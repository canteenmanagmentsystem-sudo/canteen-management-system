export const hi = {
  common: {
    save: "सहेजें",
    update: "अपडेट करें",
    delete: "हटाएं",
    cancel: "रद्द करें",
    close: "बंद करें",
    edit: "संपादित करें",
    add: "जोड़ें",
    search: "खोजें",
    reset: "रीसेट करें",
    submit: "जमा करें",
    print: "प्रिंट करें",
    export: "एक्सपोर्ट करें",
    loading: "लोड हो रहा है...",
    yes: "हाँ",
    no: "नहीं",
    active: "सक्रिय",
    inactive: "निष्क्रिय",
    actions: "कार्यवाही",
    status: "स्थिति",
    date: "दिनांक",
    time: "समय",
    total: "कुल",
    amount: "राशि",
    quantity: "मात्रा",
    rate: "दर",
    remarks: "टिप्पणी",
  },

  navigation: {
    dashboard: "डैशबोर्ड",
    sales: "बिक्री",
    billing: "बिलिंग",
    parties: "पार्टी",
    persons: "व्यक्ति",
    departments: "विभाग",
    foodItems: "खाद्य सामग्री",
    categories: "खाद्य श्रेणियां",
    units: "इकाई",
    suppliers: "आपूर्तिकर्ता",
    purchases: "खरीद",
    inventory: "इन्वेंटरी",
    payments: "भुगतान",
    ledger: "लेजर",
    reports: "रिपोर्ट",
    users: "यूजर",
    settings: "सेटिंग्स",
    logout: "लॉगआउट",
  },

  language: {
    english: "English",
    hindi: "हिन्दी",
    select: "भाषा",
  },

  department: {
    title: "विभाग",
    code: "विभाग कोड",
    nameEn: "विभाग का नाम (अंग्रेजी)",
    nameHi: "विभाग का नाम (हिंदी)",
    descriptionEn: "विवरण (अंग्रेजी)",
    descriptionHi: "विवरण (हिंदी)",
  },

  party: {
    title: "पार्टी",
    code: "पार्टी कोड",
    nameEn: "पार्टी का नाम (अंग्रेजी)",
    nameHi: "पार्टी का नाम (हिंदी)",
    type: "पार्टी प्रकार",
    department: "विभाग",
    mobile: "मोबाइल",
    email: "ईमेल",
    address: "पता",
    openingBalance: "प्रारंभिक शेष",
  },

  person: {
    title: "व्यक्ति",
    employeeCode: "कर्मचारी कोड",
    nameEn: "नाम (अंग्रेजी)",
    nameHi: "नाम (हिंदी)",
    gender: "लिंग",
    department: "विभाग",
    party: "पार्टी",
    mobile: "मोबाइल",
    email: "ईमेल",
  },

  foodCategory: {
    title: "खाद्य श्रेणियां",
    nameEn: "श्रेणी का नाम (अंग्रेजी)",
    nameHi: "श्रेणी का नाम (हिंदी)",
    descriptionEn: "विवरण (अंग्रेजी)",
    descriptionHi: "विवरण (हिंदी)",
  },

  unit: {
    title: "इकाइयां",
    nameEn: "इकाई का नाम (अंग्रेजी)",
    nameHi: "इकाई का नाम (हिंदी)",
    shortName: "संक्षिप्त नाम",
  },

  foodItem: {
    title: "खाद्य सामग्री",
    itemCode: "आइटम कोड",
    nameEn: "खाद्य सामग्री का नाम (अंग्रेजी)",
    nameHi: "खाद्य सामग्री का नाम (हिंदी)",
    category: "श्रेणी",
    unit: "इकाई",
    purchaseRate: "खरीद दर",
    saleRate: "बिक्री दर",
    minimumStock: "न्यूनतम स्टॉक",
    maximumStock: "अधिकतम स्टॉक",
    stockItem: "स्टॉक आइटम",
  },

  validation: {
    required: "यह फ़ील्ड आवश्यक है।",
    invalid: "अमान्य मान।",
    selectRequired: "कृपया एक विकल्प चुनें।",
  },

  messages: {
    saveSuccess: "रिकॉर्ड सफलतापूर्वक सहेजा गया।",
    updateSuccess: "रिकॉर्ड सफलतापूर्वक अपडेट किया गया।",
    deleteSuccess: "रिकॉर्ड सफलतापूर्वक हटाया गया।",
    somethingWentWrong: "कुछ गलत हो गया।",
    noRecords: "कोई रिकॉर्ड नहीं मिला।",
  },
  errors: {
  FOOD_ITEM_NAME_EN_REQUIRED:
    "खाद्य सामग्री का अंग्रेजी नाम आवश्यक है।",

  FOOD_ITEM_NOT_FOUND:
    "खाद्य सामग्री नहीं मिली।",

  DEPARTMENT_NOT_FOUND:
    "विभाग नहीं मिला।",

  PARTY_NOT_FOUND:
    "पार्टी नहीं मिली।",

  PERSON_NOT_FOUND:
    "व्यक्ति नहीं मिला।",

  INVALID_DATA:
    "दिया गया डेटा मान्य नहीं है।",

  UNAUTHORIZED:
    "आपको यह कार्य करने की अनुमति नहीं है।",

  FORBIDDEN:
    "आपके पास यह कार्य करने की अनुमति नहीं है।",
},
paymentMode: {
  CASH: "नकद",
  UPI: "UPI",
  CARD: "कार्ड",
  BANK_TRANSFER: "बैंक ट्रांसफर",
  CHEQUE: "चेक",
  ADJUSTMENT: "समायोजन",
  OTHER: "अन्य",
},
} as const;