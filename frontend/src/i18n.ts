export type Language = "en" | "hi";

export const translations = {
  en: {
    language: {
      select: "Language",
      english: "English",
      hindi: "Hindi"
    },
    appTitle: "Canteen Management System",
    dashboard: "Dashboard",
    reports: "Reports",
    sales: "Sales Report",
    salesFood: "Sales by Food Item",
    salesDepartment: "Sales by Department",
    purchases: "Purchase Report",
    collections: "Collection Report",
    outstanding: "Outstanding / Party Ledger",
    expenses: "Expense Report",
    stock: "Stock Report",
    stockMovements: "Stock Movement",
    wastage: "Wastage Report",
    login: "Login",
    username: "Username",
    password: "Password",
    logout: "Logout",
    fromDate: "From Date",
    toDate: "To Date",
    status: "Status",
    all: "All",
    posted: "Posted",
    draft: "Draft",
    search: "Search",
    reset: "Reset",
    exportCsv: "Export CSV",
    print: "Print",
    refresh: "Refresh",
    totalSales: "Total Sales",
    salesCount: "Sales Count",
    purchasesTotal: "Purchases",
    collectionsTotal: "Collections",
    expensesTotal: "Expenses",
    lowStock: "Low Stock",
    wastageCount: "Wastage Entries",
    invoice: "Invoice",
    date: "Date",
    saleType: "Sale Type",
    party: "Party",
    person: "Person",
    subtotal: "Subtotal",
    discount: "Discount",
    tax: "Tax",
    grandTotal: "Grand Total",
    paid: "Paid",
    due: "Due",
    quantity: "Quantity",
    amount: "Amount",
    foodItem: "Food Item",
    department: "Department",
    supplier: "Supplier",
    paymentMode: "Payment Mode",
    receipt: "Receipt",
    category: "Category",
    description: "Description",
    currentStock: "Current Stock",
    minimumStock: "Minimum Stock",
    maximumStock: "Maximum Stock",
    stockStatus: "Stock Status",
    transactionType: "Transaction Type",
    reason: "Reason",
    loading: "Loading...",
    noData: "No data found",
    error: "Something went wrong",
    loginFailed: "Login failed",
    required: "Required",
    welcome: "Welcome",
    selectReport: "Select a report",
    reportDateHint: "Leave dates blank to show all available records.",
    apiBase: "API Base URL",
    save: "Save",
    cancel: "Cancel"
  },
  hi: {
    language: {
      select: "भाषा",
      english: "अंग्रेज़ी",
      hindi: "हिन्दी"
    },
    appTitle: "कैंटीन प्रबंधन प्रणाली",
    dashboard: "डैशबोर्ड",
    reports: "रिपोर्ट",
    sales: "बिक्री रिपोर्ट",
    salesFood: "खाद्य सामग्री अनुसार बिक्री",
    salesDepartment: "विभाग अनुसार बिक्री",
    purchases: "खरीद रिपोर्ट",
    collections: "वसूली रिपोर्ट",
    outstanding: "बकाया / पार्टी लेजर",
    expenses: "व्यय रिपोर्ट",
    stock: "स्टॉक रिपोर्ट",
    stockMovements: "स्टॉक मूवमेंट",
    wastage: "बर्बादी रिपोर्ट",
    login: "लॉगिन",
    username: "यूजरनेम",
    password: "पासवर्ड",
    logout: "लॉगआउट",
    fromDate: "दिनांक से",
    toDate: "दिनांक तक",
    status: "स्थिति",
    all: "सभी",
    posted: "पोस्टेड",
    draft: "ड्राफ्ट",
    search: "खोजें",
    reset: "रीसेट",
    exportCsv: "CSV डाउनलोड",
    print: "प्रिंट",
    refresh: "रिफ्रेश",
    totalSales: "कुल बिक्री",
    salesCount: "बिक्री संख्या",
    purchasesTotal: "कुल खरीद",
    collectionsTotal: "कुल वसूली",
    expensesTotal: "कुल व्यय",
    lowStock: "कम स्टॉक",
    wastageCount: "बर्बादी प्रविष्टियां",
    invoice: "इनवॉइस",
    date: "दिनांक",
    saleType: "बिक्री प्रकार",
    party: "पार्टी",
    person: "व्यक्ति",
    subtotal: "उप-योग",
    discount: "छूट",
    tax: "टैक्स",
    grandTotal: "कुल राशि",
    paid: "जमा",
    due: "बकाया",
    quantity: "मात्रा",
    amount: "राशि",
    foodItem: "खाद्य सामग्री",
    department: "विभाग",
    supplier: "सप्लायर",
    paymentMode: "भुगतान माध्यम",
    receipt: "रसीद",
    category: "श्रेणी",
    description: "विवरण",
    currentStock: "वर्तमान स्टॉक",
    minimumStock: "न्यूनतम स्टॉक",
    maximumStock: "अधिकतम स्टॉक",
    stockStatus: "स्टॉक स्थिति",
    transactionType: "लेनदेन प्रकार",
    reason: "कारण",
    loading: "लोड हो रहा है...",
    noData: "कोई डेटा नहीं मिला",
    error: "कुछ गलत हुआ",
    loginFailed: "लॉगिन असफल",
    required: "आवश्यक",
    welcome: "स्वागत है",
    selectReport: "रिपोर्ट चुनें",
    reportDateHint: "सभी उपलब्ध रिकॉर्ड देखने के लिए तारीख खाली छोड़ें।",
    apiBase: "API बेस URL",
    save: "सेव",
    cancel: "रद्द करें"
  }
} as const;


export type TranslationType = typeof translations.en;

export type TranslationKey = keyof typeof translations.en;


export function t(lang: Language, key: TranslationKey): string {
  const value = translations[lang][key];

  if (typeof value === "string") {
    return value;
  }

  const fallback = translations.en[key];

  if (typeof fallback === "string") {
    return fallback;
  }

  return key;
}
export function getLocalized(
  lang: Language,
  en?: string | null,
  hi?: string | null
): string {
  if (lang === "hi") return hi || en || "";
  return en || hi || "";
}