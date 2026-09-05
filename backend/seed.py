"""
KisanQueue Realistic Database Seeding Engine
Pre-seeds real-world Indian Mandi infrastructure, 4 realistic farmer entries in distinct lifecycle states
(In-Queue, Confirmed, Completed & Paid, and Quality Rejected), operator/admin accounts, and GIS telemetry.
"""

import json
from datetime import datetime, date, timedelta
from database import get_db, init_db, row_to_dict
from auth import hash_password


def seed_database(force_reseed: bool = False):
    """Initializes and seeds database with realistic Indian Mandi test data if empty or forced."""
    init_db()

    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) as count FROM procurement_centres")
        centre_count = cursor.fetchone()["count"]

        if centre_count > 0 and not force_reseed:
            return  # Already seeded

        if force_reseed:
            cursor.execute("DELETE FROM notifications;")
            cursor.execute("DELETE FROM payments;")
            cursor.execute("DELETE FROM quality_inspections;")
            cursor.execute("DELETE FROM weighbridge_records;")
            cursor.execute("DELETE FROM crop_submissions;")
            cursor.execute("DELETE FROM bookings;")
            cursor.execute("DELETE FROM time_slots;")
            cursor.execute("DELETE FROM procurement_centres;")
            cursor.execute("DELETE FROM users;")
            cursor.execute("DELETE FROM complaints;")
            cursor.execute("DELETE FROM audit_logs;")

        today_str = date.today().isoformat()
        now_iso = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # -------------------------------------------------------------
        # 1. SEED PROCUREMENT CENTRES (Realistic Karnal District Mandis)
        # -------------------------------------------------------------
        centres_data = [
            {
                "id": "centre-a",
                "name": "Centre A - Grain Market Karnal (मुख्य अनाज मंडी करनाल)",
                "code": "KNL-MND-01",
                "district": "Karnal",
                "state": "Haryana",
                "lat": 29.6857,
                "lng": 76.9905,
                "distance_km": 2.5,
                "total_daily_capacity": 100,
                "current_load_percentage": 92,
                "status": "red",
                "active_counters": 3,
                "avg_processing_time_min": 12,
                "current_token": 37,
                "serving_token_number": "#A-37",
                "address": "GT Road, Near Railway Overbridge, Karnal, Haryana 132001",
                "gate_entry": "Gate 1 (North Weighbridge Entrance)",
                "route_tips": "Take NH44 towards GT Road Flyover, turn right at Anaj Mandi Chowk. Dedicated tractor lane on Gate 1.",
                "contact_phone": "+91 184 2259101",
                "crops_accepted_json": json.dumps(["Wheat (गेहूँ)", "Paddy / Rice (धान)", "Mustard / Sarson (सरसों)"])
            },
            {
                "id": "centre-b",
                "name": "Centre B - Nilokheri Sub-Mandi (नीलोखेड़ी उप-मंडी)",
                "code": "KNL-NLK-02",
                "district": "Karnal",
                "state": "Haryana",
                "lat": 29.8341,
                "lng": 76.9172,
                "distance_km": 7.2,
                "total_daily_capacity": 80,
                "current_load_percentage": 42,
                "status": "green",
                "active_counters": 3,
                "avg_processing_time_min": 10,
                "current_token": 18,
                "serving_token_number": "#B-18",
                "address": "Station Road, Nilokheri, Karnal, Haryana 132117",
                "gate_entry": "Gate 2 (Sub-Mandi Main Weighbridge)",
                "route_tips": "Via State Highway 8. Smooth traffic flow, ample parking near weighbridge.",
                "contact_phone": "+91 184 2468200",
                "crops_accepted_json": json.dumps(["Wheat (गेहूँ)", "Paddy / Rice (धान)", "Gram / Chana (चना)"])
            },
            {
                "id": "centre-c",
                "name": "Centre C - Indri Procurement Hub (इन्द्री क्रय केंद्र)",
                "code": "KNL-IND-03",
                "district": "Karnal",
                "state": "Haryana",
                "lat": 29.8809,
                "lng": 77.0601,
                "distance_km": 12.0,
                "total_daily_capacity": 75,
                "current_load_percentage": 28,
                "status": "green",
                "active_counters": 2,
                "avg_processing_time_min": 9,
                "current_token": 12,
                "serving_token_number": "#C-12",
                "address": "Indri-Ladwa Highway, Indri, Karnal, Haryana 132041",
                "gate_entry": "Main Procurement Yard Gate",
                "route_tips": "Via Karnal-Indri Road. Low traffic, fastest quality assay clearance.",
                "contact_phone": "+91 184 2381200",
                "crops_accepted_json": json.dumps(["Wheat (गेहूँ)", "Mustard / Sarson (सरसों)", "Maize (मक्का)"])
            },
            {
                "id": "centre-d",
                "name": "Centre D - Gharaunda Mandi Complex (घरौंडा मंडी परिसर)",
                "code": "KNL-GHR-04",
                "district": "Karnal",
                "state": "Haryana",
                "lat": 29.5392,
                "lng": 76.9723,
                "distance_km": 16.5,
                "total_daily_capacity": 90,
                "current_load_percentage": 68,
                "status": "yellow",
                "active_counters": 3,
                "avg_processing_time_min": 11,
                "current_token": 25,
                "serving_token_number": "#D-25",
                "address": "National Highway 44, Gharaunda, Haryana 132114",
                "gate_entry": "Gate 1 & Gate 3",
                "route_tips": "Direct access from NH44 Service Lane south of Karnal.",
                "contact_phone": "+91 184 2511400",
                "crops_accepted_json": json.dumps(["Wheat (गेहूँ)", "Paddy / Rice (धान)", "Mustard / Sarson (सरसों)"])
            }
        ]

        for c in centres_data:
            cursor.execute("""
                INSERT INTO procurement_centres (
                    id, name, code, district, state, lat, lng, distance_km,
                    total_daily_capacity, current_load_percentage, status,
                    active_counters, avg_processing_time_min, current_token,
                    serving_token_number, address, gate_entry, route_tips,
                    contact_phone, crops_accepted_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                c["id"], c["name"], c["code"], c["district"], c["state"],
                c["lat"], c["lng"], c["distance_km"], c["total_daily_capacity"],
                c["current_load_percentage"], c["status"], c["active_counters"],
                c["avg_processing_time_min"], c["current_token"], c["serving_token_number"],
                c["address"], c["gate_entry"], c["route_tips"], c["contact_phone"],
                c["crops_accepted_json"]
            ))

        # -------------------------------------------------------------
        # 2. SEED TIME SLOTS
        # -------------------------------------------------------------
        slot_windows = [
            ("08:00 - 09:00", "08:00 - 09:00 AM", 12, 10, "high"),
            ("09:00 - 10:00", "09:00 - 10:00 AM", 12, 12, "full"),
            ("10:00 - 11:00", "10:00 - 11:00 AM", 15, 14, "high"),
            ("11:00 - 12:00", "11:00 AM - 12:00 PM", 15, 8, "medium"),
            ("12:00 - 13:00", "12:00 - 01:00 PM", 15, 6, "low"),
            ("13:00 - 14:00", "01:00 - 02:00 PM", 10, 3, "low"),
            ("14:00 - 15:00", "02:00 - 03:00 PM", 15, 9, "medium"),
            ("15:00 - 16:00", "03:00 - 04:00 PM", 12, 5, "low"),
            ("16:00 - 17:00", "04:00 - 05:00 PM", 10, 2, "low")
        ]

        for cid in ["centre-a", "centre-b", "centre-c", "centre-d"]:
            for idx, (win, disp, cap, booked, cong) in enumerate(slot_windows):
                actual_booked = booked if cid == "centre-a" else max(1, booked // 2)
                is_avail = 1 if actual_booked < cap else 0
                cursor.execute("""
                    INSERT INTO time_slots (
                        id, centre_id, date, time_window, display_time_window,
                        max_capacity, booked_count, is_available, congestion_level
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    f"{cid}-slot-{idx+1}", cid, today_str, win, disp,
                    cap, actual_booked, is_avail,
                    "full" if not is_avail else cong
                ))

        # -------------------------------------------------------------
        # 3. SEED USERS (Farmers, Operator, Admin)
        # -------------------------------------------------------------
        pwd_hash = hash_password("password123")
        admin_pwd_hash = hash_password("admin123")

        users_data = [
            {
                "id": "usr-ramesh",
                "name": "Ramesh Kumar (रमेश कुमार)",
                "mobile": "9812345678",
                "password_hash": pwd_hash,
                "role": "farmer",
                "farmer_id": "FID-HR-78921",
                "aadhaar_masked": "XXXX-XXXX-4819",
                "village": "Taraori (ताराओड़ी)",
                "district": "Karnal",
                "state": "Haryana",
                "kcc_number": "KCC-882190",
                "bank_name": "State Bank of India",
                "account_masked": "XXXXXX9012",
                "ifsc": "SBIN0001234",
                "lat": 29.8055,
                "lng": 76.9282
            },
            {
                "id": "usr-baldev",
                "name": "Baldev Singh (बलदेव सिंह)",
                "mobile": "9876543210",
                "password_hash": pwd_hash,
                "role": "farmer",
                "farmer_id": "FID-HR-45120",
                "aadhaar_masked": "XXXX-XXXX-5512",
                "village": "Assandh (असंध)",
                "district": "Karnal",
                "state": "Haryana",
                "kcc_number": "KCC-441299",
                "bank_name": "Punjab National Bank",
                "account_masked": "XXXXXX4481",
                "ifsc": "PUNB0123400",
                "lat": 29.5197,
                "lng": 76.6023
            },
            {
                "id": "usr-suresh",
                "name": "Suresh Sharma (सुरेश शर्मा)",
                "mobile": "9823456789",
                "password_hash": pwd_hash,
                "role": "farmer",
                "farmer_id": "FID-HR-99214",
                "aadhaar_masked": "XXXX-XXXX-3341",
                "village": "Jundla (जुंडला)",
                "district": "Karnal",
                "state": "Haryana",
                "kcc_number": "KCC-991204",
                "bank_name": "HDFC Bank",
                "account_masked": "XXXXXX7721",
                "ifsc": "HDFC0000451",
                "lat": 29.6631,
                "lng": 76.8488
            },
            {
                "id": "usr-harpreet",
                "name": "Harpreet Kaur (हरप्रीत कौर)",
                "mobile": "9898765432",
                "password_hash": pwd_hash,
                "role": "farmer",
                "farmer_id": "FID-HR-33418",
                "aadhaar_masked": "XXXX-XXXX-9021",
                "village": "Nissing (निसिंग)",
                "district": "Karnal",
                "state": "Haryana",
                "kcc_number": "KCC-332145",
                "bank_name": "Bank of Baroda",
                "account_masked": "XXXXXX5520",
                "ifsc": "BARB0KARNAL",
                "lat": 29.6582,
                "lng": 76.7329
            },
            {
                "id": "usr-operator",
                "name": "Karnal Mandi Weighbridge Operator",
                "mobile": "9800000001",
                "password_hash": pwd_hash,
                "role": "operator",
                "farmer_id": None,
                "aadhaar_masked": None,
                "village": "Mandi Secretariat",
                "district": "Karnal",
                "state": "Haryana",
                "kcc_number": None,
                "bank_name": None,
                "account_masked": None,
                "ifsc": None,
                "lat": 29.6857,
                "lng": 76.9905
            },
            {
                "id": "usr-admin",
                "name": "District Collector & Mandi Secretary Karnal",
                "mobile": "9800000000",
                "password_hash": admin_pwd_hash,
                "role": "admin",
                "farmer_id": None,
                "aadhaar_masked": None,
                "village": "District Administrative Complex",
                "district": "Karnal",
                "state": "Haryana",
                "kcc_number": None,
                "bank_name": None,
                "account_masked": None,
                "ifsc": None,
                "lat": 29.6910,
                "lng": 76.9850
            }
        ]

        for u in users_data:
            cursor.execute("""
                INSERT INTO users (
                    id, name, mobile, password_hash, role, farmer_id,
                    aadhaar_masked, village, district, state, kcc_number,
                    bank_name, account_masked, ifsc, lat, lng, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                u["id"], u["name"], u["mobile"], u["password_hash"], u["role"], u["farmer_id"],
                u["aadhaar_masked"], u["village"], u["district"], u["state"], u["kcc_number"],
                u["bank_name"], u["account_masked"], u["ifsc"], u["lat"], u["lng"], now_iso
            ))

        # -------------------------------------------------------------
        # 4. SEED 4 REALISTIC DEMO ENTRIES (DISTINCT LIFECYCLE STATES)
        # -------------------------------------------------------------

        # DEMO ENTRY 1: Ramesh Kumar — Active / In Queue (State: ARRIVED)
        cursor.execute("""
            INSERT INTO bookings (
                id, token_number, token_sequence, farmer_user_id, farmer_id,
                farmer_name, farmer_mobile, aadhaar_masked, village, district,
                state, kcc_number, bank_name, account_masked, ifsc, centre_id,
                centre_name, date, time_window, display_time_window, crop_type,
                variety, quantity_quintal, msp_rate_per_quintal, total_estimated_value,
                vehicle_type, vehicle_number, status, status_note, created_at,
                arrived_at, procured_at, lat, lng, qr_payload
            ) VALUES (
                'BK-KNL-2026-0881', '#A-52', 52, 'usr-ramesh', 'FID-HR-78921',
                'Ramesh Kumar (रमेश कुमार)', '9812345678', 'XXXX-XXXX-4819', 'Taraori (ताराओड़ी)', 'Karnal',
                'Haryana', 'KCC-882190', 'State Bank of India', 'XXXXXX9012', 'SBIN0001234', 'centre-a',
                'Centre A - Grain Market Karnal', ?, '10:00 - 11:00', '10:00 - 11:00 AM', 'Wheat (गेहूँ)',
                'HD-2967 (Sharbati Gold)', 50.0, 2425.0, 121250.0,
                'Tractor Trolley', 'HR-05-AB-7821', 'ARRIVED', 'Checked in at Gate 1 North Weighbridge', ?,
                '09:55 AM', NULL, 29.8055, 76.9282,
                'KISANQUEUE|TOKEN:#A-52|FARMER:Ramesh Kumar|CENTRE:Centre A|CROP:Wheat|QTY:50Q'
            )
        """, (today_str, now_iso))

        # DEMO ENTRY 2: Baldev Singh — Pending / Confirmed Slot (State: BOOKED)
        cursor.execute("""
            INSERT INTO bookings (
                id, token_number, token_sequence, farmer_user_id, farmer_id,
                farmer_name, farmer_mobile, aadhaar_masked, village, district,
                state, kcc_number, bank_name, account_masked, ifsc, centre_id,
                centre_name, date, time_window, display_time_window, crop_type,
                variety, quantity_quintal, msp_rate_per_quintal, total_estimated_value,
                vehicle_type, vehicle_number, status, status_note, created_at,
                arrived_at, procured_at, lat, lng, qr_payload
            ) VALUES (
                'BK-NLK-2026-0914', '#B-19', 19, 'usr-baldev', 'FID-HR-45120',
                'Baldev Singh (बलदेव सिंह)', '9876543210', 'XXXX-XXXX-5512', 'Assandh (असंध)', 'Karnal',
                'Haryana', 'KCC-441299', 'Punjab National Bank', 'XXXXXX4481', 'PUNB0123400', 'centre-b',
                'Centre B - Nilokheri Sub-Mandi', ?, '11:00 - 12:00', '11:00 AM - 12:00 PM', 'Paddy / Rice (धान)',
                'PB-1121 (Basmati Super)', 65.0, 2320.0, 150800.0,
                'Mini Truck (Bolero Pik-up)', 'HR-05-CD-4109', 'BOOKED', 'Slot confirmed. Advance reminder sent.', ?,
                NULL, NULL, 29.5197, 76.6023,
                'KISANQUEUE|TOKEN:#B-19|FARMER:Baldev Singh|CENTRE:Centre B|CROP:Paddy|QTY:65Q'
            )
        """, (today_str, now_iso))

        # DEMO ENTRY 3: Suresh Sharma — Completed & Paid (State: PAYMENT_CREDITED)
        cursor.execute("""
            INSERT INTO bookings (
                id, token_number, token_sequence, farmer_user_id, farmer_id,
                farmer_name, farmer_mobile, aadhaar_masked, village, district,
                state, kcc_number, bank_name, account_masked, ifsc, centre_id,
                centre_name, date, time_window, display_time_window, crop_type,
                variety, quantity_quintal, msp_rate_per_quintal, total_estimated_value,
                vehicle_type, vehicle_number, status, status_note, created_at,
                arrived_at, procured_at, lat, lng, qr_payload
            ) VALUES (
                'BK-KNL-2026-0740', '#A-35', 35, 'usr-suresh', 'FID-HR-99214',
                'Suresh Sharma (सुरेश शर्मा)', '9823456789', 'XXXX-XXXX-3341', 'Jundla (जुंडला)', 'Karnal',
                'Haryana', 'KCC-991204', 'HDFC Bank', 'XXXXXX7721', 'HDFC0000451', 'centre-a',
                'Centre A - Grain Market Karnal', ?, '08:00 - 09:00', '08:00 - 09:00 AM', 'Wheat (गेहूँ)',
                'HD-2967 (Sharbati)', 80.0, 2425.0, 194000.0,
                'Tractor Trolley', 'HR-05-EF-2914', 'PAYMENT_CREDITED', 'Procurement complete and DBT payment credited', ?,
                '08:05 AM', '08:45 AM', 29.6631, 76.8488,
                'KISANQUEUE|TOKEN:#A-35|FARMER:Suresh Sharma|CENTRE:Centre A|CROP:Wheat|QTY:80Q'
            )
        """, (today_str, now_iso))

        # Seed Weighbridge Record for Demo Entry 3
        cursor.execute("""
            INSERT INTO weighbridge_records (
                id, booking_id, token_number, gross_weight_quintal,
                tare_weight_quintal, net_weight_quintal, weighbridge_slip_no,
                recorded_at, operator_id
            ) VALUES (
                'WB-KNL-0811', 'BK-KNL-2026-0740', '#A-35', 142.0, 62.0, 80.0,
                'WB-SLIP-8821', ?, 'usr-operator'
            )
        """, (now_iso,))

        # Seed Quality Inspection for Demo Entry 3
        cursor.execute("""
            INSERT INTO quality_inspections (
                id, booking_id, token_number, moisture_percentage,
                foreign_matter_percentage, damaged_grains_percentage, grade,
                approved, deduction_percentage, rejection_reason, inspector_notes,
                inspected_at, inspector_id
            ) VALUES (
                'QI-KNL-0811', 'BK-KNL-2026-0740', '#A-35', 11.2, 0.75, 0.4,
                'Grade A (FAQ)', 1, 0.0, NULL,
                'Certified Fair Average Quality (FAQ) by Mandi Quality Officer.',
                ?, 'Dr. V.K. Verma'
            )
        """, (now_iso,))

        # Seed Payment Record for Demo Entry 3
        cursor.execute("""
            INSERT INTO payments (
                id, payment_reference, booking_id, user_id, token_number,
                amount_inr, status, pfms_reference, payment_method,
                created_at, completed_at, receipt_number
            ) VALUES (
                'PAY-ID-88219', 'PAY-KQ-2026-88219', 'BK-KNL-2026-0740', 'usr-suresh', '#A-35',
                194000.0, 'SUCCESSFUL', 'GOV-AGRI-PFMS-77192', 'PFMS_DBT',
                ?, ?, 'RCP-KQ-260905-0811'
            )
        """, (now_iso, now_iso))

        # DEMO ENTRY 4: Harpreet Kaur — Rejected / Over-Moisture (State: REJECTED)
        cursor.execute("""
            INSERT INTO bookings (
                id, token_number, token_sequence, farmer_user_id, farmer_id,
                farmer_name, farmer_mobile, aadhaar_masked, village, district,
                state, kcc_number, bank_name, account_masked, ifsc, centre_id,
                centre_name, date, time_window, display_time_window, crop_type,
                variety, quantity_quintal, msp_rate_per_quintal, total_estimated_value,
                vehicle_type, vehicle_number, status, status_note, created_at,
                arrived_at, procured_at, lat, lng, qr_payload
            ) VALUES (
                'BK-IND-2026-0412', '#C-08', 8, 'usr-harpreet', 'FID-HR-33418',
                'Harpreet Kaur (हरप्रीत कौर)', '9898765432', 'XXXX-XXXX-9021', 'Nissing (निसिंग)', 'Karnal',
                'Haryana', 'KCC-332145', 'Bank of Baroda', 'XXXXXX5520', 'BARB0KARNAL', 'centre-c',
                'Centre C - Indri Procurement Hub', ?, '09:00 - 10:00', '09:00 - 10:00 AM', 'Mustard / Sarson (सरसों)',
                'Pusa Bold (सरसों)', 40.0, 5950.0, 238000.0,
                'Tractor Trolley', 'HR-05-GH-6623', 'REJECTED', 'Moisture 16.8% exceeds FAQ 12.0% limit. Sun-dry for 48 hrs.', ?,
                '09:10 AM', NULL, 29.6582, 76.7329,
                'KISANQUEUE|TOKEN:#C-08|FARMER:Harpreet Kaur|CENTRE:Centre C|CROP:Mustard|QTY:40Q'
            )
        """, (today_str, now_iso))

        # Seed Quality Inspection for Demo Entry 4 (Rejection)
        cursor.execute("""
            INSERT INTO quality_inspections (
                id, booking_id, token_number, moisture_percentage,
                foreign_matter_percentage, damaged_grains_percentage, grade,
                approved, deduction_percentage, rejection_reason, inspector_notes,
                inspected_at, inspector_id
            ) VALUES (
                'QI-IND-0412', 'BK-IND-2026-0412', '#C-08', 16.8, 4.2, 1.8,
                'Rejected (Over-Moisture)', 0, 100.0,
                'Moisture content measured at 16.8% (maximum permissible limit is 12.0%). Grains wet; please sun-dry for 48 hours and re-book slot.',
                'Exceeds permissible grain moisture threshold.',
                ?, 'Shri Anil Dahiya (Quality Inspector)'
            )
        """, (now_iso,))

        # -------------------------------------------------------------
        # 5. SEED CROP SUBMISSIONS
        # -------------------------------------------------------------
        cursor.execute("""
            INSERT INTO crop_submissions (
                id, booking_id, farmer_user_id, farmer_name, farmer_mobile,
                crop_type, variety, quantity_quintal, moisture_percentage,
                harvest_date, status, rejection_reason, evaluated_by, evaluated_at, notes, created_at
            ) VALUES
            (
                'CRP-260905-001', 'BK-KNL-2026-0881', 'usr-ramesh', 'Ramesh Kumar (रमेश कुमार)', '9812345678',
                'Wheat (गेहूँ)', 'HD-2967 (Sharbati Gold)', 50.0, 11.8, ?, 'UNDER_REVIEW', NULL,
                NULL, NULL, 'Freshly harvested from Taraori irrigated farm.', ?
            ),
            (
                'CRP-260905-002', 'BK-NLK-2026-0914', 'usr-baldev', 'Baldev Singh (बलदेव सिंह)', '9876543210',
                'Paddy / Rice (धान)', 'PB-1121 (Basmati Super)', 65.0, 13.5, ?, 'SUBMITTED', NULL,
                NULL, NULL, 'Grade A Basmati crop with golden grain length.', ?
            ),
            (
                'CRP-260905-003', 'BK-KNL-2026-0740', 'usr-suresh', 'Suresh Sharma (सुरेश शर्मा)', '9823456789',
                'Wheat (गेहूँ)', 'HD-2967 (Sharbati)', 80.0, 11.2, ?, 'ACCEPTED', NULL,
                'Dr. V.K. Verma', ?, 'Passed all FCI FAQ grain assay standards.', ?
            ),
            (
                'CRP-260905-004', 'BK-IND-2026-0412', 'usr-harpreet', 'Harpreet Kaur (हरप्रीत कौर)', '9898765432',
                'Mustard / Sarson (सरसों)', 'Pusa Bold (सरसों)', 40.0, 16.8, ?, 'REJECTED',
                'Moisture content measured at 16.8% (maximum permissible limit 12.0%). Grains wet; please sun-dry for 48 hours and re-book slot.',
                'Shri Anil Dahiya', ?, 'Failed FAQ moisture test.', ?
            )
        """, (
            today_str, now_iso,
            today_str, now_iso,
            today_str, now_iso, now_iso,
            today_str, now_iso, now_iso
        ))

        # -------------------------------------------------------------
        # 6. SEED NOTIFICATION SMS LOGS (Deduplicated, Real Indian Data)
        # -------------------------------------------------------------
        sms_entries = [
            (
                "SMS-260905-101", "BOOKING_CONFIRMATION", "BOOKING_CONFIRM_BK-KNL-2026-0881", "BK-KNL-2026-0881",
                "9812345678", "Ramesh Kumar", "#A-52", "🌾 Slot Confirmed / स्लॉट पुष्टिकरण",
                "KisanQueue: Your slot has been successfully booked. Token: #A-52 (Booking ID: BK-KNL-2026-0881). Date: Today, Time: 10:00 - 11:00 AM. Mandi: Centre A - Grain Market Karnal. Crop: Wheat (50.0 Q). Please arrive on time at Gate 1.",
                "DELIVERED", "NIC-PUSH-88210", now_iso, now_iso, 0, "DEMO", None, 0
            ),
            (
                "SMS-260905-102", "QUEUE_ALERT", "QUEUE_ALERT_#A-52_37", "BK-KNL-2026-0881",
                "9812345678", "Ramesh Kumar", "#A-52", "🔔 Queue Status Update",
                "Centre A currently serving Token #A-37. You have 15 farmers ahead. Estimated wait time: 47 mins. You may wait comfortably at home or head towards Gate 1.",
                "DELIVERED", "NIC-PUSH-88211", now_iso, now_iso, 0, "DEMO", None, 0
            ),
            (
                "SMS-260905-103", "BOOKING_CONFIRMATION", "BOOKING_CONFIRM_BK-NLK-2026-0914", "BK-NLK-2026-0914",
                "9876543210", "Baldev Singh", "#B-19", "🌾 Slot Confirmed / स्लॉट पुष्टिकरण",
                "KisanQueue: Your slot has been successfully booked. Token: #B-19. Date: Today, Time: 11:00 AM - 12:00 PM. Mandi: Centre B - Nilokheri Sub-Mandi. Crop: Paddy / Rice (65.0 Q).",
                "DELIVERED", "NIC-PUSH-88212", now_iso, now_iso, 0, "DEMO", None, 0
            ),
            (
                "SMS-260905-104", "ONE_HOUR_REMINDER", f"REMINDER_1HR_BK-NLK-2026-0914_{today_str}", "BK-NLK-2026-0914",
                "9876543210", "Baldev Singh", "#B-19", "⏰ 1-Hour Slot Reminder / स्लॉट स्मरण",
                "Reminder: Your KishanQueue slot #B-19 (ID: BK-NLK-2026-0914) is scheduled at 11:00 AM - 12:00 PM today at Centre B - Nilokheri Sub-Mandi. Please arrive at the assigned location on time.",
                "DELIVERED", "NIC-PUSH-88213", now_iso, now_iso, 0, "DEMO", None, 0
            ),
            (
                "SMS-260905-105", "PAYMENT_CONFIRMATION", "PAYMENT_CONFIRM_PAY-KQ-2026-88219", "BK-KNL-2026-0740",
                "9823456789", "Suresh Sharma", "#A-35", "💰 Payment Received / भुगतान प्राप्त",
                "Payment received successfully for KishanQueue booking #A-35 (BK-KNL-2026-0740). Amount: ₹1,94,000.00. Payment Ref: PAY-KQ-2026-88219. PFMS Ref: GOV-AGRI-PFMS-77192. Funds credited to HDFC Bank A/c XXXXXX7721.",
                "DELIVERED", "NIC-PUSH-88214", now_iso, now_iso, 0, "DEMO", None, 0
            ),
            (
                "SMS-260905-106", "CROP_REJECTED", "CROP_DECISION_BK-IND-2026-0412_REJECTED", "BK-IND-2026-0412",
                "9898765432", "Harpreet Kaur", "#C-08", "⚠️ Crop Rejected / फसल अस्वीकृत",
                "Your crop submission for KishanQueue booking #C-08 has been REJECTED. Reason: Moisture content measured at 16.8% (maximum permissible limit 12.0%). Please sun-dry for 48 hours and re-book slot.",
                "DELIVERED", "NIC-PUSH-88215", now_iso, now_iso, 0, "DEMO", None, 0
            )
        ]

        for s in sms_entries:
            cursor.execute("""
                INSERT INTO notifications (
                    id, event_type, idempotency_key, booking_id,
                    recipient_mobile, recipient_name, token_number,
                    title, message_text, status, provider_reference,
                    sent_at, delivery_time, is_read, mode, failure_reason, retry_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, s)

        # -------------------------------------------------------------
        # 7. SEED COMPLAINTS
        # -------------------------------------------------------------
        cursor.execute("""
            INSERT INTO complaints (
                id, complaint_id, farmer_mobile, farmer_name, token_number,
                category, description, status, assigned_to, resolution_eta, timestamp
            ) VALUES (
                'CMP-01', 'CMP-260905-01', '9812345678', 'Ramesh Kumar', '#A-52',
                'Weighbridge Delay', 'Slow movement at Gate 1 weighbridge due to tractor queue.',
                'IN_PROGRESS', 'Mandi Secretary Officer', 'Within 1 Hour', ?
            )
        """, (now_iso,))

        print("✓ KisanQueue database initialized and pre-seeded with 4 realistic demo records.")


if __name__ == "__main__":
    seed_database(force_reseed=True)
