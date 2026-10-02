export type ReportKey =
  | "sales"
  | "salesFood"
  | "salesDepartment"
  | "purchases"
  | "collections"
  | "outstanding"
  | "expenses"
  | "stock"
  | "stockMovements"
  | "wastage";

export interface Filters {
  fromDate: string;
  toDate: string;
  status: "POSTED" | "DRAFT" | "ALL";
}

export interface DashboardData {
  sales: {
    count: number;
    total: number;
  };
  purchases: {
    count: number;
    total: number;
  };
  collections: number;
  expenses: number;
  wastageCount: number;
  lowStockCount: number;
}