/**
 * ANNASETU (अन्नसेतु) — Standalone Mock Data & In-Browser Fallback Engine
 * Provides realistic mandi data, route guidance, complaints, and simulated responses.
 */

const MockData = (() => {
  const centres = [
    {
      id: "centre-a",
      name: "Centre A - Grain Market Karnal (मुख्य अनाज मंडी करनाल)",
      code: "KNL-MND-01",
      district: "Karnal",
      state: "Haryana",
      lat: 29.6857,
      lng: 76.9905,
      distance_km: 2.5,
      total_daily_capacity: 100,
      current_load_percentage: 92,
      status: "red",
      active_counters: 3,
      avg_processing_time_min: 12,
      current_token: 37,
      serving_token_number: "#A-37",
      address: "GT Road, Near Railway Overbridge, Karnal, Haryana 132001",
      gate_entry: "Gate 1 (North Weighbridge Entrance)",
      route_tips: "Take NH44 towards GT Road Flyover, turn right at Anaj Mandi Chowk. Dedicated tractor lane on Gate 1.",
      contact_phone: "+91 184 2259101",
      crops_accepted: ["Wheat (गेहूँ)", "Paddy / Rice (धान)", "Mustard / Sarson (सरसों)"]
    },
    {
      id: "centre-b",
      name: "Centre B - Nilokheri Sub-Mandi (नीलोखेड़ी उप-मंडी)",
      code: "KNL-NLK-02",
      district: "Karnal",
      state: "Haryana",
      lat: 29.8341,
      lng: 76.9172,
      distance_km: 7.2,
      total_daily_capacity: 80,
      current_load_percentage: 42,
      status: "green",
      active_counters: 3,
      avg_processing_time_min: 10,
      current_token: 18,
      serving_token_number: "#B-18",
      address: "Station Road, Nilokheri, Karnal, Haryana 132117",
      gate_entry: "Gate 2 (Sub-Mandi Main Weighbridge)",
      route_tips: "Via State Highway 8. Smooth traffic flow, ample parking near weighbridge.",
      contact_phone: "+91 184 2468200",
      crops_accepted: ["Wheat (गेहूँ)", "Paddy / Rice (धान)", "Gram / Chana (चना)"]
    },
    {
      id: "centre-c",
      name: "Centre C - Indri Procurement Hub (इन्द्री क्रय केंद्र)",
      code: "KNL-IND-03",
      district: "Karnal",
      state: "Haryana",
      lat: 29.8809,
      lng: 77.0601,
      distance_km: 12.0,
      total_daily_capacity: 75,
      current_load_percentage: 28,
      status: "green",
      active_counters: 2,
      avg_processing_time_min: 9,
      current_token: 12,
      serving_token_number: "#C-12",
      address: "Indri-Ladwa Highway, Indri, Karnal, Haryana 132041",
      gate_entry: "Main Procurement Yard Gate",
      route_tips: "Via Karnal-Indri Road. Low traffic, fastest quality assay clearance.",
      contact_phone: "+91 184 2381200",
      crops_accepted: ["Wheat (गेहूँ)", "Mustard / Sarson (सरसों)", "Maize (मक्का)"]
    },
    {
      id: "centre-d",
      name: "Centre D - Gharaunda Mandi Complex (घरौंडा मंडी परिसर)",
      code: "KNL-GHR-04",
      district: "Karnal",
      state: "Haryana",
      lat: 29.5392,
      lng: 76.9723,
      distance_km: 16.5,
      total_daily_capacity: 90,
      current_load_percentage: 68,
      status: "yellow",
      active_counters: 3,
      avg_processing_time_min: 11,
      current_token: 25,
      serving_token_number: "#D-25",
      address: "National Highway 44, Gharaunda, Haryana 132114",
      gate_entry: "Gate 1 & Gate 3",
      route_tips: "Direct access from NH44 Service Lane south of Karnal.",
      contact_phone: "+91 184 2511400",
      crops_accepted: ["Wheat (गेहूँ)", "Paddy / Rice (धान)", "Mustard / Sarson (सरसों)"]
    }
  ];

  const windows = [
    { window: "08:00 - 09:00", display: "08:00 - 09:00 AM", cap: 12, booked: 10, cong: "high" },
    { window: "09:00 - 10:00", display: "09:00 - 10:00 AM", cap: 12, booked: 12, cong: "full" },
    { window: "10:00 - 11:00", display: "10:00 - 11:00 AM", cap: 15, booked: 14, cong: "high" },
    { window: "11:00 - 12:00", display: "11:00 AM - 12:00 PM", cap: 15, booked: 8, cong: "medium" },
    { window: "12:00 - 13:00", display: "12:00 - 01:00 PM", cap: 15, booked: 6, cong: "low" },
    { window: "13:00 - 14:00", display: "01:00 - 02:00 PM", cap: 10, booked: 3, cong: "low" },
    { window: "14:00 - 15:00", display: "02:00 - 03:00 PM", cap: 15, booked: 9, cong: "medium" },
    { window: "15:00 - 16:00", display: "03:00 - 04:00 PM", cap: 12, booked: 5, cong: "low" },
    { window: "16:00 - 17:00", display: "04:00 - 05:00 PM", cap: 10, booked: 2, cong: "low" }
  ];

  const slots = {};
  centres.forEach(c => {
    slots[c.id] = windows.map((w, i) => {
      const actualBooked = c.id === "centre-a" ? w.booked : Math.max(1, Math.floor(w.booked / 2));
      const isAvail = actualBooked < w.cap;
      return {
        id: `${c.id}-slot-${i + 1}`,
        centre_id: c.id,
        date: new Date().toISOString().slice(0, 10),
        time_window: w.window,
        display_time_window: w.display,
        max_capacity: w.cap,
        booked_count: actualBooked,
        is_available: isAvail,
        congestion_level: !isAvail ? "full" : (c.id === "centre-a" ? w.cong : "low")
      };
    });
  });

  const bookings = {
    "#A-52": {
      booking_id: "BK-KNL-2026-0881",
      token_number: "#A-52",
      token_sequence: 52,
      farmer_id: "FID-HR-78921",
      farmer_name: "Ramesh Kumar (रमेश कुमार)",
      farmer_mobile: "9812345678",
      aadhaar_masked: "XXXX-XXXX-4819",
      village: "Taraori ABC (गाँव ताराओड़ी)",
      district: "Karnal (करनाल)",
      state: "Haryana",
      kcc_number: "KCC-882190",
      bank_name: "State Bank of India",
      account_masked: "XXXXXX9012",
      ifsc: "SBIN0001234",
      centre_id: "centre-a",
      centre_name: "Centre A - Grain Market Karnal",
      date: new Date().toISOString().slice(0, 10),
      time_window: "10:00 - 11:00",
      display_time_window: "10:00 - 11:00 AM",
      crop_type: "Wheat (गेहूँ)",
      variety: "HD-2967 (Sharbati Gold)",
      quantity_quintal: 50.0,
      msp_rate_per_quintal: 2425.0,
      total_estimated_value: 121250.0,
      vehicle_type: "Tractor Trolley",
      vehicle_number: "HR-05-AB-7821",
      status: "BOOKED",
      created_at: new Date().toLocaleString(),
      qr_payload: "ANNASETU|TOKEN:#A-52|FARMER:Ramesh Kumar|CENTRE:Centre A|CROP:Wheat|QTY:50Q",
      estimated_arrival: "10:15 AM",
      estimated_wait_time_minutes: 47,
      weighbridge: null,
      quality: null,
      payment: null
    }
  };

  const smsLogs = [
    {
      id: "SMS-101",
      recipient_mobile: "9812345678",
      farmer_name: "Ramesh Kumar",
      token_number: "#A-52",
      category: "BOOKING_CONFIRMATION",
      title: "🌾 Slot Confirmed / स्लॉट पुष्टिकरण",
      message_text: "किसान रमेश कुमार, आपका टोकन #A-52 दिनांक आज 10:00-11:00 AM केंद्र A अनाज मंडी करनाल के लिए बुक हो गया है।",
      timestamp: "08:15 AM",
      is_read: false,
      sent_via: "KisanSMS-GovPush"
    },
    {
      id: "SMS-102",
      recipient_mobile: "9812345678",
      farmer_name: "Ramesh Kumar",
      token_number: "#A-52",
      category: "QUEUE_ALERT",
      title: "🔔 Queue Status Update",
      message_text: "Centre A currently serving Token #A-37. You have 15 farmers ahead. Estimated wait time: 47 mins.",
      timestamp: "09:45 AM",
      is_read: false,
      sent_via: "KisanSMS-GovPush"
    }
  ];

  const complaints = [];

  function calculateWait(farmersAhead, counters, avgTime) {
    if (farmersAhead <= 0) return 0;
    return Math.max(5, Math.round((farmersAhead / Math.max(1, counters)) * avgTime * 1.15));
  }

  return {
    getCentres: async () => ({ status: "success", count: centres.length, data: JSON.parse(JSON.stringify(centres)) }),
    getCentre: async (id) => {
      const c = centres.find(x => x.id === id);
      if (!c) throw new Error("Centre not found");
      return { status: "success", data: JSON.parse(JSON.stringify(c)) };
    },
    getSlots: async (cid) => ({ status: "success", centre_id: cid, data: JSON.parse(JSON.stringify(slots[cid] || [])) }),
    getBooking: async (token) => {
      const key = token.toUpperCase().startsWith("#") ? token.toUpperCase() : `#${token.toUpperCase()}`;
      const b = bookings[key];
      if (!b) throw new Error(`Booking not found for token ${key}`);
      return { status: "success", data: JSON.parse(JSON.stringify(b)) };
    },
    createBooking: async (payload) => {
      const cid = payload.centre_id || "centre-a";
      const c = centres.find(x => x.id === cid) || centres[0];
      const prefix = cid.split("-").pop().toUpperCase();
      const mobile = payload.farmer?.mobile || "9812345678";
      const b_date = payload.date || new Date().toISOString().slice(0, 10);

      // Prevent duplicate booking for same farmer / date
      for (const b of Object.values(bookings)) {
        if (b.farmer_mobile === mobile && b.date === b_date && b.status !== "CANCELLED" && b.status !== "PROCURED") {
          return { status: "success", message: "Existing active booking loaded", data: b };
        }
      }

      const seq = Object.keys(bookings).length + 1 + (c.current_token || 1);
      const tokenNo = `#${prefix}-${seq}`;
      const qty = parseFloat(payload.crop?.estimated_quantity_quintal) || 50;
      const crop = payload.crop?.crop_type || "Wheat (गेहूँ)";
      const msp = 2425;

      const newBooking = {
        booking_id: `BK-${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        token_number: tokenNo,
        token_sequence: seq,
        farmer_id: payload.farmer?.farmer_id || `FID-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
        farmer_name: payload.farmer?.name || "Farmer",
        farmer_mobile: mobile,
        aadhaar_masked: "XXXX-XXXX-4819",
        village: payload.farmer?.village || "Karnal Rural",
        district: "Karnal",
        state: "Haryana",
        kcc_number: "KCC-991204",
        bank_name: "State Bank of India",
        account_masked: "XXXXXX9012",
        ifsc: "SBIN0001234",
        centre_id: cid,
        centre_name: c.name,
        date: b_date,
        time_window: payload.time_window || "10:00 - 11:00",
        display_time_window: payload.time_window || "10:00 - 11:00 AM",
        crop_type: crop,
        variety: "HD-2967 (Sharbati)",
        quantity_quintal: qty,
        msp_rate_per_quintal: msp,
        total_estimated_value: qty * msp,
        vehicle_type: payload.vehicle_type || "Tractor Trolley",
        vehicle_number: `HR-05-AB-${Math.floor(1000 + Math.random() * 9000)}`,
        status: "BOOKED",
        created_at: new Date().toLocaleString(),
        qr_payload: `ANNASETU|TOKEN:${tokenNo}|FARMER:${payload.farmer?.name}|CENTRE:${c.name}|QTY:${qty}Q`,
        estimated_arrival: "10:15 AM",
        estimated_wait_time_minutes: 35,
        weighbridge: null,
        quality: null,
        payment: null
      };
      bookings[tokenNo] = newBooking;

      const slotList = slots[cid] || [];
      const targetSlot = slotList.find(s => s.time_window.startsWith(payload.time_window?.slice(0, 5)) || s.display_time_window?.startsWith(payload.time_window?.slice(0, 5)));
      if (targetSlot) {
        targetSlot.booked_count += 1;
        targetSlot.is_available = targetSlot.booked_count < targetSlot.max_capacity;
      }

      smsLogs.unshift({
        id: `SMS-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        recipient_mobile: newBooking.farmer_mobile,
        farmer_name: newBooking.farmer_name,
        token_number: tokenNo,
        category: "BOOKING_CONFIRMATION",
        title: "🌾 Booking Confirmed / टोकन पुष्टिकरण",
        message_text: `AnnaSetu: आपका टोकन ${tokenNo} बुक हो गया है (${c.name})।`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        is_read: false,
        sent_via: "AnnaSetu-SMS-GovPush"
      });

      return { status: "success", message: "Slot booked successfully", data: newBooking };
    },
    recoverSlot: async (tokenNumber, payload) => {
      const key = tokenNumber.toUpperCase().startsWith("#") ? tokenNumber.toUpperCase() : `#${tokenNumber.toUpperCase()}`;
      const b = bookings[key];
      if (!b) throw new Error("Token not found");
      const cid = b.centre_id;
      const slotList = slots[cid] || [];
      const avail = slotList.filter(s => s.is_available);
      const nextSlot = avail.length > 0 ? avail.reduce((min, s) => s.booked_count < min.booked_count ? s : min, avail[0]) : slotList[0];
      
      b.time_window = nextSlot.time_window;
      b.display_time_window = nextSlot.display_time_window;
      b.status = "BOOKED";

      smsLogs.unshift({
        id: `SMS-REC-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        recipient_mobile: b.farmer_mobile,
        farmer_name: b.farmer_name,
        token_number: key,
        category: "SLOT_RESCHEDULE",
        title: "🔄 Missed Slot Recovered",
        message_text: `AnnaSetu: आपका टोकन ${key} नए समय ${b.display_time_window} पर री-शेड्यूल किया गया।`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        is_read: false,
        sent_via: "AnnaSetu-SMS-GovPush"
      });

      return { status: "success", message: "Slot recovered dynamically", data: b };
    },
    getQueueStatus: async (centreId, tokenNumber) => {
      const key = tokenNumber.toUpperCase().startsWith("#") ? tokenNumber.toUpperCase() : `#${tokenNumber.toUpperCase()}`;
      const c = centres.find(x => x.id === centreId) || centres[0];
      const b = bookings[key];
      const seq = b ? b.token_sequence : 52;
      const currentServing = c.current_token || 37;
      const ahead = Math.max(0, seq - currentServing);
      const wait = calculateWait(ahead, c.active_counters, c.avg_processing_time_min);

      return {
        status: "success",
        centre_id: c.id,
        centre_name: c.name,
        current_serving_token: c.serving_token_number,
        current_serving_seq: currentServing,
        your_token: key,
        your_seq: seq,
        farmers_ahead: ahead,
        estimated_wait_time_minutes: wait,
        queue_health: wait > 50 ? "High Congestion (🔴)" : (wait > 25 ? "Normal (🟡)" : "Smooth (🟢)"),
        explanation: `Based on ${ahead} farmers ahead across ${c.active_counters} active weighing desks.`,
        last_updated: new Date().toLocaleTimeString()
      };
    },
    operatorAction: async (payload) => {
      const cid = payload.centre_id || "centre-a";
      const c = centres.find(x => x.id === cid) || centres[0];

      if (payload.action === "call_next") {
        c.current_token += 1;
        const prefix = cid.split("-").pop().toUpperCase();
        c.serving_token_number = `#${prefix}-${c.current_token}`;
        return { status: "success", action: "call_next", data: { centre_id: cid, current_token: c.current_token, serving_token_number: c.serving_token_number } };
      }

      const raw = payload.token_number || "";
      const key = raw.toUpperCase().startsWith("#") ? raw.toUpperCase() : `#${raw.toUpperCase()}`;
      const b = bookings[key];
      if (!b && payload.action !== "broadcast_delay") throw new Error("Token not found");

      if (payload.action === "mark_arrived") {
        b.status = "ARRIVED";
      } else if (payload.action === "record_weighing") {
        b.weighbridge = payload.weighbridge_data || { gross_weight_quintal: 52.5, tare_weight_quintal: 2.5, net_weight_quintal: 50.0, weighbridge_slip_no: "WB-DEMO-01" };
        b.quantity_quintal = b.weighbridge.net_weight_quintal;
        b.status = "WEIGHING_COMPLETED";
      } else if (payload.action === "record_quality") {
        b.quality = payload.quality_data || { moisture_percentage: 11.2, foreign_matter_percentage: 1.0, damaged_grains_percentage: 0.5, grade: "Grade A", approved: true };
        b.status = "QUALITY_VERIFIED";
      } else if (payload.action === "complete_procurement") {
        b.status = "PROCURED";
        b.total_payout_inr = b.quantity_quintal * 2425;
      } else if (payload.action === "initiate_payment") {
        b.status = "PAYMENT_INITIATED";
        b.payment = {
          transaction_id: `DBT-PFMS-${Date.now()}`,
          total_amount_inr: (b.quantity_quintal || 50) * 2425,
          dbt_status: "CREDITED_PFMS",
          pfms_reference: `GOV-AGRI-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
          disbursed_at: new Date().toLocaleString()
        };
      }
      return { status: "success", message: `Action ${payload.action} completed`, data: b };
    },
    getAdminMetrics: async () => ({
      status: "success",
      district: "Karnal",
      state: "Haryana",
      total_centres: 48,
      active_centres: 45,
      farmers_today: 3821,
      procurement_completed_metric_tonnes: 2941.5,
      total_msp_disbursed_crores: 71.32,
      district_avg_wait_time_min: 42,
      centres_summary: centres.map(c => ({
        id: c.id,
        name: c.name,
        load: c.current_load_percentage,
        status: c.status,
        current_token: c.serving_token_number,
        avg_wait: c.avg_processing_time_min * 3
      })),
      load_analysis: {
        recommendations: [
          {
            source_centre_name: "Centre A - Grain Market Karnal",
            source_load: 92,
            target_centre_name: "Centre B - Nilokheri Sub-Mandi",
            target_load: 42,
            distance_km: 7.2,
            estimated_time_saving_min: 45,
            action_recommended: "Divert incoming slot bookings from Centre A to Centre B for 45% faster clearance."
          }
        ]
      }
    }),
    getSmsLogs: async () => ({ status: "success", count: smsLogs.length, data: JSON.parse(JSON.stringify(smsLogs)) }),
    registerComplaint: async (payload) => {
      const cmp = {
        complaint_id: `CMP-${Date.now().toString().slice(-6)}`,
        farmer_name: payload.name || "Farmer",
        token_number: payload.token_number || "",
        category: payload.category || "Queue Delay",
        description: payload.description || "",
        status: "SUBMITTED",
        assigned_to: "Mandi Secretary Officer",
        resolution_eta: "Within 2 Hours",
        timestamp: new Date().toLocaleString()
      };
      complaints.unshift(cmp);
      return { status: "success", message: "Complaint registered successfully", data: cmp };
    }
  };
})();
