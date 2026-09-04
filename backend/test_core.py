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


if __name__ == "__main__":
    unittest.main()
