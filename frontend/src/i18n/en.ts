export const en = {
  common: {
    save: "Save",
    update: "Update",
    delete: "Delete",
    cancel: "Cancel",
    close: "Close",
    edit: "Edit",
    add: "Add",
    search: "Search",
    reset: "Reset",
    submit: "Submit",
    print: "Print",
    export: "Export",
    loading: "Loading...",
    yes: "Yes",
    no: "No",
    active: "Active",
    inactive: "Inactive",
    actions: "Actions",
    status: "Status",
    date: "Date",
    time: "Time",
    total: "Total",
    amount: "Amount",
    quantity: "Quantity",
    rate: "Rate",
    remarks: "Remarks",
  },

  navigation: {
    dashboard: "Dashboard",
    sales: "Sales",
    billing: "Billing",
    parties: "Parties",
    persons: "Persons",
    departments: "Departments",
    foodItems: "Food Items",
    categories: "Food Categories",
    units: "Units",
    suppliers: "Suppliers",
    purchases: "Purchases",
    inventory: "Inventory",
    payments: "Payments",
    ledger: "Ledger",
    reports: "Reports",
    users: "Users",
    settings: "Settings",
    logout: "Logout",
  },

  language: {
    english: "English",
    hindi: "हिन्दी",
    select: "Language",
  },

  department: {
    title: "Departments",
    code: "Department Code",
    nameEn: "Department Name (English)",
    nameHi: "Department Name (Hindi)",
    descriptionEn: "Description (English)",
    descriptionHi: "Description (Hindi)",
  },

  party: {
    title: "Parties",
    code: "Party Code",
    nameEn: "Party Name (English)",
    nameHi: "Party Name (Hindi)",
    type: "Party Type",
    department: "Department",
    mobile: "Mobile",
    email: "Email",
    address: "Address",
    openingBalance: "Opening Balance",
  },

  person: {
    title: "Persons",
    employeeCode: "Employee Code",
    nameEn: "Name (English)",
    nameHi: "Name (Hindi)",
    gender: "Gender",
    department: "Department",
    party: "Party",
    mobile: "Mobile",
    email: "Email",
  },

  foodCategory: {
    title: "Food Categories",
    nameEn: "Category Name (English)",
    nameHi: "Category Name (Hindi)",
    descriptionEn: "Description (English)",
    descriptionHi: "Description (Hindi)",
  },

  unit: {
    title: "Units",
    nameEn: "Unit Name (English)",
    nameHi: "Unit Name (Hindi)",
    shortName: "Short Name",
  },

  foodItem: {
    title: "Food Items",
    itemCode: "Item Code",
    nameEn: "Food Item Name (English)",
    nameHi: "Food Item Name (Hindi)",
    category: "Category",
    unit: "Unit",
    purchaseRate: "Purchase Rate",
    saleRate: "Sale Rate",
    minimumStock: "Minimum Stock",
    maximumStock: "Maximum Stock",
    stockItem: "Stock Item",
  },

  validation: {
    required: "This field is required.",
    invalid: "Invalid value.",
    selectRequired: "Please select a value.",
  },

  messages: {
    saveSuccess: "Record saved successfully.",
    updateSuccess: "Record updated successfully.",
    deleteSuccess: "Record deleted successfully.",
    somethingWentWrong: "Something went wrong.",
    noRecords: "No records found.",
  },
  errors: {
  FOOD_ITEM_NAME_EN_REQUIRED:
    "Food item name in English is required.",

  FOOD_ITEM_NOT_FOUND:
    "Food item not found.",

  DEPARTMENT_NOT_FOUND:
    "Department not found.",

  PARTY_NOT_FOUND:
    "Party not found.",

  PERSON_NOT_FOUND:
    "Person not found.",

  INVALID_DATA:
    "Invalid data provided.",

  UNAUTHORIZED:
    "You are not authorized to perform this action.",

  FORBIDDEN:
    "You do not have permission to perform this action.",
}   ,
paymentMode: {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  ADJUSTMENT: "Adjustment",
  OTHER: "Other",
},

} as const;

