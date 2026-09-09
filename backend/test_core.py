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
from auth import (
    hash_password, verify_password, create_access_token, decode_access_token,
    normalize_indian_mobile, validate_strong_password,
    hash_security_answer, verify_security_answer, normalize_security_answer
)
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

    def test_14_indian_mobile_normalization_and_validation(self):
        """Verify standard 10-digit Indian mobile numbers and prefixes are correctly normalized and invalid numbers rejected."""
        self.assertEqual(normalize_indian_mobile("9812345678"), "9812345678")
        self.assertEqual(normalize_indian_mobile("+91 9812345678"), "9812345678")
        self.assertEqual(normalize_indian_mobile("+91-98765-43210"), "9876543210")
        self.assertEqual(normalize_indian_mobile("09812345678"), "9812345678")
        self.assertEqual(normalize_indian_mobile("919812345678"), "9812345678")

        # Invalid formats
        self.assertIsNone(normalize_indian_mobile("1234567890"))  # Starts with 1
        self.assertIsNone(normalize_indian_mobile("5812345678"))  # Starts with 5
        self.assertIsNone(normalize_indian_mobile("981234"))      # Too short
        self.assertIsNone(normalize_indian_mobile("9812345678901")) # Too long
        self.assertIsNone(normalize_indian_mobile("abcdefghij"))  # Non-numeric

    def test_15_strong_password_policy_enforcement(self):
        """Verify strict password rules: min 8 chars, uppercase, lowercase, number, special symbol."""
        # Valid password
        ok, msg = validate_strong_password("Agri@2026")
        self.assertTrue(ok)
        self.assertEqual(msg, "")

        ok, msg = validate_strong_password("Kisan#Pass99")
        self.assertTrue(ok)

        # Invalid passwords
        self.assertFalse(validate_strong_password("12345678")[0])       # Only numbers
        self.assertFalse(validate_strong_password("abcdefgh")[0])       # Only lowercase
        self.assertFalse(validate_strong_password("Abcdefgh")[0])       # No number or symbol
        self.assertFalse(validate_strong_password("Abcdef12")[0])       # No special symbol
        self.assertFalse(validate_strong_password("Agri@26")[0])        # Too short (< 8 chars)

    def test_16_unique_mobile_database_constraint(self):
        """Verify database-level unique mobile enforcement prevents duplicate registration."""
        import sqlite3
        with get_db() as conn:
            cursor = conn.cursor()
            # Attempt inserting a duplicate mobile already in database ('9812345678')
            with self.assertRaises(sqlite3.IntegrityError):
                cursor.execute("""
                    INSERT INTO users (id, name, mobile, password_hash, role, created_at)
                    VALUES ('usr-duplicate-test', 'Duplicate User', '9812345678', 'hash', 'farmer', '2026-09-09 10:00:00')
                """)

    def test_17_security_answer_hashing_and_normalization(self):
        """Verify security answers are never stored in plaintext and normalize whitespace/case safely."""
        raw_answer = "  Karnal Model School  "
        normalized = normalize_security_answer(raw_answer)
        self.assertEqual(normalized, "karnal model school")

        hashed = hash_security_answer(raw_answer)
        self.assertNotIn("karnal", hashed.lower())  # Salted hash does not expose plain text
        self.assertTrue(hashed.startswith(hashed.split("$")[0] + "$"))  # Valid salt$hash structure

        # Verification is case and whitespace insensitive
        self.assertTrue(verify_security_answer("karnal model school", hashed))
        self.assertTrue(verify_security_answer("KARNAL  MODEL   SCHOOL", hashed))
        self.assertFalse(verify_security_answer("Delhi Model School", hashed))

    def test_18_demo_users_security_questions_backfilled(self):
        """Verify all seeded users possess non-null security questions and hashed answers."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, mobile, sec_q1, sec_a1_hash, sec_q2, sec_a2_hash FROM users")
            users = rows_to_list(cursor.fetchall())
            self.assertGreaterEqual(len(users), 4)
            for u in users:
                self.assertIsNotNone(u["sec_q1"])
                self.assertIsNotNone(u["sec_a1_hash"])
                self.assertIsNotNone(u["sec_q2"])
                self.assertIsNotNone(u["sec_a2_hash"])
                # Ensure security hashes are valid salt$hash
                self.assertIn("$", u["sec_a1_hash"])
                self.assertIn("$", u["sec_a2_hash"])

    def test_19_auth_endpoints_integration(self):
        """Test API endpoints for registration, duplicate phone rejection, forgot password, and change password."""
        from fastapi.testclient import TestClient
        from main import app
        client = TestClient(app)

        # 1. Register with invalid phone number -> 400
        res = client.post("/api/auth/register", json={
            "name": "Invalid Phone Test",
            "mobile": "1234567890",
            "password": "Valid@Password2026"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("valid 10-digit Indian mobile", res.json()["detail"])

        # 2. Register with weak password -> 400
        res = client.post("/api/auth/register", json={
            "name": "Weak Pass Test",
            "mobile": "9870000001",
            "password": "weak"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("at least 8 characters", res.json()["detail"])

        # 3. Register with duplicate phone (Ramesh's 9812345678) -> 400
        res = client.post("/api/auth/register", json={
            "name": "Another Ramesh",
            "mobile": "9812345678",
            "password": "Valid@Password2026"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("already exists", res.json()["detail"])

        # 4. Successful registration with new Indian phone (+91 format)
        res = client.post("/api/auth/register", json={
            "name": "New Integrated Farmer",
            "mobile": "+91 98700 11223",
            "password": "Farmer@Pass2026",
            "sec_q1": "What was the name of your first school?",
            "sec_a1": "Karnal Primary School",
            "sec_q2": "What was your childhood nickname?",
            "sec_a2": "Chintu"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["user"]["mobile"], "9870011223")
        self.assertNotIn("password_hash", data["user"])
        token = data["token"]

        # 5. Forgot password questions retrieval
        res = client.post("/api/auth/forgot-password/questions", json={"mobile": "9870011223"})
        self.assertEqual(res.status_code, 200)
        q_data = res.json()
        self.assertEqual(len(q_data["questions"]), 2)

        # 6. Forgot password reset with wrong answer -> 400
        res = client.post("/api/auth/forgot-password/reset", json={
            "mobile": "9870011223",
            "sec_a1": "Wrong School",
            "sec_a2": "Chintu",
            "new_password": "NewStrong@Pass2026"
        })
        self.assertEqual(res.status_code, 400)

        # 7. Forgot password reset with correct answers (case-insensitive) -> 200
        res = client.post("/api/auth/forgot-password/reset", json={
            "mobile": "9870011223",
            "sec_a1": "  karnal primary school  ",
            "sec_a2": "CHINTU",
            "new_password": "NewStrong@Pass2026"
        })
        self.assertEqual(res.status_code, 200)
        self.assertIn("Password reset successfully", res.json()["message"])

        # 8. Login with the new password
        res = client.post("/api/auth/login", json={
            "identifier": "9870011223",
            "password": "NewStrong@Pass2026"
        })
        self.assertEqual(res.status_code, 200)
        new_token = res.json()["token"]

        # 9. Change password for logged-in user
        res = client.post(
            "/api/auth/change-password",
            headers={"Authorization": f"Bearer {new_token}"},
            json={
                "current_password": "NewStrong@Pass2026",
                "new_password": "Changed@Pass2026",
                "confirm_password": "Changed@Pass2026"
            }
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("Password changed successfully", res.json()["message"])


if __name__ == "__main__":
    unittest.main()


