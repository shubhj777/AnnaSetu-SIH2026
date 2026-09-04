/**
 * KisanQueue — Simplified Frontend Application
 * Talks to the real FastAPI backend for centres, bookings, queue status,
 * operator actions and admin metrics. Login/registration is a lightweight
 * client-side demo layer (stored in this browser only).
 */

const OPERATOR_CENTRE_ID = "centre-a";

const I18N = {
  en: {
    role_farmer: "Farmer", role_operator: "Operator", role_admin: "Admin",
    currently_serving: "Currently Serving", your_token: "Your Token",
    farmers_ahead: "Farmers Ahead", estimated_wait: "Est. Wait",
  },
  hi: {
    role_farmer: "किसान", role_operator: "ऑपरेटर", role_admin: "प्रशासन",
    currently_serving: "वर्तमान सेवा", your_token: "आपका टोकन",
    farmers_ahead: "आगे किसान", estimated_wait: "प्रतीक्षा समय",
  }
};

const STATE = {
  lang: "hi",
  role: "farmer",
  user: null,
  centres: [],
  myTokenNumber: null,
  myBooking: null,
  queueStatus: null,
  smsLogs: [],
  bookingCentreChoice: null,
};

// -------------------------------------------------------------
// API HELPER
// -------------------------------------------------------------
async function api(path, method = "GET", body = null) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body !== null) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
  return data;
}

// -------------------------------------------------------------
// AUTH (client-side demo layer, stored in this browser only)
// -------------------------------------------------------------
function getUsers() {
  try { return JSON.parse(localStorage.getItem("kq_users") || "[]"); } catch { return []; }
}
function saveUsers(users) { localStorage.setItem("kq_users", JSON.stringify(users)); }

function setAuthTab(tab) {
  const isLogin = tab === "login";
  document.getElementById("login-form").classList.toggle("hidden", !isLogin);
  document.getElementById("register-form").classList.toggle("hidden", isLogin);
  document.getElementById("auth-tab-login").classList.toggle("bg-emerald-700", isLogin);
  document.getElementById("auth-tab-login").classList.toggle("text-white", isLogin);
  document.getElementById("auth-tab-login").classList.toggle("shadow", isLogin);
  document.getElementById("auth-tab-login").classList.toggle("text-slate-600", !isLogin);
  document.getElementById("auth-tab-register").classList.toggle("bg-emerald-700", !isLogin);
  document.getElementById("auth-tab-register").classList.toggle("text-white", !isLogin);
  document.getElementById("auth-tab-register").classList.toggle("shadow", !isLogin);
  document.getElementById("auth-tab-register").classList.toggle("text-slate-600", isLogin);
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
  showToast("खाता सफलतापूर्वक बना! अब एक स्लॉट बुक करें।", "success");
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
    name: "Ramesh Kumar (रमेश कुमार)", mobile: "9812345678",
    village: "Taraori ABC, Karnal", farmerId: "FID-HR-78921", tokenNumber: "#A-52"
  });
}

function loginAs(user) {
  STATE.user = user;
  STATE.myTokenNumber = user.tokenNumber || null;
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
// UI CHROME
// -------------------------------------------------------------
function setLanguage(langCode) {
  STATE.lang = langCode;
  document.querySelectorAll(".lang-btn").forEach(b => {
    const active = b.dataset.lang === langCode;
    b.classList.toggle("bg-emerald-600", active);
    b.classList.toggle("text-white", active);
    b.classList.toggle("text-slate-700", !active);
  });
}

function setRole(roleName) {
  STATE.role = roleName;
  document.querySelectorAll(".role-tab-btn").forEach(b => {
    const active = b.dataset.role === roleName;
    b.classList.toggle("bg-emerald-700", active);
    b.classList.toggle("text-white", active);
    b.classList.toggle("shadow", active);
    b.classList.toggle("text-slate-700", !active);
  });
  document.querySelectorAll(".role-tab-btn-m").forEach(b => {
    const active = b.dataset.role === roleName;
    b.classList.toggle("text-emerald-800", active);
    b.classList.toggle("border-emerald-700", active);
    b.classList.toggle("text-slate-500", !active);
    b.classList.toggle("border-transparent", !active);
  });
  document.getElementById("view-farmer").classList.toggle("hidden", roleName !== "farmer");
  document.getElementById("view-operator").classList.toggle("hidden", roleName !== "operator");
  document.getElementById("view-admin").classList.toggle("hidden", roleName !== "admin");
  document.getElementById("demo-menu").classList.add("hidden");

  if (roleName === "operator") refreshOperatorView();
  if (roleName === "admin") refreshAdminView();
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
    document.getElementById("sms-unread-count").textContent = "0";
    refreshSmsLogs();
  }
}

function showToast(msg, type = "info") {
  const colors = { info: "bg-slate-800", success: "bg-emerald-600", error: "bg-rose-600", warn: "bg-amber-500" };
  const el = document.createElement("div");
  el.className = `${colors[type] || colors.info} text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-lg pointer-events-auto animate-[fadeIn_.2s_ease]`;
  el.textContent = msg;
  const container = document.getElementById("toast-container");
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s"; setTimeout(() => el.remove(), 300); }, 3200);
}

// -------------------------------------------------------------
// BOOT
// -------------------------------------------------------------
async function bootApp() {
  try {
    await loadCentres();
  } catch (e) {
    showToast("केंद्रों की जानकारी लोड नहीं हो सकी — बैकएंड चालू है क्या?", "error");
  }
  setRole("farmer");
  await refreshFarmerData();
  populateBookingCentreOptions();
  calculateFormEstimates();
  document.getElementById("form-date").value = new Date().toISOString().slice(0, 10);
}

async function loadCentres() {
  const res = await api("/api/centres");
  STATE.centres = res.data || [];
  renderNearbyCentres();
  renderAiRecommendation();
}

// -------------------------------------------------------------
// FARMER VIEW
// -------------------------------------------------------------
async function refreshFarmerData() {
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
    renderFarmerQueue();
    renderDigitalPass();
    renderStepper();
    renderSlotMatrix(STATE.myBooking.centre_id);
  } catch (e) {
    showToast("बुकिंग लोड करने में समस्या हुई।", "error");
    renderFarmerEmptyState();
  }
}

function renderFarmerEmptyState() {
  document.getElementById("q-centre-name").textContent = "कोई सक्रिय बुकिंग नहीं";
  document.getElementById("q-slot-window").textContent = "—";
  ["q-current-serving", "q-my-token", "q-farmers-ahead", "q-wait-time"].forEach(id => document.getElementById(id).textContent = "—");
  document.getElementById("q-progress-pct").textContent = "—";
  document.getElementById("q-progress-bar").style.width = "0%";
  document.getElementById("q-explanation").textContent = "अभी तक कोई स्लॉट बुक नहीं किया गया — ऊपर \"नया स्लॉट बुक करें\" पर क्लिक करें।";
  document.getElementById("printable-pass").innerHTML = "";
  document.getElementById("procurement-stepper").innerHTML = "";
}

function renderFarmerQueue() {
  const q = STATE.queueStatus, b = STATE.myBooking;
  document.getElementById("q-centre-name").textContent = q.centre_name;
  document.getElementById("q-slot-window").textContent = b.time_window + " Slot";
  document.getElementById("q-current-serving").textContent = q.current_serving_token;
  document.getElementById("q-my-token").textContent = q.your_token;
  document.getElementById("q-farmers-ahead").textContent = q.farmers_ahead;
  document.getElementById("q-wait-time").textContent = q.estimated_wait_time_minutes + " मिनट";

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
    <div class="token-card rounded-3xl p-6 space-y-4">
      <div class="flex justify-between items-start">
        <div>
          <p class="text-[10px] font-black text-emerald-700 uppercase tracking-wide">Digital Gate Pass</p>
          <h4 class="text-xl font-black text-slate-900">${b.token_number}</h4>
        </div>
        <div id="pass-qr" class="w-16 h-16"></div>
      </div>
      <div class="grid grid-cols-2 gap-3 text-xs">
        <div><span class="text-slate-400 block">Farmer</span><span class="font-bold text-slate-800">${b.farmer_name}</span></div>
        <div><span class="text-slate-400 block">Centre</span><span class="font-bold text-slate-800">${b.centre_name}</span></div>
        <div><span class="text-slate-400 block">Crop</span><span class="font-bold text-slate-800">${b.crop_type} (${b.quantity_quintal} Q)</span></div>
        <div><span class="text-slate-400 block">Slot</span><span class="font-bold text-slate-800">${b.time_window}</span></div>
        <div><span class="text-slate-400 block">Status</span><span class="font-bold text-emerald-700">${b.status}</span></div>
        <div><span class="text-slate-400 block">Est. Payout</span><span class="font-bold text-slate-800">₹${(b.total_estimated_value || 0).toLocaleString("en-IN")}</span></div>
      </div>
      <div class="flex gap-2 pt-1">
        <button onclick="window.print()" class="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition">🖨️ Print</button>
        <button onclick="sharePassWhatsApp()" class="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition">📱 Share</button>
      </div>
    </div>`;
  const qrEl = document.getElementById("pass-qr");
  if (qrEl && window.QRCode) {
    qrEl.innerHTML = "";
    new QRCode(qrEl, { text: b.qr_payload || b.token_number, width: 64, height: 64, correctLevel: QRCode.CorrectLevel.M });
  }
}

const STAGE_LABELS_HI = ["बुकिंग", "आगमन", "वजन जांच", "गुणवत्ता", "खरीद पूर्ण", "DBT शुरू", "भुगतान जमा"];
function renderStepper() {
  const b = STATE.myBooking;
  const order = ["BOOKED", "ARRIVED", "WEIGHING_COMPLETED", "QUALITY_VERIFIED", "PROCURED"];
  let completed = b.status === "PAYMENT_INITIATED" ? 7 : (order.indexOf(b.status) + 1 || 1);
  const html = STAGE_LABELS_HI.map((label, i) => {
    const idx = i + 1;
    const cls = idx <= completed ? "completed" : (idx === completed + 1 ? "active" : "");
    return `<div class="step-item ${cls}">
      <div class="step-circle">${idx <= completed ? '<i class="fa-solid fa-check text-xs"></i>' : idx}</div>
      <span class="text-[10px] font-bold text-slate-600 mt-2 text-center">${label}</span>
    </div>`;
  }).join("");
  document.getElementById("procurement-stepper").innerHTML = html;
}

function renderNearbyCentres() {
  const sorted = [...STATE.centres].sort((a, b) => a.current_load_percentage - b.current_load_percentage);
  document.getElementById("nearby-count").textContent = `${STATE.centres.length} Centres`;
  document.getElementById("nearby-centres-list").innerHTML = sorted.map(c => {
    const color = c.current_load_percentage >= 80 ? "bg-rose-500" : c.current_load_percentage >= 55 ? "bg-amber-500" : "bg-emerald-500";
    return `<div class="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
      <div class="min-w-0 pr-2">
        <p class="text-xs font-bold text-slate-800 truncate">${c.name.split(" (")[0]}</p>
        <div class="w-32 bg-slate-200 rounded-full h-1.5 mt-1.5"><div class="${color} h-1.5 rounded-full" style="width:${c.current_load_percentage}%"></div></div>
      </div>
      <span class="text-xs font-black text-slate-600 shrink-0">${c.current_load_percentage}%</span>
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
    `${overloaded.name.split(" (")[0]} पर ${overloaded.current_load_percentage}% भारी भीड़ है। हम ${alt.name.split(" (")[0]} की सिफारिश करते हैं — केवल ${alt.current_load_percentage}% लोड।`;
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

async function renderSlotMatrix(centreId) {
  if (!centreId) return;
  try {
    const res = await api(`/api/centres/${centreId}/slots`);
    const slots = res.data || [];
    document.getElementById("slot-grid").innerHTML = slots.map(s => {
      const isFull = !s.is_available;
      const congestionColor = { low: "border-emerald-300 bg-emerald-50", medium: "border-amber-300 bg-amber-50", high: "border-rose-300 bg-rose-50", full: "border-slate-300 bg-slate-100" }[s.congestion_level] || "border-slate-200";
      return `<div onclick="${isFull ? "" : `openBookingModalWithSlot('${s.time_window}', '${centreId}')`}"
        class="p-3.5 rounded-xl border transition-all text-center ${congestionColor} ${isFull ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:shadow-md"}">
        <p class="text-xs font-black text-slate-800">${s.time_window}</p>
        <p class="text-[10px] font-bold text-slate-500 mt-1">${isFull ? "Full" : `${s.max_capacity - s.booked_count} Open`}</p>
      </div>`;
    }).join("");
  } catch (e) { /* silent */ }
}

function triggerVoiceAnnouncement() {
  if (!STATE.queueStatus) { showToast("पहले एक स्लॉट बुक करें।", "warn"); return; }
  const text = `आपका टोकन ${STATE.queueStatus.your_token}. आपसे आगे ${STATE.queueStatus.farmers_ahead} किसान हैं. अनुमानित प्रतीक्षा समय ${STATE.queueStatus.estimated_wait_time_minutes} मिनट.`;
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "hi-IN"; u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } else {
    showToast(text, "info");
  }
}

async function handleMissedSlotRecovery() {
  if (!STATE.myTokenNumber) { showToast("कोई सक्रिय बुकिंग नहीं मिली।", "warn"); return; }
  try {
    await api(`/api/bookings/${encodeURIComponent(STATE.myTokenNumber)}/recover_slot`, "POST", { new_time_window: "12:00 - 13:00" });
    showToast("स्लॉट सफलतापूर्वक 12:00 PM पर पुनर्निर्धारित!", "success");
    await refreshFarmerData();
    refreshSmsLogs();
  } catch (e) { showToast("पुनर्बहाली विफल: " + e.message, "error"); }
}

function sharePassWhatsApp() {
  if (!STATE.myBooking) return;
  const b = STATE.myBooking;
  const text = encodeURIComponent(`🌾 KisanQueue Token ${b.token_number}\nCentre: ${b.centre_name}\nSlot: ${b.time_window}\nCrop: ${b.crop_type} (${b.quantity_quintal}Q)`);
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
  const slotSelect = document.getElementById("form-time-slot");
  for (const opt of slotSelect.options) {
    if (opt.value.startsWith(slotTime.split(" ")[0])) { opt.selected = true; break; }
  }
  showToast(`चयनित स्लॉट: ${slotTime}`, "info");
}

function calculateFormEstimates() {
  const cropSelect = document.getElementById("form-crop");
  const qty = parseFloat(document.getElementById("form-qty").value) || 0;
  const msp = parseFloat(cropSelect.options[cropSelect.selectedIndex]?.dataset.msp || 0);
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
// OPERATOR VIEW
// -------------------------------------------------------------
async function refreshOperatorView() {
  const centre = STATE.centres.find(c => c.id === OPERATOR_CENTRE_ID);
  document.getElementById("operator-centre-label").textContent = centre ? centre.name : OPERATOR_CENTRE_ID;
  document.getElementById("operator-current-token").textContent = centre ? centre.serving_token_number : "—";

  document.getElementById("operator-stats").innerHTML = !centre ? "" : `
    <div class="glass-card p-4 rounded-2xl text-center"><span class="text-[10px] font-bold text-slate-500 block uppercase">Serving</span><span class="text-xl font-black text-slate-900">${centre.serving_token_number}</span></div>
    <div class="glass-card p-4 rounded-2xl text-center"><span class="text-[10px] font-bold text-slate-500 block uppercase">Load</span><span class="text-xl font-black text-amber-600">${centre.current_load_percentage}%</span></div>
    <div class="glass-card p-4 rounded-2xl text-center"><span class="text-[10px] font-bold text-slate-500 block uppercase">Counters</span><span class="text-xl font-black text-emerald-700">${centre.active_counters}</span></div>
    <div class="glass-card p-4 rounded-2xl text-center"><span class="text-[10px] font-bold text-slate-500 block uppercase">Avg Time/Farmer</span><span class="text-xl font-black text-teal-700">${centre.avg_processing_time_min}m</span></div>`;
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
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p class="font-black text-slate-900">${b.farmer_name} — <span class="text-emerald-700">${b.token_number}</span></p>
          <p class="text-xs text-slate-500">${b.crop_type} · ${b.quantity_quintal} Q · ${b.vehicle_type} · Status: <span class="font-bold">${b.status}</span></p>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <button onclick="operatorAction('${b.token_number}','mark_arrived')" class="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg">✅ Mark Arrived</button>
        <button onclick="operatorRecordWeighing('${b.token_number}')" class="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg">⚖️ Record Weighing</button>
        <button onclick="operatorRecordQuality('${b.token_number}')" class="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg">🔬 Quality Assay</button>
        <button onclick="operatorAction('${b.token_number}','complete_procurement')" class="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg">📜 Complete Procurement</button>
        <button onclick="operatorAction('${b.token_number}','initiate_payment')" class="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg">💰 Sanction DBT Payment</button>
      </div>
    </div>`;
}

async function operatorAction(tokenNumber, action, extra = {}) {
  try {
    const res = await api("/api/operator/action", "POST", { centre_id: OPERATOR_CENTRE_ID, token_number: tokenNumber, action, ...extra });
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
    const res = await api("/api/operator/action", "POST", { centre_id: OPERATOR_CENTRE_ID, token_number: "", action: "call_next" });
    showToast(`Now serving ${res.data.serving_token_number}`, "success");
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
    await api("/api/operator/action", "POST", { centre_id: OPERATOR_CENTRE_ID, token_number: "", action: "broadcast_delay", delay_minutes: parseInt(mins, 10) });
    showToast("Delay broadcast sent to all waiting farmers.", "warn");
    refreshSmsLogs();
  } catch (e) { showToast("Failed: " + e.message, "error"); }
}

async function simulateFullProcurementFlow() {
  const token = STATE.myTokenNumber || "#A-52";
  showToast("Running full procurement demo…", "info");
  const steps = [
    () => operatorAction(token, "mark_arrived"),
    () => operatorAction(token, "record_weighing", { weighbridge_data: { gross_weight_quintal: 52.5, tare_weight_quintal: 2.5, net_weight_quintal: 50.0, weighbridge_slip_no: "WB-DEMO" } }),
    () => operatorAction(token, "record_quality", { quality_data: { moisture_percentage: 11.2, foreign_matter_percentage: 1.0, damaged_grains_percentage: 0.5, grade: "Grade A", approved: true } }),
    () => operatorAction(token, "complete_procurement"),
    () => operatorAction(token, "initiate_payment"),
  ];
  for (const step of steps) {
    await step();
    await new Promise(r => setTimeout(r, 500));
  }
  showToast("✅ Full procurement cycle complete!", "success");
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
  return `<div class="glass-card p-4 rounded-2xl text-center">
    <span class="text-[10px] font-bold text-slate-500 block uppercase">${label}</span>
    <span class="text-lg font-black text-slate-900">${value}</span>
  </div>`;
}

function renderAdminRecommendations(loadAnalysis) {
  const panel = document.getElementById("admin-recommendations");
  if (!loadAnalysis || !loadAnalysis.recommendations || loadAnalysis.recommendations.length === 0) {
    panel.classList.add("hidden");
    return;
  }
  panel.classList.remove("hidden");
  panel.innerHTML = `<h3 class="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3">⚡ AI Load Rebalancing Suggestions</h3>` +
    loadAnalysis.recommendations.map(r => `
      <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs">
        <p class="font-bold text-amber-900">${r.source_centre_name} (${r.source_load}%) → ${r.target_centre_name} (${r.target_load}%)</p>
        <p class="text-amber-800 mt-1">${r.action_recommended} · ~${r.distance_km} km · saves ~${r.estimated_time_saving_min} min</p>
      </div>`).join("");
}

function triggerAdminLoadBalance() {
  showToast("Recomputing district load balance…", "info");
  refreshAdminView();
}

// -------------------------------------------------------------
// SMS DRAWER
// -------------------------------------------------------------
async function refreshSmsLogs() {
  try {
    const res = await api("/api/sms_logs");
    STATE.smsLogs = res.data || [];
    document.getElementById("sms-unread-count").textContent = Math.min(STATE.smsLogs.length, 99);
    const drawer = document.getElementById("sms-drawer");
    if (!drawer.classList.contains("translate-x-full")) renderSmsLogs();
  } catch (e) { /* silent */ }
}

function renderSmsLogs() {
  const container = document.getElementById("sms-logs-container");
  if (STATE.smsLogs.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 text-center pt-8">No notifications yet.</p>`;
    return;
  }
  container.innerHTML = STATE.smsLogs.slice(0, 30).map(s => `
    <div class="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
      <div class="flex justify-between items-center mb-1">
        <span class="text-xs font-black text-slate-800">${s.title}</span>
        <span class="text-[10px] text-slate-400">${s.timestamp}</span>
      </div>
      <p class="text-xs text-slate-600 leading-relaxed">${s.message_text}</p>
      <p class="text-[10px] text-emerald-600 font-bold mt-1">${s.token_number}</p>
    </div>`).join("");
}

// -------------------------------------------------------------
// INIT
// -------------------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  setAuthTab("login");
  if (!tryRestoreSession()) {
    document.getElementById("view-auth").classList.remove("hidden");
  }
});
