/**
 * KisanQueue — Multilingual i18n Translation Engine
 * Translates UI strings dynamically between Hindi and English.
 */

const I18N_DATA = {
  hi: {
    app_title: "KisanQueue (किसान कतार)",
    app_subtitle: "स्मार्ट किसान खरीद और वास्तविक समय कतार प्रबंधन",
    role_farmer: "👨‍🌾 किसान (Farmer)",
    role_operator: "👨‍💼 ऑपरेटर (Operator)",
    role_admin: "👨‍💻 प्रशासन (Admin)",
    nav_home: "होम",
    nav_myslot: "मेरा स्लॉट",
    nav_centres: "मंडी केंद्र",
    nav_status: "खरीद प्रगति",
    nav_profile: "प्रोफाइल",
    greeting: "नमस्ते",
    book_new_slot: "नया स्लॉट बुक करें",
    voice_listen: "आवाज़ में सुनें",
    help_support: "मदद व शिकायत",
    offline_banner: "📶 ऑफलाइन मोड: अंतिम सिंक किया गया डेटा प्रदर्शित हो रहा है।",
    what_next_title: "📍 आपका अगला कदम",
    status_before_slot: "आपका स्लॉट निर्धारित है। कृपया अपने समय पर मंडी पहुँचें।",
    status_queue_approaching: "आपकी बारी आने वाली है! कृपया धर्मकांटा / गेट 1 की ओर बढ़ें।",
    status_your_turn: "🚨 आपकी बारी सक्रिय है! कृपया तुरंत वेइंग काउंटर पर टोकन दिखाएं।",
    status_procured: "✅ आपकी फसल की खरीद सफलतापूर्वक पूरी हो चुकी है।",
    status_payment_done: "💰 आपका MSP भुगतान बैंक खाते में क्रेडिट कर दिया गया है।",
    current_serving: "वर्तमान सेवा",
    your_token: "आपका टोकन",
    farmers_ahead: "आगे किसान",
    estimated_wait: "अनुमानित प्रतीक्षा",
    queue_progress: "कतार प्रगति",
    procurement_journey_title: "🌾 फसल खरीद प्रगति (7-Stage Journey)",
    nearby_centres_title: "📍 निकटवर्ती अनाज मंडियां व लोड",
    slot_allocation_title: "📅 स्लॉट आवंटन (Slot Booking)",
    slot_allocation_sub: "उपलब्ध स्लॉट चुनकर तुरंत टोकन प्राप्त करें",
    your_slot_badge: "आपका स्लॉट",
    book_btn: "बुक करें",
    full_badge: "भरा हुआ",
    payment_card_title: "💳 DBT भुगतान विवरण (PFMS Live)",
    est_payout: "कुल अनुमानित राशि",
    dbt_status: "DBT स्थिति",
    pfms_ref: "PFMS संदर्भ",
    bank_account: "बैंक खाता",
    digital_gate_pass: "डिजिटल गेट पास",
    print_btn: "🖨️ प्रिंट पास",
    share_btn: "📱 शेयर करें",
    missed_slot_title: "छूटे हुए स्लॉट की पुनर्बहाली",
    missed_slot_desc: "क्या आपका स्लॉट छूट गया? सिस्टम बिना कतार दंड के अगला उत्तम स्लॉट खोजता है।",
    missed_slot_btn: "🔄 अगला उपलब्ध स्लॉट पाएं",
    ai_rebalance_banner_title: "⚡ AI स्मार्ट मंडी सुझाव",
    ai_rebalance_btn: "सुझाया केंद्र चुनें",
    operator_console: "मंडी ऑपरेटर टर्मिनल",
    select_operator_centre: "प्रचालन केंद्र चुनें:",
    call_next_btn: "📢 अगला टोकन बुलाएं",
    delay_alert_btn: "⚠️ देरी अलर्ट जारी करें",
    admin_dashboard_title: "जिला मंडी नियंत्रण कक्ष एवं लोड बैलेंसर",
    run_ai_balancer_btn: "⚡ AI लोड बैलेंस चलाएं"
  },
  en: {
    app_title: "KisanQueue (Farmer Queue)",
    app_subtitle: "Smart Farmer Procurement & Real-Time Queue Management",
    role_farmer: "👨‍🌾 Farmer",
    role_operator: "👨‍💼 Operator",
    role_admin: "👨‍💻 Admin",
    nav_home: "Home",
    nav_myslot: "My Slot",
    nav_centres: "Mandi Centres",
    nav_status: "Procurement",
    nav_profile: "Profile",
    greeting: "Welcome",
    book_new_slot: "Book New Slot",
    voice_listen: "Listen (Audio)",
    help_support: "Help & Grievance",
    offline_banner: "📶 Offline Mode: Displaying cached sync data.",
    what_next_title: "📍 What should I do now?",
    status_before_slot: "Your slot is confirmed. Relax at home and head to mandi at your scheduled time.",
    status_queue_approaching: "Your turn is approaching! Please head towards Weighbridge Gate 1.",
    status_your_turn: "🚨 Your token is ACTIVE! Please present your pass at the weighing counter immediately.",
    status_procured: "✅ Crop procurement completed successfully. Mandi receipt generated.",
    status_payment_done: "💰 MSP payment credited directly to your registered bank account via DBT PFMS.",
    current_serving: "Now Serving",
    your_token: "Your Token",
    farmers_ahead: "Ahead",
    estimated_wait: "Est. Wait",
    queue_progress: "Queue Progress",
    procurement_journey_title: "🌾 7-Stage Procurement Journey",
    nearby_centres_title: "📍 Nearby Procurement Centres & Load",
    slot_allocation_title: "📅 Hourly Slot Allocation",
    slot_allocation_sub: "Select an available slot to receive instant digital gate token",
    your_slot_badge: "YOUR SLOT",
    book_btn: "Book",
    full_badge: "Full",
    payment_card_title: "💳 DBT Payment Details (PFMS Live)",
    est_payout: "Total Value / MSP",
    dbt_status: "DBT Status",
    pfms_ref: "PFMS Reference",
    bank_account: "Bank Account",
    digital_gate_pass: "Digital Gate Pass",
    print_btn: "🖨️ Print Pass",
    share_btn: "📱 Share",
    missed_slot_title: "Missed Slot Smart Recovery",
    missed_slot_desc: "Missed your slot? The engine finds the next optimal low-congestion slot without penalty.",
    missed_slot_btn: "🔄 Find Next Available Slot",
    ai_rebalance_banner_title: "⚡ AI Smart Mandi Suggestion",
    ai_rebalance_btn: "Select Recommended Centre",
    operator_console: "Mandi Operator Terminal",
    select_operator_centre: "Select Mandi Centre:",
    call_next_btn: "📢 Call Next Token",
    delay_alert_btn: "⚠️ Broadcast Delay Alert",
    admin_dashboard_title: "District Mandi Dashboard & Load Balancer",
    run_ai_balancer_btn: "⚡ Run AI Load Balance"
  }
};

function translateUI(lang) {
  const dict = I18N_DATA[lang] || I18N_DATA.hi;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) {
      if (el.tagName === "INPUT" && el.hasAttribute("placeholder")) {
        el.placeholder = dict[key];
      } else {
        el.textContent = dict[key];
      }
    }
  });
}
