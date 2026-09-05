"""
KisanQueue Database Store & Access Layer
Provides SQLite-backed persistence, atomic slot booking transactions,
cancellation, recovery, queue advancement, and audit logging.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, date, timedelta
import uuid
import re
import json

from database import get_db, row_to_dict, rows_to_list, init_db
from notifications import NotificationService


def normalize_time_window(tw: str) -> str:
    """Normalizes any 12-hour or 24-hour time window string into canonical 24-hour 'HH:MM - HH:MM' format."""
    if not tw:
        return "10:00 - 11:00"
    clean = re.sub(r'\(.*?\)', '', tw).strip()

    match_12 = re.search(r'(\d{1,2}):(\d{2})\s*(?:AM|PM)?\s*[-–—]\s*(\d{1,2}):(\d{2})\s*(AM|PM)', clean, re.IGNORECASE)
    if match_12:
        h1, m1, h2, m2, meridian = match_12.groups()
        h1_i, h2_i = int(h1), int(h2)
        if meridian.upper() == "PM":
            if h1_i != 12 and h1_i < 12:
                h1_i += 12
            if h2_i != 12:
                h2_i += 12
        elif meridian.upper() == "AM":
            if h1_i == 12:
                h1_i = 0
            if h2_i == 12:
                h2_i = 0
        return f"{h1_i:02d}:{m1} - {h2_i:02d}:{m2}"

    match_24 = re.search(r'(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})', clean)
    if match_24:
        h1, m1, h2, m2 = match_24.groups()
        return f"{int(h1):02d}:{m1} - {int(h2):02d}:{m2}"

    return "10:00 - 11:00"


def format_display_time_window(tw_24: str) -> str:
    """Converts 24-hour 'HH:MM - HH:MM' to friendly 12-hour '10:00 - 11:00 AM' format."""
    try:
        parts = [p.strip() for p in tw_24.split("-")]
        if len(parts) == 2:
            t1 = datetime.strptime(parts[0], "%H:%M")
            t2 = datetime.strptime(parts[1], "%H:%M")
            return f"{t1.strftime('%I:%M %p').lstrip('0')} - {t2.strftime('%I:%M %p').lstrip('0')}"
    except Exception:
        pass
    return tw_24


class DataStore:
    def __init__(self):
        self.crops_msp: Dict[str, float] = {
            "Wheat (गेहूँ)": 2425.0,
            "Paddy / Rice (धान)": 2320.0,
            "Mustard / Sarson (सरसों)": 5950.0,
            "Gram / Chana (चना)": 5650.0,
            "Maize (मक्का)": 2225.0,
            "Barley (जौ)": 1980.0
        }

    @property
    def sms_logs(self) -> List[Dict[str, Any]]:
        """Legacy compatibility getter returning notifications list."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM notifications ORDER BY sent_at DESC")
            return rows_to_list(cursor.fetchall())

    def get_centres(self) -> List[Dict[str, Any]]:
        """Retrieves list of all mandi procurement centres with calculated load percentages."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM procurement_centres")
            centres = rows_to_list(cursor.fetchall())

            for c in centres:
                if c.get("crops_accepted_json"):
                    try:
                        c["crops_accepted"] = json.loads(c["crops_accepted_json"])
                    except Exception:
                        c["crops_accepted"] = ["Wheat (गेहूँ)", "Paddy / Rice (धान)"]
                else:
                    c["crops_accepted"] = ["Wheat (गेहूँ)"]

                cursor.execute("SELECT max_capacity, booked_count FROM time_slots WHERE centre_id = ?", (c["id"],))
                slots = cursor.fetchall()
                if slots:
                    total_cap = sum(s["max_capacity"] for s in slots)
                    total_booked = sum(s["booked_count"] for s in slots)
                    load_pct = min(100, round((total_booked / max(1, total_cap)) * 100))
                    c["current_load_percentage"] = load_pct
                    c["status"] = "red" if load_pct >= 80 else ("yellow" if load_pct >= 55 else "green")

            return centres

    def get_centre(self, centre_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves detailed record for a specific centre."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM procurement_centres WHERE id = ?", (centre_id,))
            c = row_to_dict(cursor.fetchone())
            if not c:
                return None
            if c.get("crops_accepted_json"):
                try:
                    c["crops_accepted"] = json.loads(c["crops_accepted_json"])
                except Exception:
                    c["crops_accepted"] = []
            return c

    def get_slots(self, centre_id: str, booking_date: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieves hourly time slots for a centre on a given date."""
        target_date = booking_date or date.today().isoformat()
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM time_slots
                WHERE centre_id = ? AND date = ?
                ORDER BY time_window ASC
            """, (centre_id, target_date))
            slots = rows_to_list(cursor.fetchall())

            # Auto-populate slots for date if not yet generated
            if not slots:
                windows = [
                    ("08:00 - 09:00", "08:00 - 09:00 AM", 12, 0, "low"),
                    ("09:00 - 10:00", "09:00 - 10:00 AM", 12, 0, "low"),
                    ("10:00 - 11:00", "10:00 - 11:00 AM", 15, 0, "low"),
                    ("11:00 - 12:00", "11:00 AM - 12:00 PM", 15, 0, "low"),
                    ("12:00 - 13:00", "12:00 - 01:00 PM", 15, 0, "low"),
                    ("13:00 - 14:00", "01:00 - 02:00 PM", 10, 0, "low"),
                    ("14:00 - 15:00", "02:00 - 03:00 PM", 15, 0, "low"),
                    ("15:00 - 16:00", "03:00 - 04:00 PM", 12, 0, "low"),
                    ("16:00 - 17:00", "04:00 - 05:00 PM", 10, 0, "low")
                ]
                for idx, (win, disp, cap, booked, cong) in enumerate(windows):
                    sid = f"{centre_id}-{target_date}-slot-{idx+1}"
                    cursor.execute("""
                        INSERT INTO time_slots (
                            id, centre_id, date, time_window, display_time_window,
                            max_capacity, booked_count, is_available, congestion_level
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
                    """, (sid, centre_id, target_date, win, disp, cap, booked, cong))

                cursor.execute("""
                    SELECT * FROM time_slots
                    WHERE centre_id = ? AND date = ?
                    ORDER BY time_window ASC
                """, (centre_id, target_date))
                slots = rows_to_list(cursor.fetchall())

            return slots

    def find_next_best_slot(self, centre_id: str) -> str:
        """Finds next available slot with lowest current congestion/load."""
        slots = self.get_slots(centre_id)
        avail_slots = [s for s in slots if s.get("is_available")]
        if avail_slots:
            best = min(avail_slots, key=lambda s: s.get("booked_count", 0))
            return best["time_window"]
        return "12:00 - 13:00"

    def get_booking(self, token_number: str) -> Optional[Dict[str, Any]]:
        """
        Fetches full 7-stage booking details, including weighbridge, quality inspection,
        and payment records.
        """
        norm = token_number.upper().strip()
        if not norm.startswith("#"):
            norm = f"#{norm}"

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM bookings
                WHERE token_number = ? OR id = ?
            """, (norm, token_number))
            booking = row_to_dict(cursor.fetchone())
            if not booking:
                return None

            # Attach Weighbridge record
            cursor.execute("SELECT * FROM weighbridge_records WHERE booking_id = ?", (booking["id"],))
            booking["weighbridge"] = row_to_dict(cursor.fetchone())

            # Attach Quality record
            cursor.execute("SELECT * FROM quality_inspections WHERE booking_id = ?", (booking["id"],))
            booking["quality"] = row_to_dict(cursor.fetchone())

            # Attach Payment record
            cursor.execute("SELECT * FROM payments WHERE booking_id = ?", (booking["id"],))
            booking["payment"] = row_to_dict(cursor.fetchone())

            # Attach Gate Entry record
            cursor.execute("SELECT * FROM gate_entries WHERE booking_id = ? ORDER BY entry_time DESC LIMIT 1", (booking["id"],))
            booking["gate_entry"] = row_to_dict(cursor.fetchone())

            return booking

    def list_bookings(
        self,
        farmer_user_id: Optional[str] = None,
        farmer_mobile: Optional[str] = None,
        centre_id: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Searches and lists bookings with pagination and filters."""
        with get_db() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM bookings WHERE 1=1"
            params: List[Any] = []

            if farmer_user_id:
                query += " AND (farmer_user_id = ? OR farmer_mobile = ?)"
                params.extend([farmer_user_id, farmer_mobile or ""])
            elif farmer_mobile:
                query += " AND farmer_mobile = ?"
                params.append(farmer_mobile)

            if centre_id:
                query += " AND centre_id = ?"
                params.append(centre_id)

            if status:
                query += " AND status = ?"
                params.append(status)

            if search:
                query += " AND (token_number LIKE ? OR farmer_name LIKE ? OR crop_type LIKE ? OR farmer_id LIKE ?)"
                s_pat = f"%{search}%"
                params.extend([s_pat, s_pat, s_pat, s_pat])

            query += " ORDER BY created_at DESC LIMIT ?"
            params.append(limit)

            cursor.execute(query, params)
            bookings = rows_to_list(cursor.fetchall())

            # Attach payments and quality summary to each
            for b in bookings:
                cursor.execute("SELECT * FROM payments WHERE booking_id = ?", (b["id"],))
                b["payment"] = row_to_dict(cursor.fetchone())

            return bookings

    def create_booking(self, req_dict: Dict[str, Any], user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Atomic transaction: checks slot capacity, allocates token sequence,
        decrements slot availability, writes booking record, and dispatches Confirmation SMS.
        """
        cid = req_dict.get("centre_id", "centre-a")
        raw_window = req_dict.get("time_window", "10:00 - 11:00")
        canonical_window = normalize_time_window(raw_window)
        display_window = format_display_time_window(canonical_window)
        b_date = req_dict.get("date", date.today().isoformat())

        farmer_data = req_dict.get("farmer", {})
        farmer_name = farmer_data.get("name") or (user.get("name") if user else "Farmer")
        farmer_mobile = farmer_data.get("mobile") or (user.get("mobile") if user else "9812345678")
        farmer_id = farmer_data.get("farmer_id") or (user.get("farmer_id") if user else f"FID-HR-{uuid.uuid4().hex[:5].upper()}")
        user_id = user.get("id") if user else farmer_data.get("id")

        with get_db() as conn:
            cursor = conn.cursor()

            if user_id:
                cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
                if not cursor.fetchone():
                    user_id = None

            # Prevent duplicate active bookings for the same farmer on the same date
            cursor.execute("""
                SELECT * FROM bookings
                WHERE (farmer_mobile = ? OR farmer_id = ?)
                  AND date = ?
                  AND status NOT IN ('CANCELLED', 'PROCURED', 'PAYMENT_CREDITED', 'REJECTED')
            """, (farmer_mobile, farmer_id, b_date))
            existing = row_to_dict(cursor.fetchone())
            if existing:
                return self.get_booking(existing["token_number"])

            # Check Centre existence
            cursor.execute("SELECT * FROM procurement_centres WHERE id = ?", (cid,))
            centre = row_to_dict(cursor.fetchone())
            if not centre:
                cursor.execute("SELECT * FROM procurement_centres LIMIT 1")
                centre = row_to_dict(cursor.fetchone())
                cid = centre["id"]

            # Atomic check on slot capacity
            cursor.execute("""
                SELECT * FROM time_slots
                WHERE centre_id = ? AND date = ? AND time_window = ?
            """, (cid, b_date, canonical_window))
            slot = row_to_dict(cursor.fetchone())

            if slot and slot["booked_count"] >= slot["max_capacity"]:
                # Slot is full, pick next best available slot
                canonical_window = self.find_next_best_slot(cid)
                display_window = format_display_time_window(canonical_window)

            # Generate Token Number & Sequence
            prefix = cid.split("-")[-1].upper()
            cursor.execute("SELECT COUNT(*) as count FROM bookings WHERE centre_id = ?", (cid,))
            existing_count = cursor.fetchone()["count"]
            seq_num = existing_count + 1 + centre.get("current_token", 1)
            token_no = f"#{prefix}-{seq_num}"
            booking_id = f"BK-{prefix}-{datetime.now().strftime('%y%m%d')}-{uuid.uuid4().hex[:4].upper()}"

            crop_data = req_dict.get("crop", {})
            crop_type = crop_data.get("crop_type", "Wheat (गेहूँ)")
            msp = self.crops_msp.get(crop_type, 2425.0)
            qty = float(crop_data.get("estimated_quantity_quintal", 50.0))
            total_val = round(qty * msp, 2)

            now_iso = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

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
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?, 'BOOKED', 'Slot confirmed via Smart Capacity Allocator', ?,
                    NULL, NULL, ?, ?, ?
                )
            """, (
                booking_id, token_no, seq_num, user_id, farmer_id,
                farmer_name, farmer_mobile, farmer_data.get("aadhaar_masked", "XXXX-XXXX-4819"),
                farmer_data.get("village", "Karnal Rural"), farmer_data.get("district", "Karnal"),
                farmer_data.get("state", "Haryana"), farmer_data.get("kcc_number", "KCC-882190"),
                farmer_data.get("bank_name", "State Bank of India"), farmer_data.get("account_masked", "XXXXXX9012"),
                farmer_data.get("ifsc", "SBIN0001234"), cid, centre["name"],
                b_date, canonical_window, display_window, crop_type,
                crop_data.get("variety", "HD-2967 Standard FAQ"), qty, msp, total_val,
                req_dict.get("vehicle_type", "Tractor Trolley"),
                req_dict.get("vehicle_number", f"HR-05-{uuid.uuid4().hex[:4].upper()}"),
                now_iso, farmer_data.get("lat") or centre["lat"], farmer_data.get("lng") or centre["lng"],
                f"KISANQUEUE|TOKEN:{token_no}|FARMER:{farmer_name}|CENTRE:{centre['name']}|QTY:{qty}Q"
            ))

            # Increment slot booked count
            cursor.execute("""
                UPDATE time_slots
                SET booked_count = booked_count + 1,
                    is_available = CASE WHEN (booked_count + 1) < max_capacity THEN 1 ELSE 0 END,
                    congestion_level = CASE
                        WHEN (booked_count + 1) >= max_capacity THEN 'full'
                        WHEN (booked_count + 1) >= (max_capacity * 0.8) THEN 'high'
                        WHEN (booked_count + 1) >= (max_capacity * 0.5) THEN 'medium'
                        ELSE 'low'
                    END
                WHERE centre_id = ? AND date = ? AND time_window = ?
            """, (cid, b_date, canonical_window))

            # Audit Log
            cursor.execute("""
                INSERT INTO audit_logs (id, entity_type, entity_id, action, performed_by, old_status, new_status, notes, created_at)
                VALUES (?, 'BOOKING', ?, 'CREATE_SLOT', ?, NULL, 'BOOKED', ?, ?)
            """, (
                f"AUD-{uuid.uuid4().hex[:6].upper()}", booking_id, farmer_name,
                f"Allocated token {token_no} for slot {display_window}", now_iso
            ))

        # Retrieve saved booking
        booking = self.get_booking(token_no)

        # Dispatch Booking Confirmation SMS
        if booking:
            NotificationService.send_booking_confirmation(booking)

        return booking

    def cancel_booking(self, token_number: str, user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Cancels an active booking where allowed (not arrived/procured),
        frees up slot capacity, records audit trail, and sends Cancellation SMS.
        """
        norm = token_number.upper().strip()
        if not norm.startswith("#"):
            norm = f"#{norm}"

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM bookings WHERE token_number = ? OR id = ?", (norm, token_number))
            booking = row_to_dict(cursor.fetchone())

            if not booking:
                return {"success": False, "message": "Booking not found"}

            if booking["status"] in ["ARRIVED", "WEIGHING_COMPLETED", "QUALITY_VERIFIED", "PROCURED", "PAYMENT_CREDITED"]:
                return {
                    "success": False,
                    "message": f"Cannot cancel booking at stage '{booking['status']}'. Mandi processing has already begun."
                }

            if booking["status"] == "CANCELLED":
                return {"success": True, "message": "Booking is already cancelled", "booking": booking}

            now_iso = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            cursor.execute("""
                UPDATE bookings
                SET status = 'CANCELLED', status_note = 'Cancelled by farmer request'
                WHERE id = ?
            """, (booking["id"],))

            # Free up slot capacity
            cursor.execute("""
                UPDATE time_slots
                SET booked_count = MAX(0, booked_count - 1),
                    is_available = 1,
                    congestion_level = 'low'
                WHERE centre_id = ? AND date = ? AND time_window = ?
            """, (booking["centre_id"], booking["date"], booking["time_window"]))

            # Audit Log
            cursor.execute("""
                INSERT INTO audit_logs (id, entity_type, entity_id, action, performed_by, old_status, new_status, notes, created_at)
                VALUES (?, 'BOOKING', ?, 'CANCEL', ?, 'BOOKED', 'CANCELLED', 'Slot freed up', ?)
            """, (
                f"AUD-{uuid.uuid4().hex[:6].upper()}", booking["id"],
                user.get("name") if user else booking["farmer_name"], now_iso
            ))

        updated = self.get_booking(norm)
        if updated:
            NotificationService.send_booking_cancellation(updated)

        return {"success": True, "message": "Booking cancelled successfully", "booking": updated}

    def recover_slot(self, token_number: str, requested_window: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Missed Slot Dynamic Recovery:
        Finds the next optimal slot without forfeiting farmer's seniority.
        """
        norm = token_number.upper().strip()
        if not norm.startswith("#"):
            norm = f"#{norm}"

        booking = self.get_booking(norm)
        if not booking:
            return None

        cid = booking["centre_id"]
        old_window = booking.get("time_window")

        if requested_window and requested_window.strip():
            new_window = normalize_time_window(requested_window)
        else:
            new_window = self.find_next_best_slot(cid)

        display_win = format_display_time_window(new_window)
        now_iso = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        with get_db() as conn:
            cursor = conn.cursor()

            # Decrement old slot
            cursor.execute("""
                UPDATE time_slots
                SET booked_count = MAX(0, booked_count - 1), is_available = 1
                WHERE centre_id = ? AND date = ? AND time_window = ?
            """, (cid, booking["date"], old_window))

            # Increment new slot
            cursor.execute("""
                UPDATE time_slots
                SET booked_count = booked_count + 1
                WHERE centre_id = ? AND date = ? AND time_window = ?
            """, (cid, booking["date"], new_window))

            # Update booking
            cursor.execute("""
                UPDATE bookings
                SET status = 'BOOKED',
                    time_window = ?,
                    display_time_window = ?,
                    status_note = 'Recovered via Smart Reschedule Engine'
                WHERE id = ?
            """, (new_window, display_win, booking["id"]))

        # Send Reschedule SMS
        NotificationService.send_sms(
            event_type="SLOT_RESCHEDULE",
            idempotency_key=f"RESCHEDULE_{booking['id']}_{new_window}",
            recipient_mobile=booking["farmer_mobile"],
            recipient_name=booking["farmer_name"],
            token_number=norm,
            title="🔄 Missed Slot Recovered / स्लॉट पुनर्बहाल",
            message_text=f"KisanQueue: आपका टोकन {norm} सफलतापूर्वक नए समय {display_win} पर री-शेड्यूल कर दिया गया है।",
            booking_id=booking["id"]
        )

        return self.get_booking(norm)

    def advance_queue(self, centre_id: str) -> Dict[str, Any]:
        """Advances current serving token number for a mandi centre."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM procurement_centres WHERE id = ?", (centre_id,))
            centre = row_to_dict(cursor.fetchone())
            if not centre:
                return {"error": "Centre not found"}

            new_token_seq = centre["current_token"] + 1
            prefix = centre_id.split("-")[-1].upper()
            current_token_no = f"#{prefix}-{new_token_seq}"

            cursor.execute("""
                UPDATE procurement_centres
                SET current_token = ?, serving_token_number = ?
                WHERE id = ?
            """, (new_token_seq, current_token_no, centre_id))

            # Mark serving booking as arrived if booked
            cursor.execute("""
                UPDATE bookings
                SET status = 'ARRIVED', arrived_at = COALESCE(arrived_at, ?)
                WHERE token_number = ?
            """, (datetime.now().strftime("%I:%M %p"), current_token_no))

            # Check waiting bookings at this centre for 5 ahead alert
            cursor.execute("SELECT * FROM bookings WHERE centre_id = ? AND status = 'BOOKED'", (centre_id,))
            waiting = rows_to_list(cursor.fetchall())

            for b in waiting:
                ahead = b["token_sequence"] - new_token_seq
                if ahead == 5:
                    NotificationService.send_sms(
                        event_type="QUEUE_ALERT",
                        idempotency_key=f"QUEUE_5AHEAD_{b['id']}_{new_token_seq}",
                        recipient_mobile=b["farmer_mobile"],
                        recipient_name=b["farmer_name"],
                        token_number=b["token_number"],
                        title="🔔 Only 5 Farmers Ahead!",
                        message_text=f"अलर्ट: केवल 5 किसान आपकी बारी से आगे हैं। कृपया केंद्र {centre['name']} के मुख्य गेट पर पहुँचें।",
                        booking_id=b["id"]
                    )
                elif ahead == 0:
                    NotificationService.send_sms(
                        event_type="TURN_ACTIVE",
                        idempotency_key=f"TURN_ACTIVE_{b['id']}_{new_token_seq}",
                        recipient_mobile=b["farmer_mobile"],
                        recipient_name=b["farmer_name"],
                        token_number=b["token_number"],
                        title="🚨 Please reach Weighbridge!",
                        message_text=f"सूचना: आपका टोकन {b['token_number']} अब सक्रिय है! कृपया धर्मकांटा / वेइंग काउंटर पर उपस्थित हों।",
                        booking_id=b["id"]
                    )

            return {
                "centre_id": centre_id,
                "current_token": new_token_seq,
                "serving_token_number": current_token_no
            }

    def add_complaint(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Registers a farmer grievance complaint."""
        cid = f"CMP-{datetime.now().strftime('%y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
        now_iso = datetime.now().strftime("%Y-%m-%d %I:%M %p")
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO complaints (
                    id, complaint_id, farmer_mobile, farmer_name,
                    token_number, category, description, status,
                    assigned_to, resolution_eta, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', 'Mandi Secretary Officer', 'Within 2 Hours', ?)
            """, (
                cid, cid, data.get("mobile", "9812345678"), data.get("name", "Farmer"),
                (data.get("token_number") or "").upper(), data.get("category", "Queue Delay"),
                data.get("description", ""), now_iso
            ))
            cursor.execute("SELECT * FROM complaints WHERE id = ?", (cid,))
            return row_to_dict(cursor.fetchone())

    def register_gate_entry(
        self,
        booking_id_or_token: str,
        gate_number: str = "Gate-1",
        vehicle_number: Optional[str] = None,
        driver_name: Optional[str] = None,
        operator_id: Optional[str] = "usr-operator",
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Registers physical arrival at Mandi Gate, generates official Gate Entry ID (GE-{centre}-{date}-{seq}),
        transitions booking status from BOOKED to ARRIVED, and dispatches Gate Entry SMS.
        """
        booking = self.get_booking(booking_id_or_token)
        if not booking:
            return {"success": False, "message": f"Booking not found for '{booking_id_or_token}'"}

        cid = booking["centre_id"]
        token_no = booking["token_number"]
        now = datetime.now()
        today_str = now.strftime("%Y%m%d")
        now_iso = now.strftime("%Y-%m-%d %H:%M:%S")
        prefix = cid.split("-")[-1].upper()

        with get_db() as conn:
            cursor = conn.cursor()

            # Check if gate entry already exists for this booking
            cursor.execute("SELECT * FROM gate_entries WHERE booking_id = ?", (booking["id"],))
            existing_ge = row_to_dict(cursor.fetchone())
            if existing_ge:
                return {
                    "success": True,
                    "message": f"Gate entry already registered: {existing_ge['gate_entry_number']}",
                    "gate_entry_number": existing_ge["gate_entry_number"],
                    "gate_entry": existing_ge,
                    "booking": booking
                }

            # Sequence number for today
            cursor.execute("""
                SELECT COUNT(*) as count FROM gate_entries
                WHERE centre_id = ? AND entry_time LIKE ?
            """, (cid, f"{now.strftime('%Y-%m-%d')}%"))
            seq_num = cursor.fetchone()["count"] + 1

            ge_number = f"GE-{prefix}-{today_str}-{seq_num:03d}"
            ge_id = f"ge-{uuid.uuid4().hex[:8]}"
            v_num = (vehicle_number or booking.get("vehicle_number") or f"HR-05-{uuid.uuid4().hex[:4].upper()}").strip().upper()
            d_name = (driver_name or booking.get("farmer_name", "Farmer")).strip()

            cursor.execute("""
                INSERT INTO gate_entries (
                    id, gate_entry_number, booking_id, token_number, centre_id,
                    gate_number, vehicle_number, driver_name, entry_time,
                    operator_id, status, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'IN_QUEUE', ?)
            """, (
                ge_id, ge_number, booking["id"], token_no, cid,
                gate_number, v_num, d_name, now_iso,
                operator_id or "usr-operator", notes or "Gate physical arrival verified"
            ))

            # Update booking status to ARRIVED with gate entry metadata
            cursor.execute("""
                UPDATE bookings
                SET status = 'ARRIVED',
                    gate_entry_id = ?,
                    gate_number = ?,
                    arrived_at = COALESCE(arrived_at, ?),
                    vehicle_number = ?,
                    status_note = 'Arrived at Mandi Gate. Gate pass issued.'
                WHERE id = ?
            """, (ge_number, gate_number, now.strftime("%I:%M %p"), v_num, booking["id"]))

            # Audit log
            cursor.execute("""
                INSERT INTO audit_logs (id, entity_type, entity_id, action, performed_by, old_status, new_status, notes, created_at)
                VALUES (?, 'GATE_ENTRY', ?, 'REGISTER', ?, 'BOOKED', 'ARRIVED', ?, ?)
            """, (
                f"AUD-{uuid.uuid4().hex[:6].upper()}", ge_id,
                operator_id or "Gate Operator",
                f"Issued Gate Pass {ge_number} at {gate_number} for {token_no}", now_iso
            ))

            cursor.execute("SELECT * FROM gate_entries WHERE id = ?", (ge_id,))
            ge_record = row_to_dict(cursor.fetchone())

        updated_booking = self.get_booking(token_no)

        # Dispatch Gate Entry Confirmation SMS
        NotificationService.send_sms(
            event_type="GATE_ARRIVAL",
            idempotency_key=f"GATE_ARRIVAL_{booking['id']}",
            recipient_mobile=booking["farmer_mobile"],
            recipient_name=booking["farmer_name"],
            token_number=token_no,
            title="🚚 Gate Entry Registered / गेट प्रवेश दर्ज",
            message_text=f"[DEMO SMS] KisanQueue: गेट प्रवेश दर्ज! टोकन {token_no}, गेट पास {ge_number}, {gate_number}। कृपया वेइंग लेन में प्रतीक्षा करें।",
            booking_id=booking["id"]
        )

        return {
            "success": True,
            "message": f"Gate entry {ge_number} registered successfully",
            "gate_entry_number": ge_number,
            "gate_entry": ge_record,
            "booking": updated_booking
        }

    def get_crop_centres_availability(
        self,
        crop_type: Optional[str] = None,
        target_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Queries all procurement centres accepting the requested crop on the given date,
        calculates live capacity metrics (total, booked, remaining, wait time, load %),
        and provides an algorithmic Best Available Option recommendation.
        """
        t_date = target_date or date.today().isoformat()
        centres = self.get_centres()
        results = []

        with get_db() as conn:
            cursor = conn.cursor()

            for c in centres:
                crops_accepted = c.get("crops_accepted", [])
                accepts = True
                if crop_type and crop_type.strip():
                    ct_norm = crop_type.lower().strip()
                    accepts = any(ct_norm in cp.lower() or cp.lower() in ct_norm for cp in crops_accepted)

                slots = self.get_slots(c["id"], t_date)
                total_slots = sum(s["max_capacity"] for s in slots) if slots else 120
                booked_slots = sum(s["booked_count"] for s in slots) if slots else 0
                remaining_slots = max(0, total_slots - booked_slots)
                load_pct = min(100, round((booked_slots / max(1, total_slots)) * 100))

                cursor.execute("""
                    SELECT COUNT(*) as qcnt FROM bookings
                    WHERE centre_id = ? AND date = ? AND status NOT IN ('CANCELLED', 'REJECTED')
                """, (c["id"], t_date))
                queue_len = cursor.fetchone()["qcnt"]

                active_counters = c.get("active_counters", 3)
                avg_proc = c.get("avg_processing_time_min", 12)
                est_wait = max(8, round((queue_len * avg_proc) / max(1, active_counters)))

                st = "red" if load_pct >= 80 else ("yellow" if load_pct >= 50 else "green")

                results.append({
                    "centre_id": c["id"],
                    "centre_name": c["name"],
                    "code": c["code"],
                    "district": c["district"],
                    "address": c["address"],
                    "lat": c["lat"],
                    "lng": c["lng"],
                    "distance_km": c.get("distance_km", 0.0),
                    "crops_accepted": crops_accepted,
                    "accepts_selected_crop": accepts,
                    "total_capacity_slots": total_slots,
                    "booked_slots": booked_slots,
                    "remaining_slots": remaining_slots,
                    "load_percentage": load_pct,
                    "status": st,
                    "queue_length": queue_len,
                    "active_counters": active_counters,
                    "estimated_wait_time_minutes": est_wait,
                    "gate_entry": c.get("gate_entry", "Main Gate 1"),
                    "route_tips": c.get("route_tips", ""),
                    "contact_phone": c.get("contact_phone", "0184-2250100")
                })

        # Calculate Best Recommended Centre
        eligible = [r for r in results if r["accepts_selected_crop"] and r["remaining_slots"] > 0]
        if not eligible:
            eligible = [r for r in results if r["accepts_selected_crop"]]
        if not eligible:
            eligible = results

        # Rank by lowest load %, then shortest wait time
        best = min(eligible, key=lambda x: (x["load_percentage"], x["estimated_wait_time_minutes"]))
        recommendation = {
            "centre_id": best["centre_id"],
            "centre_name": best["centre_name"],
            "load_percentage": best["load_percentage"],
            "estimated_wait_time_minutes": best["estimated_wait_time_minutes"],
            "remaining_slots": best["remaining_slots"],
            "reason": f"न्यूनतम कतार भार ({best['load_percentage']}%) एवं मात्र {best['estimated_wait_time_minutes']} मिनट प्रतीक्षा समय — सबसे त्वरित खरीद!"
        }

        return {
            "status": "success",
            "date": t_date,
            "crop_type": crop_type or "All Crops",
            "total_centres": len(results),
            "centres": results,
            "best_option": recommendation
        }

    def get_daily_centre_schedule(self, target_date: Optional[str] = None) -> Dict[str, Any]:
        """Returns crop schedules, operating hours, and counter allocation per Mandi centre."""
        t_date = target_date or date.today().isoformat()
        avail = self.get_crop_centres_availability(target_date=t_date)
        centres = avail.get("centres", [])

        schedules = []
        for c in centres:
            schedules.append({
                "centre_id": c["centre_id"],
                "centre_name": c["centre_name"],
                "operating_hours": "08:00 AM - 05:00 PM",
                "lunch_break": "01:00 PM - 02:00 PM",
                "crops_scheduled": c["crops_accepted"],
                "active_counters": c["active_counters"],
                "daily_capacity_slots": c["total_capacity_slots"],
                "booked_slots": c["booked_slots"],
                "open_slots": c["remaining_slots"],
                "load_percentage": c["load_percentage"],
                "status": c["status"],
                "gate_entry": c["gate_entry"],
                "route_tips": c["route_tips"]
            })

        return {
            "status": "success",
            "date": t_date,
            "total_centres": len(schedules),
            "schedules": schedules
        }

    def get_operator_queue(self, centre_id: str, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieves real-time in-queue farmer bookings for a specific Mandi centre terminal."""
        with get_db() as conn:
            cursor = conn.cursor()
            query = """
                SELECT * FROM bookings
                WHERE centre_id = ?
            """
            params: List[Any] = [centre_id]

            if status_filter:
                query += " AND status = ?"
                params.append(status_filter)
            else:
                query += " AND status NOT IN ('CANCELLED', 'REJECTED')"

            query += """
                ORDER BY 
                    CASE 
                        WHEN status = 'ARRIVED' THEN 1
                        WHEN status = 'WEIGHING_COMPLETED' THEN 2
                        WHEN status = 'QUALITY_VERIFIED' THEN 3
                        WHEN status = 'BOOKED' THEN 4
                        ELSE 5
                    END,
                    token_sequence ASC
            """
            cursor.execute(query, params)
            bookings = rows_to_list(cursor.fetchall())

            for b in bookings:
                cursor.execute("SELECT * FROM weighbridge_records WHERE booking_id = ?", (b["id"],))
                b["weighbridge"] = row_to_dict(cursor.fetchone())

                cursor.execute("SELECT * FROM quality_inspections WHERE booking_id = ?", (b["id"],))
                b["quality"] = row_to_dict(cursor.fetchone())

                cursor.execute("SELECT * FROM payments WHERE booking_id = ?", (b["id"],))
                b["payment"] = row_to_dict(cursor.fetchone())

                cursor.execute("SELECT * FROM gate_entries WHERE booking_id = ? ORDER BY entry_time DESC LIMIT 1", (b["id"],))
                b["gate_entry"] = row_to_dict(cursor.fetchone())

            return bookings


# Global Singleton Store instance
db = DataStore()
