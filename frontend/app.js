/**
 * KisanQueue (किसान कतार) — Frontend Application Engine
 * Dual-Mode Architecture: Live FastAPI backend + In-browser mock fallback.
 */

const STATE = {
  lang: "hi",
  role: "farmer",
  user: null,
  centres: [],
  operatorCentreId: "centre-a",
  myTokenNumber: null,
  myBooking: null,
  queueStatus: null,
  smsLogs: [],
  bookingCentreChoice: null,
  isOfflineMode: false,
  pollTimer: null,
  lastSyncTime: null,
  suggestedRecoverySlot: "12:00 - 13:00"
};

// -------------------------------------------------------------
// DUAL-MODE API HELPER
// -------------------------------------------------------------
async function api(path, method = "GET", body = null) {
  try {
    const opts = { method, headers: { "Content-Type": "application/json" } };
    if (body !== null) opts.body = JSON.stringify(body);
    
    // Attempt real backend call
    const res = await fetch(path, opts);
    const contentType = res.headers.get("content-type") || "";
    
    if (!res.ok || !contentType.includes("application/json")) {
      throw new Error(`Server returned status ${res.status}`);
    }
    
    const data = await res.json();
    setOfflineMode(false);
    return data;
  } catch (err) {
    // Transparently fall back to client-side MockData
    setOfflineMode(true);
    return fallbackMockApi(path, method, body);
  }
}

function setOfflineMode(isOffline) {
  const wasOffline = STATE.isOfflineMode;
  STATE.isOfflineMode = isOffline;
  const banner = document.getElementById("offline-mode-banner");
  const bannerText = document.getElementById("offline-banner-text");

  if (banner) {
    if (isOffline) {
      banner.classList.remove("hidden");
      const timeStr = STATE.lastSyncTime || new Date().toLocaleTimeString();
      if (bannerText) bannerText.textContent = `📶 ऑफलाइन मोड — अंतिम सिंक: ${timeStr} (Cached Data)`;
    } else {
      if (wasOffline) {
        showToast("✓ सर्वर से पुनः कनेक्ट हुआ (Data updated)", "success");
      }
      banner.classList.add("hidden");
    }
  }
}

async function fallbackMockApi(path, method, body) {
  if (path === "/api/centres") return MockData.getCentres();
  if (path.startsWith("/api/centres/") && path.endsWith("/slots")) {
    const cid = path.split("/")[3];
    return MockData.getSlots(cid);
  }
  if (path.startsWith("/api/centres/")) {
    const cid = path.split("/")[3];
    return MockData.getCentre(cid);
  }
  if (path === "/api/bookings" && method === "POST") return MockData.createBooking(body);
  if (path.startsWith("/api/bookings/") && path.includes("/recover_slot")) {
    const token = decodeURIComponent(path.split("/")[3]);
    return MockData.recoverSlot(token, body);
  }
  if (path.startsWith("/api/bookings/")) {
    const token = decodeURIComponent(path.split("/")[3]);
    return MockData.getBooking(token);
  }
  if (path.startsWith("/api/queue/") && !path.includes("/advance")) {
    const parts = path.split("/");
    const cid = parts[3];
    const token = decodeURIComponent(parts[4]);
    return MockData.getQueueStatus(cid, token);
  }
  if (path.startsWith("/api/operator/action")) return MockData.operatorAction(body);
  if (path === "/api/admin/metrics") return MockData.getAdminMetrics();
  if (path === "/api/sms_logs") return MockData.getSmsLogs();
  if (path === "/api/help/complaint") return MockData.registerComplaint(body);

  throw new Error(`Endpoint not mapped in mock fallback: ${path}`);
}

// -------------------------------------------------------------
// AUTHENTICATION (Lightweight Browser Store)
// -------------------------------------------------------------
function getUsers() {
  try { return JSON.parse(localStorage.getItem("kq_users") || "[]"); } catch { return []; }
}
function saveUsers(users) { localStorage.setItem("kq_users", JSON.stringify(users)); }

function setAuthTab(tab) {
  const isLogin = tab === "login";
  document.getElementById("login-form").classList.toggle("hidden", !isLogin);
  document.getElementById("register-form").classList.toggle("hidden", isLogin);
  document.getElementById("auth-tab-login").className = isLogin ? "auth-tab flex-1 py-2 rounded-lg text-sm font-bold bg-emerald-700 text-white shadow" : "auth-tab flex-1 py-2 rounded-lg text-sm font-bold text-slate-600";
  document.getElementById("auth-tab-register").className = !isLogin ? "auth-tab flex-1 py-2 rounded-lg text-sm font-bold bg-emerald-700 text-white shadow" : "auth-tab flex-1 py-2 rounded-lg text-sm font-bold text-slate-600";
}

function handleRegister(event) {
  event.preventDefault();
  const name = document.getElementById("reg-name").value.trim();
  const mobile = document.getElementById("reg-mobile").value.trim();
  const village = document.getElementById("reg-village").value.trim();
  const password = document.getElementById("reg-password").value;
  const errEl = document.getElementById("register-error");
  errEl.classList.add("hidden");

  const users = getUsers();
  if (users.some(u => u.mobile === mobile)) {
    errEl.textContent = "इस मोबाइल नंबर से पहले से खाता मौजूद है। कृपया लॉगिन करें।";
    errEl.classList.remove("hidden");
    return;
  }
  const farmerId = "FID-" + Math.random().toString(36).slice(2, 7).toUpperCase();
  users.push({ name, mobile, village, password, farmerId });
  saveUsers(users);
  loginAs({ name, mobile, village, farmerId, tokenNumber: null });
  showToast("खाता सफलतापूर्वक बना! अब अपना पहला स्लॉट बुक करें।", "success");
  setTimeout(openBookingModal, 400);
}

function handleLogin(event) {
  event.preventDefault();
  const mobile = document.getElementById("login-mobile").value.trim();
  const password = document.getElementById("login-password").value;
  const errEl = document.getElementById("login-error");
  errEl.classList.add("hidden");

  const users = getUsers();
  const found = users.find(u => u.mobile === mobile && u.password === password);
  if (!found) {
    errEl.textContent = "गलत मोबाइल नंबर या पासवर्ड।";
    errEl.classList.remove("hidden");
    return;
  }
  loginAs({ ...found, tokenNumber: found.tokenNumber || null });
}

function handleDemoLogin() {
  loginAs({
    name: "Ramesh Kumar (रमेश कुमार)",
    mobile: "9812345678",
    village: "Taraori ABC, Karnal",
    farmerId: "FID-HR-78921",
    tokenNumber: "#A-52"
  });
}

function loginAs(user) {
  STATE.user = user;
  STATE.myTokenNumber = user.tokenNumber || (user.mobile === "9812345678" ? "#A-52" : null);
  localStorage.setItem("kq_session", JSON.stringify(user));
  document.getElementById("view-auth").classList.add("hidden");
  document.getElementById("app-shell").classList.remove("hidden");
  document.getElementById("user-avatar").textContent = (user.name || "?").charAt(0).toUpperCase();
  document.getElementById("user-menu-name").textContent = user.name;
  document.getElementById("user-menu-mobile").textContent = user.mobile;
  document.getElementById("farmer-profile-name").textContent = "नमस्ते, " + user.name;
  document.getElementById("farmer-profile-details").textContent =
    `गाँव: ${user.village} | किसान ID: ${user.farmerId}`;
  bootApp();
}

function logout() {
  localStorage.removeItem("kq_session");
  if (STATE.pollTimer) clearInterval(STATE.pollTimer);
  STATE.user = null;
  STATE.myTokenNumber = null;
  document.getElementById("app-shell").classList.add("hidden");
  document.getElementById("view-auth").classList.remove("hidden");
}

function tryRestoreSession() {
  try {
    const saved = JSON.parse(localStorage.getItem("kq_session") || "null");
    if (saved) { loginAs(saved); return true; }
  } catch {}
  return false;
}

// -------------------------------------------------------------
// UI CHROME, MULTILINGUAL & NAVIGATION
// -------------------------------------------------------------
function changeLanguage(langCode) {
  STATE.lang = langCode;
  const sel = document.getElementById("lang-select");
  if (sel) sel.value = langCode;
  if (typeof translateUI === "function") {
    translateUI(langCode);
  }
}

function setRole(roleName) {
  STATE.role = roleName;
  document.querySelectorAll(".role-tab-btn").forEach(b => {
    const active = b.dataset.role === roleName;
    b.className = active ? "role-tab-btn px-3.5 py-1.5 rounded-lg text-xs font-bold transition bg-emerald-700 text-white shadow" : "role-tab-btn px-3.5 py-1.5 rounded-lg text-xs font-bold transition text-slate-700";
  });
  document.querySelectorAll(".role-tab-btn-m").forEach(b => {
    const active = b.dataset.role === roleName;
    b.className = active ? "role-tab-btn-m flex-1 py-1.5 text-center text-emerald-800 border-b-2 border-emerald-700 font-bold" : "role-tab-btn-m flex-1 py-1.5 text-center text-slate-500 border-b-2 border-transparent font-bold";
  });
  document.getElementById("view-farmer").classList.toggle("hidden", roleName !== "farmer");
  document.getElementById("view-operator").classList.toggle("hidden", roleName !== "operator");
  document.getElementById("view-admin").classList.toggle("hidden", roleName !== "admin");
  document.getElementById("demo-menu").classList.add("hidden");

  if (roleName === "operator") refreshOperatorView();
  if (roleName === "admin") refreshAdminView();
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function toggleUserMenu() { document.getElementById("user-menu").classList.toggle("hidden"); }
function toggleDemoMenu() { document.getElementById("demo-menu").classList.toggle("hidden"); }

document.addEventListener("click", (e) => {
  const menu = document.getElementById("user-menu");
  if (menu && !menu.classList.contains("hidden") && !e.target.closest("#user-menu") && !e.target.closest("[onclick=\"toggleUserMenu()\"]")) {
    menu.classList.add("hidden");
  }
});

function toggleSmsDrawer() {
  const drawer = document.getElementById("sms-drawer");
  const opening = drawer.classList.contains("translate-x-full");
  drawer.classList.toggle("translate-x-full");
  if (opening) {
    refreshSmsLogs();
  }
}

function showToast(msg, type = "info") {
  const colors = { info: "bg-slate-800", success: "bg-emerald-600", error: "bg-rose-600", warn: "bg-amber-500" };
  const el = document.createElement("div");
  el.className = `${colors[type] || colors.info} text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl pointer-events-auto border border-white/20`;
  el.textContent = msg;
  const container = document.getElementById("toast-container");
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s"; setTimeout(() => el.remove(), 300); }, 3200);
}

// -------------------------------------------------------------
// APP BOOTSTRAP
// -------------------------------------------------------------
async function bootApp() {
  const savedLang = localStorage.getItem("kq_lang") || "hi";
  changeLanguage(savedLang);

  await loadCentres();
  setRole("farmer");
  await refreshFarmerData();
  populateBookingCentreOptions();
  populateOperatorCentreOptions();
  calculateFormEstimates();
  document.getElementById("form-date").value = new Date().toISOString().slice(0, 10);

  // Background polling for live queue radar
  if (STATE.pollTimer) clearInterval(STATE.pollTimer);
  STATE.pollTimer = setInterval(async () => {
    if (STATE.role === "farmer" && STATE.myTokenNumber) {
      await refreshFarmerData(true);
    }
  }, 6000);
}

async function loadCentres() {
  const res = await api("/api/centres");
  STATE.centres = res.data || [];
  renderNearbyCentres();
  renderAiRecommendation();
}

// -------------------------------------------------------------
// FARMER DASHBOARD v2
// -------------------------------------------------------------
async function refreshFarmerData(silent = false) {
  if (!STATE.myTokenNumber) {
    renderFarmerEmptyState();
    renderSlotMatrix(STATE.bookingCentreChoice || (STATE.centres[0] && STATE.centres[0].id));
    return;
  }
  try {
    const bRes = await api(`/api/bookings/${encodeURIComponent(STATE.myTokenNumber)}`);
    STATE.myBooking = bRes.data;
    const qRes = await api(`/api/queue/${STATE.myBooking.centre_id}/${encodeURIComponent(STATE.myTokenNumber)}`);
    STATE.queueStatus = qRes;

    STATE.lastSyncTime = new Date().toLocaleTimeString();
    localStorage.setItem("kq_cached_farmer_data", JSON.stringify({ booking: STATE.myBooking, queue: STATE.queueStatus, time: STATE.lastSyncTime }));

    renderWhatShouldIDoNow();
    renderFarmerQueue();
    renderDigitalPass();
    renderStepper();
    renderPaymentCard();
    renderGateVision();
    renderSlotMatrix(STATE.myBooking.centre_id);
    refreshSmsLogs();
  } catch (e) {
    if (!silent) showToast("बुकिंग लोड करने में समस्या हुई।", "error");
    // Attempt restoring from offline local storage
    const cached = JSON.parse(localStorage.getItem("kq_cached_farmer_data") || "null");
    if (cached) {
      STATE.myBooking = cached.booking;
      STATE.queueStatus = cached.queue;
      STATE.lastSyncTime = cached.time;
      setOfflineMode(true);
      renderWhatShouldIDoNow();
      renderFarmerQueue();
      renderDigitalPass();
      renderStepper();
      renderPaymentCard();
      renderGateVision();
      renderSlotMatrix(STATE.myBooking.centre_id);
    } else {
      renderFarmerEmptyState();
    }
  }
}

function renderFarmerEmptyState() {
  document.getElementById("q-centre-name").textContent = "कोई सक्रिय बुकिंग नहीं";
  document.getElementById("q-slot-window").textContent = "—";
  ["q-current-serving", "q-my-token", "q-farmers-ahead", "q-wait-time"].forEach(id => document.getElementById(id).textContent = "—");
  document.getElementById("q-progress-pct").textContent = "—";
  document.getElementById("q-progress-bar").style.width = "0%";
  document.getElementById("q-explanation").textContent = "अभी तक कोई स्लॉट बुक नहीं किया गया — ऊपर 'नया स्लॉट बुक करें' पर क्लिक करें।";
  document.getElementById("printable-pass").innerHTML = "";
  document.getElementById("procurement-stepper").innerHTML = "";
  
  document.getElementById("what-next-icon").textContent = "📅";
  document.getElementById("what-next-badge").textContent = "No Active Slot";
  document.getElementById("what-next-badge").className = "px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-200 text-slate-800";
  document.getElementById("what-next-desc").textContent = "आपकी कोई सक्रिय बुकिंग नहीं है। मंडी में बिना कतार परेशानी के फसल बेचने हेतु स्लॉट बुक करें।";
}

// [STEP 3] "आपका अगला काम" (What should I do now) Dynamic Action State
function renderWhatShouldIDoNow() {
  const q = STATE.queueStatus;
  const b = STATE.myBooking;
  if (!q || !b) return;

  const iconEl = document.getElementById("what-next-icon");
  const badgeEl = document.getElementById("what-next-badge");
  const descEl = document.getElementById("what-next-desc");

  const status = b.status || "BOOKED";
  const ahead = q.farmers_ahead;

  if (status === "PAYMENT_INITIATED" || (b.payment && b.payment.dbt_status)) {
    iconEl.textContent = "💰";
    badgeEl.textContent = "DBT Disbursed";
    badgeEl.className = "px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-200 text-emerald-950";
    descEl.textContent = `खरीद प्रक्रिया पूर्ण! राशि ₹${(b.total_payout_inr || b.total_estimated_value || 0).toLocaleString("en-IN")} PFMS संदर्भ द्वारा आपके खाते में प्रेषित कर दी गई है।`;
  } else if (status === "PROCURED") {
    iconEl.textContent = "✅";
    badgeEl.textContent = "Procurement Complete";
    badgeEl.className = "px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-200 text-teal-950";
    descEl.textContent = "फसल सफलतापूर्वक स्वीकृत और तौल ली गई है। आधिकारिक खरीद पर्ची जारी हो गई है। DBT भुगतान जल्द स्वीकृत होगा।";
  } else if (ahead === 0 || status === "ARRIVED" || status === "WEIGHING_COMPLETED" || status === "QUALITY_VERIFIED") {
    iconEl.textContent = "🚨";
    badgeEl.textContent = "YOUR TURN ACTIVE";
    badgeEl.className = "px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse";
    descEl.textContent = "आपकी बारी अब सक्रिय है! कृपया अपना डिजिटल गेट पास दिखाकर तुरंत धर्मकांटा / वेइंग काउंटर पर उपस्थित हों।";
  } else if (ahead <= 5) {
    iconEl.textContent = "🚜";
    badgeEl.textContent = "Queue Approaching";
    badgeEl.className = "px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950";
    descEl.textContent = `आपसे आगे केवल ${ahead} किसान हैं! कृपया अपने वाहन के साथ मंडी के मुख्य द्वार / गेट 1 की ओर प्रस्थान करें।`;
  } else {
    iconEl.textContent = "🏡";
    badgeEl.textContent = "Wait Comfortably at Home";
    badgeEl.className = "px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900";
    descEl.textContent = `आपका स्लॉट पुष्ट है (${b.display_time_window || b.time_window})। आगे ${ahead} किसान हैं। अनुमानित प्रतीक्षा समय लगभग ${q.estimated_wait_time_minutes} मिनट है।`;
  }
}

// [STEP 4 & 6] Real-time queue position & Estimated wait-time
function renderFarmerQueue() {
  const q = STATE.queueStatus, b = STATE.myBooking;
  document.getElementById("q-centre-name").textContent = q.centre_name;
  document.getElementById("q-slot-window").textContent = (b.display_time_window || b.time_window) + " Slot";
  document.getElementById("q-current-serving").textContent = q.current_serving_token;
  document.getElementById("q-my-token").textContent = q.your_token;
  document.getElementById("q-farmers-ahead").textContent = q.farmers_ahead;
  
  // Color-coded wait time
  const waitEl = document.getElementById("q-wait-time");
  waitEl.textContent = q.estimated_wait_time_minutes + " min";
  if (q.estimated_wait_time_minutes > 50) {
    waitEl.className = "text-xl font-black text-rose-600 mt-1 block";
  } else if (q.estimated_wait_time_minutes > 25) {
    waitEl.className = "text-xl font-black text-amber-600 mt-1 block";
  } else {
    waitEl.className = "text-xl font-black text-teal-700 mt-1 block";
  }

  const total = Math.max(q.your_seq - (q.current_serving_seq - q.farmers_ahead) + 1, 1);
  const done = Math.max(total - q.farmers_ahead, 0);
  const pct = Math.min(100, Math.round((done / total) * 100));
  document.getElementById("q-progress-pct").textContent = pct + "% Reached";
  document.getElementById("q-progress-bar").style.width = pct + "%";
  document.getElementById("q-explanation").textContent = "💡 " + q.explanation;
}

function renderDigitalPass() {
  const b = STATE.myBooking;
  const container = document.getElementById("printable-pass");
  container.innerHTML = `
    <div class="token-card rounded-3xl p-6 space-y-4 shadow-sm">
      <div class="flex justify-between items-start">
        <div>
          <p class="text-[10px] font-black text-emerald-700 uppercase tracking-wide">Official Digital Gate Pass</p>
          <h4 class="text-2xl font-black text-slate-900">${b.token_number}</h4>
        </div>
        <div id="pass-qr" class="w-16 h-16 bg-white p-1 rounded-xl shadow-inner"></div>
      </div>
      <div class="grid grid-cols-2 gap-3 text-xs">
        <div><span class="text-slate-400 block font-bold">Farmer</span><span class="font-bold text-slate-800">${b.farmer_name}</span></div>
        <div><span class="text-slate-400 block font-bold">Centre</span><span class="font-bold text-slate-800">${b.centre_name.split(" (")[0]}</span></div>
        <div><span class="text-slate-400 block font-bold">Crop</span><span class="font-bold text-slate-800">${b.crop_type} (${b.quantity_quintal} Q)</span></div>
        <div><span class="text-slate-400 block font-bold">Slot</span><span class="font-bold text-slate-800">${b.display_time_window || b.time_window}</span></div>
        <div><span class="text-slate-400 block font-bold">Vehicle</span><span class="font-bold text-slate-800">${b.vehicle_number || 'HR-05-AB-7821'}</span></div>
        <div><span class="text-slate-400 block font-bold">Est. Payout</span><span class="font-bold text-slate-800">₹${(b.total_estimated_value || 0).toLocaleString("en-IN")}</span></div>
      </div>
      <div class="flex gap-2 pt-1 no-print">
        <button onclick="window.print()" class="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow transition">🖨️ Print Pass</button>
        <button onclick="sharePassWhatsApp()" class="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition">📱 Share</button>
      </div>
    </div>`;

  const qrEl = document.getElementById("pass-qr");
  if (qrEl && window.QRCode) {
    qrEl.innerHTML = "";
    new QRCode(qrEl, { text: b.qr_payload || b.token_number, width: 64, height: 64, correctLevel: QRCode.CorrectLevel.M });
  }
}

// [STEP 9] 7-Stage Interactive Procurement Journey
const STAGE_CONFIG = [
  { id: 1, key: "BOOKED", label: "1. टोकन", title: "टोकन बुकिंग (Digital Token Issued)" },
  { id: 2, key: "ARRIVED", label: "2. आगमन", title: "गेट चेक-इन (Gate Entry & QR Verify)" },
  { id: 3, key: "WEIGHING_COMPLETED", label: "3. तौल", title: "धर्मकांटा तौल (Weighbridge Gross & Tare)" },
  { id: 4, key: "QUALITY_VERIFIED", label: "4. गुणवत्ता", title: "गुणवत्ता व नमी जांच (Quality FAQ Assay)" },
  { id: 5, key: "PROCURED", label: "5. खरीद पर्ची", title: "खरीद पूर्ण (Procurement Mandi Slip)" },
  { id: 6, key: "PAYMENT_INITIATED", label: "6. DBT शुरू", title: "DBT भुगतान स्वीकृति (PFMS Direct Transfer)" },
  { id: 7, key: "PAYMENT_CREDITED", label: "7. बैंक जमा", title: "बैंक खाता जमा (Credit Confirmed)" }
];

function renderStepper() {
  const b = STATE.myBooking;
  const order = ["BOOKED", "ARRIVED", "WEIGHING_COMPLETED", "QUALITY_VERIFIED", "PROCURED", "PAYMENT_INITIATED", "PAYMENT_CREDITED"];
  
  let currentStageIdx = order.indexOf(b.status) + 1;
  if (b.status === "PAYMENT_INITIATED" || (b.payment && b.payment.dbt_status)) currentStageIdx = 7;
  if (currentStageIdx === 0) currentStageIdx = 1;

  const html = STAGE_CONFIG.map((stage) => {
    const idx = stage.id;
    const isCompleted = idx <= currentStageIdx;
    const isActive = idx === currentStageIdx;
    const cls = isCompleted ? "completed" : (isActive ? "active" : "");
    return `<div onclick="showStageDetail(${idx})" class="step-item ${cls}">
      <div class="step-circle">${isCompleted ? '<i class="fa-solid fa-check text-xs"></i>' : idx}</div>
      <span class="text-[10px] font-bold text-slate-700 mt-2 text-center">${stage.label}</span>
    </div>`;
  }).join("");

  document.getElementById("procurement-stepper").innerHTML = html;
  showStageDetail(currentStageIdx);
}

function showStageDetail(stageIdx) {
  const b = STATE.myBooking;
  const cfg = STAGE_CONFIG.find(s => s.id === stageIdx) || STAGE_CONFIG[0];
  const titleEl = document.getElementById("stage-detail-title");
  const statusEl = document.getElementById("stage-detail-status");
  const bodyEl = document.getElementById("stage-detail-body");

  titleEl.textContent = cfg.title;

  if (stageIdx === 1) {
    statusEl.textContent = "✅ Confirmed";
    statusEl.className = "text-emerald-700 font-bold";
    bodyEl.innerHTML = `स्लॉट: <b>${b.display_time_window || b.time_window}</b> | केंद्र: <b>${b.centre_name}</b> | फसल: <b>${b.crop_type} (${b.quantity_quintal} Q)</b> | वाहन: <b>${b.vehicle_type} (${b.vehicle_number || 'HR-05-AB-7821'})</b>`;
  } else if (stageIdx === 2) {
    const isArrived = b.status !== "BOOKED";
    statusEl.textContent = isArrived ? "✅ Checked In" : "⏳ Pending Gate Arrival";
    statusEl.className = isArrived ? "text-emerald-700 font-bold" : "text-amber-700 font-bold";
    bodyEl.innerHTML = isArrived ? `मंडी मुख्य द्वार (Gate 1) पर आगमन दर्ज। समय: <b>${b.arrived_at || '10:05 AM'}</b>। धर्मकांटा लेन 2 के लिए निर्देशित।` : "मंडी के मुख्य द्वार (Gate 1) पर पहुँचकर अपना डिजिटल गेट पास क्यूआर कोड दिखाएं।";
  } else if (stageIdx === 3) {
    const wb = b.weighbridge;
    statusEl.textContent = wb ? "✅ Weighing Recorded" : "⏳ Pending Weighbridge";
    statusEl.className = wb ? "text-emerald-700 font-bold" : "text-amber-700 font-bold";
    bodyEl.innerHTML = wb ? `सकल वजन (Gross): <b>${wb.gross_weight_quintal} Q</b> | खाली वजन (Tare): <b>${wb.tare_weight_quintal} Q</b> | <b>शुद्ध वजन (Net): ${wb.net_weight_quintal} Q</b> | धर्मकांटा पर्ची सं: <b>${wb.weighbridge_slip_no}</b>` : "धर्मकांटा काउंटर पर वाहन सहित सकल एवं खाली वजन की जांच की जाएगी।";
  } else if (stageIdx === 4) {
    const q = b.quality;
    statusEl.textContent = q ? "✅ Grade A (Passed FAQ)" : "⏳ Pending Assay";
    statusEl.className = q ? "text-emerald-700 font-bold" : "text-amber-700 font-bold";
    bodyEl.innerHTML = q ? `नमी प्रतिशत (Moisture): <b>${q.moisture_percentage}%</b> (मानक <12%) | बाह्य पदार्थ: <b>${q.foreign_matter_percentage}%</b> | ग्रेड: <b>${q.grade}</b> (FCI FAQ Standard Passed)` : "प्रयोगशाला तकनीशियन द्वारा अनाज की नमी व गुणवत्ता का परीक्षण किया जाएगा।";
  } else if (stageIdx === 5) {
    const isProcured = b.status === "PROCURED" || b.status === "PAYMENT_INITIATED" || (b.payment && b.payment.dbt_status);
    statusEl.textContent = isProcured ? "✅ Mandi Receipt Issued" : "⏳ In Progress";
    statusEl.className = isProcured ? "text-emerald-700 font-bold" : "text-amber-700 font-bold";
    const net = b.weighbridge ? b.weighbridge.net_weight_quintal : b.quantity_quintal;
    const payout = (net * 2425).toLocaleString("en-IN");
    bodyEl.innerHTML = isProcured ? `खरीद पर्ची जारी। कुल शुद्ध फसल: <b>${net} क्विंटल</b> @ MSP ₹2,425/Q = <b>कुल राशि ₹${payout}</b> स्वीकृत।` : "तौल एवं गुणवत्ता सत्यापन उपरांत खरीद पर्ची स्वतः जनरेट होगी।";
  } else if (stageIdx >= 6) {
    const p = b.payment;
    statusEl.textContent = p ? "✅ DBT Disbursed (PFMS)" : "⏳ Payment Processing";
    statusEl.className = p ? "text-emerald-700 font-bold" : "text-amber-700 font-bold";
    bodyEl.innerHTML = p ? `PFMS संदर्भ: <b>${p.pfms_reference}</b> | लेन-देन आईडी: <b>${p.transaction_id}</b> | बैंक: <b>${b.bank_name || 'State Bank of India'} (A/C: ${b.account_masked || 'XXXXXX9012'})</b> | स्थिति: <b>CREDITED</b>` : "Direct Benefit Transfer (DBT) प्रक्रिया प्रगति पर है।";
  }
}

// [STEP 10] Dedicated Payment Card
function renderPaymentCard() {
  const b = STATE.myBooking;
  if (!b) return;

  const net = b.weighbridge ? b.weighbridge.net_weight_quintal : b.quantity_quintal;
  const msp = b.msp_rate_per_quintal || 2425;
  const total = (b.total_payout_inr || (net * msp) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  
  document.getElementById("pay-total-amt").textContent = `₹ ${total}`;
  const isPaid = b.status === "PAYMENT_INITIATED" || (b.payment && b.payment.dbt_status);
  
  const badgeEl = document.getElementById("payment-badge");
  const statusEl = document.getElementById("pay-status-text");
  const txEl = document.getElementById("pay-tx-id");
  const bankMaskedEl = document.getElementById("pay-bank-masked");

  if (bankMaskedEl) {
    bankMaskedEl.textContent = `${b.bank_name || 'State Bank of India'} - ${b.account_masked || 'XXXXXX9012'}`;
  }

  if (isPaid) {
    badgeEl.textContent = "✅ DBT PFMS Credited";
    badgeEl.className = "px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300";
    statusEl.textContent = "राशि खाते में जमा (Credited)";
    txEl.textContent = b.payment ? b.payment.pfms_reference : "PFMS-GOV-998124";
  } else {
    badgeEl.textContent = "⏳ Pending Sanction";
    badgeEl.className = "px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300";
    statusEl.textContent = "खरीद पूर्ण होने पर देय";
    txEl.textContent = "—";
  }
}

// [STEP 17] AI Gate Vision Demo Card
function renderGateVision() {
  const b = STATE.myBooking;
  if (!b) return;
  const vNo = document.getElementById("vision-vehicle-no");
  const vType = document.getElementById("vision-vehicle-type");
  const vTok = document.getElementById("vision-token");
  if (vNo) vNo.textContent = b.vehicle_number || "HR-05-AB-7821";
  if (vType) vType.textContent = b.vehicle_type || "Tractor Trolley";
  if (vTok) vTok.textContent = b.token_number || "#A-52";
}

// [STEP 5 & 7] Nearby Mandis Comparison Table / Cards
function renderNearbyCentres() {
  const sorted = [...STATE.centres].sort((a, b) => a.current_load_percentage - b.current_load_percentage);
  document.getElementById("nearby-count").textContent = `${STATE.centres.length} Mandi Centres`;
  
  const bestTarget = sorted[0];

  document.getElementById("nearby-centres-list").innerHTML = sorted.map(c => {
    const isBest = bestTarget && c.id === bestTarget.id && c.current_load_percentage <= 60;
    const color = c.current_load_percentage >= 80 ? "bg-rose-500" : c.current_load_percentage >= 55 ? "bg-amber-500" : "bg-emerald-500";
    const statusText = c.current_load_percentage >= 80 ? "🔴 High Rush" : c.current_load_percentage >= 55 ? "🟡 Moderate" : "🟢 Low Load";
    
    return `<div class="p-3.5 bg-slate-50 border ${isBest ? 'border-amber-400 bg-amber-50/50 ring-1 ring-amber-300' : 'border-slate-200'} rounded-2xl flex items-center justify-between gap-2 shadow-sm">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <p class="text-xs font-black text-slate-800 truncate">${c.name.split(" (")[0]}</p>
          ${isBest ? '<span class="px-2 py-0.5 bg-amber-500 text-slate-950 font-black text-[9px] rounded-full shrink-0 shadow-sm">⭐ RECOMMENDED</span>' : ''}
        </div>
        <div class="flex items-center gap-3 text-[11px] text-slate-500 mt-1 font-semibold">
          <span>📍 ~${c.distance_km || 5} km</span>
          <span>⏱️ Avg Wait: ${c.avg_processing_time_min * 3} min</span>
          <span class="font-bold">${statusText}</span>
        </div>
        <div class="w-full bg-slate-200 rounded-full h-1.5 mt-2">
          <div class="${color} h-1.5 rounded-full transition-all duration-500" style="width:${c.current_load_percentage}%"></div>
        </div>
      </div>
      <div class="text-right shrink-0">
        <span class="text-sm font-black text-slate-800 block">${c.current_load_percentage}%</span>
        <button onclick="openBookingModalWithSlot(null, '${c.id}')" class="mt-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow transition">
          Book
        </button>
      </div>
    </div>`;
  }).join("");
}

function renderAiRecommendation() {
  const overloaded = STATE.centres.find(c => c.current_load_percentage >= 80);
  const banner = document.getElementById("ai-recommend-banner");
  if (!overloaded) { banner.classList.add("hidden"); return; }
  
  const alt = [...STATE.centres].filter(c => c.id !== overloaded.id).sort((a, b) => a.current_load_percentage - b.current_load_percentage)[0];
  if (!alt) { banner.classList.add("hidden"); return; }

  document.getElementById("ai-recommend-text").textContent =
    `${overloaded.name.split(" (")[0]} पर ${overloaded.current_load_percentage}% भारी भीड़ है। हम ${alt.name.split(" (")[0]} (~${alt.distance_km || 7} km) की सिफारिश करते हैं — केवल ${alt.current_load_percentage}% लोड (~47 मिनट कम प्रतीक्षा)।`;
  banner.dataset.targetCentre = alt.id;
  banner.classList.remove("hidden");
}

function switchRecommendedCentre() {
  const banner = document.getElementById("ai-recommend-banner");
  const cid = banner.dataset.targetCentre;
  if (!cid) return;
  STATE.bookingCentreChoice = cid;
  const sel = document.getElementById("form-centre");
  if (sel) sel.value = cid;
  showToast("अनुशंसित केंद्र चुना गया।", "success");
  openBookingModal();
}

// [STEP 2] Hourly Slot Matrix with Exactly ONE "🟢 YOUR SLOT"
async function renderSlotMatrix(centreId) {
  if (!centreId) return;
  try {
    const res = await api(`/api/centres/${centreId}/slots`);
    const slots = res.data || [];
    const mySlotWindow = STATE.myBooking ? (STATE.myBooking.time_window || "") : "";

    document.getElementById("slot-grid").innerHTML = slots.map(s => {
      const isMySlot = STATE.myBooking && (s.time_window === mySlotWindow || s.display_time_window === STATE.myBooking.display_time_window);
      const isFull = !s.is_available && !isMySlot;
      
      let cardStyle = "border-slate-200 bg-white hover:border-emerald-400";
      if (isMySlot) {
        cardStyle = "border-2 border-emerald-600 bg-emerald-50 shadow-md ring-2 ring-emerald-400/50";
      } else if (isFull) {
        cardStyle = "border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed";
      } else if (s.congestion_level === "high") {
        cardStyle = "border-rose-300 bg-rose-50/50";
      } else if (s.congestion_level === "medium") {
        cardStyle = "border-amber-300 bg-amber-50/50";
      } else {
        cardStyle = "border-emerald-300 bg-emerald-50/40";
      }

      return `<div class="p-3.5 rounded-2xl border transition-all text-center relative ${cardStyle}">
        ${isMySlot ? '<span class="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-emerald-700 text-white font-black text-[9px] rounded-full shadow tracking-wider">🟢 YOUR SLOT</span>' : ''}
        <p class="text-xs font-black text-slate-900">${s.display_time_window || s.time_window}</p>
        <p class="text-[10px] font-bold text-slate-500 mt-1">${isFull ? 'Full' : `${s.max_capacity - s.booked_count} Open`}</p>
        ${!isMySlot && !isFull ? `<button onclick="openBookingModalWithSlot('${s.time_window}', '${centreId}')" class="mt-2 w-full py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition shadow">Book Slot</button>` : ''}
      </div>`;
    }).join("");
  } catch (e) { /* silent */ }
}

// [STEP 2 & 8] Missed Slot Recovery Flow with Confirmation Modal
async function openMissedSlotRecoveryModal() {
  if (!STATE.myTokenNumber) { showToast("कोई सक्रिय बुकिंग नहीं मिली।", "warn"); return; }
  const cid = STATE.myBooking ? STATE.myBooking.centre_id : "centre-a";
  try {
    const res = await api(`/api/centres/${cid}/slots`);
    const slots = res.data || [];
    const avail = slots.filter(s => s.is_available);
    const best = avail.length > 0 ? avail.reduce((min, s) => s.booked_count < min.booked_count ? s : min, avail[0]) : slots[0];
    STATE.suggestedRecoverySlot = best ? (best.display_time_window || best.time_window) : "12:00 - 01:00 PM";
    document.getElementById("recovery-suggested-slot").textContent = STATE.suggestedRecoverySlot;
    document.getElementById("recovery-modal").classList.remove("hidden");
  } catch {
    document.getElementById("recovery-suggested-slot").textContent = "12:00 - 01:00 PM";
    document.getElementById("recovery-modal").classList.remove("hidden");
  }
}

function closeMissedSlotRecoveryModal() {
  document.getElementById("recovery-modal").classList.add("hidden");
}

async function confirmMissedSlotRecovery() {
  closeMissedSlotRecoveryModal();
  try {
    const res = await api(`/api/bookings/${encodeURIComponent(STATE.myTokenNumber)}/recover_slot`, "POST", { new_time_window: STATE.suggestedRecoverySlot });
    showToast(res.message || "स्लॉट सफलतापूर्वक नए समय पर पुनर्निर्धारित!", "success");
    await refreshFarmerData();
    refreshSmsLogs();
  } catch (e) { showToast("पुनर्बहाली विफल: " + e.message, "error"); }
}

// [STEP 3] Route Guidance Modal
function openRouteModal() {
  const b = STATE.myBooking;
  const cid = b ? b.centre_id : "centre-a";
  const centre = STATE.centres.find(c => c.id === cid) || STATE.centres[0];
  if (!centre) return;

  document.getElementById("route-centre-title").textContent = centre.name;
  document.getElementById("route-centre-address").textContent = centre.address;
  document.getElementById("route-distance").textContent = `~${centre.distance_km || 2.5} km`;
  document.getElementById("route-gate").textContent = centre.gate_entry || "Gate 1 (North Weighbridge Entrance)";
  document.getElementById("route-tips").textContent = centre.route_tips || "Follow NH44 towards GT Road Flyover. Keep in the tractor line.";
  document.getElementById("route-modal").classList.remove("hidden");
}

function closeRouteModal() { document.getElementById("route-modal").classList.add("hidden"); }

function openExternalMaps() {
  const b = STATE.myBooking;
  const cid = b ? b.centre_id : "centre-a";
  const centre = STATE.centres.find(c => c.id === cid) || STATE.centres[0];
  const query = encodeURIComponent(`${centre.name}, Karnal, Haryana`);
  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
}

// [STEP 15] Full Profile Modal
function openProfileModal() {
  const u = STATE.user || { name: "Ramesh Kumar", mobile: "9812345678", village: "Taraori ABC, Karnal", farmerId: "FID-HR-78921" };
  document.getElementById("prof-name").textContent = u.name;
  document.getElementById("prof-mobile").textContent = u.mobile;
  document.getElementById("prof-id").textContent = u.farmerId || "FID-HR-78921";
  document.getElementById("prof-location").textContent = `${u.village}, Haryana`;
  document.getElementById("profile-modal").classList.remove("hidden");
}

function closeProfileModal() { document.getElementById("profile-modal").classList.add("hidden"); }

// [STEP 11] Voice Assistant Quick Query Handlers
function openVoiceAssistantModal() {
  document.getElementById("voice-modal").classList.remove("hidden");
  document.getElementById("voice-playback-status").textContent = "💡 ऊपर दिए गए किसी भी प्रश्न पर क्लिक करें।";
}
function closeVoiceAssistantModal() { document.getElementById("voice-modal").classList.add("hidden"); }

function handleVoiceIntent(intent) {
  const q = STATE.queueStatus;
  const b = STATE.myBooking;
  let text = "";

  if (!q || !b) {
    text = "किसान भाई, आपकी कोई सक्रिय बुकिंग नहीं मिली। कृपया नया स्लॉट बुक करें।";
  } else if (intent === "turn") {
    text = `आपसे आगे ${q.farmers_ahead} किसान हैं। आपका अनुमानित प्रतीक्षा समय ${q.estimated_wait_time_minutes} मिनट है।`;
  } else if (intent === "token") {
    text = `आपका डिजिटल टोकन नंबर ${b.token_number} है।`;
  } else if (intent === "slot") {
    text = `आपका स्लॉट समय ${b.display_time_window || b.time_window} है, केंद्र ${b.centre_name} पर।`;
  } else if (intent === "payment") {
    const isPaid = b.status === "PAYMENT_INITIATED" || (b.payment && b.payment.dbt_status);
    text = isPaid ? `आपका भुगतान स्वीकृत हो चुका है। कुल राशि ₹${(b.total_payout_inr || b.total_estimated_value || 0).toLocaleString("en-IN")} PFMS द्वारा भेजी गई है।` : `फसल की तौल व खरीद पूरी होने के बाद भुगतान जारी किया जाएगा।`;
  } else if (intent === "status") {
    text = `आपकी फसल खरीद स्थिति ${b.status} है। फसल: ${b.crop_type}, मात्रा: ${b.quantity_quintal} क्विंटल।`;
  } else if (intent === "centre") {
    const best = [...STATE.centres].sort((a,b) => a.current_load_percentage - b.current_load_percentage)[0];
    text = `सबसे कम भीड़ वाला केंद्र ${best ? best.name : 'Centre B'} है, जहाँ केवल ${best ? best.current_load_percentage : 42}% लोड है।`;
  }

  document.getElementById("voice-playback-status").innerHTML = `🔊 बोल रहा है: <b>"${text}"</b>`;

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.92;
    const voices = window.speechSynthesis.getVoices();
    const hiVoice = voices.find(v => v.lang.includes("hi") || v.lang.includes("HI"));
    if (hiVoice) { u.voice = hiVoice; u.lang = "hi-IN"; }
    window.speechSynthesis.speak(u);
  }
}

function triggerVoiceAnnouncement() {
  handleVoiceIntent("turn");
}

function sharePassWhatsApp() {
  if (!STATE.myBooking) return;
  const b = STATE.myBooking;
  const text = encodeURIComponent(`🌾 KisanQueue Digital Gate Pass\nToken: ${b.token_number}\nFarmer: ${b.farmer_name}\nCentre: ${b.centre_name}\nSlot: ${b.display_time_window || b.time_window}\nCrop: ${b.crop_type} (${b.quantity_quintal}Q)`);
  window.open(`https://wa.me/?text=${text}`, "_blank");
}

// -------------------------------------------------------------
// BOOKING MODAL
// -------------------------------------------------------------
function populateBookingCentreOptions() {
  const sel = document.getElementById("form-centre");
  if (!sel) return;
  sel.innerHTML = STATE.centres.map(c =>
    `<option value="${c.id}">${c.name.split(" (")[0]} (${c.current_load_percentage}% Load)</option>`
  ).join("");
  if (STATE.bookingCentreChoice) sel.value = STATE.bookingCentreChoice;
}

function openBookingModal() {
  document.getElementById("booking-modal").classList.remove("hidden");
  if (STATE.user) {
    document.getElementById("form-name").value = STATE.user.name || "";
    document.getElementById("form-mobile").value = STATE.user.mobile || "";
    document.getElementById("form-village").value = STATE.user.village || "";
    document.getElementById("form-farmer-id").value = STATE.user.farmerId || "";
  }
  calculateFormEstimates();
}
function closeBookingModal() { document.getElementById("booking-modal").classList.add("hidden"); }

function openBookingModalWithSlot(slotTime, centreId) {
  openBookingModal();
  if (centreId) document.getElementById("form-centre").value = centreId;
  if (slotTime) {
    const slotSelect = document.getElementById("form-time-slot");
    for (const opt of slotSelect.options) {
      if (opt.value.startsWith(slotTime.slice(0, 5))) { opt.selected = true; break; }
    }
  }
}

function calculateFormEstimates() {
  const cropSelect = document.getElementById("form-crop");
  const qty = parseFloat(document.getElementById("form-qty").value) || 0;
  const msp = parseFloat(cropSelect.options[cropSelect.selectedIndex]?.dataset.msp || 2425);
  document.getElementById("form-calc-payout").textContent = "₹ " + (qty * msp).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  
  const centreId = document.getElementById("form-centre").value;
  const centre = STATE.centres.find(c => c.id === centreId);
  const mins = centre ? Math.round(10 + centre.current_load_percentage / 4) : 20;
  document.getElementById("form-calc-time").textContent = `~ ${mins}-${mins + 10} मिनट`;
}

async function handleFormBookingSubmit(event) {
  event.preventDefault();
  const payload = {
    farmer: {
      name: document.getElementById("form-name").value,
      mobile: document.getElementById("form-mobile").value,
      village: document.getElementById("form-village").value,
      farmer_id: document.getElementById("form-farmer-id").value || undefined,
    },
    centre_id: document.getElementById("form-centre").value,
    date: document.getElementById("form-date").value,
    time_window: document.getElementById("form-time-slot").value,
    crop: {
      crop_type: document.getElementById("form-crop").value,
      estimated_quantity_quintal: parseFloat(document.getElementById("form-qty").value),
    },
    vehicle_type: document.getElementById("form-vehicle").value,
  };
  try {
    const res = await api("/api/bookings", "POST", payload);
    const booking = res.data;
    STATE.myTokenNumber = booking.token_number;
    if (STATE.user) {
      STATE.user.tokenNumber = booking.token_number;
      const users = getUsers();
      const idx = users.findIndex(u => u.mobile === STATE.user.mobile);
      if (idx >= 0) { users[idx].tokenNumber = booking.token_number; saveUsers(users); }
      localStorage.setItem("kq_session", JSON.stringify(STATE.user));
    }
    closeBookingModal();
    showToast(`🎉 टोकन ${booking.token_number} बुक हो गया!`, "success");
    await refreshFarmerData();
    await loadCentres();
    refreshSmsLogs();
  } catch (e) {
    showToast("बुकिंग विफल: " + e.message, "error");
  }
}

// -------------------------------------------------------------
// OPERATOR VIEW & MANDI SWITCHER
// -------------------------------------------------------------
function populateOperatorCentreOptions() {
  const sel = document.getElementById("operator-centre-select");
  if (!sel) return;
  sel.innerHTML = STATE.centres.map(c =>
    `<option value="${c.id}" ${c.id === STATE.operatorCentreId ? 'selected' : ''}>${c.name.split(" (")[0]}</option>`
  ).join("");
}

function handleOperatorCentreChange(centreId) {
  STATE.operatorCentreId = centreId;
  refreshOperatorView();
  showToast(`ऑपरेटर केंद्र बदला गया: ${centreId}`, "info");
}

async function refreshOperatorView() {
  const centre = STATE.centres.find(c => c.id === STATE.operatorCentreId) || STATE.centres[0];
  if (!centre) return;

  const curTokenEl = document.getElementById("operator-current-token");
  if (curTokenEl) curTokenEl.textContent = centre.serving_token_number || "—";

  document.getElementById("operator-stats").innerHTML = `
    <div class="glass-card p-4 rounded-2xl text-center"><span class="text-[10px] font-bold text-slate-500 block uppercase">Serving Token</span><span class="text-xl font-black text-slate-900 mt-1 block">${centre.serving_token_number}</span></div>
    <div class="glass-card p-4 rounded-2xl text-center"><span class="text-[10px] font-bold text-slate-500 block uppercase">Current Load</span><span class="text-xl font-black text-amber-600 mt-1 block">${centre.current_load_percentage}%</span></div>
    <div class="glass-card p-4 rounded-2xl text-center"><span class="text-[10px] font-bold text-slate-500 block uppercase">Active Desks</span><span class="text-xl font-black text-emerald-700 mt-1 block">${centre.active_counters}</span></div>
    <div class="glass-card p-4 rounded-2xl text-center"><span class="text-[10px] font-bold text-slate-500 block uppercase">Avg Clearance</span><span class="text-xl font-black text-teal-700 mt-1 block">${centre.avg_processing_time_min}m</span></div>`;
}

async function operatorLoadToken() {
  const raw = document.getElementById("operator-token-input").value.trim();
  if (!raw) return;
  const token = raw.startsWith("#") ? raw : "#" + raw.toUpperCase();
  try {
    const res = await api(`/api/bookings/${encodeURIComponent(token)}`);
    renderOperatorFarmerDetail(res.data);
  } catch (e) {
    document.getElementById("operator-farmer-detail").innerHTML = `<p class="text-rose-600 font-semibold text-sm">Token not found: ${token}</p>`;
  }
}

function renderOperatorFarmerDetail(b) {
  document.getElementById("operator-farmer-detail").innerHTML = `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
        <div>
          <p class="font-black text-slate-900 text-sm">${b.farmer_name} — <span class="text-emerald-700">${b.token_number}</span></p>
          <p class="text-xs text-slate-500 mt-0.5">${b.crop_type} · ${b.quantity_quintal} Q · ${b.vehicle_type} (${b.vehicle_number || 'HR-05-AB-7821'}) · Status: <span class="font-bold text-slate-900">${b.status}</span></p>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <button onclick="operatorAction('${b.token_number}','mark_arrived')" class="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow transition">✅ 1. Mark Arrived</button>
        <button onclick="operatorRecordWeighing('${b.token_number}')" class="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition">⚖️ 2. Record Weighing</button>
        <button onclick="operatorRecordQuality('${b.token_number}')" class="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow transition">🔬 3. Quality Assay</button>
        <button onclick="operatorAction('${b.token_number}','complete_procurement')" class="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition">📜 4. Issue Procurement Slip</button>
        <button onclick="operatorAction('${b.token_number}','initiate_payment')" class="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow transition">💰 5. Sanction DBT Payment</button>
      </div>
    </div>`;
}

async function operatorAction(tokenNumber, action, extra = {}) {
  try {
    const res = await api("/api/operator/action", "POST", { centre_id: STATE.operatorCentreId, token_number: tokenNumber, action, ...extra });
    showToast(res.message || "Action completed.", "success");
    if (res.data) renderOperatorFarmerDetail(res.data);
    refreshSmsLogs();
    if (tokenNumber === STATE.myTokenNumber) refreshFarmerData();
  } catch (e) { showToast("Action failed: " + e.message, "error"); }
}

function operatorRecordWeighing(tokenNumber) {
  const gross = prompt("Gross Weight (Quintal)?", "52.5");
  if (gross === null) return;
  const tare = prompt("Tare Weight (Quintal)?", "2.5");
  if (tare === null) return;
  const net = (parseFloat(gross) - parseFloat(tare)).toFixed(2);
  operatorAction(tokenNumber, "record_weighing", {
    weighbridge_data: { gross_weight_quintal: parseFloat(gross), tare_weight_quintal: parseFloat(tare), net_weight_quintal: parseFloat(net), weighbridge_slip_no: "WB-" + Date.now().toString().slice(-6) }
  });
}

function operatorRecordQuality(tokenNumber) {
  const moisture = prompt("Moisture %?", "11.5");
  if (moisture === null) return;
  operatorAction(tokenNumber, "record_quality", {
    quality_data: { moisture_percentage: parseFloat(moisture), foreign_matter_percentage: 1.2, damaged_grains_percentage: 0.8, grade: "Grade A", approved: true }
  });
}

async function operatorCallNext() {
  try {
    const res = await api("/api/operator/action", "POST", { centre_id: STATE.operatorCentreId, token_number: "", action: "call_next" });
    showToast(`📢 Now serving token: ${res.data.serving_token_number}`, "success");
    await loadCentres();
    refreshOperatorView();
    refreshAdminView();
    refreshSmsLogs();
    if (STATE.role === "farmer") refreshFarmerData();
  } catch (e) { showToast("Failed: " + e.message, "error"); }
}

async function operatorBroadcastDelay() {
  const mins = prompt("Delay in minutes?", "30");
  if (mins === null) return;
  try {
    await api("/api/operator/action", "POST", { centre_id: STATE.operatorCentreId, token_number: "", action: "broadcast_delay", delay_minutes: parseInt(mins, 10) });
    showToast("Delay broadcast sent to all waiting farmers.", "warn");
    refreshSmsLogs();
  } catch (e) { showToast("Failed: " + e.message, "error"); }
}

async function simulateFullProcurementFlow() {
  const token = STATE.myTokenNumber || "#A-52";
  showToast("Running full procurement demo simulation…", "info");
  const steps = [
    () => operatorAction(token, "mark_arrived"),
    () => operatorAction(token, "record_weighing", { weighbridge_data: { gross_weight_quintal: 52.5, tare_weight_quintal: 2.5, net_weight_quintal: 50.0, weighbridge_slip_no: "WB-DEMO-SIM" } }),
    () => operatorAction(token, "record_quality", { quality_data: { moisture_percentage: 11.2, foreign_matter_percentage: 1.0, damaged_grains_percentage: 0.5, grade: "Grade A", approved: true } }),
    () => operatorAction(token, "complete_procurement"),
    () => operatorAction(token, "initiate_payment"),
  ];
  for (const step of steps) {
    await step();
    await new Promise(r => setTimeout(r, 600));
  }
  showToast("✅ Full 7-stage procurement cycle complete!", "success");
}

function resetDemoData() {
  location.reload();
}

// -------------------------------------------------------------
// ADMIN VIEW
// -------------------------------------------------------------
async function refreshAdminView() {
  try {
    const res = await api("/api/admin/metrics");
    const m = res.data || res;
    document.getElementById("admin-metrics").innerHTML = `
      ${adminMetricCard("Total Centres", m.total_centres)}
      ${adminMetricCard("Active Today", m.active_centres)}
      ${adminMetricCard("Farmers Today", m.farmers_today)}
      ${adminMetricCard("Tonnes Procured", m.procurement_completed_metric_tonnes)}
      ${adminMetricCard("MSP Disbursed (₹Cr)", m.total_msp_disbursed_crores)}
      ${adminMetricCard("Avg Wait (min)", m.district_avg_wait_time_min)}`;

    document.getElementById("admin-centres-table").innerHTML = `
      <table class="w-full text-xs">
        <thead><tr class="text-left text-slate-400 uppercase text-[10px]">
          <th class="py-2">Centre</th><th>Load</th><th>Status</th><th>Serving</th><th>Avg Wait</th>
        </tr></thead>
        <tbody>${(m.centres_summary || []).map(c => `
          <tr class="border-t border-slate-100">
            <td class="py-2.5 font-bold text-slate-800">${c.name}</td>
            <td><span class="font-bold ${c.load >= 80 ? "text-rose-600" : c.load >= 55 ? "text-amber-600" : "text-emerald-600"}">${c.load}%</span></td>
            <td class="capitalize">${c.status}</td>
            <td class="font-mono">${c.current_token}</td>
            <td>${c.avg_wait}m</td>
          </tr>`).join("")}
        </tbody>
      </table>`;

    renderAdminRecommendations(m.load_analysis);
  } catch (e) { showToast("Admin metrics failed to load.", "error"); }
}

function adminMetricCard(label, value) {
  return `<div class="glass-card p-4 rounded-2xl text-center shadow-sm">
    <span class="text-[10px] font-bold text-slate-500 block uppercase">${label}</span>
    <span class="text-lg font-black text-slate-900 mt-0.5 block">${value}</span>
  </div>`;
}

function renderAdminRecommendations(loadAnalysis) {
  const panel = document.getElementById("admin-recommendations");
  if (!loadAnalysis || !loadAnalysis.recommendations || loadAnalysis.recommendations.length === 0) {
    panel.classList.add("hidden");
    return;
  }
  panel.classList.remove("hidden");
  panel.innerHTML = `<h3 class="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3">⚡ AI Load Rebalancing Suggestions (Prototype Heuristics)</h3>` +
    loadAnalysis.recommendations.map(r => `
      <div class="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1">
        <p class="font-bold text-amber-950">${r.source_centre_name} (${r.source_load}%) → ${r.target_centre_name} (${r.target_load}%)</p>
        <p class="text-amber-800 font-medium">${r.action_recommended} · ~${r.distance_km} km · saves ~${r.estimated_time_saving_min} min</p>
      </div>`).join("");
}

function triggerAdminLoadBalance() {
  showToast("Recomputing district mandi load balance…", "info");
  refreshAdminView();
}

// -------------------------------------------------------------
// [STEP 14] HELP & GRIEVANCE MODAL
// -------------------------------------------------------------
function openComplaintModal() {
  document.getElementById("complaint-modal").classList.remove("hidden");
}
function closeComplaintModal() {
  document.getElementById("complaint-modal").classList.add("hidden");
}

async function handleComplaintSubmit(e) {
  e.preventDefault();
  const payload = {
    name: STATE.user ? STATE.user.name : "Farmer",
    mobile: STATE.user ? STATE.user.mobile : "9812345678",
    token_number: STATE.myTokenNumber || "",
    category: document.getElementById("cmp-category").value,
    description: document.getElementById("cmp-desc").value
  };

  try {
    const res = await api("/api/help/complaint", "POST", payload);
    closeComplaintModal();
    showToast(`शिकायत दर्ज! संदर्भ संख्या: ${res.data.complaint_id} (स्थिति: ${res.data.status})`, "success");
    document.getElementById("cmp-desc").value = "";
  } catch (err) {
    showToast("शिकायत दर्ज नहीं हो सकी: " + err.message, "error");
  }
}

// -------------------------------------------------------------
// [STEP 8] NOTIFICATIONS & SMS DRAWER
// -------------------------------------------------------------
async function refreshSmsLogs() {
  try {
    const res = await api("/api/sms_logs");
    STATE.smsLogs = res.data || [];
    const unread = STATE.smsLogs.filter(s => !s.is_read).length;
    document.getElementById("sms-unread-count").textContent = Math.min(unread, 99);
    const drawer = document.getElementById("sms-drawer");
    if (!drawer.classList.contains("translate-x-full")) renderSmsLogs();
  } catch (e) { /* silent */ }
}

function markAllSmsRead() {
  STATE.smsLogs.forEach(s => s.is_read = true);
  document.getElementById("sms-unread-count").textContent = "0";
  renderSmsLogs();
  showToast("सभी अलर्ट पढ़े गए मार्क किए गए", "info");
}

function renderSmsLogs() {
  const container = document.getElementById("sms-logs-container");
  if (STATE.smsLogs.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 text-center pt-8">No notifications yet.</p>`;
    return;
  }
  container.innerHTML = STATE.smsLogs.slice(0, 30).map(s => `
    <div class="bg-white border ${s.is_read ? 'border-slate-200 opacity-80' : 'border-emerald-300 ring-1 ring-emerald-100'} rounded-2xl p-3.5 shadow-sm space-y-1">
      <div class="flex justify-between items-center">
        <span class="text-xs font-black text-slate-900">${s.title}</span>
        <span class="text-[10px] text-slate-400 font-bold">${s.timestamp}</span>
      </div>
      <p class="text-xs text-slate-600 leading-relaxed font-medium">${s.message_text}</p>
      <div class="flex justify-between items-center mt-1">
        <p class="text-[10px] text-emerald-700 font-bold">${s.token_number}</p>
        ${!s.is_read ? '<span class="w-2 h-2 rounded-full bg-emerald-500"></span>' : ''}
      </div>
    </div>`).join("");
}

// -------------------------------------------------------------
// INITIALIZATION
// -------------------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  setAuthTab("login");
  if (!tryRestoreSession()) {
    document.getElementById("view-auth").classList.remove("hidden");
  }
});
