# 🌾 KisanQueue (किसान कतार) — Smart Farmer Procurement & Real-Time Queue Management Platform

[![SIH Ready](https://img.shields.io/badge/Smart_India_Hackathon-2026-brightgreen.svg)](https://kisanqueue.gov.in)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com)
[![Multilingual](https://img.shields.io/badge/Languages-Hindi%20%7C%20English%20%7C%20Punjabi%20%7C%20Marathi%20%7C%20Telugu-orange.svg)](#)
[![Zero-Config Deploy](https://img.shields.io/badge/Deploy-Vercel%20%7C%20Netlify%20%7C%20Render%20%7C%20GitHub%20Pages-blue.svg)](#)

---

## 📌 Problem Solved
Farmers across Indian agricultural mandis regularly endure **12 to 24 hours of waiting in line**, arbitrary slot timing, lack of schedule visibility, middleman exploitation, and uncertainty regarding their Minimum Support Price (MSP) payment disbursal. 

**KisanQueue** eliminates physical mandi congestion by providing:
1. **Hourly Capacity-Controlled Smart Slot Booking**
2. **Real-Time Live Queue Tracking & AI Wait-Time Radar** (Wait comfortably at home until your turn)
3. **SMS & Push Alerts** ("Only 5 farmers ahead", "Turn active at Weighbridge")
4. **7-Stage Transparent Procurement & DBT PFMS Tracker**
5. **AI District-Wide Mandi Load Balancing & Overflow Rerouting**
6. **Smart Missed Slot Recovery Engine**

---

## 👥 Three Core User Roles

| Role | Key Capabilities |
|---|---|
| **👨‍🌾 Farmer Portal** | • Book hourly procurement slots<br>• View Real-Time Queue Radar (`#A-37` serving vs `#A-52` your token, 15 ahead, 47 min wait)<br>• 7-Stage Procurement Status (Booking → Arrived → Weighing → Quality FAQ → Mandi Slip → DBT Sanction → Credited)<br>• Download / Print Digital Gate Pass with QR code<br>• Text-to-Speech Voice Readout in Hindi/English<br>• Missed Slot 1-Click Recovery |
| **👨‍💼 Mandi Operator** | • Live Mandi Counters (Booked: 82, Completed: 36, Waiting: 46)<br>• Call Next Token & Gate QR Check-in<br>• Weighbridge Gross & Tare Entry with Net Quintals Calculator<br>• Grain Moisture & Fair Average Quality (FAQ) Grade Certification<br>• Issue Official Mandi Procurement Slip & Trigger Instant Direct Benefit Transfer (DBT) |
| **👨‍💻 District Admin / Govt** | • GIS District Heatmap displaying all procurement centres with live load radar rings<br>• District Procurement Metrics (3,821 farmers, 2,941 MT procured, ₹71.32 Cr disbursed)<br>• AI Load Rebalancing: Divert traffic from high-load centres (Centre A 92%) to low-load sub-mandis (Centre B 42%) |

---

## 🚀 Key SIH Innovation Features

- 🚀 **Feature 1 — AI Smart Queue Wait-Time Predictor**: Mathematical model factoring parallel weighbridges, vehicle offloading dynamics (Tractor vs Bolero vs Heavy Truck), batch volume, and moisture testing overhead.
- 🚀 **Feature 2 — Capacity-Aware Slot Allocator**: Prevents 8 AM morning stampedes by distributing farmers across 1-hour regulated windows.
- 🚀 **Feature 3 — Nearby Centre Smart Recommendation**: Proactively flags 92% congested mandis and recommends underutilized green-zone mandis (e.g. Centre B 7 km away with 65% faster processing).
- 🚀 **Feature 4 — Missed Slot Auto-Recovery**: Re-slots delayed farmers into the nearest optimal slot without losing queue seniority.
- 🚀 **Feature 5 — District Mandi Load Balancing**: Live GIS algorithm computing optimal diversion routes across district procurement centers.
- 🚀 **Feature 6 — Multilingual & Voice Readout**: 5 Indian languages (Hindi, English, Punjabi, Marathi, Telugu) with Web Speech API audio announcements.
- 🚀 **Feature 7 — Offline SMS Gateway Simulation**: SMS inbox drawer emulating government push alerts for non-smartphone users.

---

## 🛠️ Quick Local Setup

### Running with Python (FastAPI + Frontend)
```bash
# 1. Clone or navigate to the project directory
cd C:\Users\Keshav\.gemini\antigravity\scratch\kisanqueue

# 2. Run the launcher script
python run.py
```
> The application will start at `http://127.0.0.1:8000` and automatically open in your web browser!

---

## 🌐 Instant 1-Click Cloud Deployment

### 1. Deploy on Vercel
Simply import this repository into [Vercel](https://vercel.com). The included `vercel.json` will instantly deploy the frontend.

### 2. Deploy on Netlify
Drag and drop the `frontend/` folder into [Netlify Drop](https://app.netlify.com/drop) or link Git with the included `netlify.toml`.

### 3. Deploy on GitHub Pages
Go to your GitHub Repository Settings → Pages → Select `/frontend` as the source root.

---

## 📊 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/centres` | List all mandi centres with live load percentages |
| `GET` | `/api/centres/{id}/slots` | Get hourly slot availability for a centre |
| `POST` | `/api/bookings` | Book a slot and issue digital QR token |
| `GET` | `/api/bookings/{token}` | Get full 7-stage procurement status for a token |
| `GET` | `/api/queue/{centre_id}/{token}` | Real-time queue position & AI wait-time estimation |
| `POST` | `/api/operator/action` | Perform operator workflows (Arrived, Weighing, Quality, DBT) |
| `GET` | `/api/admin/metrics` | District-wide procurement analytics and load balancing suggestions |
| `GET` | `/api/sms_logs` | Retrieve simulated government SMS logs |
