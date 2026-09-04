"""
KisanQueue In-Memory Data Store & Seed Database
Provides realistic Indian Mandi test data, pre-seeded farmer bookings, and queue state.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, date, timedelta
import uuid


class DataStore:
    def __init__(self):
        self.centres: Dict[str, Dict[str, Any]] = {}
        self.slots: Dict[str, List[Dict[str, Any]]] = {}
        self.bookings: Dict[str, Dict[str, Any]] = {}
        self.sms_logs: List[Dict[str, Any]] = []
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
        tomorrow_str = (date.today() + timedelta(days=1)).isoformat()
        
        # 1. Seed Procurement Centres
        centres_data = [
            {
                "id": "centre-a",
                "name": "Centre A - Grain Market Karnal (मुख्य अनाज मंडी करनाल)",
                "code": "KNL-MND-01",
                "district": "Karnal",
                "state": "Haryana",
                "lat": 29.6857,
                "lng": 76.9905,
                "total_daily_capacity": 100,
                "current_load_percentage": 92,  # RED - High load as in user prompt
                "status": "red",
                "active_counters": 3,
                "avg_processing_time_min": 12,
                "current_token": 37,
                "serving_token_number": "#A-37",
                "address": "GT Road, Near Railway Overbridge, Karnal, Haryana 132001",
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
                "total_daily_capacity": 80,
                "current_load_percentage": 42,  # GREEN - Recommended alternative (7 km)
                "status": "green",
                "active_counters": 3,
                "avg_processing_time_min": 10,
                "current_token": 18,
                "serving_token_number": "#B-18",
                "address": "Station Road, Nilokheri, Karnal, Haryana 132117",
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
                "total_daily_capacity": 75,
                "current_load_percentage": 28,  # GREEN - Low load (12 km)
                "status": "green",
                "active_counters": 2,
                "avg_processing_time_min": 9,
                "current_token": 12,
                "serving_token_number": "#C-12",
                "address": "Indri-Ladwa Highway, Indri, Karnal, Haryana 132041",
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
                "total_daily_capacity": 90,
                "current_load_percentage": 68,  # YELLOW - Moderate load
                "status": "yellow",
                "active_counters": 3,
                "avg_processing_time_min": 11,
                "current_token": 25,
                "serving_token_number": "#D-25",
                "address": "National Highway 44, Gharaunda, Haryana 132114",
                "contact_phone": "+91 184 2511400",
                "crops_accepted": ["Wheat (गेहूँ)", "Paddy / Rice (धान)", "Mustard / Sarson (सरसों)"]
            }
        ]
        
        for c in centres_data:
            self.centres[c["id"]] = c

        # 2. Seed Time Slots for each centre
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
                is_avail = (booked < cap)
                self.slots[cid].append({
                    "id": slot_id,
                    "centre_id": cid,
                    "date": today_str,
                    "time_window": win,
                    "max_capacity": cap,
                    "booked_count": booked if cid == "centre-a" else max(1, booked // 2),
                    "is_available": is_avail,
                    "congestion_level": cong if cid == "centre-a" else "low"
                })

        # 3. Seed Demo Hero Farmer Ramesh Kumar with Token #A-52 at Centre A (matching user prompt!)
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
            "crop_type": "Wheat (गेहूँ)",
            "variety": "HD-2967 (Sharbati Gold)",
            "quantity_quintal": 50.0,
            "msp_rate_per_quintal": 2425.0,
            "total_estimated_value": 50.0 * 2425.0,
            "vehicle_type": "Tractor Trolley",
            "status": "BOOKED",
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "qr_payload": "KISANQUEUE|TOKEN:#A-52|FARMER:Ramesh Kumar|CENTRE:Centre A|CROP:Wheat|QTY:50Q",
            "estimated_arrival": "10:15 AM",
            "estimated_wait_time_minutes": 47,  # User's exact prompt demo!
            "weighbridge": None,
            "quality": None,
            "payment": None
        }
        self.bookings["#A-52"] = demo_booking

        # Pre-seed SMS Log
        self.sms_logs.append({
            "id": "SMS-101",
            "recipient_mobile": "9812345678",
            "farmer_name": "Ramesh Kumar",
            "token_number": "#A-52",
            "category": "BOOKING_CONFIRMATION",
            "title": "🌾 Slot Confirmed / स्लॉट पुष्टिकरण",
            "message_text": "किसान रमेश कुमार, आपका टोकन #A-52 दिनांक आज 10:00-11:00 AM केंद्र A अनाज मंडी करनाल के लिए बुक हो गया है। फसल: गेहूँ (50 क्विंटल)।",
            "timestamp": "08:15 AM",
            "sent_via": "KisanSMS-GovPush"
        })
        self.sms_logs.append({
            "id": "SMS-102",
            "recipient_mobile": "9812345678",
            "farmer_name": "Ramesh Kumar",
            "token_number": "#A-52",
            "category": "QUEUE_ALERT",
            "title": "🔔 Queue Status Update",
            "message_text": "Centre A currently serving Token #37. You have 15 farmers ahead. Estimated wait time: 47 mins. You may wait at home or head to centre.",
            "timestamp": "09:45 AM",
            "sent_via": "KisanSMS-GovPush"
        })

    def get_centres(self) -> List[Dict[str, Any]]:
        return list(self.centres.values())

    def get_centre(self, centre_id: str) -> Optional[Dict[str, Any]]:
        return self.centres.get(centre_id)

    def get_slots(self, centre_id: str) -> List[Dict[str, Any]]:
        return self.slots.get(centre_id, [])

    def get_booking(self, token_number: str) -> Optional[Dict[str, Any]]:
        return self.bookings.get(token_number)

    def create_booking(self, req_dict: Dict[str, Any]) -> Dict[str, Any]:
        cid = req_dict["centre_id"]
        centre = self.centres.get(cid, self.centres["centre-a"])
        
        # Determine token code
        prefix = cid.split("-")[-1].upper()
        centre["total_daily_capacity"] = centre.get("total_daily_capacity", 100)
        
        # Count existing bookings
        existing_count = len([b for b in self.bookings.values() if b["centre_id"] == cid])
        seq_num = existing_count + 1 + centre.get("current_token", 1)
        token_no = f"#{prefix}-{seq_num}"

        crop_type = req_dict.get("crop", {}).get("crop_type", "Wheat (गेहूँ)")
        msp = self.crops_msp.get(crop_type, 2425.0)
        qty = float(req_dict.get("crop", {}).get("estimated_quantity_quintal", 50.0))

        booking = {
            "booking_id": f"BK-{prefix}-{uuid.uuid4().hex[:6].upper()}",
            "token_number": token_no,
            "token_sequence": seq_num,
            "farmer_id": req_dict.get("farmer", {}).get("farmer_id", f"FID-{uuid.uuid4().hex[:5].upper()}"),
            "farmer_name": req_dict.get("farmer", {}).get("name", "Farmer"),
            "farmer_mobile": req_dict.get("farmer", {}).get("mobile", "9800000000"),
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
            "date": req_dict.get("date", date.today().isoformat()),
            "time_window": req_dict.get("time_window", "10:00 - 11:00"),
            "crop_type": crop_type,
            "variety": req_dict.get("crop", {}).get("variety", "Standard FAQ Grade"),
            "quantity_quintal": qty,
            "msp_rate_per_quintal": msp,
            "total_estimated_value": round(qty * msp, 2),
            "vehicle_type": req_dict.get("vehicle_type", "Tractor Trolley"),
            "status": "BOOKED",
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "qr_payload": f"KISANQUEUE|TOKEN:{token_no}|FARMER:{req_dict.get('farmer', {}).get('name')}|CENTRE:{centre['name']}|QTY:{qty}Q",
            "estimated_arrival": "10:00 AM",
            "estimated_wait_time_minutes": max(10, (seq_num - centre.get("current_token", 1)) * 10),
            "weighbridge": None,
            "quality": None,
            "payment": None
        }

        self.bookings[token_no] = booking

        # Keep slot availability in sync with the new booking (previously
        # bookings never touched self.slots, so the slot grid never
        # reflected real demand).
        for slot in self.slots.get(cid, []):
            if slot["time_window"] == booking["time_window"] or booking["time_window"].startswith(slot["time_window"]):
                slot["booked_count"] += 1
                slot["is_available"] = slot["booked_count"] < slot["max_capacity"]
                break

        # Record SMS Log
        self.sms_logs.append({
            "id": f"SMS-{uuid.uuid4().hex[:4].upper()}",
            "recipient_mobile": booking["farmer_mobile"],
            "farmer_name": booking["farmer_name"],
            "token_number": token_no,
            "category": "BOOKING_CONFIRMATION",
            "title": "🌾 Booking Confirmed / टोकन पुष्टिकरण",
            "message_text": f"KisanQueue: आपका टोकन {token_no} सफलतापूर्वक बुक हो गया है ({centre['name']}, समय: {booking['time_window']})। कृपया समय पर पहुँचें।",
            "timestamp": datetime.now().strftime("%I:%M %p"),
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

        # Check if booking exists for this token and update status
        if current_token_no in self.bookings:
            self.bookings[current_token_no]["status"] = "ARRIVED"

        # Broadcast SMS trigger if farmers are within 5 count
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
                        "sent_via": "KisanSMS-GovPush"
                    })

        return {
            "centre_id": centre_id,
            "current_token": centre["current_token"],
            "serving_token_number": current_token_no
        }


# Global Singleton Store instance
db = DataStore()
