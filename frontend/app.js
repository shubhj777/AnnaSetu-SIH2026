/**
 * ANNASETU (किसान कतार) — Frontend Application Engine
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
// DUAL-MODE API HELPER WITH JWT AUTH
// -------------------------------------------------------------
async function api(path, method = "GET", body = null) {
  try {
    const opts = { method, headers: { "Content-Type": "application/json" } };
    const token = localStorage.getItem("kq_token");
    if (token) {
      opts.headers["Authorization"] = `Bearer ${token}`;
    }
    if (body !== null) opts.body = JSON.stringify(body);
    
    // Attempt real backend call
    const res = await fetch(path, opts);
    const contentType = res.headers.get("content-type") || "";
    
    if (!res.ok || !contentType.includes("application/json")) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.detail || `Server returned status ${res.status}`);
    }
    
    const data = await res.json();
    setOfflineMode(false);
    return data;
  } catch (err) {
    if (path.startsWith("/api/auth/")) {
      throw err; // Do not swallow auth errors
    }
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
  if (path === "/api/sms_logs" || path.startsWith("/api/admin/notifications")) return MockData.getSmsLogs();
  if (path === "/api/help/complaint") return MockData.registerComplaint(body);
  if (path === "/api/gis/locations") {
    return {
      status: "success",
      data: {
        centres: MockData.getCentres().data,
        farmers: [
          { id: "f-01", name: "Ramesh Kumar", village: "Taraori", latitude: 29.8055, longitude: 76.9282, token_number: "#A-52", centre_id: "centre-a", status: "ARRIVED" },
          { id: "f-02", name: "Baldev Singh", village: "Assandh", latitude: 29.5197, longitude: 76.6023, token_number: "#B-19", centre_id: "centre-b", status: "BOOKED" }
        ]
      }
    };
  }
  if (path.startsWith("/api/payments/receipt/")) {
    return {
      status: "success",
      receipt: {
        receipt_number: "RCP-DEMO-001",
        pfms_reference: "PFMS-GOV-998124",
        booking_id: "b-ramesh-wheat",
        farmer_name: "Ramesh Kumar (रमेश कुमार)",
        farmer_mobile: "9812345678",
        token_number: "#A-52",
        crop_type: "Wheat (गेहूँ)",
        quantity_quintal: 50.0,
        net_weight_quintal: 50.0,
        msp_rate_per_quintal: 2425.0,
        total_amount_inr: 121250.0,
        bank_name: "State Bank of India",
        account_masked: "XXXXXX9012",
        ifsc: "SBIN0001234",
        status: "SUCCESSFUL",
        completed_at: new Date().toISOString()
      }
    };
  }
  if (path === "/api/payments/initiate" || path === "/api/payments/verify") {
    return {
      status: "success",
      message: "Payment processed",
      data: {
        payment: { payment_reference: "PAY-REF-DEMO", status: "SUCCESSFUL", total_amount_inr: 121250.0 },
        receipt: { receipt_number: "RCP-DEMO-001", pfms_reference: "PFMS-GOV-998124" }
      }
    };
  }
  if (path === "/api/crops/submissions") {
    return {
      status: "success",
      count: 1,
      data: [
        {
          id: "sub-demo-01",
          farmer_name: "Ramesh Kumar",
          farmer_mobile: "9812345678",
          crop_type: "Wheat (गेहूँ)",
          variety: "HD-2967",
          quantity_quintal: 50.0,
          moisture_percentage: 11.5,
          status: "APPROVED",
          notes: "Meets FCI FAQ parameters (Moisture < 12%)",
          created_at: new Date().toISOString().slice(0, 16).replace("T", " ")
        }
      ]
    };
  }
  if (path === "/api/crops/submit" || path.includes("/evaluate")) {
    return { status: "success", message: "Crop assay processed successfully." };
  }
  if (path.endsWith("/cancel")) {
    return { status: "success", message: "Booking cancelled successfully." };
  }
  if (path === "/api/bookings" && method === "GET") {
    return {
      status: "success",
      data: [
        { id: "b-01", token_number: "#A-52", centre_id: "centre-a", centre_name: "Centre A - Karnal", date: "2026-09-01", time_window: "10:00 - 11:00 AM", crop_type: "Wheat (गेहूँ)", quantity_quintal: 50, status: "ARRIVED", total_payout_inr: 121250 }
      ]
    };
  }

  throw new Error(`Endpoint not mapped in mock fallback: ${path}`);
}

// -------------------------------------------------------------
// AUTHENTICATION & ROLE-BASED LOGIN (Multi-Role System)
// -------------------------------------------------------------
function getUsers() {
  try { return JSON.parse(localStorage.getItem("kq_users") || "[]"); } catch { return []; }
}
function saveUsers(users) { localStorage.setItem("kq_users", JSON.stringify(users)); }

let currentAuthRole = "farmer";

function setRoleAuthTab(role) {
  currentAuthRole = role;
  const roles = ["farmer", "operator", "admin"];
  roles.forEach(r => {
    const tabBtn = document.getElementById(`auth-tab-${r}`);
    const formEl = document.getElementById(`form-role-${r}`);
    const isActive = r === role;
    if (tabBtn) {
      tabBtn.className = isActive 
        ? "auth-role-tab flex-1 py-2 rounded-xl text-xs font-black transition bg-emerald-700 text-white shadow"
        : "auth-role-tab flex-1 py-2 rounded-xl text-xs font-black transition text-slate-600 hover:text-slate-900";
    }
    if (formEl) {
      formEl.classList.toggle("hidden", !isActive);
    }
  });
}

function setFarmerSubTab(subTab) {
  const isLogin = subTab === "login";
  const loginForm = document.getElementById("farmer-login-form");
  const regForm = document.getElementById("farmer-register-form");
  const tabLogin = document.getElementById("farmer-subtab-login");
  const tabReg = document.getElementById("farmer-subtab-register");

  if (loginForm) loginForm.classList.toggle("hidden", !isLogin);
  if (regForm) regForm.classList.toggle("hidden", isLogin);
  if (tabLogin) tabLogin.className = isLogin ? "flex-1 py-1.5 rounded-lg font-bold bg-white text-emerald-800 shadow-sm" : "flex-1 py-1.5 rounded-lg font-bold text-slate-500";
  if (tabReg) tabReg.className = !isLogin ? "flex-1 py-1.5 rounded-lg font-bold bg-white text-emerald-800 shadow-sm" : "flex-1 py-1.5 rounded-lg font-bold text-slate-500";
}

async function handleFarmerLoginSubmit(event) {
  event.preventDefault();
  const identifier = document.getElementById("f-login-mobile").value.trim();
  const otp = document.getElementById("f-login-otp").value.trim();
  const errEl = document.getElementById("f-login-error");
  if (errEl) errEl.classList.add("hidden");

  if (!identifier) {
    if (errEl) { errEl.textContent = "कृपया मोबाइल नंबर या किसान ID दर्ज करें।"; errEl.classList.remove("hidden"); }
    return;
  }

  try {
    const res = await api("/api/auth/login", "POST", { identifier, password: otp || "1234", role: "farmer" });
    loginAs(res.user, res.token);
  } catch (err) {
    if (errEl) { errEl.textContent = err.message || "लॉगिन विफल रहा।"; errEl.classList.remove("hidden"); }
    showToast(err.message || "लॉगिन विफल", "error");
  }
}

async function handleDemoFarmerLogin() {
  try {
    const res = await api("/api/auth/login", "POST", { identifier: "9812345678", password: "1234", role: "farmer" });
    loginAs(res.user, res.token);
  } catch (err) {
    loginAs({
      id: "usr-ramesh",
      role: "farmer",
      name: "Ramesh Kumar (रमेश कुमार)",
      mobile: "9812345678",
      village: "Taraori (ताराओड़ी)",
      farmerId: "FID-HR-78921",
      tokenNumber: "#A-52"
    });
  }
}

async function handleFarmerRegisterSubmit(event) {
  event.preventDefault();
  const name = document.getElementById("f-reg-name").value.trim();
  const mobile = document.getElementById("f-reg-mobile").value.trim();
  const village = document.getElementById("f-reg-village").value.trim();
  const password = document.getElementById("f-reg-password").value;
  const errEl = document.getElementById("f-reg-error");
  if (errEl) errEl.classList.add("hidden");

  try {
    const res = await api("/api/auth/register", "POST", { name, mobile, village, password: password || "1234" });
    loginAs(res.user, res.token);
    showToast("पंजीकरण सफल! अब अपना पहला स्लॉट बुक करें।", "success");
    setTimeout(openBookingModal, 400);
  } catch (err) {
    if (errEl) { errEl.textContent = err.message || "पंजीकरण विफल रहा।"; errEl.classList.remove("hidden"); }
    showToast(err.message || "पंजीकरण विफल", "error");
  }
}

async function handleOperatorLoginSubmit(event) {
  event.preventDefault();
  const opId = document.getElementById("op-login-id").value.trim();
  const centreId = document.getElementById("op-login-centre").value;
  try {
    const res = await api("/api/auth/login", "POST", { identifier: "9800000001", password: "1234", role: "operator" });
    res.user.centreId = centreId;
    loginAs(res.user, res.token);
  } catch {
    loginAs({
      role: "operator",
      name: `Operator (${opId || 'Desk 1'})`,
      opId: opId || "OP-01",
      centreId: centreId
    });
  }
}

async function handleDemoOperatorLogin() {
  try {
    const res = await api("/api/auth/login", "POST", { identifier: "9800000001", password: "1234", role: "operator" });
    res.user.centreId = "centre-a";
    loginAs(res.user, res.token);
  } catch {
    loginAs({
      role: "operator",
      name: "Karnal Mandi Operator",
      opId: "OP-KNL-01",
      centreId: "centre-a"
    });
  }
}

async function handleAdminLoginSubmit(event) {
  event.preventDefault();
  const admId = document.getElementById("adm-login-id").value.trim();
  try {
    const res = await api("/api/auth/login", "POST", { identifier: "9800000000", password: "1234", role: "admin" });
    loginAs(res.user, res.token);
  } catch {
    loginAs({
      role: "admin",
      name: `District Admin (${admId || 'Karnal'})`,
      adminId: admId || "ADM-KNL",
      jurisdiction: "District Karnal, Haryana"
    });
  }
}

async function handleDemoAdminLogin() {
  try {
    const res = await api("/api/auth/login", "POST", { identifier: "9800000000", password: "1234", role: "admin" });
    loginAs(res.user, res.token);
  } catch {
    loginAs({
      role: "admin",
      name: "District Collector & Mandi Secretary",
      adminId: "ADM-KNL-HQ",
      jurisdiction: "District Karnal, Haryana"
    });
  }
}

function quickSwitchRole(role) {
  if (role === "operator") {
    handleDemoOperatorLogin();
  } else if (role === "admin") {
    handleDemoAdminLogin();
  } else {
    handleDemoFarmerLogin();
  }
}

function loginAs(user, token = null) {
  STATE.user = user;
  STATE.role = user.role || "farmer";
  if (token) {
    localStorage.setItem("kq_token", token);
  }
  if (user.role === "operator") {
    STATE.operatorCentreId = user.centreId || "centre-a";
  }
  if (user.role === "farmer") {
    STATE.myTokenNumber = user.tokenNumber || (user.mobile === "9812345678" ? "#A-52" : (user.mobile === "9876543210" ? "#B-19" : (user.mobile === "9823456789" ? "#A-35" : (user.mobile === "9898765432" ? "#C-08" : null))));
  }

  // Persist session in localStorage
  localStorage.setItem("kq_session", JSON.stringify(user));

  // Switch views
  const authEl = document.getElementById("view-auth");
  const appEl = document.getElementById("app-shell");
  if (authEl) authEl.classList.add("hidden");
  if (appEl) appEl.classList.remove("hidden");

  // Update header and profile names
  const headerUserEl = document.getElementById("header-user-name");
  if (headerUserEl) {
    const firstName = (user.name || "User").split(" ")[0];
    headerUserEl.textContent = firstName;
  }

  const heroNameEl = document.getElementById("farmer-hero-name");
  if (heroNameEl) heroNameEl.textContent = user.name || "Ramesh Kumar (रमेश कुमार)";

  const heroDetailsEl = document.getElementById("farmer-hero-details");
  if (heroDetailsEl) {
    heroDetailsEl.textContent = `गाँव: ${user.village || 'Taraori (ताराओड़ी)'} | किसान ID: ${user.farmer_id || user.farmerId || 'FID-HR-78921'} | फसल: ${user.crop || 'Wheat (गेहूँ) (50 क्विंटल)'}`;
  }

  bootApp();
  setRole(STATE.role);

  // Initialize role-specific GIS and data tables
  if (STATE.role === "farmer") {
    setTimeout(() => {
      initFarmerGisMap();
      loadFarmerCropSubmissions();
      renderFarmerBookingHistory();
    }, 200);
  } else if (STATE.role === "admin") {
    setTimeout(() => {
      initAdminGisMap();
      loadAdminCropSubmissions();
      loadAdminNotificationLogs();
    }, 200);
  } else if (STATE.role === "operator") {
    setTimeout(() => {
      loadOperatorCropSubmissions();
    }, 200);
  }

  showToast(`✓ ${user.name || 'User'} के रूप में लॉगिन सफल`, "success");
}

function logout() {
  localStorage.removeItem("kq_session");
  localStorage.removeItem("kq_token");
  if (STATE.pollTimer) clearInterval(STATE.pollTimer);
  STATE.user = null;
  STATE.myTokenNumber = null;
  const authEl = document.getElementById("view-auth");
  const appEl = document.getElementById("app-shell");
  if (appEl) appEl.classList.add("hidden");
  if (authEl) authEl.classList.remove("hidden");
  showToast("लॉगआउट हुआ।", "info");
}

function tryRestoreSession() {
  try {
    const saved = JSON.parse(localStorage.getItem("kq_session") || "null");
    if (saved && saved.role) {
      const token = localStorage.getItem("kq_token");
      loginAs(saved, token);
      return true;
    }
  } catch {}
  return false;
}

// -------------------------------------------------------------
// UI CHROME, MULTILINGUAL & NAVIGATION
// -------------------------------------------------------------
function changeLanguage(langCode) {
  STATE.lang = langCode;
  localStorage.setItem("kq_lang", langCode);
  document.documentElement.lang = langCode;
  
  // Update lang pills styling
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === langCode);
  });

  const sel = document.getElementById("lang-select");
  if (sel) sel.value = langCode;

  if (typeof translateUI === "function") {
    translateUI(langCode);
  }
}

function initLanguageSwitcher() {
  document.querySelectorAll(".lang-btn[data-lang]").forEach(btn => {
    btn.addEventListener("click", () => {
      changeLanguage(btn.dataset.lang || "hi");
    });
  });
}

function handleRoleTabClick(targetRole) {
  if (targetRole === "farmer") {
    setRole("farmer");
    return;
  }

  const user = STATE.user;
  const isAuthorized = user && (user.role === targetRole || user.role === "admin");
  if (isAuthorized) {
    setRole(targetRole);
    return;
  }

  openAuthorityLoginModal(targetRole);
}

function openAuthorityLoginModal(targetRole) {
  const modal = document.getElementById("authority-login-modal");
  if (!modal) return;
  const title = document.getElementById("auth-modal-title");
  const sub = document.getElementById("auth-modal-sub");
  const roleInput = document.getElementById("auth-modal-target-role");
  
  if (roleInput) roleInput.value = targetRole;
  if (title) {
    title.textContent = targetRole === "admin" 
      ? "🏛️ जिला प्रशासन प्रमाणीकरण (District Admin SSO)" 
      : "⚖️ मंडी ऑपरेटर कंसोल लॉगिन (Mandi Operator Login)";
  }
  if (sub) {
    sub.textContent = targetRole === "admin"
      ? "जिला कृषि उप-निदेशक / मंडी सचिव प्रशासनिक स्तर प्रमाणीकरण"
      : "क्रय केंद्र वेइंग एवं धर्मकांटा ऑपरेटर सुरक्षित टर्मिनल";
  }

  fillAuthorityDemo(targetRole);
  modal.classList.remove("hidden");
}

function closeAuthorityLoginModal() {
  const modal = document.getElementById("authority-login-modal");
  if (modal) modal.classList.add("hidden");
}

function fillAuthorityDemo(role) {
  const idEl = document.getElementById("auth-modal-id");
  const pwdEl = document.getElementById("auth-modal-pwd");
  const roleInput = document.getElementById("auth-modal-target-role");
  if (roleInput) roleInput.value = role;

  if (role === "admin") {
    if (idEl) idEl.value = "9800000000";
    if (pwdEl) pwdEl.value = "admin123";
  } else {
    if (idEl) idEl.value = "9800000001";
    if (pwdEl) pwdEl.value = "password123";
  }
}

async function handleAuthorityLoginSubmit(e) {
  if (e) e.preventDefault();
  const id = document.getElementById("auth-modal-id").value.trim();
  const pwd = document.getElementById("auth-modal-pwd").value.trim();
  const targetRole = document.getElementById("auth-modal-target-role").value || "operator";

  try {
    const res = await api("/api/auth/login", "POST", {
      identifier: id,
      password: pwd,
      role: targetRole
    });

    if (res.token) {
      localStorage.setItem("kq_token", res.token);
    }
    if (res.user) {
      STATE.user = res.user;
      const headerName = document.getElementById("header-user-name");
      if (headerName) headerName.textContent = res.user.name;
    }

    closeAuthorityLoginModal();
    showToast(`✓ अधिकृत पहुंच सत्यापित: ${res.user ? res.user.name : targetRole}`, "success");
    setRole(targetRole);
  } catch (err) {
    showToast(`प्रमाणीकरण विफल: ${err.message}`, "error");
  }
}

function setRole(roleName) {
  STATE.role = roleName;
  document.querySelectorAll(".role-tab-btn").forEach(b => {
    const active = b.dataset.role === roleName;
    b.className = active 
      ? "role-tab-btn px-4 py-1.5 rounded-xl text-xs font-extrabold transition bg-emerald-700 text-white shadow flex items-center gap-1.5" 
      : "role-tab-btn px-4 py-1.5 rounded-xl text-xs font-bold transition text-slate-700 hover:text-slate-900 flex items-center gap-1.5";
  });
  document.querySelectorAll(".role-tab-btn-m").forEach(b => {
    const active = b.dataset.role === roleName;
    b.className = active 
      ? "role-tab-btn-m flex-1 py-1 text-center text-emerald-800 border-b-2 border-emerald-700 font-bold" 
      : "role-tab-btn-m flex-1 py-1 text-center text-slate-500 border-b-2 border-transparent font-bold";
  });
  
  const fView = document.getElementById("view-farmer");
  const opView = document.getElementById("view-operator");
  const admView = document.getElementById("view-admin");
  if (fView) fView.classList.toggle("hidden", roleName !== "farmer");
  if (opView) opView.classList.toggle("hidden", roleName !== "operator");
  if (admView) admView.classList.toggle("hidden", roleName !== "admin");

  if (roleName === "farmer") {
    requestAnimationFrame(() => {
      setTimeout(() => { if (typeof farmerGisMap !== 'undefined' && farmerGisMap) farmerGisMap.invalidateSize(); }, 200);
    });
  }
  if (roleName === "operator") {
    refreshOperatorView();
    refreshOperatorLiveQueue();
  }
  if (roleName === "admin") {
    refreshAdminView();
    requestAnimationFrame(() => {
      setTimeout(() => { if (typeof adminGisMap !== 'undefined' && adminGisMap) adminGisMap.invalidateSize(); }, 200);
    });
  }
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function toggleSmsDrawer() {
  const drawer = document.getElementById("sms-drawer");
  if (!drawer) return;
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
  if (container) {
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s"; setTimeout(() => el.remove(), 300); }, 3200);
  }
}

// -------------------------------------------------------------
// APP BOOTSTRAP
// -------------------------------------------------------------
async function bootApp() {
  const savedLang = localStorage.getItem("kq_lang") || "hi";
  changeLanguage(savedLang);

  await loadCentres();
  await refreshFarmerData();
  renderCentreDailySchedule();
  populateBookingCentreOptions();
  populateOperatorCentreOptions();
  calculateFormEstimates();
  const dateEl = document.getElementById("form-date");
  if (dateEl) dateEl.value = new Date().toISOString().slice(0, 10);

  // Background polling for live queue radar
  if (STATE.pollTimer) clearInterval(STATE.pollTimer);
  STATE.pollTimer = setInterval(async () => {
    if (STATE.role === "farmer" && STATE.myTokenNumber) {
      await refreshFarmerData(true);
    }
  }, 5000);
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
    renderCentreDailySchedule();
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
    renderSlotMatrix(STATE.myBooking.centre_id);
    renderCentreDailySchedule();
    initFarmerGisMap();
    loadFarmerCropSubmissions();
    renderFarmerBookingHistory();
    refreshSmsLogs();
  } catch (e) {
    if (!silent) showToast("बुकिंग लोड करने में समस्या हुई।", "error");
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
      renderSlotMatrix(STATE.myBooking.centre_id);
      initFarmerGisMap();
      loadFarmerCropSubmissions();
      renderFarmerBookingHistory();
    } else {
      renderFarmerEmptyState();
      initFarmerGisMap();
      loadFarmerCropSubmissions();
      renderFarmerBookingHistory();
    }
  }
}

function renderFarmerEmptyState() {
  const cName = document.getElementById("q-centre-name");
  if (cName) cName.textContent = "कोई सक्रिय बुकिंग नहीं";
  const sWin = document.getElementById("q-slot-window");
  if (sWin) sWin.textContent = "—";
  ["q-current-serving", "q-my-token", "q-farmers-ahead", "q-wait-time"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = "—";
  });
  const pPct = document.getElementById("q-progress-pct");
  if (pPct) pPct.textContent = "—";
  const pBar = document.getElementById("q-progress-bar");
  if (pBar) pBar.style.width = "0%";
  const pExpl = document.getElementById("q-explanation");
  if (pExpl) pExpl.textContent = "अभी तक कोई स्लॉट बुक नहीं किया गया — ऊपर 'नया स्लॉट बुक करें' पर क्लिक करें।";
  const pPass = document.getElementById("printable-pass");
  if (pPass) pPass.innerHTML = "";
  const pStep = document.getElementById("procurement-stepper");
  if (pStep) pStep.innerHTML = "";
  
  const statusLineText = document.getElementById("status-line-text");
  if (statusLineText) statusLineText.textContent = "⚪ कोई सक्रिय टोकन नहीं";
  const statusLineSub = document.getElementById("status-line-sub");
  if (statusLineSub) statusLineSub.textContent = "स्लॉट बुक करें";
}

// "आपका अगला काम" & Live Status Line
function renderWhatShouldIDoNow() {
  const q = STATE.queueStatus;
  const b = STATE.myBooking;
  if (!q || !b) return;

  const statusLineDot = document.getElementById("status-line-dot");
  const statusLineText = document.getElementById("status-line-text");
  const statusLineSub = document.getElementById("status-line-sub");

  const status = b.status || "BOOKED";
  const ahead = q.farmers_ahead;

  if (status === "PAYMENT_INITIATED" || (b.payment && b.payment.dbt_status)) {
    if (statusLineDot) statusLineDot.className = "w-3 h-3 rounded-full bg-emerald-500";
    if (statusLineText) statusLineText.textContent = "💰 MSP भुगतान बैंक खाते में PFMS द्वारा प्रेषित";
    if (statusLineSub) statusLineSub.textContent = "DBT Disbursed";
  } else if (status === "PROCURED") {
    if (statusLineDot) statusLineDot.className = "w-3 h-3 rounded-full bg-teal-500";
    if (statusLineText) statusLineText.textContent = "✅ फसल खरीद पूर्ण (Official Mandi Receipt Issued)";
    if (statusLineSub) statusLineSub.textContent = "Procurement Done";
  } else if (ahead === 0 || status === "ARRIVED" || status === "WEIGHING_COMPLETED" || status === "QUALITY_VERIFIED") {
    if (statusLineDot) statusLineDot.className = "w-3 h-3 rounded-full bg-rose-500 animate-ping";
    if (statusLineText) statusLineText.textContent = "🔴 Your turn is now! (आपकी बारी सक्रिय है)";
    if (statusLineSub) statusLineSub.textContent = "Present Pass at Desk #2";
  } else if (ahead <= 5) {
    if (statusLineDot) statusLineDot.className = "w-3 h-3 rounded-full bg-amber-500 animate-pulse";
    if (statusLineText) statusLineText.textContent = "🟢 Your turn is approaching (आपसे आगे " + ahead + " किसान हैं)";
    if (statusLineSub) statusLineSub.textContent = "Head towards Gate 1";
  } else {
    if (statusLineDot) statusLineDot.className = "w-3 h-3 rounded-full bg-emerald-500 animate-pulse";
    if (statusLineText) statusLineText.textContent = "🟢 Your turn is approaching (~" + q.estimated_wait_time_minutes + " मिनट प्रतीक्षा)";
    if (statusLineSub) statusLineSub.textContent = "Wait comfortably at home";
  }
}

// Real-time queue position & Estimated wait-time
function renderFarmerQueue() {
  const q = STATE.queueStatus, b = STATE.myBooking;
  if (!q || !b) return;

  const centreEl = document.getElementById("q-centre-name");
  if (centreEl) centreEl.textContent = q.centre_name;

  const slotEl = document.getElementById("q-slot-window");
  if (slotEl) slotEl.textContent = (b.display_time_window || b.time_window) + " Slot";

  const servEl = document.getElementById("q-current-serving");
  if (servEl) servEl.textContent = q.current_serving_token;

  const tokEl = document.getElementById("q-my-token");
  if (tokEl) tokEl.textContent = q.your_token;

  const tokSub = document.getElementById("q-token-sub");
  if (tokSub) tokSub.textContent = `${b.quantity_quintal || 50} Q (${b.crop_type || 'Wheat'})`;

  const aheadEl = document.getElementById("q-farmers-ahead");
  if (aheadEl) aheadEl.textContent = q.farmers_ahead;
  
  // Color-coded wait time
  const waitEl = document.getElementById("q-wait-time");
  if (waitEl) {
    waitEl.textContent = q.estimated_wait_time_minutes + " मिनट";
    if (q.estimated_wait_time_minutes > 50) {
      waitEl.className = "text-2xl font-black text-rose-600 mt-1 block";
    } else if (q.estimated_wait_time_minutes > 25) {
      waitEl.className = "text-2xl font-black text-amber-600 mt-1 block";
    } else {
      waitEl.className = "text-2xl font-black text-teal-800 mt-1 block";
    }
  }

  const timerEl = document.getElementById("q-wait-timer");
  if (timerEl) {
    const minStr = Math.max(1, q.estimated_wait_time_minutes);
    timerEl.textContent = `⏳ ~${minStr} min`;
  }

  const total = Math.max(q.your_seq - (q.current_serving_seq - q.farmers_ahead) + 1, 1);
  const done = Math.max(total - q.farmers_ahead, 0);
  const pct = Math.min(100, Math.round((done / total) * 100));
  
  const pctEl = document.getElementById("q-progress-pct");
  if (pctEl) pctEl.textContent = pct + "% Reached";
  const barEl = document.getElementById("q-progress-bar");
  if (barEl) barEl.style.width = pct + "%";
  const explEl = document.getElementById("q-explanation");
  if (explEl) explEl.textContent = "💡 " + q.explanation;
}

// Digital Gate Pass Printable Widget (Matching Screenshot Exactly)
function renderDigitalPass() {
  const b = STATE.myBooking;
  if (!b) return;

  const container = document.getElementById("printable-pass");
  if (!container) return;

  const estVal = (b.total_estimated_value || (b.quantity_quintal || 50) * 2425).toLocaleString("en-IN");

  container.innerHTML = `
    <div class="official-pass-card p-5 space-y-4 shadow-md bg-white">
      <div class="flex justify-between items-center text-[10px] font-bold text-slate-600 border-b border-dashed border-slate-200 pb-2.5">
        <div class="flex items-center gap-1.5">
          <span class="text-emerald-700">🇮🇳</span>
          <span class="font-semibold text-slate-700">भारतीय खाद्य निगम / राज्य कृषि विपणन बोर्ड डिजिटल गेट पास</span>
        </div>
        <span class="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-black text-[9px] border border-amber-300">★ OFFICIAL PASS ★</span>
      </div>

      <div class="flex justify-between items-center">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-emerald-800 text-white flex items-center justify-center text-2xl shadow">
            🌾
          </div>
          <div>
            <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">OFFICIAL MANDI PASS</span>
            <span class="font-mono text-xs font-bold text-slate-500 block">BK-KNL-2026-0881</span>
            <h4 class="text-base font-extrabold text-slate-900">${b.centre_name || 'Centre A - Grain Market Karnal'}</h4>
          </div>
        </div>
        <div class="text-right">
          <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">GATE PASS TOKEN</span>
          <span id="pass-token-badge" class="text-3xl font-black text-emerald-800 block">${b.token_number || '#A-52'}</span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-100">
        <div>
          <span class="text-slate-400 block font-bold text-[10px]">Farmer Name / किसान:</span>
          <span class="font-bold text-slate-900">${b.farmer_name || 'Ramesh Kumar (रमेश कुमार)'}</span>
        </div>
        <div>
          <span class="text-slate-400 block font-bold text-[10px]">Date & Time Slot / समय:</span>
          <span class="font-bold text-slate-900">2026-09-01 ${b.display_time_window || b.time_window || '10:00 - 11:00 AM'}</span>
        </div>
        <div>
          <span class="text-slate-400 block font-bold text-[10px]">Crop & Quantity / फसल:</span>
          <span class="font-bold text-slate-900">${b.crop_type || 'Wheat (गेहूँ)'} ${b.quantity_quintal || 50} Quintal (${b.vehicle_number ? 'HR-05-AB-7821' : 'Tractor Trolley'})</span>
        </div>
        <div>
          <span class="text-slate-400 block font-bold text-[10px]">MSP Sanction Rate:</span>
          <span class="font-bold text-emerald-800">₹2425 / Q <span class="text-slate-500 font-normal">(Est: ₹${estVal})</span></span>
        </div>
      </div>

      <div class="flex gap-2 pt-2 border-t border-dashed border-slate-200 no-print">
        <button onclick="window.print()" class="flex-1 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5">
          <i class="fa-solid fa-print"></i> प्रिंट पास (Print)
        </button>
        <button onclick="sharePassWhatsApp()" class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5">
          <i class="fa-brands fa-whatsapp"></i> WhatsApp शेयर
        </button>
        ${(b.status === 'BOOKED' || b.status === 'ARRIVED') ? `
        <button onclick="promptCancelBooking('${b.token_number}')" class="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1" title="रद्द करें">
          <i class="fa-solid fa-xmark"></i> रद्द करें
        </button>` : ''}
      </div>
    </div>`;
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

  if (isPaid || b.status === "PAYMENT_CREDITED") {
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

  const btnDbt = document.getElementById("btn-process-dbt");
  if (btnDbt) {
    if (isPaid || b.status === "PAYMENT_CREDITED") {
      btnDbt.innerHTML = '<i class="fa-solid fa-circle-check"></i><span>✓ DBT राशि जमा हो चुकी है (Credited)</span>';
      btnDbt.className = "flex-1 py-2.5 px-4 bg-emerald-800 text-white font-black text-xs rounded-xl shadow transition flex items-center justify-center gap-2";
    } else {
      btnDbt.innerHTML = '<i class="fa-solid fa-file-invoice-dollar"></i><span>💰 DBT भुगतान स्वीकृति व सत्यापन (Verify DBT)</span>';
      btnDbt.className = "flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow transition flex items-center justify-center gap-2";
    }
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
  const banner = document.getElementById("ai-smart-banner") || document.getElementById("ai-recommend-banner");
  if (!banner) return;
  if (!overloaded) { banner.classList.add("hidden"); return; }
  
  const alt = [...STATE.centres].filter(c => c.id !== overloaded.id).sort((a, b) => a.current_load_percentage - b.current_load_percentage)[0];
  if (!alt) { banner.classList.add("hidden"); return; }

  const txt = document.getElementById("ai-smart-text") || document.getElementById("ai-recommend-text");
  if (txt) {
    txt.textContent =
      `${overloaded.name.split(" (")[0]} पर ${overloaded.current_load_percentage}% भारी भीड़ है। हम ${alt.name.split(" (")[0]} (~${alt.distance_km || 7} km) की सिफारिश करते हैं — केवल ${alt.current_load_percentage}% लोड (~47 मिनट कम प्रतीक्षा)।`;
  }
  banner.dataset.targetCentre = alt.id;
  banner.classList.remove("hidden");
}

function switchRecommendedCentre() {
  const banner = document.getElementById("ai-smart-banner") || document.getElementById("ai-recommend-banner");
  if (!banner) return;
  const cid = banner.dataset.targetCentre;
  if (!cid) return;
  STATE.bookingCentreChoice = cid;
  const sel = document.getElementById("form-centre");
  if (sel) sel.value = cid;
  showToast("अनुशंसित केंद्र चुना गया।", "success");
  openBookingModal();
}

let currentSlotFilter = {
  centreId: null,
  cropType: "Wheat (गेहूँ)",
  date: new Date().toISOString().slice(0, 10)
};

async function onSlotFilterChange() {
  const centreSel = document.getElementById("slot-filter-centre");
  const cropSel = document.getElementById("slot-filter-crop");
  const dateInput = document.getElementById("slot-filter-date");

  currentSlotFilter.centreId = centreSel ? centreSel.value : (currentSlotFilter.centreId || "centre-a");
  currentSlotFilter.cropType = cropSel ? cropSel.value : "Wheat (गेहूँ)";
  currentSlotFilter.date = dateInput && dateInput.value ? dateInput.value : new Date().toISOString().slice(0, 10);

  await renderSlotMatrix(currentSlotFilter.centreId, currentSlotFilter.cropType, currentSlotFilter.date);
}

function resetSlotFilters() {
  const firstCentre = (STATE.centres && STATE.centres[0]) ? STATE.centres[0].id : "centre-a";
  currentSlotFilter = {
    centreId: firstCentre,
    cropType: "Wheat (गेहूँ)",
    date: new Date().toISOString().slice(0, 10)
  };
  const centreSel = document.getElementById("slot-filter-centre");
  const cropSel = document.getElementById("slot-filter-crop");
  const dateInput = document.getElementById("slot-filter-date");
  if (centreSel) centreSel.value = firstCentre;
  if (cropSel) cropSel.value = "Wheat (गेहूँ)";
  if (dateInput) dateInput.value = currentSlotFilter.date;

  renderSlotMatrix(currentSlotFilter.centreId, currentSlotFilter.cropType, currentSlotFilter.date);
}

function applyBestRecommendedCentre() {
  const card = document.getElementById("slot-best-recommendation-card");
  const targetId = card ? card.dataset.bestCentreId : null;
  if (!targetId) return;
  const centreSel = document.getElementById("slot-filter-centre");
  if (centreSel) centreSel.value = targetId;
  onSlotFilterChange();
  showToast("सर्वोत्तम अनुशंसित क्रय केंद्र चयनित।", "success");
}

// [STEP 2] Reactive Slot Allocation Matrix with Filters & Real-Time Capacity
async function renderSlotMatrix(centreId, cropType, targetDate) {
  const cid = centreId || currentSlotFilter.centreId || (STATE.centres[0] && STATE.centres[0].id) || "centre-a";
  const cType = cropType || currentSlotFilter.cropType || "Wheat (गेहूँ)";
  const tDate = targetDate || currentSlotFilter.date || new Date().toISOString().slice(0, 10);
  currentSlotFilter.centreId = cid;
  currentSlotFilter.cropType = cType;
  currentSlotFilter.date = tDate;

  // Initialize and sync filter select options
  const centreSel = document.getElementById("slot-filter-centre");
  if (centreSel) {
    if (centreSel.options.length === 0 && STATE.centres.length > 0) {
      centreSel.innerHTML = STATE.centres.map(c => `
        <option value="${c.id}">${c.name.split(' (')[0]} (${c.current_load_percentage || 50}% Load)</option>
      `).join('');
    }
    centreSel.value = cid;
  }
  const cropSel = document.getElementById("slot-filter-crop");
  if (cropSel && cropSel.value !== cType) cropSel.value = cType;
  const dateInput = document.getElementById("slot-filter-date");
  if (dateInput && !dateInput.value) dateInput.value = tDate;

  try {
    // 1. Fetch hourly slots
    const slotsRes = await api(`/api/centres/${cid}/slots?booking_date=${tDate}`);
    const slots = slotsRes.data || [];

    // 2. Fetch multi-centre availability and algorithmic recommendation
    const availRes = await api(`/api/availability/crop-centres?crop_type=${encodeURIComponent(cType)}&date=${tDate}`);
    const availCentres = availRes.centres || [];
    const bestOpt = availRes.best_option || {};
    const currCentreStats = availCentres.find(c => c.centre_id === cid) || {};

    // 3. Render Capacity Summary Chips
    const summaryContainer = document.getElementById("slot-capacity-summary");
    if (summaryContainer) {
      const totalCap = currCentreStats.total_capacity_slots || (slots.reduce((acc, s) => acc + s.max_capacity, 0) || 120);
      const bookedCap = currCentreStats.booked_slots || (slots.reduce((acc, s) => acc + s.booked_count, 0) || 0);
      const remainingCap = Math.max(0, totalCap - bookedCap);
      const loadPct = currCentreStats.load_percentage !== undefined ? currCentreStats.load_percentage : Math.min(100, Math.round((bookedCap / Math.max(1, totalCap)) * 100));
      const waitMins = currCentreStats.estimated_wait_time_minutes || 25;
      const counters = currCentreStats.active_counters || 3;

      let loadColor = loadPct >= 80 ? "rose" : loadPct >= 50 ? "amber" : "emerald";

      summaryContainer.innerHTML = `
        <div class="p-2.5 rounded-xl bg-white border border-slate-200 text-center shadow-sm">
          <span class="text-[10px] uppercase font-bold text-slate-500 block">दैनिक क्षमता</span>
          <span class="text-base font-black text-slate-900 block mt-0.5">${totalCap}</span>
          <span class="text-[9px] text-slate-400">कुल स्लॉट</span>
        </div>
        <div class="p-2.5 rounded-xl bg-white border border-slate-200 text-center shadow-sm">
          <span class="text-[10px] uppercase font-bold text-slate-500 block">आरक्षित (Booked)</span>
          <span class="text-base font-black text-slate-900 block mt-0.5">${bookedCap}</span>
          <span class="text-[9px] text-slate-400">टोकन जारी</span>
        </div>
        <div class="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-center shadow-sm">
          <span class="text-[10px] uppercase font-bold text-emerald-800 block">खुले स्लॉट (Open)</span>
          <span class="text-base font-black text-emerald-700 block mt-0.5">${remainingCap}</span>
          <span class="text-[9px] text-emerald-600 font-bold">उपलब्ध</span>
        </div>
        <div class="p-2.5 rounded-xl bg-${loadColor}-50 border border-${loadColor}-300 text-center shadow-sm">
          <span class="text-[10px] uppercase font-bold text-${loadColor}-800 block">कतार भार (Load)</span>
          <span class="text-base font-black text-${loadColor}-700 block mt-0.5">${loadPct}%</span>
          <span class="text-[9px] text-${loadColor}-600 font-bold">${loadPct >= 80 ? 'उच्च भीड़' : loadPct >= 50 ? 'मध्यम' : 'सुगम'}</span>
        </div>
        <div class="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-center shadow-sm">
          <span class="text-[10px] uppercase font-bold text-teal-800 block">प्रतीक्षा समय</span>
          <span class="text-base font-black text-teal-800 block mt-0.5">~${waitMins}m</span>
          <span class="text-[9px] text-teal-600">औसत समय</span>
        </div>
        <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center shadow-sm">
          <span class="text-[10px] uppercase font-bold text-slate-500 block">सक्रिय कांटे</span>
          <span class="text-base font-black text-slate-800 block mt-0.5">${counters}</span>
          <span class="text-[9px] text-slate-400">वेइंग काउंटर</span>
        </div>`;
    }

    // 4. Render Best Mandi Recommendation Box
    const recCard = document.getElementById("slot-best-recommendation-card");
    const recText = document.getElementById("slot-best-rec-text");
    if (recCard && recText && bestOpt.centre_name) {
      recCard.dataset.bestCentreId = bestOpt.centre_id;
      recText.textContent = `${bestOpt.centre_name}: ${bestOpt.reason}`;
      const btn = document.getElementById("btn-select-best-centre");
      if (btn) {
        btn.classList.toggle("hidden", bestOpt.centre_id === cid);
      }
    }

    // 5. Render Slots Grid
    const slotGrid = document.getElementById("slot-grid");
    if (!slotGrid) return;
    const mySlotWindow = STATE.myBooking ? (STATE.myBooking.time_window || "") : "";

    if (slots.length === 0) {
      slotGrid.innerHTML = `<div class="col-span-full text-center py-6 text-slate-400 text-xs font-semibold">इस तिथि पर कोई स्लॉट उपलब्ध नहीं हैं।</div>`;
      return;
    }

    slotGrid.innerHTML = slots.map(s => {
      const isMySlot = STATE.myBooking && (s.time_window === mySlotWindow || s.display_time_window === STATE.myBooking.display_time_window);
      const isFull = !s.is_available && !isMySlot;
      const openCount = Math.max(0, s.max_capacity - s.booked_count);
      
      let cardStyle = "border-slate-200 bg-white hover:border-emerald-400";
      if (isMySlot) {
        cardStyle = "border-2 border-emerald-600 bg-emerald-50 shadow-md ring-2 ring-emerald-400/50";
      } else if (isFull) {
        cardStyle = "border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed";
      } else if (s.congestion_level === "high" || openCount <= 2) {
        cardStyle = "border-rose-300 bg-rose-50/50";
      } else if (s.congestion_level === "medium" || openCount <= 5) {
        cardStyle = "border-amber-300 bg-amber-50/50";
      } else {
        cardStyle = "border-emerald-300 bg-emerald-50/40";
      }

      return `<div class="p-3.5 rounded-2xl border transition-all text-center relative ${cardStyle}">
        ${isMySlot ? '<span class="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-emerald-700 text-white font-black text-[9px] rounded-full shadow tracking-wider">🟢 YOUR SLOT</span>' : ''}
        <p class="text-xs font-black text-slate-900">${s.display_time_window || s.time_window}</p>
        <p class="text-[10px] font-bold text-slate-500 mt-1">${isFull ? '<span class="text-rose-600 font-bold">Full</span>' : `<span class="text-emerald-700 font-bold">${openCount} Open</span>`}</p>
        ${!isMySlot && !isFull ? `<button onclick="openBookingModalWithSlot('${s.time_window}', '${cid}', '${tDate}', '${cType}')" class="mt-2 w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold rounded-lg transition shadow">स्लॉट बुक करें</button>` : ''}
        ${isMySlot ? `<div class="mt-2 text-[10px] font-bold text-emerald-800 bg-emerald-100/80 py-1 rounded-lg">आपका आरक्षित स्लॉट</div>` : ''}
      </div>`;
    }).join("");

  } catch (e) {
    console.warn("Slot matrix render error:", e);
  }
}

// Daily Mandi Procurement Schedule ("आज किस केंद्र पर कौन सी फसल ली जा रही है?")
async function renderCentreDailySchedule() {
  const container = document.getElementById("centre-schedule-grid");
  if (!container) return;
  try {
    const res = await api("/api/centres/daily-schedule");
    const schedules = res.schedules || [];
    if (schedules.length === 0) return;

    container.innerHTML = schedules.map(s => {
      const loadColor = s.load_percentage >= 80 ? "rose" : s.load_percentage >= 50 ? "amber" : "emerald";
      return `
        <div class="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div class="flex justify-between items-start">
            <div>
              <h4 class="font-extrabold text-slate-900 text-xs">${s.centre_name.split(" -")[0]}</h4>
              <span class="text-[10px] text-slate-400 font-bold block">${s.centre_id.toUpperCase()}</span>
            </div>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-${loadColor}-100 text-${loadColor}-800 border border-${loadColor}-300">
              ${s.load_percentage}% भार
            </span>
          </div>

          <div class="space-y-1.5 text-[11px]">
            <div class="text-slate-600">
              <span class="font-bold text-slate-700">🕒 समय:</span> ${s.operating_hours}
            </div>
            <div class="text-slate-600">
              <span class="font-bold text-slate-700">🚪 गेट:</span> ${s.gate_entry || 'Main Gate 1'}
            </div>
            <div class="text-slate-600">
              <span class="font-bold text-slate-700">🌾 स्वीकृत फसलें:</span>
              <div class="flex flex-wrap gap-1 mt-1">
                ${(s.crops_scheduled || []).map(cp => `
                  <span class="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[9px] font-bold">
                    ${cp.split(' ')[0]}
                  </span>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span class="text-[10px] text-slate-500 font-bold">${s.open_slots} खुले स्लॉट</span>
            <button onclick="selectCentreForBooking('${s.centre_id}')" class="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-[10px] transition shadow">
              स्लॉट चुनें &rarr;
            </button>
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    console.warn("Centre daily schedule error:", err);
  }
}

function selectCentreForBooking(centreId) {
  const sel = document.getElementById("slot-filter-centre");
  if (sel) sel.value = centreId;
  onSlotFilterChange();
  scrollToSection("slot-section");
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
  setTimeout(() => initRouteGisMap(cid), 150);
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
  const text = encodeURIComponent(`🌾 ANNASETU Digital Gate Pass\nToken: ${b.token_number}\nFarmer: ${b.farmer_name}\nCentre: ${b.centre_name}\nSlot: ${b.display_time_window || b.time_window}\nCrop: ${b.crop_type} (${b.quantity_quintal}Q)`);
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

function openBookingModalWithSlot(slotTime, centreId, dateVal, cropVal) {
  openBookingModal();
  if (centreId) {
    const cEl = document.getElementById("form-centre");
    if (cEl) cEl.value = centreId;
  }
  if (dateVal) {
    const dEl = document.getElementById("form-date");
    if (dEl) dEl.value = dateVal;
  }
  if (cropVal) {
    const crEl = document.getElementById("form-crop");
    if (crEl) {
      for (const opt of crEl.options) {
        if (opt.value.toLowerCase().includes(cropVal.toLowerCase()) || cropVal.toLowerCase().includes(opt.value.toLowerCase())) {
          opt.selected = true;
          break;
        }
      }
    }
  }
  if (slotTime) {
    const slotSelect = document.getElementById("form-time-slot");
    if (slotSelect) {
      for (const opt of slotSelect.options) {
        if (opt.value.startsWith(slotTime.slice(0, 5))) { opt.selected = true; break; }
      }
    }
  }
  calculateFormEstimates();
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

  loadOperatorCropSubmissions();
  refreshOperatorLiveQueue();
}

async function refreshOperatorLiveQueue() {
  const container = document.getElementById("operator-live-queue-container");
  if (!container) return;
  const cid = STATE.operatorCentreId || "centre-a";
  const filterEl = document.getElementById("operator-queue-filter");
  const filterVal = filterEl ? filterEl.value : "ALL";

  try {
    const url = `/api/operator/queue/${cid}${filterVal !== 'ALL' ? `?status=${filterVal}` : ''}`;
    const res = await api(url);
    const queue = res.data || [];

    if (queue.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-slate-400">
          <i class="fa-solid fa-clipboard-check text-3xl mb-2 text-slate-300 block"></i>
          <p class="text-xs font-semibold">इस केंद्र पर वर्तमान में कोई कतारबद्ध किसान नहीं है।</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
            <th class="p-3">टोकन / गेट पास</th>
            <th class="p-3">किसान विवरण</th>
            <th class="p-3">फसल व मात्रा</th>
            <th class="p-3">वाहन संख्या</th>
            <th class="p-3">वर्तमान स्थिति</th>
            <th class="p-3">आवक समय</th>
            <th class="p-3 text-right">कार्रवाई (Stage Actions)</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
          ${queue.map(b => {
            const isArrived = b.status === 'ARRIVED';
            const isWeighed = b.status === 'WEIGHING_COMPLETED';
            const isQualityPassed = b.status === 'QUALITY_VERIFIED';
            const isProcured = b.status === 'PROCURED';
            const isPaid = b.status === 'PAYMENT_CREDITED';

            let statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">${b.status}</span>`;
            if (isArrived) statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">🚚 गेट इन</span>`;
            else if (isWeighed) statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">⚖️ वेइंग पूर्ण</span>`;
            else if (isQualityPassed) statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">🔬 FAQ पास</span>`;
            else if (isProcured) statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">✅ खरीद स्वीकृत</span>`;
            else if (isPaid) statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">💰 DBT जमा</span>`;

            return `
              <tr class="hover:bg-slate-50 transition">
                <td class="p-3">
                  <div class="font-extrabold text-slate-900 font-mono text-xs">${b.token_number}</div>
                  <div class="text-[10px] text-emerald-700 font-mono font-bold">${b.gate_entry_id || (b.gate_entry && b.gate_entry.gate_entry_number) || '—'}</div>
                </td>
                <td class="p-3">
                  <div class="font-bold text-slate-900">${b.farmer_name}</div>
                  <div class="text-[11px] text-slate-400 font-mono">${b.farmer_mobile || ''}</div>
                </td>
                <td class="p-3">
                  <div class="font-bold text-slate-900">${b.crop_type}</div>
                  <div class="text-[11px] text-slate-500 font-bold">${b.quantity_quintal} Q</div>
                </td>
                <td class="p-3 font-mono font-bold text-slate-700 text-[11px]">
                  ${b.vehicle_number || 'HR-05-AB-7821'}
                </td>
                <td class="p-3">
                  ${statusBadge}
                </td>
                <td class="p-3 text-[11px] text-slate-500">
                  ${b.arrived_at || b.display_time_window || b.time_window || '—'}
                </td>
                <td class="p-3 text-right">
                  <div class="flex items-center justify-end gap-1.5 flex-wrap">
                    ${b.status === 'BOOKED' ? `
                      <button onclick="openGateEntryModal('${b.token_number}')" class="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-bold transition shadow">
                        🚚 गेट इन
                      </button>
                    ` : ''}
                    ${isArrived ? `
                      <button onclick="operatorRecordWeighing('${b.token_number}')" class="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition shadow">
                        ⚖️ वेइंग
                      </button>
                    ` : ''}
                    ${isWeighed ? `
                      <button onclick="operatorRecordQuality('${b.token_number}')" class="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold transition shadow">
                        🔬 गुणवत्ता
                      </button>
                    ` : ''}
                    ${isQualityPassed ? `
                      <button onclick="operatorAction('${b.token_number}', 'complete_procurement')" class="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition shadow">
                        ✅ खरीद
                      </button>
                    ` : ''}
                    ${isProcured ? `
                      <button onclick="operatorAction('${b.token_number}', 'initiate_payment')" class="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition shadow">
                        💰 DBT
                      </button>
                    ` : ''}
                    <button onclick="operatorLoadTokenFromQueue('${b.token_number}')" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition">
                      विवरण
                    </button>
                  </div>
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    container.innerHTML = `<p class="text-rose-600 text-xs p-3">कतार लोड करने में त्रुटि: ${err.message}</p>`;
  }
}

function operatorLoadTokenFromQueue(token) {
  const input = document.getElementById("operator-token-input");
  if (input) input.value = token;
  operatorLoadToken();
  scrollToSection("operator-farmer-detail");
}

// -------------------------------------------------------------
// GATE ENTRY & MANDI ARRIVAL MODAL HANDLERS
// -------------------------------------------------------------
function openGateEntryModal(tokenNumber) {
  const modal = document.getElementById("gate-entry-modal");
  if (!modal) return;
  const tokenInput = document.getElementById("ge-token-input");
  const vehicleInput = document.getElementById("ge-vehicle-input");
  const driverInput = document.getElementById("ge-driver-input");
  const resultCard = document.getElementById("ge-result-card");
  if (resultCard) resultCard.classList.add("hidden");

  const targetToken = tokenNumber || STATE.myTokenNumber || "#A-52";
  if (tokenInput) tokenInput.value = targetToken;
  if (driverInput) driverInput.value = (STATE.myBooking && STATE.myBooking.farmer_name) || "Ramesh Kumar";
  if (vehicleInput) vehicleInput.value = (STATE.myBooking && STATE.myBooking.vehicle_number) || "HR-05-AB-7821";

  modal.classList.remove("hidden");
}

function closeGateEntryModal() {
  const modal = document.getElementById("gate-entry-modal");
  if (modal) modal.classList.add("hidden");
}

async function handleGateEntrySubmit(e) {
  if (e) e.preventDefault();
  const token = document.getElementById("ge-token-input").value.trim();
  const gate = document.getElementById("ge-gate-select").value;
  const vehicle = document.getElementById("ge-vehicle-input").value.trim();
  const driver = document.getElementById("ge-driver-input").value.trim();
  const notes = document.getElementById("ge-notes-input").value.trim();

  try {
    const res = await api("/api/gate-entry/register", "POST", {
      token_number: token,
      gate_number: gate,
      vehicle_number: vehicle,
      driver_name: driver,
      notes: notes
    });

    const resultCard = document.getElementById("ge-result-card");
    const resultNum = document.getElementById("ge-result-number");
    if (resultCard && resultNum) {
      resultNum.textContent = res.gate_entry_number || (res.gate_entry && res.gate_entry.gate_entry_number) || "GE-PASS-CONFIRMED";
      resultCard.classList.remove("hidden");
    }

    showToast(`✓ गेट प्रवेश दर्ज! पास संख्या: ${res.gate_entry_number}`, "success");

    if (STATE.myTokenNumber && token.toUpperCase() === STATE.myTokenNumber.toUpperCase()) {
      await refreshFarmerData();
    }
    refreshOperatorLiveQueue();
    refreshSmsLogs();

    setTimeout(() => {
      closeGateEntryModal();
    }, 1800);
  } catch (err) {
    showToast(`गेट प्रवेश विफल: ${err.message}`, "error");
  }
}

// -------------------------------------------------------------
// PUBLIC TRUST & SERVICE MODAL HANDLERS
// -------------------------------------------------------------
function openPublicTrustModal() {
  const modal = document.getElementById("public-trust-modal");
  if (modal) modal.classList.remove("hidden");
}

function closePublicTrustModal() {
  const modal = document.getElementById("public-trust-modal");
  if (modal) modal.classList.add("hidden");
}

function openGrievanceModal() {
  openComplaintModal();
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
    refreshOperatorLiveQueue();
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
    initAdminGisMap();
    loadAdminNotificationLogs();
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

// =============================================================
// [GIS ENGINE] REAL LEAFLET.JS & OPENSTREETMAP INTERACTIVE MAPS
// =============================================================
let farmerGisMap = null;
let farmerGisMarkers = {};
let farmerRoutePolyline = null;

let adminGisMap = null;
let adminGisMarkers = {};

let routeGisMap = null;
let routeGisPolyline = null;

function createGisMarkerIcon(color, label, iconClass = "fa-warehouse") {
  return L.divIcon({
    className: "custom-gis-marker",
    html: `
      <div class="relative flex flex-col items-center group">
        <div class="w-8 h-8 rounded-full shadow-lg flex items-center justify-center text-white font-bold text-xs border-2 border-white transition transform hover:scale-125" style="background-color: ${color};">
          <i class="fa-solid ${iconClass}"></i>
        </div>
        <span class="mt-1 bg-slate-900/90 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap shadow tracking-tight">${label}</span>
      </div>
    `,
    iconSize: [32, 48],
    iconAnchor: [16, 24],
    popupAnchor: [0, -26]
  });
}

function renderGisFallback(centres) {
  const fallbackEl = document.getElementById("farmer-gis-fallback");
  if (!fallbackEl) return;
  const list = centres && centres.length > 0 ? centres : (STATE.centres || []);
  if (list.length === 0) return;

  fallbackEl.innerHTML = list.map(c => {
    const load = c.load !== undefined ? c.load : (c.current_load_percentage || 50);
    const color = load >= 80 ? "rose" : load >= 50 ? "amber" : "emerald";
    return `
      <div class="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
        <div class="flex justify-between items-center">
          <span class="font-extrabold text-xs text-slate-900">${(c.name || 'Centre').split(" -")[0]}</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-${color}-100 text-${color}-800 border border-${color}-300">${load}% भार</span>
        </div>
        <p class="text-[11px] text-slate-500 truncate">${c.address || 'करनाल जिला'}</p>
        <div class="flex justify-between text-[10px] text-slate-600 font-semibold pt-1">
          <span>दूरी: <b>${c.distance_km || 5} km</b></span>
          <span>औसत समय: <b>${c.avg_processing_time_min || 12} min</b></span>
        </div>
        <button onclick="switchCentreFromGis('${c.id}')" class="w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition shadow">
          यह केंद्र चुनें
        </button>
      </div>`;
  }).join('');
  fallbackEl.classList.remove("hidden");
}

async function initFarmerGisMap() {
  const container = document.getElementById("farmer-gis-map");
  if (!container) return;

  if (typeof L === "undefined") {
    renderGisFallback(STATE.centres);
    return;
  }

  if (farmerGisMap) {
    requestAnimationFrame(() => {
      setTimeout(() => farmerGisMap.invalidateSize(), 150);
    });
    return;
  }

  try {
    // Centered on Karnal Mandi District
    farmerGisMap = L.map("farmer-gis-map", {
      zoomControl: true,
      scrollWheelZoom: false
    }).setView([29.6857, 76.9905], 11);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(farmerGisMap);

    // Guarantee render dimensions
    setTimeout(() => {
      if (farmerGisMap) farmerGisMap.invalidateSize();
    }, 200);

    const res = await api("/api/gis/locations");
    const data = res.data || {};
    const centres = data.centres || STATE.centres || [];
    const farmers = data.farmers || [];

    // Render Centres
    centres.forEach(c => {
      const lat = c.lat !== undefined ? c.lat : c.latitude;
      const lng = c.lng !== undefined ? c.lng : c.longitude;
      if (lat === undefined || lng === undefined) return;
      const load = c.load !== undefined ? c.load : (c.current_load_percentage || 50);
      const color = load >= 80 ? "#e11d48" : load >= 50 ? "#d97706" : "#059669";
      const marker = L.marker([lat, lng], {
        icon: createGisMarkerIcon(color, `${(c.name || 'Centre').split(" -")[0]} (${load}%)`, "fa-wheat-awn")
      }).addTo(farmerGisMap);

      const popupHtml = `
        <div class="p-2 space-y-1.5 min-w-[200px] text-xs font-sans">
          <div class="font-extrabold text-slate-900 border-b border-slate-200 pb-1.5 flex justify-between items-center gap-2">
            <span>${c.name}</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-black text-white" style="background:${color}">${load}%</span>
          </div>
          <p class="text-slate-600 font-medium">${c.address || 'Karnal District'}</p>
          <div class="grid grid-cols-2 gap-1 text-[11px] pt-1">
            <div class="text-slate-500">औसत प्रतीक्षा: <b class="text-slate-900">${c.avg_processing_time_min || 12}m</b></div>
            <div class="text-slate-500">कतार: <b class="text-slate-900">${c.active_queues || c.active_counters || 12}</b></div>
          </div>
          <button onclick="switchCentreFromGis('${c.id}')" class="mt-2 w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs shadow transition">
            यह केंद्र चुनें (Select Centre)
          </button>
        </div>`;
      marker.bindPopup(popupHtml);
      farmerGisMarkers[c.id] = marker;
    });

    // Render Current Farmer Marker
    const farmerLat = 29.8055;
    const farmerLng = 76.9282; // Taraori
    const fMarker = L.marker([farmerLat, farmerLng], {
      icon: createGisMarkerIcon("#2563eb", `आप: ${STATE.myTokenNumber || '#A-52'}`, "fa-tractor")
    }).addTo(farmerGisMap);

    fMarker.bindPopup(`
      <div class="p-2 text-xs font-sans space-y-1">
        <p class="font-extrabold text-blue-900">👨‍🌾 आपका स्थान (Taraori Farm)</p>
        <p class="text-slate-600">सक्रिय टोकन: <b>${STATE.myTokenNumber || '#A-52'}</b></p>
        <p class="text-slate-500 text-[11px]">ट्रैक्टर ट्रॉली लोड: 50 क्विंटल गेहूँ</p>
      </div>`);
    farmerGisMarkers["farmer"] = fMarker;

    // Draw active route polyline to current/assigned centre
    const currentCentreId = (STATE.myBooking && STATE.myBooking.centre_id) || "centre-a";
    const destCentre = centres.find(c => c.id === currentCentreId) || centres[0];
    const dLat = destCentre ? (destCentre.lat !== undefined ? destCentre.lat : destCentre.latitude) : 29.6857;
    const dLng = destCentre ? (destCentre.lng !== undefined ? destCentre.lng : destCentre.longitude) : 76.9905;
    if (dLat && dLng) {
      farmerRoutePolyline = L.polyline([[farmerLat, farmerLng], [dLat, dLng]], {
        color: "#059669",
        weight: 4,
        dashArray: "6, 8",
        opacity: 0.85
      }).addTo(farmerGisMap);
    }
  } catch (err) {
    console.warn("Farmer GIS load error, rendering cards fallback:", err);
    renderGisFallback(STATE.centres);
  }
}

function focusMapLocation(target) {
  if (!farmerGisMap) {
    initFarmerGisMap();
    setTimeout(() => focusMapLocation(target), 200);
    return;
  }
  if (target === "all") {
    const group = L.featureGroup(Object.values(farmerGisMarkers));
    if (group.getLayers().length > 0) {
      farmerGisMap.fitBounds(group.getBounds().pad(0.15));
    }
  } else if (farmerGisMarkers[target]) {
    farmerGisMap.setView(farmerGisMarkers[target].getLatLng(), 13);
    farmerGisMarkers[target].openPopup();
  }
}

function switchCentreFromGis(centreId) {
  STATE.bookingCentreChoice = centreId;
  const sel = document.getElementById("form-centre");
  if (sel) sel.value = centreId;
  renderSlotMatrix(centreId);
  showToast(`केंद्र चुना गया: ${centreId.toUpperCase()}। कृपया नीचे समय स्लॉट चुनें।`, "info");
  scrollToSection("slot-selection-card");
}

async function initAdminGisMap() {
  const container = document.getElementById("admin-gis-map");
  if (!container) return;

  if (adminGisMap) {
    setTimeout(() => adminGisMap.invalidateSize(), 150);
    return;
  }

  adminGisMap = L.map("admin-gis-map", {
    zoomControl: true,
    scrollWheelZoom: false
  }).setView([29.6857, 76.9905], 10);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap'
  }).addTo(adminGisMap);

  try {
    const res = await api("/api/gis/locations");
    const data = res.data || {};
    const centres = data.centres || STATE.centres || [];
    const farmers = data.farmers || [];

    // Render Mandi Centres with Load Circles
    centres.forEach(c => {
      const lat = c.lat !== undefined ? c.lat : c.latitude;
      const lng = c.lng !== undefined ? c.lng : c.longitude;
      if (lat === undefined || lng === undefined) return;
      const load = c.load !== undefined ? c.load : (c.current_load_percentage || 50);
      const color = load >= 80 ? "#e11d48" : load >= 50 ? "#d97706" : "#059669";

      // Circular load heat footprint
      L.circle([lat, lng], {
        radius: 1200 + (load * 20),
        color: color,
        fillColor: color,
        fillOpacity: 0.25,
        weight: 1.5
      }).addTo(adminGisMap);

      const marker = L.marker([lat, lng], {
        icon: createGisMarkerIcon(color, `${(c.name || 'Centre').split(" -")[0]} (${load}%)`, "fa-warehouse")
      }).addTo(adminGisMap);

      marker.bindPopup(`
        <div class="p-2 space-y-1 text-xs font-sans">
          <p class="font-extrabold text-slate-900">${c.name}</p>
          <p class="text-slate-600">क्षमता: <b>${c.capacity_trucks || 150} वाहन</b> · भार: <b>${load}%</b></p>
          <p class="text-slate-600">सक्रिय कतार: <b>${c.active_queues || 12}</b> · औसत निकासी: <b>${c.avg_processing_time_min || 12} min</b></p>
          <p class="text-slate-500 font-mono text-[10px]">सेवा टोकन: ${c.serving_token_number || c.current_token || '—'}</p>
        </div>`);
      adminGisMarkers[c.id] = marker;
    });

    // Render Farmers Across District
    farmers.forEach(f => {
      const fLat = f.lat !== undefined ? f.lat : f.latitude;
      const fLng = f.lng !== undefined ? f.lng : f.longitude;
      if (fLat === undefined || fLng === undefined) return;
      const fMark = L.circleMarker([fLat, fLng], {
        radius: 6,
        color: "#1d4ed8",
        fillColor: "#3b82f6",
        fillOpacity: 0.9,
        weight: 2
      }).addTo(adminGisMap);

      fMark.bindPopup(`
        <div class="p-1.5 text-xs font-sans">
          <p class="font-bold text-slate-900">${f.name} (${f.token_number})</p>
          <p class="text-slate-500 text-[11px]">${f.village || ''} · स्थिति: <b>${f.status}</b></p>
        </div>`);
    });
  } catch (err) {
    console.warn("Admin GIS load error:", err);
  }
}

async function initRouteGisMap(centreId) {
  const container = document.getElementById("route-gis-map");
  if (!container) return;

  if (routeGisMap) {
    routeGisMap.remove();
    routeGisMap = null;
  }

  const centre = (STATE.centres || []).find(c => c.id === centreId) || { lat: 29.6857, lng: 76.9905, name: "Karnal Main Mandi" };
  const originLat = 29.8055;
  const originLng = 76.9282; // Taraori
  const destLat = centre.lat !== undefined ? centre.lat : (centre.latitude || 29.6857);
  const destLng = centre.lng !== undefined ? centre.lng : (centre.longitude || 76.9905);

  routeGisMap = L.map("route-gis-map", {
    zoomControl: false,
    scrollWheelZoom: false
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap'
  }).addTo(routeGisMap);

  const startMarker = L.marker([originLat, originLng], {
    icon: createGisMarkerIcon("#2563eb", "प्रस्थान (Taraori)", "fa-location-dot")
  }).addTo(routeGisMap);

  const endMarker = L.marker([destLat, destLng], {
    icon: createGisMarkerIcon("#059669", "गंतव्य (Mandi)", "fa-flag-checkered")
  }).addTo(routeGisMap);

  routeGisPolyline = L.polyline([[originLat, originLng], [destLat, destLng]], {
    color: "#0d9488",
    weight: 5,
    dashArray: "8, 8",
    opacity: 0.9
  }).addTo(routeGisMap);

  const group = L.featureGroup([startMarker, endMarker, routeGisPolyline]);
  routeGisMap.fitBounds(group.getBounds().pad(0.25));
}

// =============================================================
// [PAYMENTS] REAL DBT VERIFICATION & OFFICIAL RECEIPT MODAL
// =============================================================
async function handleFarmerPaymentClick() {
  const b = STATE.myBooking;
  if (!b) {
    showToast("कोई सक्रिय टोकन नहीं मिला।", "warn");
    return;
  }

  if (b.status === "PAYMENT_CREDITED") {
    showToast("✓ यह भुगतान पहले ही स्वीकृत व खाते में जमा हो चुका है।", "success");
    openReceiptModal(b.token_number);
    return;
  }

  showToast("प्रसंस्करण: DBT भुगतान अधिकृत किया जा रहा है...", "info");
  try {
    // Step 1: Initiate Payment
    const initRes = await api("/api/payments/initiate", "POST", {
      booking_id: b.id,
      payment_method: "DBT_BANK_TRANSFER"
    });

    const payRef = (initRes.data && initRes.data.payment) ? initRes.data.payment.payment_reference : "PAY-REF-DEMO";

    // Step 2: Verify and Sanction
    await api("/api/payments/verify", "POST", {
      payment_reference: payRef
    });

    showToast("✓ DBT भुगतान स्वीकृत! PFMS संदर्भ जारी एवं किसान को SMS भेजा गया।", "success");
    await refreshFarmerData(true);
    openReceiptModal(b.token_number);
  } catch (err) {
    showToast("भुगतान प्रसंस्करण में त्रुटि: " + err.message, "error");
  }
}

async function openReceiptModal(tokenOrPaymentId) {
  const token = tokenOrPaymentId || (STATE.myBooking && STATE.myBooking.token_number) || "#A-52";
  const modal = document.getElementById("payment-receipt-modal");
  const content = document.getElementById("receipt-modal-content");
  if (!modal || !content) return;

  content.innerHTML = `<div class="p-8 text-center text-slate-400 text-xs font-bold">
    <i class="fa-solid fa-spinner fa-spin text-2xl text-emerald-600 block mb-2"></i>
    आधिकारिक DBT रसीद लोड हो रही है...
  </div>`;
  modal.classList.remove("hidden");

  try {
    const res = await api(`/api/payments/receipt/${encodeURIComponent(token)}`);
    const r = res.receipt || res.data || {};
    const b = STATE.myBooking || {};

    const netQty = r.net_weight_quintal || r.quantity_quintal || b.quantity_quintal || 50;
    const mspRate = r.msp_rate_per_quintal || b.msp_rate_per_quintal || 2425;
    const totalPayout = r.total_amount_inr || (netQty * mspRate);

    content.innerHTML = `
      <div class="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3 font-sans text-xs">
        <div class="flex justify-between items-start border-b border-dashed border-slate-300 pb-2">
          <div>
            <span class="text-[9px] font-black uppercase text-emerald-800 tracking-wider block">FOOD, CIVIL SUPPLIES &amp; CONSUMER AFFAIRS</span>
            <span class="text-xs font-black text-slate-900 block">${r.centre_name || b.centre_name || 'Centre A - Grain Market Karnal'}</span>
          </div>
          <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-black text-[10px] border border-emerald-300">
            ✓ DBT CONFIRMED
          </span>
        </div>

        <div class="grid grid-cols-2 gap-2 text-[11px] bg-white p-3 rounded-xl border border-slate-200">
          <div>
            <span class="text-slate-400 block font-bold text-[9px] uppercase">Receipt No</span>
            <span class="font-mono font-bold text-slate-900">${r.receipt_number || 'RCP-KQ-260901-0881'}</span>
          </div>
          <div>
            <span class="text-slate-400 block font-bold text-[9px] uppercase">PFMS Ref / Tx ID</span>
            <span class="font-mono font-bold text-emerald-700">${r.pfms_reference || 'PFMS-GOV-998124'}</span>
          </div>
          <div>
            <span class="text-slate-400 block font-bold text-[9px] uppercase">Date &amp; Time</span>
            <span class="font-medium text-slate-700">${r.completed_at || new Date().toLocaleString()}</span>
          </div>
          <div>
            <span class="text-slate-400 block font-bold text-[9px] uppercase">Token &amp; Gate Pass</span>
            <span class="font-black text-slate-900">${r.token_number || token}</span>
          </div>
        </div>

        <div class="space-y-1 bg-white p-3 rounded-xl border border-slate-200 text-[11px]">
          <span class="text-slate-400 block font-bold text-[9px] uppercase">Beneficiary Farmer</span>
          <p class="font-black text-slate-900 text-xs">${r.farmer_name || b.farmer_name || 'Ramesh Kumar (रमेश कुमार)'}</p>
          <p class="text-slate-500 font-medium">मोबाईल: <b>${r.farmer_mobile || b.farmer_mobile || '9812345678'}</b> | FID: <b>${r.farmer_id || 'FID-HR-78921'}</b></p>
          <p class="text-slate-500 font-medium">खाता: <b>${r.bank_name || b.bank_name || 'State Bank of India'}</b> (${r.account_masked || b.account_masked || 'XXXXXX9012'}) | IFSC: <b>${r.ifsc || b.ifsc || 'SBIN0001234'}</b></p>
        </div>

        <div class="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs space-y-1.5">
          <div class="flex justify-between font-bold text-slate-700">
            <span>फसल (Crop):</span>
            <span class="text-slate-900">${r.crop_type || b.crop_type || 'Wheat (गेहूँ)'}</span>
          </div>
          <div class="flex justify-between font-bold text-slate-700">
            <span>कुल शुद्ध वजन (Net Weight):</span>
            <span class="text-slate-900 font-mono">${netQty} Quintal</span>
          </div>
          <div class="flex justify-between font-bold text-slate-700">
            <span>MSP निर्धारित दर:</span>
            <span class="text-slate-900">₹${mspRate} / Quintal</span>
          </div>
          <div class="border-t border-emerald-300 pt-1.5 flex justify-between items-center">
            <span class="font-black text-emerald-950 text-xs">कुल भुगतान राशि (Direct Credit):</span>
            <span class="text-base font-black text-emerald-800 font-mono">₹ ${Number(totalPayout).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div class="text-center pt-1 text-[10px] text-slate-400 font-bold border-t border-slate-200">
          ✓ Digital Signature Verified · FCI &amp; Haryana Mandi Board e-Procurement Portal
        </div>
      </div>`;
  } catch (err) {
    content.innerHTML = `<div class="p-6 text-center text-rose-600 text-xs font-bold">
      रसीद प्राप्त नहीं हो सकी: ${err.message}
    </div>`;
  }
}

function closeReceiptModal() {
  const modal = document.getElementById("payment-receipt-modal");
  if (modal) modal.classList.add("hidden");
}

// =============================================================
// [CROPS] FCI FAQ DECLARATION & QUALITY ASSAY WORKFLOW
// =============================================================
function openCropDeclarationModal() {
  const modal = document.getElementById("crop-declaration-modal");
  if (modal) modal.classList.remove("hidden");
}

function closeCropDeclarationModal() {
  const modal = document.getElementById("crop-declaration-modal");
  if (modal) modal.classList.add("hidden");
}

async function handleCropDeclarationSubmit(e) {
  e.preventDefault();
  const cropType = document.getElementById("crop-decl-type").value;
  const variety = document.getElementById("crop-decl-variety").value.trim() || "Standard";
  const qty = parseFloat(document.getElementById("crop-decl-qty").value) || 50;
  const moisture = parseFloat(document.getElementById("crop-decl-moisture").value) || 11.5;
  const notes = document.getElementById("crop-decl-notes").value.trim();

  const payload = {
    crop_type: cropType,
    variety: variety,
    quantity_quintal: qty,
    moisture_percentage: moisture,
    notes: notes,
    booking_id: (STATE.myBooking ? STATE.myBooking.id : null)
  };

  try {
    await api("/api/crops/submit", "POST", payload);
    closeCropDeclarationModal();
    showToast("✓ फसल गुणवत्ता घोषणा सफलतापूर्वक दर्ज की गई!", "success");
    await loadFarmerCropSubmissions();
    refreshSmsLogs();
  } catch (err) {
    showToast("घोषणा दर्ज करने में त्रुटि: " + err.message, "error");
  }
}

async function loadFarmerCropSubmissions() {
  const container = document.getElementById("crop-submissions-list");
  if (!container) return;

  try {
    const res = await api("/api/crops/submissions");
    const subs = res.data || [];
    if (subs.length === 0) {
      container.innerHTML = `
        <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-500">
          <p class="font-bold">कोई पूर्व फसल घोषणा दर्ज नहीं है।</p>
          <p class="text-[11px] mt-0.5 text-slate-400">'नई घोषणा' बटन दबाकर अपनी उपज की नमी व विवरण दर्ज करें।</p>
        </div>`;
      return;
    }

    container.innerHTML = subs.map(s => {
      const isApproved = s.status === "APPROVED";
      const isRejected = s.status === "REJECTED";
      const badgeClass = isApproved ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                         isRejected ? "bg-rose-100 text-rose-800 border-rose-300" :
                         "bg-amber-100 text-amber-800 border-amber-300";
      const statusText = isApproved ? "✓ FCI FAQ स्वीकृत (Approved)" :
                         isRejected ? "❌ अस्वीकृत (Rejected)" : "⏳ लंबित जांच (Pending Assay)";

      return `
        <div class="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-2">
          <div class="flex justify-between items-start">
            <div>
              <p class="font-black text-slate-900 text-xs">${s.crop_type} · <span class="text-slate-500">${s.variety}</span></p>
              <p class="text-[11px] text-slate-500 font-medium">मात्रा: <b>${s.quantity_quintal} क्विंटल</b> · नमी: <b>${s.moisture_percentage}%</b> ${s.moisture_percentage > 12 ? '<span class="text-rose-600 font-bold">(>12% FAQ Warning)</span>' : '<span class="text-emerald-600 font-bold">(FAQ Compliant)</span>'}</p>
            </div>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black border ${badgeClass}">${statusText}</span>
          </div>
          ${isRejected ? `
            <div class="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-900 space-y-0.5">
              <span class="font-black block">अस्वीकृति कारण:</span>
              <p class="font-medium">${s.rejection_reason || 'नमी 12% मानक सीमा से अधिक पाई गई।'}</p>
              <p class="text-[10px] text-rose-700 font-bold">💡 सलाह: कृपया फसल को 24-48 घंटे धूप में सुखाकर नया स्लॉट बुक करें।</p>
            </div>` : ''}
          ${isApproved ? `
            <div class="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 flex items-center gap-1.5 font-medium">
              <i class="fa-solid fa-circle-check text-emerald-600"></i>
              <span>गुणवत्ता जांचकर्ता: <b>${s.evaluator_name || 'Mandi Quality Lab'}</b> (${s.notes || 'Meets FCI Grade A FAQ Standard'})</span>
            </div>` : ''}
        </div>`;
    }).join("");
  } catch (err) {
    console.warn("Farmer crops load error:", err);
  }
}

async function loadOperatorCropSubmissions() {
  const container = document.getElementById("operator-crop-table");
  if (!container) return;

  try {
    const res = await api("/api/crops/submissions");
    const subs = res.data || [];
    if (subs.length === 0) {
      container.innerHTML = `<p class="p-4 text-center text-slate-400 text-xs font-bold">No crop declarations for evaluation.</p>`;
      return;
    }

    container.innerHTML = `
      <table class="w-full text-xs">
        <thead>
          <tr class="text-left text-slate-400 uppercase text-[10px] border-b border-slate-100">
            <th class="py-2.5">Date / Farmer</th>
            <th>Crop &amp; Variety</th>
            <th>Qty</th>
            <th>Moisture %</th>
            <th>Status</th>
            <th class="text-right">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${subs.map(s => {
            const isPending = s.status === "PENDING";
            return `
              <tr>
                <td class="py-3">
                  <p class="font-black text-slate-900">${s.farmer_name}</p>
                  <p class="text-[10px] text-slate-400 font-mono">${s.created_at || 'Today'}</p>
                </td>
                <td>
                  <p class="font-bold text-slate-800">${s.crop_type}</p>
                  <p class="text-[10px] text-slate-500">${s.variety}</p>
                </td>
                <td class="font-bold text-slate-900">${s.quantity_quintal} Q</td>
                <td>
                  <span class="font-mono font-bold ${s.moisture_percentage > 12 ? 'text-rose-600' : 'text-emerald-700'}">${s.moisture_percentage}%</span>
                </td>
                <td>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${s.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : s.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}">
                    ${s.status}
                  </span>
                </td>
                <td class="text-right">
                  ${isPending ? `
                    <div class="inline-flex gap-1.5">
                      <button onclick="evaluateCropSubmission('${s.id}', 'APPROVED')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow transition">
                        ✓ स्वीकृत (Pass)
                      </button>
                      <button onclick="openCropRejectionModal('${s.id}')" class="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] shadow transition">
                        ❌ अस्वीकृत (Reject)
                      </button>
                    </div>` : `
                    <span class="text-[11px] text-slate-400 italic">Evaluated by ${s.evaluator_name || 'Lab'}</span>`}
                </td>
              </tr>`;
          }).join("")}
        </tbody>
      </table>`;
  } catch (err) {
    console.warn("Operator crops load error:", err);
  }
}

function openCropRejectionModal(submissionId) {
  document.getElementById("reject-sub-id").value = submissionId;
  document.getElementById("crop-rejection-modal").classList.remove("hidden");
}

function closeCropRejectionModal() {
  document.getElementById("crop-rejection-modal").classList.add("hidden");
}

async function handleCropRejectionConfirm(e) {
  e.preventDefault();
  const subId = document.getElementById("reject-sub-id").value;
  const reason = document.getElementById("reject-reason-text").value.trim();
  const moisture = parseFloat(document.getElementById("reject-moisture-val").value) || 16.5;

  if (!reason) {
    showToast("अस्वीकृति का कारण लिखना अनिवार्य है।", "warn");
    return;
  }

  try {
    await api(`/api/crops/${subId}/evaluate`, "POST", {
      decision: "REJECTED",
      rejection_reason: reason,
      moisture_percentage: moisture
    });
    closeCropRejectionModal();
    showToast("फसल अस्वीकृति दर्ज की गई एवं किसान को SMS अलर्ट भेजा गया।", "warn");
    await loadOperatorCropSubmissions();
    refreshSmsLogs();
  } catch (err) {
    showToast("त्रुटि: " + err.message, "error");
  }
}

async function evaluateCropSubmission(subId, decision) {
  try {
    await api(`/api/crops/${subId}/evaluate`, "POST", {
      decision: decision,
      notes: decision === "APPROVED" ? "Meets FCI FAQ parameters (Moisture within limit)" : "Rejected"
    });
    showToast(`✓ फसल गुणवत्ता स्थिति '${decision}' दर्ज एवं किसान को SMS भेजा गया।`, "success");
    await loadOperatorCropSubmissions();
    refreshSmsLogs();
  } catch (err) {
    showToast("त्रुटि: " + err.message, "error");
  }
}

// =============================================================
// [BOOKINGS] CANCELLATION & HISTORY TABLE
// =============================================================
function promptCancelBooking(token) {
  const tok = token || (STATE.myBooking && STATE.myBooking.token_number) || STATE.myTokenNumber;
  document.getElementById("cancel-token-input").value = tok;
  document.getElementById("cancel-booking-modal").classList.remove("hidden");
}

function closeCancelBookingModal() {
  document.getElementById("cancel-booking-modal").classList.add("hidden");
}

async function confirmBookingCancellation() {
  const token = document.getElementById("cancel-token-input").value;
  if (!token) return;

  try {
    await api(`/api/bookings/${encodeURIComponent(token)}/cancel`, "POST");
    closeCancelBookingModal();
    showToast(`स्लॉट ${token} सफलतापूर्वक रद्द किया गया। पुष्टि SMS भेजा गया।`, "info");
    await refreshFarmerData();
    await renderFarmerBookingHistory();
    refreshSmsLogs();
  } catch (err) {
    showToast("रद्दीकरण विफल: " + err.message, "error");
  }
}

async function renderFarmerBookingHistory() {
  const container = document.getElementById("farmer-history-table-container");
  if (!container) return;

  const filter = (document.getElementById("history-status-filter") || {}).value || "ALL";

  try {
    const res = await api("/api/bookings");
    let list = res.data || [];

    if (filter === "ACTIVE") {
      list = list.filter(b => b.status === "BOOKED" || b.status === "ARRIVED");
    } else if (filter === "COMPLETED") {
      list = list.filter(b => b.status === "PROCURED" || b.status === "PAYMENT_INITIATED" || b.status === "PAYMENT_CREDITED");
    } else if (filter === "CANCELLED") {
      list = list.filter(b => b.status === "CANCELLED" || b.status === "REJECTED");
    }

    if (list.length === 0) {
      container.innerHTML = `<p class="p-6 text-center text-slate-400 text-xs font-bold">कोई बुकिंग रिकॉर्ड नहीं मिला।</p>`;
      return;
    }

    container.innerHTML = `
      <table class="w-full text-xs">
        <thead>
          <tr class="text-left text-slate-400 uppercase text-[10px] border-b border-slate-100">
            <th class="py-2.5">टोकन (Token)</th>
            <th>मंडी केंद्र (Centre)</th>
            <th>दिनांक व समय</th>
            <th>फसल व मात्रा</th>
            <th>स्थिति (Status)</th>
            <th class="text-right">कार्य (Action)</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${list.map(b => {
            const isCurrent = b.token_number === STATE.myTokenNumber;
            const canCancel = b.status === "BOOKED" || b.status === "ARRIVED";
            const canReceipt = b.status === "PAYMENT_CREDITED" || b.status === "PAYMENT_INITIATED" || b.status === "PROCURED";

            return `
              <tr>
                <td class="py-3 font-black text-slate-900">
                  <span>${b.token_number}</span>
                  ${isCurrent ? '<span class="ml-1.5 text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black">CURRENT</span>' : ''}
                </td>
                <td class="font-bold text-slate-800">${b.centre_name || b.centre_id}</td>
                <td class="text-slate-600">${b.date} <span class="text-slate-400 text-[10px]">(${b.display_time_window || b.time_window})</span></td>
                <td class="font-bold text-slate-900">${b.crop_type} (${b.quantity_quintal} Q)</td>
                <td>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${
                    b.status === 'PAYMENT_CREDITED' ? 'bg-emerald-100 text-emerald-800' :
                    b.status === 'CANCELLED' ? 'bg-slate-200 text-slate-600' :
                    b.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                    'bg-blue-100 text-blue-800'
                  }">
                    ${b.status}
                  </span>
                </td>
                <td class="text-right">
                  <div class="inline-flex gap-1.5">
                    <button onclick="loadSpecificBooking('${b.token_number}')" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition">
                      पास देखें
                    </button>
                    ${canReceipt ? `
                      <button onclick="openReceiptModal('${b.token_number}')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow transition">
                        रसीद
                      </button>` : ''}
                    ${canCancel ? `
                      <button onclick="promptCancelBooking('${b.token_number}')" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-lg text-[11px] transition">
                        रद्द करें
                      </button>` : ''}
                  </div>
                </td>
              </tr>`;
          }).join("")}
        </tbody>
      </table>`;
  } catch (err) {
    console.warn("Farmer history load error:", err);
  }
}

async function loadSpecificBooking(tokenNumber) {
  STATE.myTokenNumber = tokenNumber;
  localStorage.setItem("kq_token_number", tokenNumber);
  await refreshFarmerData();
  scrollToSection("printable-pass");
  showToast(`टोकन ${tokenNumber} लोड किया गया।`, "info");
}

// =============================================================
// [ADMIN] NOTIFICATIONS LOGS MONITORING & RETRY
// =============================================================
async function loadAdminNotificationLogs() {
  const container = document.getElementById("admin-notifications-table");
  if (!container) return;

  try {
    const res = await api("/api/admin/notifications?limit=25");
    const logs = res.data || [];
    if (logs.length === 0) {
      container.innerHTML = `<p class="p-6 text-center text-slate-400 text-xs font-bold">No SMS notifications recorded yet.</p>`;
      return;
    }

    container.innerHTML = `
      <table class="w-full text-xs">
        <thead>
          <tr class="text-left text-slate-400 uppercase text-[10px] border-b border-slate-100">
            <th class="py-2.5">Time</th>
            <th>Recipient / Token</th>
            <th>Event / Channel</th>
            <th>Status</th>
            <th>SMS Content Preview</th>
            <th class="text-right">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${logs.map(n => `
            <tr>
              <td class="py-3 text-slate-500 font-mono text-[10px] whitespace-nowrap">${n.timestamp || n.created_at || 'Just now'}</td>
              <td>
                <p class="font-black text-slate-900">${n.recipient_name || 'Farmer'} <span class="text-emerald-700 font-bold font-mono">(${n.token_number})</span></p>
                <p class="text-[10px] text-slate-400 font-mono">${n.recipient_mobile}</p>
              </td>
              <td>
                <p class="font-bold text-slate-700">${n.event_type || 'NOTIFICATION'}</p>
                <span class="text-[10px] text-slate-400">NIC SMS Gateway</span>
              </td>
              <td>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${
                  n.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                  n.status === 'FAILED' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                  'bg-amber-100 text-amber-800 border border-amber-300'
                }">
                  ${n.status}
                </span>
              </td>
              <td class="max-w-xs truncate text-slate-600 font-medium" title="${n.message_text}">${n.message_text}</td>
              <td class="text-right">
                <button onclick="retryNotification('${n.id}')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-[11px] shadow transition flex items-center gap-1 ml-auto">
                  <i class="fa-solid fa-rotate-right"></i><span>Retry</span>
                </button>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>`;
  } catch (err) {
    console.warn("Admin notifications load error:", err);
  }
}

async function retryNotification(id) {
  try {
    await api(`/api/admin/notifications/${id}/retry`, "POST");
    showToast("SMS पुनः प्रेषित किया गया।", "success");
    await loadAdminNotificationLogs();
  } catch (err) {
    showToast("SMS Retry विफल: " + err.message, "error");
  }
}

// -------------------------------------------------------------
// INITIALIZATION
// -------------------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  setRoleAuthTab("farmer");
  initLanguageSwitcher();
  changeLanguage(typeof getSavedLanguage === "function" ? getSavedLanguage() : "hi");
  if (!tryRestoreSession()) {
    document.getElementById("view-auth").classList.remove("hidden");
  }
});
