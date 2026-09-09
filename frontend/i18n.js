/**
 * ANNASETU — Multilingual i18n Translation Engine
 * Complete language-specific website internationalization.
 * Supports: Hindi (hi), English (en), Punjabi (pa), Marathi (mr), Telugu (te).
 */

const I18N_DATA = {
  hi: {
    // Branding & Header
    app_title: "ANNASETU",
    app_subtitle: "स्मार्ट किसान खरीद एवं वास्तविक समय कतार प्रबंधन प्रणाली",
    gov_badge: "भारत सरकार",
    ministry_hindi: "उपभोक्ता मामले, खाद्य और सार्वजनिक वितरण मंत्रालय",
    ministry_english: "खाद्य और सार्वजनिक वितरण विभाग",
    ministry_gov: "भारत सरकार",
    live_ticker_badge: "लाइव मंडी टिकर",
    ticker_dbt_text: "DBT PFMS भुगतान निष्पादन दर: 99.4% (औसत समय: 2.4 घंटे)",
    ticker_queue_text: "कतार स्थिति: सामान्य (धर्मकांटा डेस्क 1, 2 व 3 पूर्णतः कार्यरत)",
    offline_banner_text: "📶 ऑफलाइन मोड — अंतिम सिंक किया गया डेटा प्रदर्शित हो रहा है।",

    // Roles & Portals
    role_farmer: "👨‍🌾 किसान",
    role_operator: "⚖️ ऑपरेटर",
    role_admin: "🏛️ प्रशासन",
    role_farmer_portal: "किसान पोर्टल",
    role_operator_portal: "केंद्र ऑपरेटर",
    role_admin_portal: "जिला प्रशासन",
    role_farmer_short: "किसान",
    role_operator_short: "ऑपरेटर",
    role_admin_short: "प्रशासन",
    logout_btn: "लॉगआउट",
    book_new_slot: "नया स्लॉट बुक करें",

    // Simulation Controls Bar
    live_controls_label: "डेमो वर्कफ़्लो कंट्रोल:",
    sim_book_slot: "1. नया किसान स्लॉट बुक करें",
    sim_operator_login: "2. ऑपरेटर लॉगिन",
    sim_admin_login: "3. एडमिन SSO लॉगिन",
    reset_btn: "रीसेट",

    // Navigation & Tabs
    nav_home: "होम",
    nav_myslot: "मेरा स्लॉट",
    nav_centres: "मंडी केंद्र",
    nav_status: "प्रगति",
    nav_profile: "प्रोफाइल",
    greeting: "नमस्ते",
    kcc_verified: "KCC सत्यापित",
    view_full_profile: "पूर्ण प्रोफाइल देखें",
    voice_listen: "आवाज़ में सुनें",
    help_support: "मदद व शिकायत",

    // Authentication Screen
    auth_title: "ANNASETU (अन्नसेतु)",
    auth_subtitle: "स्मार्ट किसान फसल खरीद और रियल-टाइम कतार प्रबंधन प्रणाली",
    auth_footer_note: "ANNASETU — राष्ट्रीय डिजिटल कृषि खरीद एवं कतार प्रबंधन पोर्टल | कृषि एवं किसान कल्याण विभाग",
    tab_login: "लॉगिन",
    tab_register: "नया पंजीकरण",
    label_mobile_or_fid: "मोबाइल नंबर / किसान आईडी",
    placeholder_mobile_or_fid: "10-अंकों का मोबाइल नंबर या FID",
    label_password_or_otp: "पासवर्ड या ओटीपी",
    placeholder_password_or_otp: "पासवर्ड या 4-6 अंकों का पिन दर्ज करें",
    demo_otp_hint: "💡 डेमो के लिए कोई भी 4-अंक OTP स्वीकार्य है (उदा. 1234)",
    btn_farmer_login: "किसान पोर्टल पर लॉगिन करें",
    btn_demo_farmer: "⚡ 1-क्लिक डेमो किसान (रमेश कुमार — टोकन #A-52)",
    link_forgot_password: "पासवर्ड भूल गए? (रिकवरी)",

    // Registration Form
    label_full_name: "पूरा नाम",
    placeholder_full_name: "उदा. रमेश कुमार",
    label_mobile: "भारतीय मोबाइल नंबर",
    placeholder_mobile: "10-अंकों का मोबाइल नंबर (उदा. 9812345678)",
    label_village: "गाँव का नाम",
    placeholder_village: "उदा. ताराओड़ी",
    label_reg_password: "मजबूत पासवर्ड",
    placeholder_reg_password: "कम से कम 8 अक्षर (उदा. Agri@2026)",
    label_sec_q1: "सुरक्षा प्रश्न 1",
    label_sec_a1: "सुरक्षा उत्तर 1",
    placeholder_sec_a1: "उत्तर दर्ज करें (केस-असंवेदनशील)",
    label_sec_q2: "सुरक्षा प्रश्न 2",
    label_sec_a2: "सुरक्षा उत्तर 2",
    placeholder_sec_a2: "उत्तर दर्ज करें",
    btn_create_account: "खाता बनाएं व स्लॉट बुक करें",

    // Password Policy & Interactive Checklist
    pwd_criteria_title: "पासवर्ड की आवश्यकताएं:",
    pwd_rule_length: "कम से कम 8 अक्षर",
    pwd_rule_upper: "कम से कम एक बड़ा अक्षर (A-Z)",
    pwd_rule_lower: "कम से कम एक छोटा अक्षर (a-z)",
    pwd_rule_number: "कम से कम एक अंक (0-9)",
    pwd_rule_special: "कम से कम एक विशेष चिन्ह (!@#$%^&*)",

    // Security Questions Options
    q_school: "आपके पहले स्कूल का नाम क्या था?",
    q_village: "आपका पैतृक गाँव या शहर कौन सा है?",
    q_nickname: "आपके बचपन का उपनाम क्या था?",
    q_crop: "आपकी पसंदीदा फसल कौन सी है?",

    // Three-Dot User Menu
    menu_new_slot: "नया स्लॉट बुक करें",
    menu_new_reg: "नया पंजीकरण",
    menu_change_pwd: "पासवर्ड बदलें",
    menu_forgot_pwd: "पासवर्ड रिकवरी",
    menu_profile: "किसान प्रोफाइल",
    menu_logout: "लॉगआउट",

    // Change Password Modal
    change_pwd_title: "पासवर्ड बदलें",
    change_pwd_sub: "अपने खाते के लिए नया सुरक्षित पासवर्ड निर्धारित करें।",
    label_current_pwd: "वर्तमान पासवर्ड",
    placeholder_current_pwd: "वर्तमान पासवर्ड दर्ज करें",
    label_new_pwd: "नया पासवर्ड",
    placeholder_new_pwd: "नया मजबूत पासवर्ड दर्ज करें",
    label_confirm_pwd: "नए पासवर्ड की पुष्टि करें",
    placeholder_confirm_pwd: "नया पासवर्ड पुनः दर्ज करें",
    btn_save_new_pwd: "पासवर्ड अपडेट करें",
    btn_cancel: "रद्द करें",

    // Forgot Password Modal
    forgot_pwd_title: "पासवर्ड रिकवरी (सुरक्षा प्रश्न)",
    forgot_pwd_sub: "सुरक्षा प्रश्नों के माध्यम से बिना ओटीपी के पासवर्ड पुनर्प्राप्त करें।",
    step1_title: "चरण 1: पंजीकृत मोबाइल नंबर",
    step1_desc: "खाता खोजने के लिए अपना 10-अंकों का भारतीय मोबाइल नंबर दर्ज करें।",
    btn_find_account: "आगे बढ़ें (सुरक्षा प्रश्न खोजें)",
    step2_title: "चरण 2: सुरक्षा प्रश्नों के उत्तर दें",
    step2_desc: "पंजीकरण के समय निर्धारित प्रश्नों के सही उत्तर दें।",
    btn_verify_answers: "उत्तर सत्यापित करें",
    step3_title: "चरण 3: नया मजबूत पासवर्ड सेट करें",
    step3_desc: "सुरक्षा नीति के अनुसार नया पासवर्ड दर्ज करें।",
    btn_reset_pwd: "नया पासवर्ड सहेजें",

    // Farmer Hero & Status
    what_next_title: "📍 आपका अगला कदम",
    status_before_slot: "आपका स्लॉट पुष्ट है। घर पर आराम करें और समय पर मंडी पहुंचें।",
    status_queue_approaching: "आपकी बारी आने वाली है! कृपया धर्मकांटा / गेट 1 की ओर बढ़ें।",
    status_your_turn: "🚨 आपकी बारी सक्रिय है! कृपया तुरंत वेइंग काउंटर पर टोकन दिखाएं।",
    status_procured: "✅ फसल की खरीद पूर्ण। आधिकारिक खरीद पर्ची जारी।",
    status_payment_done: "💰 MSP भुगतान बैंक खाते में PFMS द्वारा क्रेडिट कर दिया गया है।",
    status_rejected: "❌ गुणवत्ता मानकों के अनुरूप न होने के कारण फसल अस्वीकृत की गई।",
    status_cancelled: "⚠️ यह स्लॉट टोकन रद्द कर दिया गया है।",
    view_route: "रास्ता देखें",

    // Live Queue Radar
    live_radar: "लाइव रडार",
    current_serving: "वर्तमान सेवा",
    current_serving_token: "वर्तमान सेवा टोकन",
    your_token: "आपका टोकन",
    farmers_ahead: "आगे किसान",
    estimated_wait: "अनुमानित प्रतीक्षा",
    estimated_wait_time: "अनुमानित प्रतीक्षा समय",
    queue_progress: "कतार प्रगति",
    wait_at_home: "घर पर आराम से प्रतीक्षा करें",
    you_badge: "आप",
    active_queue: "सक्रिय कतार",

    // 7-Stage Journey
    procurement_journey_title: "🌾 फसल खरीद प्रगति (7-Stage Journey)",
    stage1_name: "स्लॉट बुक हुआ",
    stage2_name: "गेट आवक / पास",
    stage3_name: "धर्मकांटा सकल वजन",
    stage4_name: "गुणवत्ता परख (FAQ)",
    stage5_name: "अनलोडिंग व खाली वजन",
    stage6_name: "मंडी खरीद पर्ची",
    stage7_name: "DBT बैंक क्रेडिट",
    stage_details: "चरण विवरण",
    stage_help: "सकल/खाली वजन, नमी परिणाम और PFMS भुगतान संदर्भ देखने के लिए ऊपर किसी भी चरण पर क्लिक करें।",

    // Mandi Centres & Maps
    nearby_centres_title: "📍 निकटवर्ती अनाज मंडियां व लोड",
    nearby_centres_title_plain: "निकटवर्ती अनाज मंडियां व लोड",
    mandi_centres_count: "मंडी केंद्र",
    centre_col: "मंडी केंद्र",
    distance_col: "दूरी",
    load_col: "वर्तमान लोड",
    status_col: "स्थिति",
    action_col: "कार्य",
    normal_load: "सामान्य लोड",
    moderate_load: "मध्यम लोड",
    high_load: "उच्च लोड",
    select_slot_btn: "स्लॉट चुनें",
    route_tips_btn: "मार्ग सुझाव",

    // Daily Schedule
    daily_schedule_title: "आज किस केंद्र पर कौन सी फसल ली जा रही है? (दैनिक खरीद सारणी)",
    daily_schedule_sub: "करनाल जिले के सभी क्रय केंद्रों की दैनिक फसल सारणी, कार्य समय (08:00 AM - 05:00 PM) एवं आवक क्षमता",
    refresh_btn: "ताज़ा करें",

    // Slot Matrix Modal & Booking
    slot_allocation_title: "स्लॉट आवंटन (Smart Slot Allocation)",
    slot_allocation_sub: "उपलब्ध स्लॉट चुनकर तुरंत टोकन प्राप्त करें",
    centre_label: "क्रय केंद्र:",
    crop_type_label: "फसल का प्रकार:",
    procurement_date_label: "तिथि:",
    apply_btn: "लागू करें",
    your_slot_badge: "आपका स्लॉट",
    book_btn: "बुक करें",
    full_badge: "भरा हुआ",
    available_badge: "उपलब्ध",
    high_demand: "उच्च मांग",
    regulated_windows: "1-घंटे के विनियमित स्लॉट",
    ai_recommendation_title: "अनुशंसित क्रय केंद्र",
    loading_text: "लोड हो रहा है...",
    choose_centre: "यह केंद्र चुनें",
    crop_quantity_label: "अनुमानित मात्रा (क्विंटल):",
    crop_variety_label: "फसल की किस्म:",

    // DBT Payments & Receipts
    payment_card_title: "💳 DBT भुगतान विवरण (PFMS Live)",
    dbt_payment_title: "DBT भुगतान विवरण (PFMS Live)",
    est_payout: "कुल अनुमानित राशि",
    total_msp_value: "कुल MSP मूल्य",
    dbt_status: "DBT स्थिति",
    pfms_ref: "PFMS संदर्भ",
    pfms_ref_tx: "PFMS संदर्भ / लेन-देन ID",
    bank_account: "बैंक खाता",
    aadhaar_bank: "आधार लिंक बैंक",
    verify_dbt_btn: "💰 DBT भुगतान सत्यापन",
    view_receipt_btn: "📄 रसीद देखें",
    digital_gate_pass: "डिजिटल गेट पास",
    print_btn: "🖨️ प्रिंट पास",
    print_pass_btn: "प्रिंट पास",
    share_btn: "📱 शेयर करें",
    whatsapp_share: "WhatsApp शेयर",

    // Missed Slot Recovery
    missed_slot_title: "छूटे हुए स्लॉट की पुनर्बहाली",
    missed_slot_desc: "क्या आपका स्लॉट छूट गया? सिस्टम बिना कतार दंड के अगला उत्तम स्लॉट खोजता है।",
    missed_slot_btn: "🔄 छूटा स्लॉट पुनर्बहाल करें",
    recover_missed_slot: "छूटा स्लॉट पुनर्बहाल करें",

    // Crop Declaration
    crop_quality_title: "फसल गुणवत्ता घोषणा (FAQ Declaration & Assays)",
    declare_crop_btn: "नई घोषणा",
    booking_history_title: "बुकिंग इतिहास एवं रसीदें",
    booking_history_sub: "आपके सभी पिछले और सक्रिय टोकन एवं भुगतान स्थिति",
    all_statuses: "सभी स्थितियां",
    active_booked: "सक्रिय / बुक",
    completed_credited: "पूर्ण / जमा",
    cancelled_rejected: "रद्द / अस्वीकृत",
    token_col: "टोकन",
    date_time_col: "दिनांक व समय",
    crop_qty_col: "फसल व मात्रा",
    view_pass: "पास देखें",

    // Operator Console
    operator_console: "मंडी ऑपरेटर टर्मिनल",
    select_operator_centre: "प्रचालन केंद्र चुनें:",
    call_next_btn: "📢 अगला टोकन बुलाएं",
    delay_alert_btn: "⚠️ देरी अलर्ट जारी करें",

    // Admin Dashboard
    admin_dashboard_title: "जिला मंडी नियंत्रण कक्ष एवं लोड विश्लेषण",
    run_ai_balancer_btn: "⚡ लोड बैलेंस विश्लेषण चलाएं",

    // Crops
    crop_wheat: "गेहूँ (Wheat)",
    crop_paddy: "धान (Paddy / Rice)",
    crop_mustard: "सरसों (Mustard)",
    crop_gram: "चना (Gram / Chana)",
    crop_maize: "मक्का (Maize)",

    // Statuses
    status_booked_badge: "पुष्ट (Booked)",
    status_arrived_badge: "आगमन / कतार में",
    status_weighed_badge: "वजन संपन्न",
    status_inspected_badge: "गुणवत्ता स्वीकृत",
    status_procured_badge: "खरीद पूर्ण",
    status_paid_badge: "भुगतान जमा (Credited)",
    status_rejected_badge: "अस्वीकृत (Rejected)",
    status_cancelled_badge: "रद्द (Cancelled)",

    // Common Messages & Toasts
    toast_login_success: "लॉगिन सफल!",
    toast_logout_success: "सफलतापूर्वक लॉगआउट किया गया।",
    toast_reg_success: "पंजीकरण सफल! अब अपना स्लॉट बुक करें।",
    toast_pwd_changed: "पासवर्ड सफलतापूर्वक बदला गया।",
    toast_pwd_reset: "पासवर्ड सफलतापूर्वक रीसेट हुआ। अब नए पासवर्ड से लॉगिन करें।",
    err_duplicate_phone: "इस मोबाइल नंबर से पहले से ही एक खाता मौजूद है।",
    err_invalid_phone: "कृपया एक वैध 10-अंकों का भारतीय मोबाइल नंबर दर्ज करें।",
    err_weak_password: "कृपया एक मजबूत पासवर्ड दर्ज करें (न्यूनतम 8 अक्षर, बड़ा अक्षर, छोटा अक्षर, अंक व विशेष चिन्ह)।",
    err_wrong_current_pwd: "वर्तमान पासवर्ड सही नहीं है।",
    err_pwd_mismatch: "नया पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते हैं।",
    err_pwd_same_as_curr: "नया पासवर्ड आपके वर्तमान पासवर्ड के समान नहीं हो सकता।",
    err_wrong_answers: "सुरक्षा उत्तर सत्यापित नहीं हो सके। कृपया सही उत्तर दर्ज करें।",

    // Footer
    footer_platform: "ANNASETU — स्मार्ट किसान खरीद मंच · Smart India Hackathon 2026",
    footer_title: "ANNASETU (अन्नसेतु) — राष्ट्रीय डिजिटल कृषि खरीद मंच",
    public_guidelines: "सरकारी सेवा दिशानिर्देश",
    farmer_helpline: "किसान हेल्पलाइन (1800-180-1551)"
  },

  en: {
    // Branding & Header
    app_title: "ANNASETU",
    app_subtitle: "Smart Farmer Procurement & Real-Time Queue Management System",
    gov_badge: "Government of India",
    ministry_hindi: "Ministry of Consumer Affairs, Food & Public Distribution",
    ministry_english: "Department of Food & Public Distribution",
    ministry_gov: "Government of India",
    live_ticker_badge: "LIVE MANDI TICKER",
    ticker_dbt_text: "DBT PFMS Payment Execution Rate: 99.4% (Average turnaround: 2.4 hrs)",
    ticker_queue_text: "Queue Status: Normal (Weighbridge Desks 1, 2 & 3 fully operational)",
    offline_banner_text: "📶 Offline Mode — Displaying cached data.",

    // Roles & Portals
    role_farmer: "👨‍🌾 Farmer",
    role_operator: "⚖️ Operator",
    role_admin: "🏛️ Admin",
    role_farmer_portal: "Farmer Portal",
    role_operator_portal: "Centre Operator",
    role_admin_portal: "District Admin",
    role_farmer_short: "Farmer",
    role_operator_short: "Operator",
    role_admin_short: "Admin",
    logout_btn: "Logout",
    book_new_slot: "Book New Slot",

    // Simulation Controls Bar
    live_controls_label: "Demo Workflow Controls:",
    sim_book_slot: "1. Book Farmer Slot",
    sim_operator_login: "2. Operator Login",
    sim_admin_login: "3. Admin SSO Login",
    reset_btn: "Reset",

    // Navigation & Tabs
    nav_home: "Home",
    nav_myslot: "My Slot",
    nav_centres: "Mandi Centres",
    nav_status: "Status",
    nav_profile: "Profile",
    greeting: "Welcome",
    kcc_verified: "KCC Verified",
    view_full_profile: "View Full Profile",
    voice_listen: "Listen (Audio)",
    help_support: "Help & Grievance",

    // Authentication Screen
    auth_title: "ANNASETU",
    auth_subtitle: "Smart Farmer Procurement & Real-Time Queue Management System",
    auth_footer_note: "ANNASETU — National Digital Agricultural Procurement & Queue Platform | Dept of Agriculture & Farmers Welfare",
    tab_login: "Login",
    tab_register: "Register",
    label_mobile_or_fid: "Mobile Number / Farmer ID",
    placeholder_mobile_or_fid: "10-digit mobile number or Farmer ID",
    label_password_or_otp: "Password or OTP",
    placeholder_password_or_otp: "Enter password or 4-6 digit OTP",
    demo_otp_hint: "💡 Any 4-digit OTP is accepted for demo (e.g. 1234)",
    btn_farmer_login: "Login to Farmer Portal",
    btn_demo_farmer: "⚡ 1-Click Demo Farmer (Ramesh Kumar — Token #A-52)",
    link_forgot_password: "Forgot Password? (Recovery)",

    // Registration Form
    label_full_name: "Full Name",
    placeholder_full_name: "e.g. Ramesh Kumar",
    label_mobile: "Indian Mobile Number",
    placeholder_mobile: "10-digit mobile number (e.g. 9812345678)",
    label_village: "Village Name",
    placeholder_village: "e.g. Taraori",
    label_reg_password: "Strong Password",
    placeholder_reg_password: "At least 8 characters (e.g. Agri@2026)",
    label_sec_q1: "Security Question 1",
    label_sec_a1: "Security Answer 1",
    placeholder_sec_a1: "Enter answer (case-insensitive)",
    label_sec_q2: "Security Question 2",
    label_sec_a2: "Security Answer 2",
    placeholder_sec_a2: "Enter answer",
    btn_create_account: "Create Account & Book Slot",

    // Password Policy & Interactive Checklist
    pwd_criteria_title: "Password Requirements:",
    pwd_rule_length: "At least 8 characters",
    pwd_rule_upper: "At least one uppercase letter (A-Z)",
    pwd_rule_lower: "At least one lowercase letter (a-z)",
    pwd_rule_number: "At least one number (0-9)",
    pwd_rule_special: "At least one special symbol (!@#$%^&*)",

    // Security Questions Options
    q_school: "What was the name of your first school?",
    q_village: "What is your native village or hometown?",
    q_nickname: "What was your childhood nickname?",
    q_crop: "What is your favorite crop?",

    // Three-Dot User Menu
    menu_new_slot: "New Slot Booking",
    menu_new_reg: "New Registration",
    menu_change_pwd: "Change Password",
    menu_forgot_pwd: "Forgot Password",
    menu_profile: "Farmer Profile",
    menu_logout: "Logout",

    // Change Password Modal
    change_pwd_title: "Change Account Password",
    change_pwd_sub: "Create a new strong password for your account.",
    label_current_pwd: "Current Password",
    placeholder_current_pwd: "Enter current password",
    label_new_pwd: "New Password",
    placeholder_new_pwd: "Enter new strong password",
    label_confirm_pwd: "Confirm New Password",
    placeholder_confirm_pwd: "Re-enter new password",
    btn_save_new_pwd: "Update Password",
    btn_cancel: "Cancel",

    // Forgot Password Modal
    forgot_pwd_title: "Forgot Password (Security Recovery)",
    forgot_pwd_sub: "Recover your password securely using your configured questions without OTP.",
    step1_title: "Step 1: Registered Mobile Number",
    step1_desc: "Enter your 10-digit Indian mobile number to look up your account.",
    btn_find_account: "Continue (Retrieve Questions)",
    step2_title: "Step 2: Answer Security Questions",
    step2_desc: "Provide the answers configured during registration.",
    btn_verify_answers: "Verify Answers",
    step3_title: "Step 3: Set New Strong Password",
    step3_desc: "Create a new password that satisfies the security requirements.",
    btn_reset_pwd: "Save New Password",

    // Farmer Hero & Status
    what_next_title: "📍 What should I do now?",
    status_before_slot: "Your slot is confirmed. Relax at home and head to mandi at your scheduled time.",
    status_queue_approaching: "Your turn is approaching! Please head towards Weighbridge Gate 1.",
    status_your_turn: "🚨 Your token is ACTIVE! Please present your pass at the weighing counter immediately.",
    status_procured: "✅ Crop procurement completed successfully. Mandi receipt generated.",
    status_payment_done: "💰 MSP payment credited directly to your bank account via DBT PFMS.",
    status_rejected: "❌ Crop declaration was rejected as it did not meet FAQ quality specs.",
    status_cancelled: "⚠️ This slot booking has been cancelled.",
    view_route: "View Route",

    // Live Queue Radar
    live_radar: "LIVE RADAR",
    current_serving: "Now Serving",
    current_serving_token: "Current Serving Token",
    your_token: "Your Token",
    farmers_ahead: "Ahead",
    estimated_wait: "Est. Wait",
    estimated_wait_time: "Estimated Wait Time",
    queue_progress: "Queue Progress",
    wait_at_home: "Relax and wait at home",
    you_badge: "YOU",
    active_queue: "Active Queue",

    // 7-Stage Journey
    procurement_journey_title: "🌾 7-Stage Procurement Journey",
    stage1_name: "Slot Booked",
    stage2_name: "Gate Arrival & Pass",
    stage3_name: "Gross Weighbridge",
    stage4_name: "Quality Assay (FAQ)",
    stage5_name: "Unloading & Tare",
    stage6_name: "Mandi Receipt Slip",
    stage7_name: "DBT Bank Credit",
    stage_details: "Stage Details",
    stage_help: "Click any stage above to inspect weighbridge slips, quality assay results, and PFMS payment reference.",

    // Mandi Centres & Maps
    nearby_centres_title: "📍 Nearby Mandi Centres & Load",
    nearby_centres_title_plain: "Nearby Mandi Centres & Load",
    mandi_centres_count: "Mandi Centres",
    centre_col: "Mandi Centre",
    distance_col: "Distance",
    load_col: "Current Load",
    status_col: "Status",
    action_col: "Action",
    normal_load: "Normal Load",
    moderate_load: "Moderate Load",
    high_load: "High Load",
    select_slot_btn: "Select Slot",
    route_tips_btn: "Route Tips",

    // Daily Schedule
    daily_schedule_title: "Which centre is procuring which crop today? (Daily Schedule)",
    daily_schedule_sub: "Daily crop schedule, operational hours (08:00 AM - 05:00 PM), and capacity across all centres",
    refresh_btn: "Refresh",

    // Slot Matrix Modal & Booking
    slot_allocation_title: "Slot Allocation (Smart Slot Allocation)",
    slot_allocation_sub: "Select an available slot to receive instant digital gate token",
    centre_label: "Procurement Centre:",
    crop_type_label: "Crop Type:",
    procurement_date_label: "Date:",
    apply_btn: "Apply",
    your_slot_badge: "Your Slot",
    book_btn: "Book Slot",
    full_badge: "Full",
    available_badge: "Available",
    high_demand: "High Demand",
    regulated_windows: "1-Hour Regulated Windows",
    ai_recommendation_title: "AI Recommendation",
    loading_text: "Loading...",
    choose_centre: "Choose This Centre",
    crop_quantity_label: "Estimated Quantity (Quintal):",
    crop_variety_label: "Crop Variety:",

    // DBT Payments & Receipts
    payment_card_title: "💳 DBT Payment Details (PFMS Live)",
    dbt_payment_title: "DBT Payment Details (PFMS Live)",
    est_payout: "Total MSP Value",
    total_msp_value: "Total MSP Value",
    dbt_status: "DBT Status",
    pfms_ref: "PFMS Reference",
    pfms_ref_tx: "PFMS Reference / Tx ID",
    bank_account: "Bank Account",
    aadhaar_bank: "Aadhaar Linked Bank",
    verify_dbt_btn: "💰 Verify DBT Payment",
    view_receipt_btn: "📄 View Receipt",
    digital_gate_pass: "Digital Gate Pass",
    print_btn: "🖨️ Print Pass",
    print_pass_btn: "Print Pass",
    share_btn: "📱 Share",
    whatsapp_share: "WhatsApp Share",

    // Missed Slot Recovery
    missed_slot_title: "Missed Slot Smart Recovery",
    missed_slot_desc: "Missed your slot? The engine finds the next optimal slot without queue penalty.",
    missed_slot_btn: "🔄 Recover Missed Slot",
    recover_missed_slot: "Recover Missed Slot",

    // Crop Declaration
    crop_quality_title: "Crop Quality Declaration (FAQ & Assays)",
    declare_crop_btn: "Declare Crop",
    booking_history_title: "Booking History & Receipts",
    booking_history_sub: "All your past and active tokens and payment status",
    all_statuses: "All Statuses",
    active_booked: "Active / Booked",
    completed_credited: "Completed / Credited",
    cancelled_rejected: "Cancelled / Rejected",
    token_col: "Token",
    date_time_col: "Date & Time",
    crop_qty_col: "Crop & Quantity",
    view_pass: "View Pass",

    // Operator Console
    operator_console: "Mandi Operator Terminal",
    select_operator_centre: "Select Mandi Centre:",
    call_next_btn: "📢 Call Next Token",
    delay_alert_btn: "⚠️ Broadcast Delay Alert",

    // Admin Dashboard
    admin_dashboard_title: "District Mandi Dashboard & Telemetry",
    run_ai_balancer_btn: "⚡ Run Load Balance Analysis",

    // Crops
    crop_wheat: "Wheat",
    crop_paddy: "Paddy / Rice",
    crop_mustard: "Mustard",
    crop_gram: "Gram / Chana",
    crop_maize: "Maize",

    // Statuses
    status_booked_badge: "Booked",
    status_arrived_badge: "In Queue / Arrived",
    status_weighed_badge: "Weighed",
    status_inspected_badge: "FAQ Approved",
    status_procured_badge: "Procured",
    status_paid_badge: "Payment Credited",
    status_rejected_badge: "Rejected",
    status_cancelled_badge: "Cancelled",

    // Common Messages & Toasts
    toast_login_success: "Login successful!",
    toast_logout_success: "Logged out successfully.",
    toast_reg_success: "Registration successful! You can now book your slot.",
    toast_pwd_changed: "Password changed successfully.",
    toast_pwd_reset: "Password reset successfully. Please log in with your new password.",
    err_duplicate_phone: "An account already exists with this mobile number.",
    err_invalid_phone: "Please enter a valid 10-digit Indian mobile number.",
    err_weak_password: "Please enter a strong password (at least 8 chars, uppercase, lowercase, number, symbol).",
    err_wrong_current_pwd: "Current password is incorrect.",
    err_pwd_mismatch: "New password and confirmation do not match.",
    err_pwd_same_as_curr: "New password cannot be the same as your current password.",
    err_wrong_answers: "Security answers could not be verified. Please verify your details.",

    // Footer
    footer_platform: "ANNASETU — Smart Farmer Procurement Platform · Smart India Hackathon 2026",
    footer_title: "ANNASETU — National Digital Agricultural Procurement Platform",
    public_guidelines: "Public Service Guidelines",
    farmer_helpline: "Farmer Helpline (1800-180-1551)"
  }
};

// Punjabi (pa) Dictionary
I18N_DATA.pa = {
  ...I18N_DATA.en,
  app_title: "ANNASETU",
  app_subtitle: "ਸਮਾਰਟ ਕਿਸਾਨ ਖਰੀਦ ਅਤੇ ਰੀਅਲ-ਟਾਈਮ ਕਤਾਰ ਪ੍ਰਬੰਧਨ ਪ੍ਰਣਾਲੀ",
  gov_badge: "ਭਾਰਤ ਸਰਕਾਰ",
  role_farmer: "👨‍🌾 ਕਿਸਾਨ",
  role_operator: "⚖️ ਆਪਰੇਟਰ",
  role_admin: "🏛️ ਪ੍ਰਸ਼ਾਸਨ",
  role_farmer_portal: "ਕਿਸਾਨ ਪੋਰਟਲ",
  role_operator_portal: "ਕੇਂਦਰ ਆਪਰੇਟਰ",
  role_admin_portal: "ਜ਼ਿਲ੍ਹਾ ਪ੍ਰਸ਼ਾਸਨ",
  role_farmer_short: "ਕਿਸਾਨ",
  role_operator_short: "ਆਪਰੇਟਰ",
  role_admin_short: "ਪ੍ਰਸ਼ਾਸਨ",
  logout_btn: "ਲਾਗਆਊਟ",
  book_new_slot: "ਨਵਾਂ ਸਲਾਟ ਬੁੱਕ ਕਰੋ",
  nav_home: "ਮੁੱਖ ਪੰਨਾ",
  nav_myslot: "ਮੇਰਾ ਸਲਾਟ",
  nav_centres: "ਮੰਡੀ ਕੇਂਦਰ",
  nav_status: "ਸਥਿਤੀ",
  nav_profile: "ਪ੍ਰੋਫਾਈਲ",
  greeting: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ",
  tab_login: "ਲਾਗਇਨ",
  tab_register: "ਨਵੀਂ ਰਜਿਸਟ੍ਰੇਸ਼ਨ",
  label_mobile: "ਮੋਬਾਈਲ ਨੰਬਰ",
  label_full_name: "ਪੂਰਾ ਨਾਮ",
  label_village: "ਪਿੰਡ ਦਾ ਨਾਮ",
  btn_farmer_login: "ਕਿਸਾਨ ਪੋਰਟਲ 'ਤੇ ਲਾਗਇਨ ਕਰੋ",
  menu_new_slot: "ਨਵਾਂ ਸਲਾਟ ਬੁੱਕ ਕਰੋ",
  menu_new_reg: "ਨਵੀਂ ਰਜਿਸਟ੍ਰੇਸ਼ਨ",
  menu_change_pwd: "ਪਾਸਵਰਡ ਬਦਲੋ",
  menu_forgot_pwd: "ਪਾਸਵਰਡ ਭੁੱਲ ਗਏ",
  menu_logout: "ਲਾਗਆਊਟ",
  pwd_criteria_title: "ਪਾਸਵਰਡ ਦੀਆਂ ਸ਼ਰਤਾਂ:",
  pwd_rule_length: "ਘੱਟੋ-ਘੱਟ 8 ਅੱਖਰ",
  pwd_rule_upper: "ਘੱਟੋ-ਘੱਟ ਇੱਕ ਵੱਡਾ ਅੱਖਰ (A-Z)",
  pwd_rule_lower: "ਘੱਟੋ-ਘੱਟ ਇੱਕ ਛੋਟਾ ਅੱਖਰ (a-z)",
  pwd_rule_number: "ਘੱਟੋ-ਘੱਟ ਇੱਕ ਅੰਕ (0-9)",
  pwd_rule_special: "ਘੱਟੋ-ਘੱਟ ਇੱਕ ਖਾਸ ਚਿੰਨ੍ਹ (!@#$%^&*)",
  change_pwd_title: "ਪਾਸਵਰਡ ਬਦਲੋ",
  forgot_pwd_title: "ਪਾਸਵਰਡ ਰਿਕਵਰੀ (ਸੁਰੱਖਿਆ ਸਵਾਲ)",
  live_radar: "ਲਾਈਵ ਰਡਾਰ",
  current_serving: "ਮੌਜੂਦਾ ਸੇਵਾ",
  your_token: "ਤੁਹਾਡਾ ਟੋਕਨ",
  farmers_ahead: "ਅੱਗੇ ਕਿਸਾਨ",
  estimated_wait: "ਅੰਦਾਜ਼ਨ ਸਮਾਂ",
  queue_progress: "ਕਤਾਰ ਪ੍ਰਗਤੀ",
  procurement_journey_title: "🌾 ਫਸਲ ਖਰੀਦ ਪ੍ਰਗਤੀ (7 ਪੜਾਅ)",
  nearby_centres_title: "📍 ਨੇੜਲੇ ਮੰਡੀ ਕੇਂਦਰ ਅਤੇ ਲੋਡ",
  slot_allocation_title: "ਸਲਾਟ ਵੰਡ (Slot Booking)",
  payment_card_title: "💳 ਡੀਬੀਟੀ ਭੁਗਤਾਨ ਸਥਿਤੀ (PFMS)",
  digital_gate_pass: "ਡਿਜੀਟਲ ਗੇਟ ਪਾਸ",
  print_btn: "🖨️ ਪ੍ਰਿੰਟ ਪਾਸ",
  share_btn: "📱 ਸ਼ੇਅਰ ਕਰੋ",
  crop_wheat: "ਕਣਕ (Wheat)",
  crop_paddy: "ਝੋਨਾ (Paddy)",
  crop_mustard: "ਸਰ੍ਹੋਂ (Mustard)",
  crop_gram: "ਛੋਲੇ (Gram)",
  toast_login_success: "ਲਾਗਇਨ ਸਫਲ ਰਿਹਾ!",
  toast_logout_success: "ਲਾਗਆਊਟ ਹੋ ਗਿਆ।",
  err_duplicate_phone: "ਇਸ ਮੋਬਾਈਲ ਨੰਬਰ ਨਾਲ ਪਹਿਲਾਂ ਹੀ ਖਾਤਾ ਮੌਜੂਦ ਹੈ।"
};

// Marathi (mr) Dictionary
I18N_DATA.mr = {
  ...I18N_DATA.en,
  app_title: "ANNASETU",
  app_subtitle: "स्मार्ट शेतकरी खरेदी आणि रीअल-टाइम रांग व्यवस्थापन प्रणाली",
  gov_badge: "भारत सरकार",
  role_farmer: "👨‍🌾 शेतकरी",
  role_operator: "⚖️ ऑपरेटर",
  role_admin: "🏛️ प्रशासन",
  role_farmer_portal: "शेतकरी पोर्टल",
  role_operator_portal: "केंद्र ऑपरेटर",
  role_admin_portal: "जिल्हा प्रशासन",
  role_farmer_short: "शेतकरी",
  role_operator_short: "ऑपरेटर",
  role_admin_short: "प्रशासन",
  logout_btn: "लॉगआउट",
  book_new_slot: "नवीन स्लॉट बुक करा",
  nav_home: "मुख्यपृष्ठ",
  nav_myslot: "माझा स्लॉट",
  nav_centres: "खरेदी केंद्र",
  nav_status: "प्रगती",
  nav_profile: "प्रोफाइल",
  greeting: "नमस्कार",
  tab_login: "लॉगिन",
  tab_register: "नवीन नोंदणी",
  label_mobile: "मोबाईल नंबर",
  label_full_name: "पूर्ण नाव",
  label_village: "गावाचे नाव",
  btn_farmer_login: "शेतकरी पोर्टलवर लॉगिन करा",
  menu_new_slot: "नवीन स्लॉट बुक करा",
  menu_new_reg: "नवीन नोंदणी",
  menu_change_pwd: "पासवर्ड बदला",
  menu_forgot_pwd: "पासवर्ड विसरलात",
  menu_logout: "लॉगआउट",
  pwd_criteria_title: "पासवर्ड आवश्यकता:",
  pwd_rule_length: "किमान 8 अक्षरे",
  pwd_rule_upper: "किमान एक मोठे अक्षर (A-Z)",
  pwd_rule_lower: "किमान एक लहान अक्षर (a-z)",
  pwd_rule_number: "किमान एक अंक (0-9)",
  pwd_rule_special: "किमान एक विशेष चिन्ह (!@#$%^&*)",
  change_pwd_title: "पासवर्ड बदला",
  forgot_pwd_title: "पासवर्ड पुनर्प्राप्ती (सुरक्षा प्रश्न)",
  live_radar: "लाइव्ह रडार",
  current_serving: "सध्याची सेवा",
  your_token: "आपला टोकन",
  farmers_ahead: "पुढील शेतकरी",
  estimated_wait: "अंदाजे वेळ",
  queue_progress: "रांगेची प्रगती",
  procurement_journey_title: "🌾 पीक खरेदी प्रगती (7 टप्पे)",
  nearby_centres_title: "📍 जवळील खरेदी केंद्र आणि भार",
  slot_allocation_title: "स्लॉट वाटप",
  payment_card_title: "💳 DBT पेमेंट स्थिती (PFMS)",
  digital_gate_pass: "डिजिटल गेट पास",
  print_btn: "🖨️ पास प्रिंट करा",
  share_btn: "📱 शेअर करा",
  crop_wheat: "गहू (Wheat)",
  crop_paddy: "भात / धान (Paddy)",
  crop_mustard: "मोहरी (Mustard)",
  crop_gram: "हरभरा (Gram)",
  toast_login_success: "लॉगिन यशस्वी!",
  toast_logout_success: "लॉगआउट झाले.",
  err_duplicate_phone: "या मोबाईल नंबरसह आधीपासूनच खाते अस्तित्वात आहे."
};

// Telugu (te) Dictionary
I18N_DATA.te = {
  ...I18N_DATA.en,
  app_title: "ANNASETU",
  app_subtitle: "రైతు సేకరణ & రియల్-టైమ్ క్యూ నిర్వహణ వ్యవస్థ",
  gov_badge: "భారత ప్రభుత్వం",
  role_farmer: "👨‍🌾 రైతు",
  role_operator: "⚖️ ఆపరేటర్",
  role_admin: "🏛️ అడ్మిన్",
  role_farmer_portal: "రైతు పోర్టల్",
  role_operator_portal: "కేంద్ర ఆపరేటర్",
  role_admin_portal: "జిల్లా అడ్మిన్",
  role_farmer_short: "రైతు",
  role_operator_short: "ఆపరేటర్",
  role_admin_short: "అడ్మిన్",
  logout_btn: "లాగౌట్",
  book_new_slot: "కొత్త స్లాట్ బుక్ చేయండి",
  nav_home: "హోమ్",
  nav_myslot: "నా స్లాట్",
  nav_centres: "కొనుగోలు కేంద్రాలు",
  nav_status: "పురోగతి",
  nav_profile: "ప్రొఫైల్",
  greeting: "నమస్కారం",
  tab_login: "లాగిన్",
  tab_register: "కొత్త రిజిస్ట్రేషన్",
  label_mobile: "మొబైల్ నంబర్",
  label_full_name: "పూర్తి పేరు",
  label_village: "గ్రామం పేరు",
  btn_farmer_login: "రైతు పోర్టల్‌లోకి లాగిన్ అవ్వండి",
  menu_new_slot: "కొత్త స్లాట్ బుక్ చేయండి",
  menu_new_reg: "కొత్త రిజిస్ట్రేషన్",
  menu_change_pwd: "పాస్‌వర్డ్ మార్చండి",
  menu_forgot_pwd: "పాస్‌వర్డ్ మర్చిపోయారా",
  menu_logout: "లాగౌట్",
  pwd_criteria_title: "పాస్‌వర్డ్ అవసరాలు:",
  pwd_rule_length: "కనీసం 8 అక్షరాలు",
  pwd_rule_upper: "కనీసం ఒక పెద్ద అక్షరం (A-Z)",
  pwd_rule_lower: "కనీసం ఒక చిన్న అక్షరం (a-z)",
  pwd_rule_number: "కనీసం ఒక సంఖ్య (0-9)",
  pwd_rule_special: "కనీసం ఒక ప్రత్యేక గుర్తు (!@#$%^&*)",
  change_pwd_title: "పాస్‌వర్డ్ మార్చండి",
  forgot_pwd_title: "పాస్‌వర్డ్ రికవరీ (భద్రతా ప్రశ్నలు)",
  live_radar: "లైవ్ రాడార్",
  current_serving: "ప్రస్తుత టోకెన్",
  your_token: "మీ టోకెన్",
  farmers_ahead: "ముందున్న రైతులు",
  estimated_wait: "వేచి ఉండే సమయం",
  queue_progress: "క్యూ పురోగతి",
  procurement_journey_title: "🌾 ధాన్య సేకరణ దశలు (7 దశలు)",
  nearby_centres_title: "📍 సమీప కొనుగోలు కేంద్రాలు & లోడ్",
  slot_allocation_title: "స్లాట్ బుకింగ్",
  payment_card_title: "💳 DBT చెల్లింపు వివరాలు (PFMS)",
  digital_gate_pass: "డిజిటల్ గేట్ పాస్",
  print_btn: "🖨️ ప్రింట్ పాస్",
  share_btn: "📱 షేర్ చేయండి",
  crop_wheat: "గోధుమలు (Wheat)",
  crop_paddy: "వరి / ధాన్యం (Paddy)",
  crop_mustard: "ఆవాలు (Mustard)",
  crop_gram: "శనగలు (Gram)",
  toast_login_success: "లాగిన్ విజయవంతమైంది!",
  toast_logout_success: "లాగౌట్ అయ్యారు.",
  err_duplicate_phone: "ఈ మొబైల్ నంబర్‌తో ఇప్పటికే ఖాతా ఉంది."
};

function getSavedLanguage() {
  return localStorage.getItem("kq_lang") || "hi";
}

function saveLanguage(lang) {
  localStorage.setItem("kq_lang", lang);
}

function t(key, lang = getSavedLanguage()) {
  const dict = I18N_DATA[lang] || I18N_DATA.hi;
  if (dict && dict[key] !== undefined) return dict[key];
  if (I18N_DATA.en && I18N_DATA.en[key] !== undefined) return I18N_DATA.en[key];
  if (I18N_DATA.hi && I18N_DATA.hi[key] !== undefined) return I18N_DATA.hi[key];
  return key;
}

function translateUI(lang = getSavedLanguage()) {
  saveLanguage(lang);
  document.documentElement.lang = lang;
  const dict = I18N_DATA[lang] || I18N_DATA.hi;

  // 1. Text elements with data-i18n
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    const val = t(key, lang);
    if (val && val !== key) {
      el.textContent = val;
    }
  });

  // 2. HTML elements with data-i18n-html
  document.querySelectorAll("[data-i18n-html]").forEach(el => {
    const key = el.getAttribute("data-i18n-html");
    const val = t(key, lang);
    if (val && val !== key) {
      el.innerHTML = val;
    }
  });

  // 3. Input placeholders with data-i18n-placeholder
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    const val = t(key, lang);
    if (val && val !== key) {
      el.placeholder = val;
    }
  });

  // 4. Element titles/tooltips with data-i18n-title
  document.querySelectorAll("[data-i18n-title]").forEach(el => {
    const key = el.getAttribute("data-i18n-title");
    const val = t(key, lang);
    if (val && val !== key) {
      el.title = val;
    }
  });

  // 5. Update active language switcher pills
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });

  // 6. Notify active view to re-render dynamic tables/cards
  if (typeof onLanguageChanged === "function") {
    try {
      onLanguageChanged(lang);
    } catch (e) {
      console.warn("onLanguageChanged error:", e);
    }
  }
}
