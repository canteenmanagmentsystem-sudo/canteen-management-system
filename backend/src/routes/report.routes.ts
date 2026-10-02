import { Router } from "express";

import {
  getDashboard,
  getSalesReport,
  getSalesByFoodItem,
  getSalesByDepartment,
  getPurchaseReport,
  getCollectionReport,
  getOutstandingReport,
  getExpenseReport,
  getStockReport,
  getStockMovementReport,
  getWastageReport,
} from "../controllers/report.controller.js";

import {
  authenticate,
  requirePermission,
} from "../middleware/auth.middleware.js";

const router = Router();

/* =========================================================
   DASHBOARD
   ========================================================= */

router.get(
  "/dashboard",
  authenticate,
  requirePermission("reports.view"),
  getDashboard
);

/* =========================================================
   SALES
   ========================================================= */

router.get(
  "/sales",
  authenticate,
  requirePermission("reports.view"),
  getSalesReport
);

router.get(
  "/sales-by-food-item",
  authenticate,
  requirePermission("reports.view"),
  getSalesByFoodItem
);

router.get(
  "/sales-by-department",
  authenticate,
  requirePermission("reports.view"),
  getSalesByDepartment
);

/* =========================================================
   PURCHASE
   ========================================================= */

router.get(
  "/purchases",
  authenticate,
  requirePermission("reports.view"),
  getPurchaseReport
);

/* =========================================================
   COLLECTION
   ========================================================= */

router.get(
  "/collections",
  authenticate,
  requirePermission("reports.view"),
  getCollectionReport
);

/* =========================================================
   OUTSTANDING
   ========================================================= */

router.get(
  "/outstanding",
  authenticate,
  requirePermission("reports.view"),
  getOutstandingReport
);

/* =========================================================
   EXPENSE
   ========================================================= */

router.get(
  "/expenses",
  authenticate,
  requirePermission("reports.view"),
  getExpenseReport
);

/* =========================================================
   STOCK
   ========================================================= */

router.get(
  "/stock",
  authenticate,
  requirePermission("reports.view"),
  getStockReport
);

router.get(
  "/stock-movements",
  authenticate,
  requirePermission("reports.view"),
  getStockMovementReport
);

/* =========================================================
   WASTAGE
   ========================================================= */

router.get(
  "/wastage",
  authenticate,
  requirePermission("reports.view"),
  getWastageReport
);

export default router;