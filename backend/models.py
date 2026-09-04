"""
KisanQueue Data Models
Defines Pydantic schemas for Farmer, Centre, Slot, Booking, Queue, and Operations.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime


class FarmerProfile(BaseModel):
    id: str
    name: str
    mobile: str
    farmer_id: str
    aadhaar_masked: Optional[str] = "XXXX-XXXX-4819"
    village: str
    district: str
    state: str = "Haryana"
    kcc_number: Optional[str] = "KCC-882190"
    bank_name: Optional[str] = "State Bank of India"
    account_masked: Optional[str] = "XXXXXX9012"
    ifsc: Optional[str] = "SBIN0001234"


class CropDetails(BaseModel):
    crop_type: str  # Wheat, Paddy, Mustard, Gram (Chana), Maize
    variety: Optional[str] = "HD-2967 (Sharbati)"
    estimated_quantity_quintal: float
    msp_rate_per_quintal: float


class ProcurementCentre(BaseModel):
    id: str
    name: str
    code: str
    district: str
    state: str
    lat: float
    lng: float
    total_daily_capacity: int
    current_load_percentage: int
    status: str  # green (normal), yellow (moderate), red (high_load)
    active_counters: int
    avg_processing_time_min: int
    current_token: int
    serving_token_number: str
    address: str
    contact_phone: str
    crops_accepted: List[str]


class TimeSlot(BaseModel):
    id: str
    centre_id: str
    date: str  # YYYY-MM-DD
    time_window: str  # e.g., "08:00 - 09:00"
    max_capacity: int
    booked_count: int
    is_available: bool
    congestion_level: str  # low, medium, high, full


class BookingRequest(BaseModel):
    farmer: FarmerProfile
    centre_id: str
    date: str
    time_slot_id: str
    crop: CropDetails
    vehicle_type: str = "Tractor Trolley"


class QualityInspection(BaseModel):
    moisture_percentage: float
    foreign_matter_percentage: float
    damaged_grains_percentage: float
    grade: str  # Grade A, Grade B, Grade C, Rejected
    approved: bool
    deduction_percentage: float = 0.0
    inspector_notes: Optional[str] = "Passed FCI Fair Average Quality (FAQ) standards."


class WeighbridgeRecord(BaseModel):
    gross_weight_quintal: float
    tare_weight_quintal: float
    net_weight_quintal: float
    weighbridge_slip_no: str


class DBTPaymentRecord(BaseModel):
    transaction_id: str
    total_amount_inr: float
    dbt_status: str  # pending, initiated, credited, failed
    pfms_reference: str
    disbursed_at: Optional[str] = None


class BookingToken(BaseModel):
    booking_id: str
    token_number: str
    token_sequence: int
    farmer_id: str
    farmer_name: str
    farmer_mobile: str
    centre_id: str
    centre_name: str
    date: str
    time_window: str
    crop_type: str
    quantity_quintal: float
    vehicle_type: str
    status: str  # BOOKED, ARRIVED, WEIGHING, QUALITY_CHECK, PROCURED, PAYMENT_INITIATED, PAYMENT_CREDITED, MISSED, CANCELLED
    created_at: str
    qr_payload: str
    estimated_arrival: str
    estimated_wait_time_minutes: int
    weighbridge: Optional[WeighbridgeRecord] = None
    quality: Optional[QualityInspection] = None
    payment: Optional[DBTPaymentRecord] = None


class QueueStatusResponse(BaseModel):
    centre_id: str
    centre_name: str
    current_serving_token: str
    current_serving_seq: int
    your_token: str
    your_seq: int
    farmers_ahead: int
    estimated_wait_time_minutes: int
    avg_turnaround_per_farmer_min: int
    queue_health: str  # Smooth, Normal, Slow, Congested
    last_updated: str


class SMSAlert(BaseModel):
    id: str
    recipient_mobile: str
    farmer_name: str
    token_number: str
    category: str  # BOOKING_CONFIRMATION, QUEUE_ALERT, TURN_ACTIVE, SLOT_RESCHEDULE, PAYMENT_ALERT
    title: str
    message_text: str
    timestamp: str
    sent_via: str = "KisanSMS-GovPush"


class OperatorActionRequest(BaseModel):
    centre_id: str
    token_number: str
    action: str  # call_next, mark_arrived, record_weighing, record_quality, complete_procurement, initiate_payment, broadcast_delay
    weighbridge_data: Optional[WeighbridgeRecord] = None
    quality_data: Optional[QualityInspection] = None
    delay_minutes: Optional[int] = 0
    broadcast_message: Optional[str] = None


class AdminMetricsResponse(BaseModel):
    total_district_centres: int
    active_centres: int
    total_registered_farmers_today: int
    total_procured_metric_tonnes: float
    total_msp_disbursed_crores: float
    district_avg_wait_time_min: int
    high_load_centres_count: int
    recommended_reroutes: List[Dict[str, Any]]
