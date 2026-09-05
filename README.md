# 🌾 ANNASETU (अन्नसेतु) — Smart Agricultural Procurement & Farmer Queue Platform

> **स्मार्ट कृषि खरीद एवं किसान कतार प्रबंधन प्रणाली**
> *Academic Demonstration Prototype · Department of Food & Public Distribution (DFPD) & Agriculture Ministry Adherent*

[![SIH Ready](https://img.shields.io/badge/Academic_Prototype-AnnaSetu-amber.svg)](#)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-0f172a.svg)](https://fastapi.tiangolo.com)
[![SMS Engine](https://img.shields.io/badge/SMS_Gateway-Fast2SMS%20%7C%20Twilio%20%7C%20MSG91-blue.svg)](#)
[![Multilingual](https://img.shields.io/badge/Languages-Hindi%20%7C%20English%20%7C%20Punjabi%20%7C%20Marathi%20%7C%20Telugu-orange.svg)](#)
[![Zero-Config Deploy](https://img.shields.io/badge/Deploy-Vercel%20%7C%20Netlify%20%7C%20Render%20%7C%20GitHub%20Pages-slate.svg)](#)

---

## 📌 Problem Statement & Solution

Farmers across Indian agricultural mandis regularly endure **12 to 24 hours of queue congestion**, arbitrary slot timing, lack of schedule visibility, middleman exploitation, and uncertainty regarding their Minimum Support Price (MSP) payment disbursal via PFMS.

**ANNASETU (अन्नसेतु)** eliminates physical mandi congestion and brings full transparency through:
1. **Hourly Capacity-Controlled Smart Slot Booking** (1-Hour regulated windows)
2. **Real-Time Live Queue Tracking & AI Wait-Time Radar** (Wait comfortably at home until your turn)
3. **Dynamic Real-World SMS Delivery Engine** (Supports Fast2SMS, Twilio, MSG91, and Generic HTTP Gateways)
4. **7-Stage Transparent Procurement & DBT PFMS Tracker**
5. **District Mandi GIS Heatmap & Load Balancer** (Leaflet + OpenStreetMap)
6. **Smart Missed Slot Recovery Engine** (Reschedules missed slots without queue penalty)

---

## 👥 Three Core Operational Portals

| Role | Key Capabilities |
|---|---|
| **🌾 Farmer Portal** | • Book hourly procurement slots with live capacity feedback<br>• View Real-Time Queue Radar (`#A-37` serving vs `#A-52` your token, 15 ahead, ~35 min wait)<br>• 7-Stage Procurement Status (Booking → Arrived → Weighing → Quality FAQ → Mandi Slip → DBT Sanction → Credited)<br>• Download / Print Digital Gate Pass with verifiable QR code<br>• Text-to-Speech Voice Readout in Hindi & English<br>• 1-Click Missed Slot Recovery |
| **⚖️ Mandi Operator** | • Live Mandi Counters (Booked, Serving, Active Desks, Avg Clearance)<br>• Call Next Token & Mandi Gate QR Arrival Check-in<br>• Weighbridge Gross & Tare Entry with Net Quintals Calculator<br>• Grain Moisture & Fair Average Quality (FAQ 12% standard) Grade Certification<br>• Issue Official Mandi Procurement Slip & Trigger Instant Direct Benefit Transfer (DBT) |
| **🏛️ District Admin (SSO)** | • District Mandi GIS Telemetry Map displaying all 4 procurement centres with load rings<br>• District Procurement Telemetry (3,821 farmers, 2,941 MT procured, ₹71.32 Cr disbursed)<br>• AI Load Rebalancing: Divert traffic from congested centres (Centre A 92%) to low-load sub-mandis (Centre B 42%)<br>• Real-Time SMS Alert Monitoring & Delivery Audit Trail |

---

## 📱 Dynamic SMS Delivery Engine

AnnaSetu features a pluggable, production-ready SMS gateway architecture (`backend/sms_providers.py`):

### Supported Providers:
- **Fast2SMS**: Direct Indian DLT/Quick SMS routes.
- **Twilio**: Global REST SMS Gateway.
- **MSG91**: Enterprise Indian transactional flow SMS.
- **Generic HTTP Gateway**: Webhook or custom NIC/CDAC SMS gateways.
- **Demo Provider**: Simulated local delivery for development and academic demonstrations.

### Configuration (`.env`):
Copy `.env.example` to `.env` to configure your SMS provider:
```bash
cp .env.example .env
```
Edit `.env`:
```env
# Mode: 'demo' (simulation) or 'production' (real SMS)
SMS_MODE=production
SMS_PROVIDER=fast2sms
FAST2SMS_API_KEY=your_actual_fast2sms_api_key_here
```

### Strict Dynamic Routing Rules:
- The SMS recipient is **always dynamically obtained** from the current farmer's booking, transaction, or user mobile number.
- Numbers are normalized to standard 10-digit Indian formats (`+91`, `91`, leading `0`, spaces, and dashes stripped).
- In the UI, application notifications ("Token #A-41 booked") and SMS delivery statuses ("SMS: SENT to +91 98... via Fast2SMS") are clearly distinguished.
- The system reports `SENT` or `ACCEPTED` upon gateway API acceptance, and only `DELIVERED` when confirmed by the provider or in simulation mode.

---

## 🛠️ Quick Local Setup

```bash
# 1. Run the launcher script (Starts FastAPI backend on port 8000)
python3 run.py --no-browser
```
Access the application in your browser at `http://127.0.0.1:8000`.

### Running Automated Test Suites:
```bash
# Run backend unit tests (Database, Auth, Booking, Normalization, SMS Providers)
python3 backend/test_core.py

# Run live API integration tests
python3 scratch/test_live_api.py
```

---

## 📊 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/centres` | List all mandi centres with live load percentages |
| `GET` | `/api/centres/{id}/slots` | Get hourly slot availability for a centre |
| `POST` | `/api/bookings` | Book a slot, issue digital token, and dispatch dynamic SMS |
| `GET` | `/api/bookings/{token}` | Get full 7-stage procurement status for a token |
| `POST` | `/api/bookings/{token}/cancel` | Cancel booking and release slot capacity |
| `GET` | `/api/queue/{centre_id}/{token}` | Real-time queue position & AI wait-time estimation |
| `POST` | `/api/payments/initiate` | Initiate DBT payment voucher via PFMS |
| `POST` | `/api/payments/verify` | Verify DBT disbursal and issue official receipt |
| `POST` | `/api/gate-entry/register` | Register mandi physical arrival and issue official Gate Pass |
| `GET` | `/api/admin/metrics` | District-wide procurement telemetry and rebalancing analysis |
| `GET` | `/api/admin/notifications` | Audit trail of all dispatched SMS alerts and provider delivery statuses |
| `POST` | `/api/help/complaint` | File farmer grievance with CPGRAMS tracking |

