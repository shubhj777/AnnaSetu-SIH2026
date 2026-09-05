"""
KisanQueue Data Models & Schemas
Defines Pydantic schemas for Authentication, Farmer, Centre, Slot, Booking,
Queue, Operations, Payments, Crops, GIS, and Admin telemetry.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


# -------------------------------------------------------------
# 1. AUTHENTICATION & USER SCHEMAS
# -------------------------------------------------------------
class LoginRequest(BaseModel):
    identifier: str  # Mobile number or Farmer ID
    password: str  # Password or demo OTP
    role: Optional[str] = "farmer"  # farmer, operator, admin


class RegisterRequest(BaseModel):
    name: str
    mobile: str
    password: str
    village: Optional[str] = "Karnal Rural"
    district: Optional[str] = "Karnal"
    state: Optional[str] = "Haryana"
    aadhaar_masked: Optional[str] = "XXXX-XXXX-4819"
    kcc_number: Optional[str] = "KCC-882190"
    bank_name: Optional[str] = "State Bank of India"
    account_masked: Optional[str] = "XXXXXX9012"
    ifsc: Optional[str] = "SBIN0001234"
    lat: Optional[float] = Field(default=29.6857, ge=-90.0, le=90.0)
    lng: Optional[float] = Field(default=76.9905, ge=-180.0, le=180.0)


class UserProfile(BaseModel):
    id: str
    name: str
    mobile: str
    role: str
    farmer_id: Optional[str] = None
    aadhaar_masked: Optional[str] = None
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    kcc_number: Optional[str] = None
    bank_name: Optional[str] = None
    account_masked: Optional[str] = None
    ifsc: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    created_at: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    village: Optional[str] = None
    district: Optional[str] = None
    kcc_number: Optional[str] = None
    bank_name: Optional[str] = None
    account_masked: Optional[str] = None
    ifsc: Optional[str] = None
    lat: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    lng: Optional[float] = Field(default=None, ge=-180.0, le=180.0)


# -------------------------------------------------------------
# 2. CORE PROCUREMENT & QUEUE SCHEMAS
# -------------------------------------------------------------
class FarmerProfile(BaseModel):
    id: Optional[str] = None
    name: str
    mobile: str
    farmer_id: Optional[str] = None
    aadhaar_masked: Optional[str] = "XXXX-XXXX-4819"
    village: Optional[str] = "Taraori"
    district: Optional[str] = "Karnal"
    state: Optional[str] = "Haryana"
    kcc_number: Optional[str] = "KCC-882190"
    bank_name: Optional[str] = "State Bank of India"
    account_masked: Optional[str] = "XXXXXX9012"
    ifsc: Optional[str] = "SBIN0001234"
    lat: Optional[float] = None
    lng: Optional[float] = None


class CropDetails(BaseModel):
    crop_type: str  # Wheat, Paddy, Mustard, Gram (Chana), Maize
    variety: Optional[str] = "HD-2967 (Sharbati)"
    estimated_quantity_quintal: float
    msp_rate_per_quintal: float


class GISLocation(BaseModel):
    name: str
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)
    address: str
    city: Optional[str] = "Karnal"
    district: str = "Karnal"
    state: str = "Haryana"
    entity_type: str  # centre, farmer, collection_point


class ProcurementCentre(BaseModel):
    id: str
    name: str
    code: str
    district: str
    state: str
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)
    distance_km: Optional[float] = 0.0
    total_daily_capacity: int
    current_load_percentage: int
    status: str  # green, yellow, red
    active_counters: int
    avg_processing_time_min: int
    current_token: int
    serving_token_number: str
    address: str
    gate_entry: Optional[str] = None
    route_tips: Optional[str] = None
    contact_phone: str
    crops_accepted: List[str]


class TimeSlot(BaseModel):
    id: str
    centre_id: str
    date: str  # YYYY-MM-DD
    time_window: str  # e.g., "08:00 - 09:00"
    display_time_window: Optional[str] = None
    max_capacity: int
    booked_count: int
    is_available: bool
    congestion_level: str  # low, medium, high, full


class BookingRequest(BaseModel):
    farmer: Optional[FarmerProfile] = None
    centre_id: str
    date: Optional[str] = None
    time_slot_id: Optional[str] = None
    time_window: Optional[str] = "10:00 - 11:00"
    crop: Optional[CropDetails] = None
    crop_type: Optional[str] = None
    quantity_quintal: Optional[float] = 50.0
    vehicle_type: str = "Tractor Trolley"
    vehicle_number: Optional[str] = None


class QualityInspection(BaseModel):
    moisture_percentage: float
    foreign_matter_percentage: float
    damaged_grains_percentage: float
    grade: str  # Grade A, Grade B, Grade C, Rejected
    approved: bool
    deduction_percentage: float = 0.0
    rejection_reason: Optional[str] = None
    inspector_notes: Optional[str] = "Passed FCI Fair Average Quality (FAQ) standards."


class WeighbridgeRecord(BaseModel):
    gross_weight_quintal: float
    tare_weight_quintal: float
    net_weight_quintal: float
    weighbridge_slip_no: str


class DBTPaymentRecord(BaseModel):
    transaction_id: str
    total_amount_inr: float
    dbt_status: str  # PENDING, SUCCESSFUL, FAILED
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
    display_time_window: Optional[str] = None
    crop_type: str
    quantity_quintal: float
    vehicle_type: str
    status: str
    created_at: str
    qr_payload: str
    estimated_arrival: Optional[str] = None
    estimated_wait_time_minutes: Optional[int] = 0
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
    min_estimated_minutes: Optional[int] = None
    max_estimated_minutes: Optional[int] = None
    queue_health: str
    explanation: Optional[str] = None
    last_updated: str


class SMSAlert(BaseModel):
    id: str
    recipient_mobile: str
    farmer_name: str
    token_number: str
    category: str
    title: str
    message_text: str
    timestamp: str
    status: Optional[str] = "DELIVERED"
    sent_via: str = "KisanSMS-GovPush"


# -------------------------------------------------------------
# 3. PAYMENT & CROP WORKFLOW SCHEMAS
# -------------------------------------------------------------
class PaymentInitiateRequest(BaseModel):
    booking_id: str
    payment_method: Optional[str] = "PFMS_DBT"


class PaymentVerifyRequest(BaseModel):
    payment_reference: str
    verification_pin: Optional[str] = None


class CropSubmissionRequest(BaseModel):
    crop_type: str
    variety: Optional[str] = "Standard Quality"
    quantity_quintal: float
    moisture_percentage: Optional[float] = 11.5
    harvest_date: Optional[str] = None
    booking_id: Optional[str] = None
    notes: Optional[str] = None


class CropEvaluationRequest(BaseModel):
    decision: str  # ACCEPTED or REJECTED
    rejection_reason: Optional[str] = None
    moisture_percentage: Optional[float] = None
    foreign_matter_percentage: Optional[float] = None
    notes: Optional[str] = None


class OperatorActionRequest(BaseModel):
    centre_id: str
    token_number: str
    action: str  # call_next, mark_arrived, record_weighing, record_quality, complete_procurement, initiate_payment, broadcast_delay
    weighbridge_data: Optional[WeighbridgeRecord] = None
    quality_data: Optional[QualityInspection] = None
    delay_minutes: Optional[int] = 0
    broadcast_message: Optional[str] = None


class AdminMetricsResponse(BaseModel):
    district: str
    state: str
    total_district_centres: int
    active_centres: int
    total_registered_farmers_today: int
    total_procured_metric_tonnes: float
    total_msp_disbursed_crores: float
    district_avg_wait_time_min: int
    high_load_centres_count: int
    recommended_reroutes: List[Dict[str, Any]]
