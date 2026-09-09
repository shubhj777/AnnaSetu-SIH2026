"""
KisanQueue Database Engine & Persistence Layer
Provides SQLite database connection management, relational schema initialization,
ACID transactions, and indexed query operations.
"""

import sqlite3
import os
from pathlib import Path
from typing import Optional, Dict, Any, List
import contextlib

DB_PATH = Path(os.getenv("DATABASE_PATH", Path(__file__).resolve().parent.parent / "kisanqueue.db"))


def get_db_connection() -> sqlite3.Connection:
    """Returns a configured SQLite connection with foreign keys and row factory enabled."""
    conn = sqlite3.connect(str(DB_PATH), timeout=20.0)
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.row_factory = sqlite3.Row
    return conn


@contextlib.contextmanager
def get_db():
    """Context manager for SQLite transactions with automatic commit and rollback."""
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def row_to_dict(row: Optional[sqlite3.Row]) -> Optional[Dict[str, Any]]:
    """Converts a SQLite Row object to a standard Python dictionary."""
    if row is None:
        return None
    return dict(row)


def rows_to_list(rows: List[sqlite3.Row]) -> List[Dict[str, Any]]:
    """Converts a list of SQLite Row objects to a list of standard Python dictionaries."""
    return [dict(r) for r in rows]


def init_db():
    """Initializes the SQLite schema with all required tables, constraints, and indices."""
    with get_db() as conn:
        cursor = conn.cursor()

        # 1. Users Table (Authentication & Role-Based Access)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            mobile TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'farmer',
            farmer_id TEXT UNIQUE,
            aadhaar_masked TEXT DEFAULT 'XXXX-XXXX-4819',
            village TEXT DEFAULT 'Karnal Rural',
            district TEXT DEFAULT 'Karnal',
            state TEXT DEFAULT 'Haryana',
            kcc_number TEXT DEFAULT 'KCC-882190',
            bank_name TEXT DEFAULT 'State Bank of India',
            account_masked TEXT DEFAULT 'XXXXXX9012',
            ifsc TEXT DEFAULT 'SBIN0001234',
            lat REAL CHECK(lat IS NULL OR (lat >= -90.0 AND lat <= 90.0)),
            lng REAL CHECK(lng IS NULL OR (lng >= -180.0 AND lng <= 180.0)),
            sec_q1 TEXT,
            sec_a1_hash TEXT,
            sec_q2 TEXT,
            sec_a2_hash TEXT,
            created_at TEXT NOT NULL
        );
        """)

        # 2. Procurement Centres Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS procurement_centres (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            code TEXT UNIQUE NOT NULL,
            district TEXT NOT NULL,
            state TEXT NOT NULL,
            lat REAL NOT NULL CHECK(lat >= -90.0 AND lat <= 90.0),
            lng REAL NOT NULL CHECK(lng >= -180.0 AND lng <= 180.0),
            distance_km REAL DEFAULT 0.0,
            total_daily_capacity INTEGER NOT NULL DEFAULT 100,
            current_load_percentage INTEGER DEFAULT 0,
            status TEXT DEFAULT 'green',
            active_counters INTEGER DEFAULT 3,
            avg_processing_time_min INTEGER DEFAULT 12,
            current_token INTEGER DEFAULT 0,
            serving_token_number TEXT DEFAULT '#A-01',
            address TEXT NOT NULL,
            gate_entry TEXT,
            route_tips TEXT,
            contact_phone TEXT,
            crops_accepted_json TEXT NOT NULL
        );
        """)

        # 3. Time Slots Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS time_slots (
            id TEXT PRIMARY KEY,
            centre_id TEXT NOT NULL REFERENCES procurement_centres(id) ON DELETE CASCADE,
            date TEXT NOT NULL,
            time_window TEXT NOT NULL,
            display_time_window TEXT NOT NULL,
            max_capacity INTEGER NOT NULL DEFAULT 15,
            booked_count INTEGER NOT NULL DEFAULT 0,
            is_available INTEGER NOT NULL DEFAULT 1,
            congestion_level TEXT DEFAULT 'low'
        );
        """)

        # 4. Bookings Table (7-Stage Procurement Lifecycle)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS bookings (
            id TEXT PRIMARY KEY,
            token_number TEXT UNIQUE NOT NULL,
            token_sequence INTEGER NOT NULL,
            farmer_user_id TEXT REFERENCES users(id),
            farmer_id TEXT NOT NULL,
            farmer_name TEXT NOT NULL,
            farmer_mobile TEXT NOT NULL,
            aadhaar_masked TEXT,
            village TEXT,
            district TEXT,
            state TEXT,
            kcc_number TEXT,
            bank_name TEXT,
            account_masked TEXT,
            ifsc TEXT,
            centre_id TEXT NOT NULL REFERENCES procurement_centres(id),
            centre_name TEXT NOT NULL,
            date TEXT NOT NULL,
            time_window TEXT NOT NULL,
            display_time_window TEXT NOT NULL,
            crop_type TEXT NOT NULL,
            variety TEXT,
            quantity_quintal REAL NOT NULL,
            msp_rate_per_quintal REAL NOT NULL,
            total_estimated_value REAL NOT NULL,
            vehicle_type TEXT DEFAULT 'Tractor Trolley',
            vehicle_number TEXT,
            status TEXT NOT NULL DEFAULT 'BOOKED',
            status_note TEXT,
            created_at TEXT NOT NULL,
            arrived_at TEXT,
            procured_at TEXT,
            lat REAL CHECK(lat IS NULL OR (lat >= -90.0 AND lat <= 90.0)),
            lng REAL CHECK(lng IS NULL OR (lng >= -180.0 AND lng <= 180.0)),
            qr_payload TEXT,
            gate_entry_id TEXT,
            gate_number TEXT
        );
        """)

        # 4b. Gate Entries Table (Arrival Registration & Gate Pass)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS gate_entries (
            id TEXT PRIMARY KEY,
            gate_entry_number TEXT UNIQUE NOT NULL,
            booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
            token_number TEXT NOT NULL,
            centre_id TEXT NOT NULL REFERENCES procurement_centres(id),
            gate_number TEXT NOT NULL DEFAULT 'Gate-1',
            vehicle_number TEXT,
            driver_name TEXT,
            entry_time TEXT NOT NULL,
            operator_id TEXT,
            status TEXT NOT NULL DEFAULT 'IN_QUEUE',
            notes TEXT
        );
        """)

        # 5. Weighbridge Records Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS weighbridge_records (
            id TEXT PRIMARY KEY,
            booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
            token_number TEXT NOT NULL,
            gross_weight_quintal REAL NOT NULL,
            tare_weight_quintal REAL NOT NULL,
            net_weight_quintal REAL NOT NULL,
            weighbridge_slip_no TEXT NOT NULL,
            recorded_at TEXT NOT NULL,
            operator_id TEXT
        );
        """)

        # 6. Quality Inspections Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS quality_inspections (
            id TEXT PRIMARY KEY,
            booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
            token_number TEXT NOT NULL,
            moisture_percentage REAL NOT NULL,
            foreign_matter_percentage REAL NOT NULL,
            damaged_grains_percentage REAL NOT NULL,
            grade TEXT NOT NULL,
            approved INTEGER NOT NULL DEFAULT 1,
            deduction_percentage REAL DEFAULT 0.0,
            rejection_reason TEXT,
            inspector_notes TEXT,
            inspected_at TEXT NOT NULL,
            inspector_id TEXT
        );
        """)

        # 7. Payments Table (Real Backend Verification & Receipts)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS payments (
            id TEXT PRIMARY KEY,
            payment_reference TEXT UNIQUE NOT NULL,
            booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
            user_id TEXT REFERENCES users(id),
            token_number TEXT NOT NULL,
            amount_inr REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDING',
            pfms_reference TEXT,
            payment_method TEXT DEFAULT 'PFMS_DBT',
            created_at TEXT NOT NULL,
            completed_at TEXT,
            receipt_number TEXT
        );
        """)

        # 8. Crop Submissions Table (Farmer Crop Declaration & Quality Decision)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS crop_submissions (
            id TEXT PRIMARY KEY,
            booking_id TEXT REFERENCES bookings(id),
            farmer_user_id TEXT REFERENCES users(id),
            farmer_name TEXT NOT NULL,
            farmer_mobile TEXT NOT NULL,
            crop_type TEXT NOT NULL,
            variety TEXT,
            quantity_quintal REAL NOT NULL,
            moisture_percentage REAL,
            harvest_date TEXT,
            status TEXT NOT NULL DEFAULT 'SUBMITTED',
            rejection_reason TEXT,
            evaluated_by TEXT,
            evaluated_at TEXT,
            notes TEXT,
            created_at TEXT NOT NULL
        );
        """)

        # 9. Notifications Table (SMS Dispatch, Delivery Tracking & Duplicate Prevention)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            event_type TEXT NOT NULL,
            idempotency_key TEXT UNIQUE NOT NULL,
            booking_id TEXT REFERENCES bookings(id),
            recipient_mobile TEXT NOT NULL,
            recipient_name TEXT NOT NULL,
            token_number TEXT NOT NULL,
            title TEXT NOT NULL,
            message_text TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDING',
            provider_reference TEXT,
            sent_at TEXT NOT NULL,
            delivery_time TEXT,
            is_read INTEGER DEFAULT 0,
            mode TEXT DEFAULT 'DEMO',
            failure_reason TEXT,
            retry_count INTEGER DEFAULT 0
        );
        """)

        # 10. Grievance Complaints Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS complaints (
            id TEXT PRIMARY KEY,
            complaint_id TEXT UNIQUE NOT NULL,
            farmer_mobile TEXT NOT NULL,
            farmer_name TEXT NOT NULL,
            token_number TEXT,
            category TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT DEFAULT 'SUBMITTED',
            assigned_to TEXT,
            resolution_eta TEXT,
            timestamp TEXT NOT NULL
        );
        """)

        # 11. System Audit Logs
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            action TEXT NOT NULL,
            performed_by TEXT NOT NULL,
            old_status TEXT,
            new_status TEXT,
            notes TEXT,
            created_at TEXT NOT NULL
        );
        """)

        # Create Indices for Efficient Queries
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_bookings_centre_date ON bookings(centre_id, date);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(farmer_user_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_bookings_token ON bookings(token_number);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_time_slots_centre ON time_slots(centre_id, date);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notifications_idemp ON notifications(idempotency_key);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notifications_mobile ON notifications(recipient_mobile);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_crop_submissions_user ON crop_submissions(farmer_user_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_gate_entries_booking ON gate_entries(booking_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_gate_entries_centre ON gate_entries(centre_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_gate_entries_number ON gate_entries(gate_entry_number);")

        # Column migrations for existing databases
        cursor.execute("PRAGMA table_info(bookings);")
        booking_cols = [c[1] for c in cursor.fetchall()]
        if "gate_entry_id" not in booking_cols:
            cursor.execute("ALTER TABLE bookings ADD COLUMN gate_entry_id TEXT;")
        if "gate_number" not in booking_cols:
            cursor.execute("ALTER TABLE bookings ADD COLUMN gate_number TEXT;")

        # Safe migration for users table: security question columns
        cursor.execute("PRAGMA table_info(users);")
        user_cols = [c[1] for c in cursor.fetchall()]
        if "sec_q1" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN sec_q1 TEXT;")
        if "sec_a1_hash" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN sec_a1_hash TEXT;")
        if "sec_q2" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN sec_q2 TEXT;")
        if "sec_a2_hash" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN sec_a2_hash TEXT;")

        # Check for duplicate mobile numbers before creating unique index
        cursor.execute("SELECT mobile, COUNT(*) as cnt FROM users GROUP BY mobile HAVING cnt > 1;")
        duplicate_mobiles = cursor.fetchall()
        if duplicate_mobiles:
            print(f"[WARNING] Duplicate mobile numbers detected in users table: {[r['mobile'] for r in duplicate_mobiles]}. Unique index creation skipped.")
        else:
            cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_mobile_unique ON users(mobile);")

