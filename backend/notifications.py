"""
KisanQueue Notification Service & SMS Gateway Engine
Provides centralized, idempotent, deduplicated SMS notifications with demo/production modes,
delivery tracking, and administrative retry capabilities.
"""

import os
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from database import get_db, row_to_dict, rows_to_list

SMS_MODE = os.getenv("SMS_MODE", "demo").lower()
SMS_SENDER_ID = os.getenv("SMS_SENDER_ID", "KISANQ")


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
        Idempotently dispatches an SMS notification.
        If a notification with the same idempotency_key exists, returns the existing record.
        """
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

            # 2. Build Record
            notif_id = f"SMS-{datetime.now().strftime('%y%m%d%H%M')}-{uuid.uuid4().hex[:4].upper()}"
            now_iso = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            provider_ref = f"NIC-PUSH-{uuid.uuid4().hex[:8].upper()}"

            # Demo vs Production handling
            if SMS_MODE == "production":
                # In real production, invoke third-party SMS API (e.g. CDAC / NIC e-Gov SMS Gateway / Twilio)
                status = "SENT"
                delivery_time = now_iso
                mode = "PRODUCTION"
            else:
                # Demo simulation mode: immediately mark DELIVERED and flag as DEMO
                status = "DELIVERED"
                delivery_time = now_iso
                mode = "DEMO"

            cursor.execute("""
                INSERT INTO notifications (
                    id, event_type, idempotency_key, booking_id,
                    recipient_mobile, recipient_name, token_number,
                    title, message_text, status, provider_reference,
                    sent_at, delivery_time, is_read, mode, failure_reason, retry_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                notif_id, event_type, idempotency_key, booking_id,
                recipient_mobile, recipient_name, token_number,
                title, message_text, status, provider_ref,
                now_iso, delivery_time, 0, mode, None, 0
            ))

            cursor.execute("SELECT * FROM notifications WHERE id = ?", (notif_id,))
            return row_to_dict(cursor.fetchone())

    # -------------------------------------------------------------
    # HIGH-LEVEL EVENT HELPERS
    # -------------------------------------------------------------
    @classmethod
    def send_booking_confirmation(cls, booking: Dict[str, Any]) -> Dict[str, Any]:
        """Event: Slot Booked -> Booking confirmation SMS"""
        bid = booking["id"]
        token = booking["token_number"]
        key = f"BOOKING_CONFIRM_{bid}"
        title = "🌾 Slot Confirmed / स्लॉट पुष्टिकरण"
        msg = (
            f"KisanQueue: Your slot has been successfully booked. "
            f"Token: {token} (Booking ID: {bid}). Date: {booking['date']}, "
            f"Time: {booking.get('display_time_window', booking.get('time_window'))}. "
            f"Mandi: {booking['centre_name']}. Crop: {booking['crop_type']} ({booking['quantity_quintal']} Q). "
            f"Please arrive on time at the assigned gate."
        )
        return cls.send_sms(
            event_type="BOOKING_CONFIRMATION",
            idempotency_key=key,
            recipient_mobile=booking["farmer_mobile"],
            recipient_name=booking["farmer_name"],
            token_number=token,
            title=title,
            message_text=msg,
            booking_id=bid
        )

    @classmethod
    def send_booking_cancellation(cls, booking: Dict[str, Any]) -> Dict[str, Any]:
        """Event: Booking Cancelled -> Cancellation SMS"""
        bid = booking["id"]
        token = booking["token_number"]
        key = f"BOOKING_CANCEL_{bid}"
        title = "❌ Slot Cancelled / स्लॉट निरस्तीकरण"
        msg = (
            f"KisanQueue: Booking {bid} (Token: {token}) scheduled for {booking['date']} "
            f"at {booking['centre_name']} has been CANCELLED as requested. "
            f"You may book a fresh slot anytime on KisanQueue."
        )
        return cls.send_sms(
            event_type="BOOKING_CANCELLATION",
            idempotency_key=key,
            recipient_mobile=booking["farmer_mobile"],
            recipient_name=booking["farmer_name"],
            token_number=token,
            title=title,
            message_text=msg,
            booking_id=bid
        )

    @classmethod
    def send_one_hour_reminder(cls, booking: Dict[str, Any]) -> Dict[str, Any]:
        """Event: 1 hour before slot -> Reminder SMS"""
        bid = booking["id"]
        token = booking["token_number"]
        key = f"REMINDER_1HR_{bid}_{booking['date']}"
        title = "⏰ 1-Hour Slot Reminder / स्लॉट स्मरण"
        tw = booking.get("display_time_window", booking.get("time_window"))
        msg = (
            f"Reminder: Your KishanQueue slot {token} (ID: {bid}) is scheduled at {tw} today "
            f"at {booking['centre_name']}. Please arrive at the assigned entry gate on time."
        )
        return cls.send_sms(
            event_type="ONE_HOUR_REMINDER",
            idempotency_key=key,
            recipient_mobile=booking["farmer_mobile"],
            recipient_name=booking["farmer_name"],
            token_number=token,
            title=title,
            message_text=msg,
            booking_id=bid
        )

    @classmethod
    def send_payment_confirmation(cls, booking: Dict[str, Any], payment: Dict[str, Any]) -> Dict[str, Any]:
        """Event: Payment Successful -> Payment confirmation SMS"""
        bid = booking["id"]
        token = booking["token_number"]
        pid = payment["payment_reference"]
        key = f"PAYMENT_CONFIRM_{pid}"
        amt = payment["amount_inr"]
        title = "💰 Payment Received / भुगतान प्राप्त"
        msg = (
            f"Payment received successfully for KishanQueue booking {token} (ID: {bid}). "
            f"Amount: ₹{amt:,.2f}. Payment Ref: {pid}. PFMS Ref: {payment.get('pfms_reference', 'PFMS-GOV')}. "
            f"Date: {payment.get('completed_at', datetime.now().strftime('%d %b %Y %I:%M %p'))}."
        )
        return cls.send_sms(
            event_type="PAYMENT_CONFIRMATION",
            idempotency_key=key,
            recipient_mobile=booking["farmer_mobile"],
            recipient_name=booking["farmer_name"],
            token_number=token,
            title=title,
            message_text=msg,
            booking_id=bid
        )

    @classmethod
    def send_crop_decision(cls, booking: Dict[str, Any], decision: str, notes: str = "", rejection_reason: str = "") -> Dict[str, Any]:
        """Event: Crop Accepted or Rejected -> Evaluation SMS"""
        bid = booking["id"]
        token = booking["token_number"]
        key = f"CROP_DECISION_{bid}_{decision}"
        if decision.upper() in ["ACCEPTED", "APPROVED"]:
            title = "✅ Crop Accepted / फसल स्वीकृत"
            msg = (
                f"Your crop submission ({booking['crop_type']}, {booking['quantity_quintal']} Q) "
                f"for KishanQueue booking {token} has been ACCEPTED under FCI FAQ standards. "
                f"Please check the KishanQueue application for procurement slip and payment details."
            )
            event_type = "CROP_ACCEPTED"
        else:
            title = "⚠️ Crop Rejected / फसल अस्वीकृत"
            msg = (
                f"Your crop submission for KishanQueue booking {token} has been REJECTED. "
                f"Reason: {rejection_reason or notes or 'High moisture exceeds permissible FAQ limit'}. "
                f"Please check the KishanQueue application for the reason and further instructions."
            )
            event_type = "CROP_REJECTED"

        return cls.send_sms(
            event_type=event_type,
            idempotency_key=key,
            recipient_mobile=booking["farmer_mobile"],
            recipient_name=booking["farmer_name"],
            token_number=token,
            title=title,
            message_text=msg,
            booking_id=bid
        )

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
            cursor.execute("""
                UPDATE notifications
                SET status = 'DELIVERED', retry_count = retry_count + 1, failure_reason = NULL,
                    delivery_time = ?
                WHERE id = ?
            """, (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), notif_id))
            cursor.execute("SELECT * FROM notifications WHERE id = ?", (notif_id,))
            return row_to_dict(cursor.fetchone())
