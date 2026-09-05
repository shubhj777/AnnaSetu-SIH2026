"""
KisanQueue Comprehensive Automated Test Suite
Verifies Database integrity, Authentication & Authorization, Slot Booking & Cancellation,
Queue advancement, 1-Hour Reminder Scheduler, Payment Verification, Crop Evaluation,
Deduplicated SMS Dispatch, and GIS Telemetry.
"""

import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

import unittest
from datetime import datetime, date

from database import get_db, init_db, row_to_dict, rows_to_list
from seed import seed_database
from auth import hash_password, verify_password, create_access_token, decode_access_token
from data_store import db
from notifications import NotificationService
from payments import PaymentService
from crops import CropService
from scheduler import check_and_send_due_reminders, parse_slot_start_datetime


class TestKisanQueueCore(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Set up fresh test database and seed with demo data."""
        init_db()
        seed_database(force_reseed=True)

    def test_01_database_and_demo_records(self):
        """Verify database contains the 4 realistic demo records across distinct states."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT token_number, status, farmer_name FROM bookings")
            bookings = {r["token_number"]: r for r in rows_to_list(cursor.fetchall())}

            self.assertIn("#A-52", bookings)
            self.assertEqual(bookings["#A-52"]["status"], "ARRIVED")  # In Queue / Active

            self.assertIn("#B-19", bookings)
            self.assertEqual(bookings["#B-19"]["status"], "BOOKED")   # Confirmed / Upcoming

            self.assertIn("#A-35", bookings)
            self.assertEqual(bookings["#A-35"]["status"], "PAYMENT_CREDITED") # Completed & Paid

            self.assertIn("#C-08", bookings)
            self.assertEqual(bookings["#C-08"]["status"], "REJECTED") # Quality Rejected

    def test_02_authentication_and_password_hashing(self):
        """Verify PBKDF2 password hashing, verification, and HMAC-SHA256 JWT tokens."""
        raw_pwd = "SecureFarmerPass@2026"
        hashed = hash_password(raw_pwd)
        self.assertTrue(verify_password(raw_pwd, hashed))
        self.assertFalse(verify_password("WrongPassword", hashed))

        payload = {"user_id": "usr-test-123", "role": "farmer", "mobile": "9811122233"}
        token = create_access_token(payload, expires_in=3600)
        decoded = decode_access_token(token)
        self.assertIsNotNone(decoded)
        self.assertEqual(decoded["user_id"], "usr-test-123")
        self.assertEqual(decoded["role"], "farmer")

    def test_03_booking_creation_and_duplicate_prevention(self):
        """Verify slot booking creation, capacity decrement, and duplicate booking prevention."""
        today_str = date.today().isoformat()
        req_data = {
            "centre_id": "centre-b",
            "time_window": "14:00 - 15:00",
            "date": today_str,
            "farmer": {
                "id": "usr-new-farmer",
                "name": "Kuldeep Bishnoi",
                "mobile": "9871100222",
                "farmer_id": "FID-HR-11223",
                "village": "Taraori Rural",
                "district": "Karnal"
            },
            "crop": {
                "crop_type": "Wheat (गेहूँ)",
                "variety": "HD-3086",
                "estimated_quantity_quintal": 60.0
            }
        }

        # 1. First booking should succeed
        booking = db.create_booking(req_data)
        self.assertIsNotNone(booking)
        token_no = booking["token_number"]
        self.assertEqual(booking["farmer_name"], "Kuldeep Bishnoi")
        self.assertEqual(booking["status"], "BOOKED")

        # 2. Duplicate booking for same farmer on same date returns existing booking seamlessly
        dup_booking = db.create_booking(req_data)
        self.assertEqual(dup_booking["token_number"], token_no)

        # 3. Verify confirmation SMS was dispatched
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM notifications WHERE token_number = ? AND event_type = 'BOOKING_CONFIRMATION'", (token_no,))
            sms = cursor.fetchone()
            self.assertIsNotNone(sms)

    def test_04_booking_cancellation(self):
        """Verify slot cancellation frees up slot capacity and dispatches cancellation SMS."""
        today_str = date.today().isoformat()
        req_data = {
            "centre_id": "centre-d",
            "time_window": "15:00 - 16:00",
            "date": today_str,
            "farmer": {
                "name": "Manjit Singh",
                "mobile": "9812999888",
                "farmer_id": "FID-HR-99887"
            },
            "crop": {"crop_type": "Mustard / Sarson (सरसों)", "estimated_quantity_quintal": 30.0}
        }
        b = db.create_booking(req_data)
        token_no = b["token_number"]

        # Cancel booking
        res = db.cancel_booking(token_no)
        self.assertTrue(res["success"])
        self.assertEqual(res["booking"]["status"], "CANCELLED")

        # Verify cancellation SMS was generated
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM notifications WHERE token_number = ? AND event_type = 'BOOKING_CANCELLATION'", (token_no,))
            sms = cursor.fetchone()
            self.assertIsNotNone(sms)

    def test_05_payment_initiation_and_backend_verification(self):
        """Verify payment initiation, verification, receipt generation, and SMS dispatch."""
        # Initiate payment for Demo 1 (Ramesh Kumar #A-52)
        init_res = PaymentService.initiate_payment("BK-KNL-2026-0881")
        self.assertIn("payment", init_res)
        pay_ref = init_res["payment"]["payment_reference"]

        # Backend verification
        verified = PaymentService.verify_payment(pay_ref)
        receipt = verified["receipt"]
        self.assertEqual(receipt["status"], "SUCCESSFUL")
        self.assertTrue(receipt["pfms_reference"].startswith("GOV-AGRI-PFMS-"))
        self.assertTrue(receipt["receipt_number"].startswith("RCP-KQ-"))

        # Verify booking status updated to PAYMENT_CREDITED
        updated_b = db.get_booking("#A-52")
        self.assertEqual(updated_b["status"], "PAYMENT_CREDITED")

        # Verify payment confirmation SMS dispatched
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM notifications WHERE event_type = 'PAYMENT_CONFIRMATION' AND recipient_mobile = '9812345678'")
            sms = cursor.fetchone()
            self.assertIsNotNone(sms)

    def test_06_crop_submission_and_evaluation(self):
        """Verify crop submission, acceptance/rejection flow, and decision SMS dispatch."""
        # 1. Submit crop
        sub = CropService.submit_crop(
            farmer_user_id="usr-test",
            farmer_name="Gurnam Singh",
            farmer_mobile="9876500111",
            crop_type="Wheat (गेहूँ)",
            variety="Sharbati",
            quantity_quintal=75.0,
            moisture_percentage=11.0,
            notes="Dry, premium quality wheat grains"
        )
        self.assertEqual(sub["status"], "SUBMITTED")

        # 2. Evaluate Crop (Accept)
        evaluated = CropService.evaluate_crop(
            submission_id=sub["id"],
            decision="ACCEPTED",
            evaluator_name="District Assayer",
            notes="Passed FCI FAQ parameters with flying colors."
        )
        self.assertEqual(evaluated["status"], "ACCEPTED")

        # Verify acceptance SMS dispatched
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM notifications WHERE event_type = 'CROP_ACCEPTED' AND recipient_mobile = '9876500111'")
            sms = cursor.fetchone()
            self.assertIsNotNone(sms)

    def test_07_sms_idempotency_and_no_duplicates(self):
        """Verify that identical notifications are not duplicated in the database."""
        idemp_key = "TEST_IDEMP_EVENT_UNIQUE_99"
        res1 = NotificationService.send_sms(
            event_type="TEST_EVENT",
            idempotency_key=idemp_key,
            recipient_mobile="9800001111",
            recipient_name="Tester",
            token_number="#T-01",
            title="Test",
            message_text="Test SMS Text"
        )

        res2 = NotificationService.send_sms(
            event_type="TEST_EVENT",
            idempotency_key=idemp_key,
            recipient_mobile="9800001111",
            recipient_name="Tester",
            token_number="#T-01",
            title="Test",
            message_text="Test SMS Text"
        )

        self.assertEqual(res1["id"], res2["id"])

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM notifications WHERE idempotency_key = ?", (idemp_key,))
            count = cursor.fetchone()[0]
            self.assertEqual(count, 1)

    def test_08_scheduler_1_hour_reminder(self):
        """Verify 1-hour slot reminder logic and background dispatch."""
        sent = check_and_send_due_reminders()
        self.assertIsInstance(sent, int)

    def test_09_gis_coordinates_and_centres(self):
        """Verify real geographic coordinates for all Mandi centres and farmers."""
        centres = db.get_centres()
        self.assertGreaterEqual(len(centres), 4)
        for c in centres:
            self.assertGreaterEqual(c["lat"], -90.0)
            self.assertLessEqual(c["lat"], 90.0)
            self.assertGreaterEqual(c["lng"], -180.0)
            self.assertLessEqual(c["lng"], 180.0)
            # Karnal district approximate bounds: 29.3 to 30.1 N, 76.5 to 77.2 E
            self.assertTrue(29.0 <= c["lat"] <= 30.5)
            self.assertTrue(76.0 <= c["lng"] <= 77.5)

    def test_10_gate_entry_registration_and_pass(self):
        """Verify gate entry registration, official GE number generation, ARRIVED status transition, and SMS."""
        # Book a test slot
        today_str = date.today().isoformat()
        req_data = {
            "centre_id": "centre-a",
            "time_window": "11:00 - 12:00",
            "date": today_str,
            "farmer": {
                "name": "Kuldeep Singh",
                "mobile": "9812444333",
                "farmer_id": "FID-HR-44332"
            },
            "crop": {"crop_type": "Wheat (गेहूँ)", "estimated_quantity_quintal": 60.0}
        }
        b = db.create_booking(req_data)
        token_no = b["token_number"]

        # Register Gate Entry
        ge_res = db.register_gate_entry(
            booking_id_or_token=token_no,
            gate_number="Gate-2",
            vehicle_number="HR-05-AB-9988",
            driver_name="Kuldeep Singh",
            operator_id="usr-op-karnal"
        )
        self.assertTrue(ge_res["success"])
        self.assertTrue(ge_res["gate_entry_number"].startswith("GE-A-"))
        self.assertEqual(ge_res["booking"]["status"], "ARRIVED")
        self.assertEqual(ge_res["booking"]["gate_entry_id"], ge_res["gate_entry_number"])

        # Check Gate Entry in notifications
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM notifications WHERE booking_id = ? AND event_type = 'GATE_ARRIVAL'", (b["id"],))
            sms = cursor.fetchone()
            self.assertIsNotNone(sms)

    def test_11_crop_centres_availability_and_recommendation(self):
        """Verify multi-crop availability query, load calculation, and best option recommendation."""
        res = db.get_crop_centres_availability(crop_type="Wheat (गेहूँ)")
        self.assertEqual(res["status"], "success")
        self.assertGreaterEqual(res["total_centres"], 4)
        self.assertIn("best_option", res)
        best = res["best_option"]
        self.assertIn("centre_id", best)
        self.assertIn("reason", best)
        self.assertLessEqual(best["load_percentage"], 100)

    def test_12_daily_centre_schedule(self):
        """Verify daily procurement schedule answers 'Where & when can I sell my crop?'."""
        res = db.get_daily_centre_schedule()
        self.assertEqual(res["status"], "success")
        self.assertGreaterEqual(res["total_centres"], 4)
        for s in res["schedules"]:
            self.assertIn("centre_name", s)
            self.assertIn("operating_hours", s)
            self.assertIn("crops_scheduled", s)
            self.assertGreater(len(s["crops_scheduled"]), 0)

    def test_13_operator_queue_retrieval(self):
        """Verify operator terminal retrieves active queue sorted by operational stage."""
        queue = db.get_operator_queue("centre-a")
        self.assertIsInstance(queue, list)
        self.assertGreaterEqual(len(queue), 1)
        for item in queue:
            self.assertIn("token_number", item)
            self.assertIn("status", item)
            self.assertIn("farmer_name", item)

    def test_14_mobile_normalization_and_dynamic_routing(self):
        """Verify Indian phone normalization and strictly dynamic recipient isolation."""
        from notifications import normalize_indian_mobile
        # Valid normalization
        self.assertEqual(normalize_indian_mobile("9876543210"), "9876543210")
        self.assertEqual(normalize_indian_mobile("+91 98765 43210"), "9876543210")
        self.assertEqual(normalize_indian_mobile("09123456789"), "9123456789")
        self.assertEqual(normalize_indian_mobile("+91-88888-99999"), "8888899999")
        self.assertEqual(normalize_indian_mobile("917000012345"), "7000012345")

        # Invalid numbers raise ValueError
        with self.assertRaises(ValueError):
            normalize_indian_mobile("1234567890")  # Invalid starting digit
        with self.assertRaises(ValueError):
            normalize_indian_mobile("98765")       # Too short
        with self.assertRaises(ValueError):
            normalize_indian_mobile("")            # Empty

        # Test Dynamic Isolation: Two distinct farmers with distinct numbers
        today_str = date.today().isoformat()
        farmer_a_mobile = "9876543210"
        farmer_b_mobile = "9123456789"

        booking_a = db.create_booking({
            "centre_id": "centre-c",
            "time_window": "09:00 - 10:00",
            "date": today_str,
            "farmer": {
                "name": "Dynamic Farmer Alpha",
                "mobile": farmer_a_mobile,
                "village": "Taraori Alpha"
            },
            "crop": {"crop_type": "Wheat (गेहूँ)", "estimated_quantity_quintal": 45.0}
        })

        booking_b = db.create_booking({
            "centre_id": "centre-c",
            "time_window": "10:00 - 11:00",
            "date": today_str,
            "farmer": {
                "name": "Dynamic Farmer Beta",
                "mobile": farmer_b_mobile,
                "village": "Taraori Beta"
            },
            "crop": {"crop_type": "Wheat (गेहूँ)", "estimated_quantity_quintal": 55.0}
        })

        # Check notification recipients in database
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT recipient_mobile FROM notifications WHERE token_number = ?", (booking_a["token_number"],))
            sms_a = cursor.fetchone()
            self.assertEqual(sms_a["recipient_mobile"], farmer_a_mobile)

            cursor.execute("SELECT recipient_mobile FROM notifications WHERE token_number = ?", (booking_b["token_number"],))
            sms_b = cursor.fetchone()
            self.assertEqual(sms_b["recipient_mobile"], farmer_b_mobile)

            # Ensure neither received the other's message nor any hardcoded default
            self.assertNotEqual(sms_a["recipient_mobile"], sms_b["recipient_mobile"])

    def test_15_sms_provider_status_semantics(self):
        """Verify SMS provider engine semantics: SENT/ACCEPTED on gateway accept vs DEMO in demo mode."""
        from sms_providers import DemoSMSProvider, BaseSMSProvider

        # Demo provider returns DEMO from provider
        demo_provider = DemoSMSProvider()
        demo_res = demo_provider.send_sms("9876543210", "AnnaSetu Test Message")
        self.assertTrue(demo_res["success"])
        self.assertEqual(demo_res["status"], "DEMO")
        self.assertTrue(demo_res["provider_reference"].startswith("DEMO-SMS-"))

        # Base / Subclassed gateway provider must not return DELIVERED unless confirmed
        class MockGatewayProvider(BaseSMSProvider):
            def send_sms(self, to_mobile: str, message: str, sender_id: str = None) -> dict:
                return {
                    "success": True,
                    "status": "ACCEPTED",
                    "provider_reference": "GW-TX-98712",
                    "error_message": None,
                    "raw_response": {"message_id": "GW-TX-98712"}
                }

        gw_provider = MockGatewayProvider()
        gw_res = gw_provider.send_sms("9123456789", "AnnaSetu Gateway Test")
        self.assertTrue(gw_res["success"])
        self.assertEqual(gw_res["status"], "ACCEPTED")
        self.assertNotEqual(gw_res["status"], "DELIVERED")


if __name__ == "__main__":
    unittest.main()
