"""
KisanQueue (किसान कतार) — FastAPI Backend Server
Provides comprehensive REST APIs for Farmer Slot Booking, Live Queue Management,
Mandi Operator Terminal, District Admin GIS Dashboard, and AI Predictions.
"""

import os
from pathlib import Path
from datetime import datetime, date
from typing import Dict, Any, Optional, List

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from models import (
    FarmerProfile, CropDetails, BookingRequest, OperatorActionRequest,
    WeighbridgeRecord, QualityInspection, DBTPaymentRecord
)
from data_store import db
from ml_predictor import predict_queue_waiting_time, analyze_mandi_load_balance, haversine_distance_km

app = FastAPI(
    title="KisanQueue API",
    description="Smart Farmer Procurement & Real-Time Queue Management Platform",
    version="2.1.0"
)

# Enable CORS for cross-origin frontend support
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


def normalize_token_key(token_number: str) -> str:
    if not token_number:
        return ""
    norm = token_number.upper().strip()
    return norm if norm.startswith("#") else f"#{norm}"


# -------------------------------------------------------------
# 1. PROCUREMENT CENTRES & SLOTS APIS
# -------------------------------------------------------------
@app.get("/api/centres")
def get_procurement_centres():
    """Retrieve list of all mandi procurement centres with live status and load."""
    centres = db.get_centres()
    return {"status": "success", "count": len(centres), "data": centres}


@app.get("/api/centres/{centre_id}")
def get_centre_detail(centre_id: str):
    centre = db.get_centre(centre_id)
    if not centre:
        raise HTTPException(status_code=404, detail="Centre not found")
    return {"status": "success", "data": centre}


@app.get("/api/centres/{centre_id}/slots")
def get_centre_slots(centre_id: str, booking_date: Optional[str] = None):
    """Retrieve slot availability for a specified centre and date."""
    slots = db.get_slots(centre_id)
    return {"status": "success", "centre_id": centre_id, "date": booking_date or date.today().isoformat(), "data": slots}


# -------------------------------------------------------------
# 2. BOOKINGS & TOKEN GENERATION APIS
# -------------------------------------------------------------
@app.post("/api/bookings")
def create_booking(payload: Dict[str, Any]):
    """Create a new farmer booking, allocate slot, generate digital token and QR payload."""
    try:
        booking = db.create_booking(payload)
        return {"status": "success", "message": "Slot booked successfully", "data": booking}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/bookings/{token_number}")
def get_booking(token_number: str):
    """Fetch booking details and complete 7-stage procurement status."""
    token_key = normalize_token_key(token_number)
    booking = db.get_booking(token_key)
    if not booking:
        raise HTTPException(status_code=404, detail=f"Booking not found for token '{token_key}'")
    return {"status": "success", "data": booking}


@app.post("/api/bookings/{token_number}/recover_slot")
def recover_missed_slot(token_number: str, payload: Optional[Dict[str, Any]] = None):
    """
    Missed Slot Dynamic Recovery:
    Finds the next optimal non-congested slot without forfeiting farmer's seniority.
    """
    token_key = normalize_token_key(token_number)
    req_window = payload.get("new_time_window") if payload else None
    booking = db.recover_slot(token_key, req_window)
    if not booking:
        raise HTTPException(status_code=404, detail=f"Token '{token_key}' not found")

    return {
        "status": "success",
        "message": f"Slot recovered and rescheduled successfully to {booking.get('display_time_window', booking['time_window'])}",
        "data": booking
    }


# -------------------------------------------------------------
# 3. REAL-TIME QUEUE & AI PREDICTOR APIS
# -------------------------------------------------------------
@app.get("/api/queue/{centre_id}/{token_number}")
def get_live_queue_status(centre_id: str, token_number: str):
    """
    Real-Time Queue Management Engine.
    Returns currently serving token, farmers ahead, and AI-estimated waiting time.
    """
    token_key = normalize_token_key(token_number)
    centre = db.get_centre(centre_id)
    if not centre:
        raise HTTPException(status_code=404, detail="Centre not found")

    booking = db.get_booking(token_key)
    if not booking:
        seq = 52 if "52" in token_number else 50
    else:
        seq = booking.get("token_sequence", 52)

    current_serving_seq = centre.get("current_token", 37)
    farmers_ahead = max(0, seq - current_serving_seq)

    # Run AI Waiting Time Model
    qty = booking.get("quantity_quintal", 50.0) if booking else 50.0
    vtype = booking.get("vehicle_type", "Tractor Trolley") if booking else "Tractor Trolley"
    
    ai_prediction = predict_queue_waiting_time(
        farmers_ahead=farmers_ahead,
        active_counters=centre.get("active_counters", 3),
        avg_processing_time_min=centre.get("avg_processing_time_min", 12),
        quantity_quintal=qty,
        vehicle_type=vtype,
        hour_of_day=datetime.now().hour,
        current_load_percentage=centre.get("current_load_percentage", 60)
    )

    return {
        "status": "success",
        "centre_id": centre_id,
        "centre_name": centre["name"],
        "current_serving_token": centre["serving_token_number"],
        "current_serving_seq": current_serving_seq,
        "your_token": token_key,
        "your_seq": seq,
        "farmers_ahead": farmers_ahead,
        "estimated_wait_time_minutes": ai_prediction["estimated_minutes"],
        "min_estimated_minutes": ai_prediction["min_estimated_minutes"],
        "max_estimated_minutes": ai_prediction["max_estimated_minutes"],
        "queue_health": ai_prediction["congestion_level"],
        "explanation": ai_prediction["explanation"],
        "last_updated": datetime.now().strftime("%I:%M:%S %p")
    }


@app.post("/api/queue/{centre_id}/advance")
def advance_queue_token(centre_id: str):
    """Mandi operator advances current serving token number."""
    result = db.advance_queue(centre_id)
    return {"status": "success", "data": result}


# -------------------------------------------------------------
# 4. MANDI OPERATOR TERMINAL APIS (7-STAGE WORKFLOW)
# -------------------------------------------------------------
@app.post("/api/operator/action")
def perform_operator_action(payload: Dict[str, Any]):
    centre_id = payload.get("centre_id", "centre-a")
    centre = db.get_centre(centre_id)
    if not centre:
        raise HTTPException(status_code=404, detail="Centre not found")

    action = payload.get("action")
    if action == "call_next":
        res = db.advance_queue(centre_id)
        return {"status": "success", "action": "call_next", "data": res}

    raw_token = payload.get("token_number", "")
    token_key = normalize_token_key(raw_token)
    booking = db.get_booking(token_key)

    if not booking and action != "broadcast_delay":
        raise HTTPException(status_code=404, detail=f"Booking not found for token '{token_key}'")

    if action == "mark_arrived":
        booking["status"] = "ARRIVED"
        booking["arrived_at"] = datetime.now().strftime("%I:%M %p")
        return {"status": "success", "message": f"Farmer {booking['farmer_name']} marked ARRIVED at Gate.", "data": booking}

    elif action == "record_weighing":
        weigh_data = payload.get("weighbridge_data", {})
        if weigh_data:
            booking["weighbridge"] = weigh_data
            if "net_weight_quintal" in weigh_data:
                booking["quantity_quintal"] = float(weigh_data["net_weight_quintal"])
            booking["status"] = "WEIGHING_COMPLETED"
        return {"status": "success", "message": "Weighbridge gross & tare weights recorded.", "data": booking}

    elif action == "record_quality":
        quality_data = payload.get("quality_data", {})
        if quality_data:
            booking["quality"] = quality_data
            booking["status"] = "QUALITY_VERIFIED"
        return {"status": "success", "message": "Quality inspection and moisture assay recorded.", "data": booking}

    elif action == "complete_procurement":
        booking["status"] = "PROCURED"
        booking["procured_at"] = datetime.now().strftime("%Y-%m-%d %H:%M")
        net_qty = booking.get("weighbridge", {}).get("net_weight_quintal", booking["quantity_quintal"])
        msp_rate = booking.get("msp_rate_per_quintal", 2425.0)
        total_payout = round(net_qty * msp_rate, 2)
        booking["total_payout_inr"] = total_payout

        db.sms_logs.append({
            "id": f"SMS-{datetime.now().strftime('%M%S')}",
            "recipient_mobile": booking["farmer_mobile"],
            "farmer_name": booking["farmer_name"],
            "token_number": token_key,
            "category": "PROCUREMENT_COMPLETED",
            "title": "✅ Procurement Successful / खरीद पूर्ण",
            "message_text": f"KisanQueue: खरीद पर्ची जारी। कुल वजन: {net_qty} क्विंटल, दर: ₹{msp_rate}/Q, कुल राशि: ₹{total_payout:,.2f} स्वीकृत।",
            "timestamp": datetime.now().strftime("%I:%M %p"),
            "sent_via": "KisanSMS-GovPush"
        })
        return {"status": "success", "message": "Procurement completed and MSP sanction issued.", "data": booking}

    elif action == "initiate_payment":
        booking["status"] = "PAYMENT_INITIATED"
        tx_id = f"DBT-PFMS-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        net_qty = booking.get("weighbridge", {}).get("net_weight_quintal", booking["quantity_quintal"])
        msp_rate = booking.get("msp_rate_per_quintal", 2425.0)
        total_payout = round(net_qty * msp_rate, 2)
        
        booking["payment"] = {
            "transaction_id": tx_id,
            "total_amount_inr": total_payout,
            "dbt_status": "CREDITED_PFMS",
            "pfms_reference": f"GOV-AGRI-{tx_id[-8:]}",
            "disbursed_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        db.sms_logs.append({
            "id": f"SMS-DBT-{datetime.now().strftime('%M%S')}",
            "recipient_mobile": booking["farmer_mobile"],
            "farmer_name": booking["farmer_name"],
            "token_number": token_key,
            "category": "PAYMENT_ALERT",
            "title": "💰 DBT Payment Credited",
            "message_text": f"DBT Alert: राशि ₹{total_payout:,.2f} आपके बैंक खाते में PFMS संदर्भ {booking['payment']['pfms_reference']} द्वारा प्रेषित कर दी गई है।",
            "timestamp": datetime.now().strftime("%I:%M %p"),
            "sent_via": "KisanSMS-GovPush"
        })
        return {"status": "success", "message": "Direct Benefit Transfer (DBT) payment sanctioned.", "data": booking}

    elif action == "broadcast_delay":
        delay_mins = payload.get("delay_minutes", 30)
        msg = payload.get("broadcast_message") or f"केंद्र पर अधिक भार के कारण स्लॉट {delay_mins} मिनट आगे बढ़ा दिया गया है।"
        
        db.sms_logs.append({
            "id": f"SMS-BROAD-{datetime.now().strftime('%M%S')}",
            "recipient_mobile": "All Waiting Farmers",
            "farmer_name": "Broadcast",
            "token_number": "ALL",
            "category": "SLOT_RESCHEDULE",
            "title": "⚠️ Mandi Delay Alert",
            "message_text": f"KisanQueue Mandi Alert: {msg}",
            "timestamp": datetime.now().strftime("%I:%M %p"),
            "sent_via": "KisanSMS-GovPush"
        })
        return {"status": "success", "message": "Broadcast alert sent to all farmers."}

    return {"status": "error", "message": "Invalid operator action"}


# -------------------------------------------------------------
# 5. DISTRICT ADMIN & GIS DASHBOARD APIS
# -------------------------------------------------------------
@app.get("/api/admin/metrics")
def get_district_admin_metrics():
    centres = db.get_centres()
    load_analysis = analyze_mandi_load_balance(centres)
    
    return {
        "status": "success",
        "district": "Karnal",
        "state": "Haryana",
        "total_centres": 48,
        "active_centres": 45,
        "farmers_today": 3821,
        "procurement_completed_metric_tonnes": 2941.5,
        "total_msp_disbursed_crores": 71.32,
        "district_avg_wait_time_min": 42,
        "load_analysis": load_analysis,
        "centres_summary": [
            {
                "id": c["id"],
                "name": c["name"],
                "load": c["current_load_percentage"],
                "status": c["status"],
                "current_token": c["serving_token_number"],
                "avg_wait": c["avg_processing_time_min"] * 3
            } for c in centres
        ]
    }


@app.get("/api/sms_logs")
def get_sms_logs():
    return {"status": "success", "count": len(db.sms_logs), "data": list(reversed(db.sms_logs))}


@app.post("/api/help/complaint")
def register_complaint(payload: Dict[str, Any]):
    record = db.add_complaint(payload)
    return {"status": "success", "message": "Complaint registered successfully", "data": record}


# -------------------------------------------------------------
# 6. STATIC FRONTEND SERVING (Root Mount)
# -------------------------------------------------------------
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
