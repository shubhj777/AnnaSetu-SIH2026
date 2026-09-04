"""
KisanQueue In-Memory Data Store & Seed Database
Provides realistic Indian Mandi test data, pre-seeded farmer bookings, and queue state.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, date, timedelta
import uuid
import re


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
        self.centres: Dict[str, Dict[str, Any]] = {}
        self.slots: Dict[str, List[Dict[str, Any]]] = {}
        self.bookings: Dict[str, Dict[str, Any]] = {}
        self.sms_logs: List[Dict[str, Any]] = []
        self.complaints: List[Dict[str, Any]] = []
        self.crops_msp: Dict[str, float] = {
            "Wheat (गेहूँ)": 2425.0,
            "Paddy / Rice (धान)": 2320.0,
            "Mustard / Sarson (सरसों)": 5950.0,
            "Gram / Chana (चना)": 5650.0,
            "Maize (मक्का)": 2225.0,
            "Barley (जौ)": 1980.0
        }
        self._seed_initial_data()

    def _seed_initial_data(self):
        today_str = date.today().isoformat()
        
        # 1. Seed Procurement Centres with navigation instructions & route guidance
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
                "current_load_percentage": 92,  # RED - High load
                "status": "red",
                "active_counters": 3,
                "avg_processing_time_min": 12,
                "current_token": 37,
                "serving_token_number": "#A-37",
                "address": "GT Road, Near Railway Overbridge, Karnal, Haryana 132001",
                "gate_entry": "Gate 1 (North Weighbridge Entrance)",
                "route_tips": "Take NH44 towards GT Road Flyover, turn right at Anaj Mandi Chowk. Dedicated tractor lane is active on Gate 1.",
                "contact_phone": "+91 184 2259101",
                "crops_accepted": ["Wheat (गेहूँ)", "Paddy / Rice (धान)", "Mustard / Sarson (सरसों)"]
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
                "current_load_percentage": 42,  # GREEN - Recommended alternative
                "status": "green",
                "active_counters": 3,
                "avg_processing_time_min": 10,
                "current_token": 18,
                "serving_token_number": "#B-18",
                "address": "Station Road, Nilokheri, Karnal, Haryana 132117",
                "gate_entry": "Gate 2 (Sub-Mandi Main Weighbridge)",
                "route_tips": "Via State Highway 8. Smooth traffic flow, ample parking near weighbridge.",
                "contact_phone": "+91 184 2468200",
                "crops_accepted": ["Wheat (गेहूँ)", "Paddy / Rice (धान)", "Gram / Chana (चना)"]
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
                "current_load_percentage": 28,  # GREEN - Low load
                "status": "green",
                "active_counters": 2,
                "avg_processing_time_min": 9,
                "current_token": 12,
                "serving_token_number": "#C-12",
                "address": "Indri-Ladwa Highway, Indri, Karnal, Haryana 132041",
                "gate_entry": "Main Procurement Yard Gate",
                "route_tips": "Via Karnal-Indri Road. Low traffic, fastest quality assay clearance.",
                "contact_phone": "+91 184 2381200",
                "crops_accepted": ["Wheat (गेहूँ)", "Mustard / Sarson (सरसों)", "Maize (मक्का)"]
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
                "current_load_percentage": 68,  # YELLOW - Moderate load
                "status": "yellow",
                "active_counters": 3,
                "avg_processing_time_min": 11,
                "current_token": 25,
                "serving_token_number": "#D-25",
                "address": "National Highway 44, Gharaunda, Haryana 132114",
                "gate_entry": "Gate 1 & Gate 3",
                "route_tips": "Direct access from NH44 Service Lane south of Karnal.",
                "contact_phone": "+91 184 2511400",
                "crops_accepted": ["Wheat (गेहूँ)", "Paddy / Rice (धान)", "Mustard / Sarson (सरसों)"]
            }
        ]
        
        for c in centres_data:
            self.centres[c["id"]] = c

        # 2. Canonical 24-hour time slots
        windows = [
            ("08:00 - 09:00", 12, 10, "high"),
            ("09:00 - 10:00", 12, 12, "full"),
            ("10:00 - 11:00", 15, 14, "high"),
            ("11:00 - 12:00", 15, 8, "medium"),
            ("12:00 - 13:00", 15, 6, "low"),
            ("13:00 - 14:00", 10, 3, "low"),
            ("14:00 - 15:00", 15, 9, "medium"),
            ("15:00 - 16:00", 12, 5, "low"),
            ("16:00 - 17:00", 10, 2, "low")
        ]

        for cid in self.centres.keys():
            self.slots[cid] = []
            for idx, (win, cap, booked, cong) in enumerate(windows):
                slot_id = f"{cid}-slot-{idx+1}"
                actual_booked = booked if cid == "centre-a" else max(1, booked // 2)
                is_avail = (actual_booked < cap)
                actual_cong = cong if cid == "centre-a" else ("low" if actual_booked < cap * 0.6 else "medium")
                self.slots[cid].append({
                    "id": slot_id,
                    "centre_id": cid,
                    "date": today_str,
                    "time_window": win,
                    "display_time_window": format_display_time_window(win),
                    "max_capacity": cap,
                    "booked_count": actual_booked,
                    "is_available": is_avail,
                    "congestion_level": "full" if not is_avail else actual_cong
                })

        # 3. Seed Demo Hero Farmer Ramesh Kumar with Token #A-52 at Centre A
        demo_booking = {
            "booking_id": "BK-KNL-2026-0881",
            "token_number": "#A-52",
            "token_sequence": 52,
            "farmer_id": "FID-HR-78921",
            "farmer_name": "Ramesh Kumar (रमेश कुमार)",
            "farmer_mobile": "9812345678",
            "aadhaar_masked": "XXXX-XXXX-4819",
            "village": "Taraori ABC (गाँव ताराओड़ी)",
            "district": "Karnal (करनाल)",
            "state": "Haryana",
            "kcc_number": "KCC-882190",
            "bank_name": "State Bank of India",
            "account_masked": "XXXXXX9012",
            "ifsc": "SBIN0001234",
            "centre_id": "centre-a",
            "centre_name": "Centre A - Grain Market Karnal",
            "date": today_str,
            "time_window": "10:00 - 11:00",
            "display_time_window": "10:00 - 11:00 AM",
            "crop_type": "Wheat (गेहूँ)",
            "variety": "HD-2967 (Sharbati Gold)",
            "quantity_quintal": 50.0,
            "msp_rate_per_quintal": 2425.0,
            "total_estimated_value": 50.0 * 2425.0,
            "vehicle_type": "Tractor Trolley",
            "vehicle_number": "HR-05-AB-7821",
            "status": "BOOKED",
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "qr_payload": "KISANQUEUE|TOKEN:#A-52|FARMER:Ramesh Kumar|CENTRE:Centre A|CROP:Wheat|QTY:50Q",
            "estimated_arrival": "10:15 AM",
            "estimated_wait_time_minutes": 47,
            "weighbridge": None,
            "quality": None,
            "payment": None
        }
        self.bookings["#A-52"] = demo_booking

        # Pre-seed SMS Logs
        self.sms_logs.append({
            "id": "SMS-101",
            "recipient_mobile": "9812345678",
            "farmer_name": "Ramesh Kumar",
            "token_number": "#A-52",
            "category": "BOOKING_CONFIRMATION",
            "title": "🌾 Slot Confirmed / स्लॉट पुष्टिकरण",
            "message_text": "किसान रमेश कुमार, आपका टोकन #A-52 दिनांक आज 10:00-11:00 AM केंद्र A अनाज मंडी करनाल के लिए बुक हो गया है। फसल: गेहूँ (50 क्विंटल)।",
            "timestamp": "08:15 AM",
            "is_read": False,
            "sent_via": "KisanSMS-GovPush"
        })
        self.sms_logs.append({
            "id": "SMS-102",
            "recipient_mobile": "9812345678",
            "farmer_name": "Ramesh Kumar",
            "token_number": "#A-52",
            "category": "QUEUE_ALERT",
            "title": "🔔 Queue Status Update",
            "message_text": "Centre A currently serving Token #A-37. You have 15 farmers ahead. Estimated wait time: 47 mins. You may wait at home or head to centre.",
            "timestamp": "09:45 AM",
            "is_read": False,
            "sent_via": "KisanSMS-GovPush"
        })

    def get_centres(self) -> List[Dict[str, Any]]:
        for cid, centre in self.centres.items():
            slots = self.slots.get(cid, [])
            if slots:
                total_cap = sum(s["max_capacity"] for s in slots)
                total_booked = sum(s["booked_count"] for s in slots)
                load_pct = min(100, round((total_booked / max(1, total_cap)) * 100))
                centre["current_load_percentage"] = load_pct
                centre["status"] = "red" if load_pct >= 80 else ("yellow" if load_pct >= 55 else "green")
        return list(self.centres.values())

    def get_centre(self, centre_id: str) -> Optional[Dict[str, Any]]:
        return self.centres.get(centre_id)

    def get_slots(self, centre_id: str) -> List[Dict[str, Any]]:
        return self.slots.get(centre_id, [])

    def find_next_best_slot(self, centre_id: str) -> str:
        """Finds next available slot with lowest current congestion/load."""
        slots = self.slots.get(centre_id, [])
        avail_slots = [s for s in slots if s.get("is_available", True)]
        if avail_slots:
            best = min(avail_slots, key=lambda s: s.get("booked_count", 0))
            return best["time_window"]
        return "12:00 - 13:00"

    def get_booking(self, token_number: str) -> Optional[Dict[str, Any]]:
        norm = token_number.upper().strip()
        if not norm.startswith("#"):
            norm = f"#{norm}"
        return self.bookings.get(norm)

    def create_booking(self, req_dict: Dict[str, Any]) -> Dict[str, Any]:
        cid = req_dict["centre_id"]
        centre = self.centres.get(cid, self.centres["centre-a"])
        
        farmer_id = req_dict.get("farmer", {}).get("farmer_id")
        farmer_mobile = req_dict.get("farmer", {}).get("mobile")
        b_date = req_dict.get("date", date.today().isoformat())

        # Prevent duplicate active bookings for the same farmer on the same date
        for existing in self.bookings.values():
            if (existing.get("farmer_id") == farmer_id or existing.get("farmer_mobile") == farmer_mobile) and existing.get("date") == b_date and existing.get("status") not in ["CANCELLED", "PROCURED", "PAYMENT_CREDITED"]:
                return existing  # Return existing confirmed slot seamlessly

        prefix = cid.split("-")[-1].upper()
        existing_count = len([b for b in self.bookings.values() if b["centre_id"] == cid])
        seq_num = existing_count + 1 + centre.get("current_token", 1)
        token_no = f"#{prefix}-{seq_num}"

        crop_type = req_dict.get("crop", {}).get("crop_type", "Wheat (गेहूँ)")
        msp = self.crops_msp.get(crop_type, 2425.0)
        qty = float(req_dict.get("crop", {}).get("estimated_quantity_quintal", 50.0))

        raw_window = req_dict.get("time_window", "10:00 - 11:00")
        canonical_window = normalize_time_window(raw_window)
        display_window = format_display_time_window(canonical_window)

        booking = {
            "booking_id": f"BK-{prefix}-{uuid.uuid4().hex[:6].upper()}",
            "token_number": token_no,
            "token_sequence": seq_num,
            "farmer_id": farmer_id or f"FID-{uuid.uuid4().hex[:5].upper()}",
            "farmer_name": req_dict.get("farmer", {}).get("name", "Farmer"),
            "farmer_mobile": farmer_mobile or "9800000000",
            "aadhaar_masked": req_dict.get("farmer", {}).get("aadhaar_masked", "XXXX-XXXX-1234"),
            "village": req_dict.get("farmer", {}).get("village", "Karnal Rural"),
            "district": req_dict.get("farmer", {}).get("district", "Karnal"),
            "state": "Haryana",
            "kcc_number": req_dict.get("farmer", {}).get("kcc_number", "KCC-552140"),
            "bank_name": req_dict.get("farmer", {}).get("bank_name", "State Bank of India"),
            "account_masked": req_dict.get("farmer", {}).get("account_masked", "XXXXXX4411"),
            "ifsc": req_dict.get("farmer", {}).get("ifsc", "SBIN0001234"),
            "centre_id": cid,
            "centre_name": centre["name"],
            "date": b_date,
            "time_window": canonical_window,
            "display_time_window": display_window,
            "crop_type": crop_type,
            "variety": req_dict.get("crop", {}).get("variety", "Standard FAQ Grade"),
            "quantity_quintal": qty,
            "msp_rate_per_quintal": msp,
            "total_estimated_value": round(qty * msp, 2),
            "vehicle_type": req_dict.get("vehicle_type", "Tractor Trolley"),
            "vehicle_number": req_dict.get("vehicle_number", f"HR-05-AB-{uuid.uuid4().hex[:4].upper()}"),
            "status": "BOOKED",
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "qr_payload": f"KISANQUEUE|TOKEN:{token_no}|FARMER:{req_dict.get('farmer', {}).get('name')}|CENTRE:{centre['name']}|QTY:{qty}Q",
            "estimated_arrival": f"{canonical_window.split('-')[0].strip()} AM" if int(canonical_window.split(':')[0]) < 12 else f"{canonical_window.split('-')[0].strip()} PM",
            "estimated_wait_time_minutes": max(10, (seq_num - centre.get("current_token", 1)) * 10),
            "weighbridge": None,
            "quality": None,
            "payment": None
        }

        self.bookings[token_no] = booking

        for slot in self.slots.get(cid, []):
            if slot["time_window"] == canonical_window:
                slot["booked_count"] += 1
                slot["is_available"] = slot["booked_count"] < slot["max_capacity"]
                slot["congestion_level"] = "full" if not slot["is_available"] else ("high" if slot["booked_count"] >= slot["max_capacity"] * 0.8 else ("medium" if slot["booked_count"] >= slot["max_capacity"] * 0.5 else "low"))
                break

        self.sms_logs.append({
            "id": f"SMS-{uuid.uuid4().hex[:4].upper()}",
            "recipient_mobile": booking["farmer_mobile"],
            "farmer_name": booking["farmer_name"],
            "token_number": token_no,
            "category": "BOOKING_CONFIRMATION",
            "title": "🌾 Booking Confirmed / टोकन पुष्टिकरण",
            "message_text": f"KisanQueue: आपका टोकन {token_no} सफलतापूर्वक बुक हो गया है ({centre['name']}, समय: {display_window})। कृपया समय पर पहुँचें।",
            "timestamp": datetime.now().strftime("%I:%M %p"),
            "is_read": False,
            "sent_via": "KisanSMS-GovPush"
        })

        return booking

    def recover_slot(self, token_number: str, requested_window: Optional[str] = None) -> Optional[Dict[str, Any]]:
        norm = token_number.upper().strip()
        if not norm.startswith("#"):
            norm = f"#{norm}"
        booking = self.bookings.get(norm)
        if not booking:
            return None

        cid = booking["centre_id"]
        old_window = booking.get("time_window")
        
        if requested_window and requested_window.strip():
            new_window = normalize_time_window(requested_window)
        else:
            new_window = self.find_next_best_slot(cid)

        for slot in self.slots.get(cid, []):
            if slot["time_window"] == old_window and slot["booked_count"] > 0:
                slot["booked_count"] -= 1
                slot["is_available"] = True
                break

        for slot in self.slots.get(cid, []):
            if slot["time_window"] == new_window:
                slot["booked_count"] += 1
                slot["is_available"] = slot["booked_count"] < slot["max_capacity"]
                break

        display_win = format_display_time_window(new_window)
        booking["status"] = "BOOKED"
        booking["time_window"] = new_window
        booking["display_time_window"] = display_win
        booking["status_note"] = "Recovered via Smart Reschedule Engine"

        self.sms_logs.append({
            "id": f"SMS-REC-{datetime.now().strftime('%M%S')}",
            "recipient_mobile": booking["farmer_mobile"],
            "farmer_name": booking["farmer_name"],
            "token_number": norm,
            "category": "SLOT_RESCHEDULE",
            "title": "🔄 Missed Slot Recovered",
            "message_text": f"KisanQueue: आपका टोकन {norm} सफलतापूर्वक नए समय {display_win} पर री-शेड्यूल कर दिया गया है।",
            "timestamp": datetime.now().strftime("%I:%M %p"),
            "is_read": False,
            "sent_via": "KisanSMS-GovPush"
        })

        return booking

    def advance_queue(self, centre_id: str) -> Dict[str, Any]:
        centre = self.centres.get(centre_id)
        if not centre:
            return {"error": "Centre not found"}
        
        centre["current_token"] += 1
        prefix = centre_id.split("-")[-1].upper()
        current_token_no = f"#{prefix}-{centre['current_token']}"
        centre["serving_token_number"] = current_token_no

        if current_token_no in self.bookings:
            self.bookings[current_token_no]["status"] = "ARRIVED"

        for token_no, b in self.bookings.items():
            if b["centre_id"] == centre_id:
                ahead = b["token_sequence"] - centre["current_token"]
                if ahead == 5:
                    self.sms_logs.append({
                        "id": f"SMS-{uuid.uuid4().hex[:4].upper()}",
                        "recipient_mobile": b["farmer_mobile"],
                        "farmer_name": b["farmer_name"],
                        "token_number": token_no,
                        "category": "QUEUE_ALERT",
                        "title": "🔔 Only 5 Farmers Ahead!",
                        "message_text": f"अलर्ट: केवल 5 किसान आपकी बारी से आगे हैं। कृपया केंद्र {centre['name']} के मुख्य गेट पर पहुँचें।",
                        "timestamp": datetime.now().strftime("%I:%M %p"),
                        "is_read": False,
                        "sent_via": "KisanSMS-GovPush"
                    })
                elif ahead == 0:
                    self.sms_logs.append({
                        "id": f"SMS-{uuid.uuid4().hex[:4].upper()}",
                        "recipient_mobile": b["farmer_mobile"],
                        "farmer_name": b["farmer_name"],
                        "token_number": token_no,
                        "category": "TURN_ACTIVE",
                        "title": "🚨 Please reach Weighbridge!",
                        "message_text": f"सूचना: आपका टोकन {token_no} अब सक्रिय है! कृपया धर्मकांटा / वेइंग काउंटर पर उपस्थित हों।",
                        "timestamp": datetime.now().strftime("%I:%M %p"),
                        "is_read": False,
                        "sent_via": "KisanSMS-GovPush"
                    })

        return {
            "centre_id": centre_id,
            "current_token": centre["current_token"],
            "serving_token_number": current_token_no
        }

    def add_complaint(self, data: Dict[str, Any]) -> Dict[str, Any]:
        cid = f"CMP-{datetime.now().strftime('%y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
        record = {
            "complaint_id": cid,
            "farmer_mobile": data.get("mobile", "9812345678"),
            "farmer_name": data.get("name", "Farmer"),
            "token_number": (data.get("token_number") or "").upper(),
            "category": data.get("category", "Queue Delay"),
            "description": data.get("description", ""),
            "status": "SUBMITTED",
            "assigned_to": "Mandi Secretary Officer",
            "resolution_eta": "Within 2 Hours",
            "timestamp": datetime.now().strftime("%Y-%m-%d %I:%M %p")
        }
        self.complaints.append(record)
        return record


# Global Singleton Store instance
db = DataStore()
