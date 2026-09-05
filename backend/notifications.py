"""
AnnaSetu Notification Service & Dynamic SMS Gateway Engine
Provides centralized, idempotent, deduplicated SMS notifications supporting real SMS providers
(Fast2SMS, Twilio, MSG91, Generic HTTP) and a local demo mode.
Strictly dispatches messages to the dynamically entered farmer mobile number.
"""

import os
import re
import uuid
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List
from database import get_db, row_to_dict, rows_to_list
from sms_providers import get_sms_provider

logger = logging.getLogger("annasetu.notifications")

# -------------------------------------------------------------
# 1. AUTOMATIC ENVIRONMENT CONFIGURATION
# -------------------------------------------------------------
def load_env_file():
    """Loads key-value pairs from .env if present into os.environ."""
    root_dir = Path(__file__).resolve().parent.parent
    env_path = root_dir / ".env"
    if env_path.exists():
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k, v = k.strip(), v.strip().strip("'\"")
                        if k and k not in os.environ:
                            os.environ[k] = v
        except Exception as e:
            logger.warning(f"Failed to read .env file: {e}")

load_env_file()

SMS_SENDER_ID = os.getenv("SMS_SENDER_ID", "ANNAST")


# -------------------------------------------------------------
# 2. INDIAN MOBILE NUMBER VALIDATION & NORMALIZATION
# -------------------------------------------------------------
def normalize_indian_mobile(mobile: Any) -> str:
    """
    Validates and normalizes an Indian mobile phone number.
    Accepts formats: '9876543210', '+919876543210', '919876543210', '09876543210', '98765 43210'.
    Returns canonical 10-digit string: '9876543210'.
    Raises ValueError if missing or invalid.
    """
    if not mobile:
        raise ValueError("Mobile number is required.")
    
    cleaned = re.sub(r"[^\d+]", "", str(mobile).strip())
    if cleaned.startswith("+91"):
        cleaned = cleaned[3:]
    elif cleaned.startswith("91") and len(cleaned) == 12:
        cleaned = cleaned[2:]
    elif cleaned.startswith("0") and len(cleaned) == 11:
        cleaned = cleaned[1:]

    if not re.match(r"^[6-9]\d{9}$", cleaned):
        raise ValueError(
            f"Invalid Indian mobile number '{mobile}'. Must be a 10-digit number starting with 6, 7, 8, or 9."
        )
    return cleaned


# -------------------------------------------------------------
# 3. NOTIFICATION SERVICE
# -------------------------------------------------------------
class NotificationService:
    @staticmethod
    def send_sms(
        event_type: str,
        idempotency_key: str,
        recipient_mobile: str,
        recipient_name: str,
        token_number: str,
        title: str,
        message_text: str,
        booking_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Idempotently dispatches an SMS notification to the recipient_mobile.
        Uses active provider (Fast2SMS, Twilio, MSG91, or Demo).
        """
        # Validate and normalize phone number
        try:
            norm_mobile = normalize_indian_mobile(recipient_mobile)
        except ValueError as e:
            logger.error(f"Cannot dispatch SMS: {e}")
            return {
                "id": None,
                "event_type": event_type,
                "recipient_mobile": str(recipient_mobile),
                "status": "FAILED",
                "failure_reason": str(e),
                "sms_status": "FAILED",
                "message": str(e)
            }

        with get_db() as conn:
            cursor = conn.cursor()

            # 1. Idempotency Check
            cursor.execute("SELECT * FROM notifications WHERE idempotency_key = ?", (idempotency_key,))
            existing = row_to_dict(cursor.fetchone())
            if existing:
                return existing

            if booking_id:
                cursor.execute("SELECT id FROM bookings WHERE id = ?", (booking_id,))
                if not cursor.fetchone():
                    booking_id = None

            # 2. Invoke SMS Provider
            provider = get_sms_provider()
            provider_res = provider.send_sms(to_mobile=norm_mobile, message=message_text, sender_id=SMS_SENDER_ID)

            # 3. Determine Status & Metadata
            now_iso = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            mode = os.getenv("SMS_MODE", "demo").lower().strip()
            mode_label = "PRODUCTION" if mode == "production" else "DEMO"

            if provider_res.get("success"):
                if mode == "production":
                    # Mark SENT or ACCEPTED, NEVER falsely claim DELIVERED without provider callback
                    status = provider_res.get("status", "ACCEPTED")
                    delivery_time = None
                    failure_reason = None
                    provider_ref = provider_res.get("provider_reference")
                else:
                    # Demo simulation mode - explicitly DEMO
                    status = "DEMO"
                    delivery_time = now_iso
                    failure_reason = None
                    provider_ref = provider_res.get("provider_reference") or f"DEMO-SMS-{uuid.uuid4().hex[:6].upper()}"
            else:
                status = "FAILED"
                delivery_time = None
                provider_ref = None
                failure_reason = provider_res.get("error_message") or "Provider rejected the request"

            notif_id = f"SMS-{datetime.now().strftime('%y%m%d%H%M')}-{uuid.uuid4().hex[:4].upper()}"

            # 4. Store Record
            cursor.execute("""
                INSERT INTO notifications (
                    id, event_type, idempotency_key, booking_id,
                    recipient_mobile, recipient_name, token_number,
                    title, message_text, status, provider_reference,
                    sent_at, delivery_time, is_read, mode, failure_reason, retry_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                notif_id, event_type, idempotency_key, booking_id,
                norm_mobile, recipient_name or "Farmer", token_number or "N/A",
                title, message_text, status, provider_ref,
                now_iso, delivery_time, 0, mode_label, failure_reason, 0
            ))

            cursor.execute("SELECT * FROM notifications WHERE id = ?", (notif_id,))
            record = row_to_dict(cursor.fetchone())
            if record:
                record["sms_status"] = status
            return record

    # -------------------------------------------------------------
    # HIGH-LEVEL DYNAMIC EVENT HELPERS
    # -------------------------------------------------------------
    @classmethod
    def send_booking_confirmation(cls, booking: Dict[str, Any]) -> Dict[str, Any]:
        """Event: Slot Booked -> Booking confirmation SMS"""
        bid = booking.get("id", "")
        token = booking.get("token_number", "")
        key = f"BOOKING_CONFIRM_{bid}"
        title = "🌾 Slot Confirmed / स्लॉट पुष्टिकरण"
        date_str = booking.get("date", "")
        time_str = booking.get("display_time_window") or booking.get("time_window") or "10:00 - 11:00 AM"
        centre_name = booking.get("centre_name", "Mandi Centre")
        
        msg = (
            f"AnnaSetu: आपका खरीद स्लॉट सफलतापूर्वक बुक हो गया है।\n"
            f"केंद्र: {centre_name}\n"
            f"दिनांक: {date_str}\n"
            f"समय: {time_str}\n"
            f"टोकन: {token}"
        )
        return cls.send_sms(
            event_type="BOOKING_CONFIRMATION",
            idempotency_key=key,
            recipient_mobile=booking.get("farmer_mobile", ""),
            recipient_name=booking.get("farmer_name", "Farmer"),
            token_number=token,
            title=title,
            message_text=msg,
            booking_id=bid
        )

    @classmethod
    def send_booking_cancellation(cls, booking: Dict[str, Any]) -> Dict[str, Any]:
        """Event: Booking Cancelled -> Cancellation SMS"""
        bid = booking.get("id", "")
        token = booking.get("token_number", "")
        key = f"BOOKING_CANCEL_{bid}"
        title = "❌ Slot Cancelled / स्लॉट निरस्तीकरण"
        centre_name = booking.get("centre_name", "Mandi Centre")
        date_str = booking.get("date", "")

        msg = (
            f"AnnaSetu: स्लॉट निरस्तीकरण।\n"
            f"टोकन {token} (बुकिंग ID: {bid}) जो {centre_name} पर {date_str} को निर्धारित था, "
            f"सफलतापूर्वक रद्द कर दिया गया है।"
        )
        return cls.send_sms(
            event_type="BOOKING_CANCELLATION",
            idempotency_key=key,
            recipient_mobile=booking.get("farmer_mobile", ""),
            recipient_name=booking.get("farmer_name", "Farmer"),
            token_number=token,
            title=title,
            message_text=msg,
            booking_id=bid
        )

    @classmethod
    def send_one_hour_reminder(cls, booking: Dict[str, Any]) -> Dict[str, Any]:
        """Event: 1 hour before slot -> Reminder SMS"""
        bid = booking.get("id", "")
        token = booking.get("token_number", "")
        key = f"REMINDER_1HR_{bid}_{booking.get('date')}"
        title = "⏰ 1-Hour Slot Reminder / स्लॉट स्मरण"
        tw = booking.get("display_time_window") or booking.get("time_window") or "10:00 - 11:00 AM"
        centre_name = booking.get("centre_name", "Mandi Centre")

        msg = (
            f"AnnaSetu: स्लॉट स्मरण।\n"
            f"आपका खरीद स्लॉट {token} आज {tw} पर {centre_name} में निर्धारित है। "
            f"कृपया समय पर आवंटित गेट पर पहुंचें।"
        )
        return cls.send_sms(
            event_type="ONE_HOUR_REMINDER",
            idempotency_key=key,
            recipient_mobile=booking.get("farmer_mobile", ""),
            recipient_name=booking.get("farmer_name", "Farmer"),
            token_number=token,
            title=title,
            message_text=msg,
            booking_id=bid
        )

    @classmethod
    def send_payment_confirmation(cls, booking: Dict[str, Any], payment: Dict[str, Any]) -> Dict[str, Any]:
        """Event: Payment Successful -> Payment confirmation SMS"""
        bid = booking.get("id", "")
        token = booking.get("token_number", "")
        pid = payment.get("payment_reference", f"PAY-{uuid.uuid4().hex[:6].upper()}")
        key = f"PAYMENT_CONFIRM_{pid}"
        amt = float(payment.get("amount_inr", 0.0))
        pfms_ref = payment.get("pfms_reference") or f"DEMO-PFMS-{uuid.uuid4().hex[:6].upper()}"
        title = "💰 Payment Recorded / भुगतान दर्ज"

        msg = (
            f"AnnaSetu: आपकी कृषि उपज का भुगतान सफलतापूर्वक दर्ज किया गया है।\n"
            f"राशि: ₹{amt:,.2f}\n"
            f"भुगतान संदर्भ: {pid}\n"
            f"PFMS संदर्भ: {pfms_ref} (DEMO)"
        )
        return cls.send_sms(
            event_type="PAYMENT_CONFIRMATION",
            idempotency_key=key,
            recipient_mobile=booking.get("farmer_mobile", ""),
            recipient_name=booking.get("farmer_name", "Farmer"),
            token_number=token,
            title=title,
            message_text=msg,
            booking_id=bid
        )

    @classmethod
    def send_gate_entry(cls, booking: Dict[str, Any], gate_entry_number: str, gate_number: str = "Gate-1") -> Dict[str, Any]:
        """Event: Physical Gate Entry Arrival -> Gate Pass SMS"""
        bid = booking.get("id", "")
        token = booking.get("token_number", "")
        key = f"GATE_ENTRY_{bid}_{gate_entry_number}"
        title = "🚚 Gate Entry / गेट प्रवेश सत्यापित"
        centre_name = booking.get("centre_name", "Mandi Centre")

        msg = (
            f"AnnaSetu: मंडी गेट प्रवेश सत्यापित।\n"
            f"टोकन: {token}\n"
            f"केंद्र: {centre_name}\n"
            f"गेट: {gate_number}\n"
            f"गेट पास: {gate_entry_number}\n"
            f"कृपया धर्मकांटा वेइंग हेतु आगे बढ़ें।"
        )
        return cls.send_sms(
            event_type="GATE_ENTRY",
            idempotency_key=key,
            recipient_mobile=booking.get("farmer_mobile", ""),
            recipient_name=booking.get("farmer_name", "Farmer"),
            token_number=token,
            title=title,
            message_text=msg,
            booking_id=bid
        )

    @classmethod
    def send_weighbridge_completed(cls, booking: Dict[str, Any], weigh_data: Dict[str, Any]) -> Dict[str, Any]:
        """Event: Weighbridge Completed -> Weighment Slip SMS"""
        bid = booking.get("id", "")
        token = booking.get("token_number", "")
        slip_no = weigh_data.get("slip_number", f"WB-{uuid.uuid4().hex[:5].upper()}")
        key = f"WEIGH_{bid}_{slip_no}"
        net_qty = weigh_data.get("net_weight_quintals", booking.get("quantity_quintal", 50))
        title = "⚖️ Weighment Recorded / तौल पर्ची"

        msg = (
            f"AnnaSetu: धर्मकांटा तौल पर्ची जारी।\n"
            f"टोकन: {token}\n"
            f"पर्ची संख्या: {slip_no}\n"
            f"शुद्ध वजन: {net_qty} क्विंटल।\n"
            f"कृपया गुणवत्ता परख काउंटर पर संपर्क करें।"
        )
        return cls.send_sms(
            event_type="WEIGHBRIDGE_COMPLETED",
            idempotency_key=key,
            recipient_mobile=booking.get("farmer_mobile", ""),
            recipient_name=booking.get("farmer_name", "Farmer"),
            token_number=token,
            title=title,
            message_text=msg,
            booking_id=bid
        )

    @classmethod
    def send_crop_decision(cls, booking: Dict[str, Any], decision: str, notes: str = "", rejection_reason: str = "") -> Dict[str, Any]:
        """Event: Crop Accepted or Rejected -> Evaluation SMS"""
        bid = booking.get("id", "")
        token = booking.get("token_number", "")
        key = f"CROP_DECISION_{bid}_{decision}"
        crop_type = booking.get("crop_type", "Crop")
        qty = booking.get("quantity_quintal", 0)

        if decision.upper() in ["ACCEPTED", "APPROVED"]:
            title = "✅ Crop Accepted / फसल स्वीकृत"
            msg = (
                f"AnnaSetu: फसल गुणवत्ता स्वीकृति।\n"
                f"टोकन: {token} ({crop_type}, {qty} क्विंटल) FCI FAQ गुणवत्ता मानकों के अनुसार स्वीकृत है। "
                f"खरीद पर्ची व भुगतान प्रक्रिया आरंभ की जा रही है।"
            )
            event_type = "CROP_ACCEPTED"
        else:
            title = "⚠️ Crop Rejected / फसल अस्वीकृत"
            reason = rejection_reason or notes or "High moisture exceeds permissible FAQ limit (12%)"
            msg = (
                f"AnnaSetu: फसल अस्वीकृत।\n"
                f"टोकन: {token} की गुणवत्ता अस्वीकृत की गई।\n"
                f"कारण: {reason}।\n"
                f"कृपया धूप में सुखाकर पुनः स्लॉट आरक्षित करें।"
            )
            event_type = "CROP_REJECTED"

        return cls.send_sms(
            event_type=event_type,
            idempotency_key=key,
            recipient_mobile=booking.get("farmer_mobile", ""),
            recipient_name=booking.get("farmer_name", "Farmer"),
            token_number=token,
            title=title,
            message_text=msg,
            booking_id=bid
        )

    # -------------------------------------------------------------
    # QUERY & MANAGEMENT
    # -------------------------------------------------------------
    @staticmethod
    def get_notifications(
        mobile: Optional[str] = None,
        event_type: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Retrieves SMS notification logs with optional mobile/type filtering."""
        with get_db() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM notifications WHERE 1=1"
            params: List[Any] = []
            if mobile:
                try:
                    norm = normalize_indian_mobile(mobile)
                    query += " AND (recipient_mobile = ? OR recipient_mobile = ?)"
                    params.extend([mobile, norm])
                except Exception:
                    query += " AND recipient_mobile = ?"
                    params.append(mobile)
            if event_type:
                query += " AND event_type = ?"
                params.append(event_type)
            query += " ORDER BY sent_at DESC LIMIT ?"
            params.append(limit)

            cursor.execute(query, params)
            return rows_to_list(cursor.fetchall())

    @staticmethod
    def mark_all_read(mobile: Optional[str] = None):
        with get_db() as conn:
            cursor = conn.cursor()
            if mobile:
                cursor.execute("UPDATE notifications SET is_read = 1 WHERE recipient_mobile = ?", (mobile,))
            else:
                cursor.execute("UPDATE notifications SET is_read = 1")

    @staticmethod
    def retry_notification(notif_id: str) -> Optional[Dict[str, Any]]:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM notifications WHERE id = ?", (notif_id,))
            notif = row_to_dict(cursor.fetchone())
            if not notif:
                return None

            provider = get_sms_provider()
            res = provider.send_sms(to_mobile=notif["recipient_mobile"], message=notif["message_text"])

            new_status = res.get("status", "SENT") if res.get("success") else "FAILED"
            fail_reason = res.get("error_message") if not res.get("success") else None
            pref = res.get("provider_reference") or notif.get("provider_reference")

            cursor.execute("""
                UPDATE notifications
                SET status = ?, retry_count = retry_count + 1, failure_reason = ?,
                    provider_reference = ?, delivery_time = ?
                WHERE id = ?
            """, (new_status, fail_reason, pref, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), notif_id))
            cursor.execute("SELECT * FROM notifications WHERE id = ?", (notif_id,))
            return row_to_dict(cursor.fetchone())
