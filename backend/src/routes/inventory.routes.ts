import { Router } from "express";

import {
  getCurrentStock,
  getStockMovements,
  getWastage,
  createStockAdjustment,
  createWastage,
} from "../controllers/inventory.controller.js";

import {
  authenticate,
  requirePermission,
} from "../middleware/auth.middleware.js";

const router = Router();

// Current stock
router.get(
  "/stock",
  authenticate,
  requirePermission("inventory.view"),
  getCurrentStock
);

// Stock movement
router.get(
  "/movements",
  authenticate,
  requirePermission("inventory.view"),
  getStockMovements
);

// Wastage list
router.get(
  "/wastage",
  authenticate,
  requirePermission("wastage.view"),
  getWastage
);

// Stock adjustment
router.post(
  "/adjustment",
  authenticate,
  requirePermission("inventory.adjust"),
  createStockAdjustment
);

// Wastage entry
router.post(
  "/wastage",
  authenticate,
  requirePermission("wastage.create"),
  createWastage
);

export default router;