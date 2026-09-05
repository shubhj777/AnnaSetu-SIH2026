"""
KisanQueue Crop Submission & Quality Assay Evaluation Engine
Handles farmer crop declarations, Fair Average Quality (FAQ) moisture assay evaluation,
official acceptance/rejection decisions, and evaluation SMS triggers.
"""

import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import HTTPException

from database import get_db, row_to_dict, rows_to_list
from notifications import NotificationService


class CropService:
    @staticmethod
    def submit_crop(
        farmer_user_id: Optional[str],
        farmer_name: str,
        farmer_mobile: str,
        crop_type: str,
        variety: str,
        quantity_quintal: float,
        moisture_percentage: Optional[float] = None,
        harvest_date: Optional[str] = None,
        booking_id: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Registers a farmer's crop quality declaration."""
        crop_id = f"CRP-{datetime.now().strftime('%y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
        now_iso = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        with get_db() as conn:
            cursor = conn.cursor()
            if farmer_user_id:
                cursor.execute("SELECT id FROM users WHERE id = ?", (farmer_user_id,))
                if not cursor.fetchone():
                    farmer_user_id = None
            if booking_id:
                cursor.execute("SELECT id FROM bookings WHERE id = ?", (booking_id,))
                if not cursor.fetchone():
                    booking_id = None

            cursor.execute("""
                INSERT INTO crop_submissions (
                    id, booking_id, farmer_user_id, farmer_name,
                    farmer_mobile, crop_type, variety, quantity_quintal,
                    moisture_percentage, harvest_date, status,
                    rejection_reason, evaluated_by, evaluated_at, notes, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', NULL, NULL, NULL, ?, ?)
            """, (
                crop_id, booking_id, farmer_user_id, farmer_name,
                farmer_mobile, crop_type, variety, quantity_quintal,
                moisture_percentage, harvest_date or datetime.now().strftime("%Y-%m-%d"),
                notes, now_iso
            ))

            cursor.execute("SELECT * FROM crop_submissions WHERE id = ?", (crop_id,))
            created = row_to_dict(cursor.fetchone())

            # Audit Log
            cursor.execute("""
                INSERT INTO audit_logs (id, entity_type, entity_id, action, performed_by, old_status, new_status, notes, created_at)
                VALUES (?, 'CROP_SUBMISSION', ?, 'SUBMIT', ?, NULL, 'SUBMITTED', ?, ?)
            """, (
                f"AUD-{uuid.uuid4().hex[:6].upper()}", crop_id, farmer_name,
                f"Declared {quantity_quintal}Q {crop_type} ({variety})", now_iso
            ))

        return created

    @staticmethod
    def list_submissions(
        farmer_user_id: Optional[str] = None,
        status_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Retrieves list of crop submissions with optional user or status filter."""
        with get_db() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM crop_submissions WHERE 1=1"
            params: List[Any] = []
            if farmer_user_id:
                query += " AND farmer_user_id = ?"
                params.append(farmer_user_id)
            if status_filter:
                query += " AND status = ?"
                params.append(status_filter)
            query += " ORDER BY created_at DESC"
            cursor.execute(query, params)
            return rows_to_list(cursor.fetchall())

    @staticmethod
    def evaluate_crop(
        submission_id: str,
        decision: str,  # "ACCEPTED" or "REJECTED"
        evaluator_name: str = "Chief Mandi Quality Assayer",
        rejection_reason: Optional[str] = None,
        moisture_percentage: Optional[float] = None,
        foreign_matter_percentage: Optional[float] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Official authority action: evaluates crop submission under FCI FAQ standards.
        Updates status, logs quality parameters, transitions linked booking,
        and triggers Acceptance or Rejection SMS to farmer.
        """
        decision_raw = decision.strip().upper()
        if decision_raw in ["ACCEPTED", "PASS"]:
            decision_upper = "ACCEPTED"
        elif decision_raw == "APPROVED":
            decision_upper = "APPROVED"
        elif decision_raw in ["REJECTED", "FAIL"]:
            decision_upper = "REJECTED"
        else:
            raise HTTPException(status_code=400, detail="Decision must be 'APPROVED' or 'REJECTED'")

        if decision_upper == "REJECTED" and not rejection_reason:
            raise HTTPException(status_code=400, detail="Rejection reason is required when rejecting a crop submission")

        is_approved = (decision_upper in ["ACCEPTED", "APPROVED"])
        now_iso = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM crop_submissions WHERE id = ?", (submission_id,))
            submission = row_to_dict(cursor.fetchone())
            if not submission:
                raise HTTPException(status_code=404, detail="Crop submission not found")

            # Update crop submission record
            cursor.execute("""
                UPDATE crop_submissions
                SET status = ?, rejection_reason = ?, evaluated_by = ?, evaluated_at = ?,
                    moisture_percentage = COALESCE(?, moisture_percentage),
                    notes = COALESCE(?, notes)
                WHERE id = ?
            """, (
                decision_upper, rejection_reason if decision_upper == "REJECTED" else None,
                evaluator_name, now_iso, moisture_percentage, notes, submission_id
            ))

            booking = None
            if submission.get("booking_id"):
                cursor.execute("SELECT * FROM bookings WHERE id = ? OR token_number = ?", 
                               (submission["booking_id"], submission["booking_id"]))
                booking = row_to_dict(cursor.fetchone())

                if booking:
                    new_b_status = "QUALITY_VERIFIED" if is_approved else "REJECTED"
                    status_note = "Crop passed FAQ inspection." if is_approved else f"Rejected: {rejection_reason}"
                    cursor.execute("""
                        UPDATE bookings
                        SET status = ?, status_note = ?
                        WHERE id = ?
                    """, (new_b_status, status_note, booking["id"]))

                    # Record quality inspection record
                    q_id = f"QID-{uuid.uuid4().hex[:6].upper()}"
                    cursor.execute("""
                        INSERT INTO quality_inspections (
                            id, booking_id, token_number, moisture_percentage,
                            foreign_matter_percentage, damaged_grains_percentage,
                            grade, approved, deduction_percentage, rejection_reason,
                            inspector_notes, inspected_at, inspector_id
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        q_id, booking["id"], booking["token_number"],
                        moisture_percentage or submission.get("moisture_percentage", 11.5),
                        foreign_matter_percentage or 0.8, 0.5,
                        "Grade A (FAQ)" if is_approved else "Rejected (Over-Moisture)",
                        1 if is_approved else 0,
                        0.0 if is_approved else 100.0,
                        rejection_reason, notes, now_iso, evaluator_name
                    ))

            cursor.execute("SELECT * FROM crop_submissions WHERE id = ?", (submission_id,))
            updated_submission = row_to_dict(cursor.fetchone())

            # Audit log
            cursor.execute("""
                INSERT INTO audit_logs (id, entity_type, entity_id, action, performed_by, old_status, new_status, notes, created_at)
                VALUES (?, 'CROP_EVALUATION', ?, ?, ?, 'SUBMITTED', ?, ?, ?)
            """, (
                f"AUD-{uuid.uuid4().hex[:6].upper()}", submission_id, f"EVALUATE_{decision_upper}",
                evaluator_name, decision_upper, rejection_reason or notes or "FAQ standards passed", now_iso
            ))

        # Trigger Acceptance or Rejection SMS
        if booking:
            NotificationService.send_crop_decision(
                booking=booking,
                decision=decision_upper,
                notes=notes or "",
                rejection_reason=rejection_reason or ""
            )
        else:
            # Standalone submission without pre-linked booking
            mock_b = {
                "id": None,
                "token_number": submission["id"],
                "farmer_mobile": submission["farmer_mobile"],
                "farmer_name": submission["farmer_name"],
                "crop_type": submission["crop_type"],
                "quantity_quintal": submission["quantity_quintal"]
            }
            NotificationService.send_crop_decision(
                booking=mock_b,
                decision=decision_upper,
                notes=notes or "",
                rejection_reason=rejection_reason or ""
            )

        return updated_submission
