"""
KisanQueue Automated Server-Side 1-Hour Reminder Scheduler
Runs an asynchronous/threaded background worker that evaluates active bookings
and dispatches 1-hour advance SMS notifications without client-side dependency.
"""

import time
import threading
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
import logging

from database import get_db, row_to_dict, rows_to_list
from notifications import NotificationService

logger = logging.getLogger("kisanqueue.scheduler")


def parse_slot_start_datetime(slot_date_str: str, time_window_str: str) -> Optional[datetime]:
    """
    Parses slot date ('YYYY-MM-DD') and time window (e.g. '10:00 - 11:00' or '10:00 - 11:00 AM')
    into a concrete timezone-aware or local datetime for the slot start.
    """
    try:
        from data_store import normalize_time_window
        canonical = normalize_time_window(time_window_str)
        start_part = canonical.split("-")[0].strip()
        h, m = [int(x) for x in start_part.split(":")]
        
        slot_d = datetime.strptime(slot_date_str, "%Y-%m-%d").date()
        return datetime(slot_d.year, slot_d.month, slot_d.day, h, m, 0)
    except Exception as e:
        logger.warning(f"Error parsing slot datetime: {slot_date_str} {time_window_str}: {e}")
        return None


def check_and_send_due_reminders() -> int:
    """
    Core scheduler evaluation function.
    Finds active bookings where slot starts in approximately 1 hour (between 0 and 70 minutes),
    checks that booking is not cancelled/completed, verifies no duplicate reminder, and dispatches SMS.
    Returns the count of reminders sent in this evaluation cycle.
    """
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    sent_count = 0

    with get_db() as conn:
        cursor = conn.cursor()
        # Query active bookings for today (or upcoming dates)
        cursor.execute("""
            SELECT * FROM bookings
            WHERE date >= ?
              AND status IN ('BOOKED', 'ARRIVED')
        """, (today_str,))
        active_bookings = rows_to_list(cursor.fetchall())

    for booking in active_bookings:
        slot_dt = parse_slot_start_datetime(booking["date"], booking["time_window"])
        if not slot_dt:
            continue

        # Calculate time until slot start
        diff_seconds = (slot_dt - now).total_seconds()
        
        # Eligible if slot starts in next 70 minutes (and hasn't already passed by more than 10 mins)
        if -600 <= diff_seconds <= 4200:
            key = f"REMINDER_1HR_{booking['id']}_{booking['date']}"
            
            # Check if reminder already dispatched
            with get_db() as conn:
                c2 = conn.cursor()
                c2.execute("SELECT id FROM notifications WHERE idempotency_key = ?", (key,))
                if c2.fetchone() is not None:
                    continue  # Already sent, skip
            
            # Dispatch reminder SMS
            NotificationService.send_one_hour_reminder(booking)
            sent_count += 1
            logger.info(f"Dispatched 1-hour reminder SMS for booking {booking['token_number']} ({booking['farmer_name']})")

    return sent_count


class ReminderSchedulerThread(threading.Thread):
    """Background daemon thread running the reminder checker loop."""
    def __init__(self, interval_seconds: int = 30):
        super().__init__(daemon=True)
        self.interval_seconds = interval_seconds
        self._stop_event = threading.Event()

    def run(self):
        logger.info("KisanQueue 1-Hour Reminder Scheduler started.")
        while not self._stop_event.is_set():
            try:
                check_and_send_due_reminders()
            except Exception as e:
                logger.error(f"Error in reminder scheduler cycle: {e}")
            self._stop_event.wait(self.interval_seconds)
        logger.info("KisanQueue 1-Hour Reminder Scheduler stopped.")

    def stop(self):
        self._stop_event.set()


# Global scheduler thread instance
_scheduler_thread = None


def start_scheduler():
    global _scheduler_thread
    if _scheduler_thread is None or not _scheduler_thread.is_alive():
        _scheduler_thread = ReminderSchedulerThread(interval_seconds=30)
        _scheduler_thread.start()


def stop_scheduler():
    global _scheduler_thread
    if _scheduler_thread and _scheduler_thread.is_alive():
        _scheduler_thread.stop()
        _scheduler_thread.join(timeout=2.0)
        _scheduler_thread = None
