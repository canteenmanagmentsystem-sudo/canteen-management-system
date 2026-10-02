import { Router } from "express";

import {
  getPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchase,
  receivePurchase,
  cancelPurchase,
} from "../controllers/purchase.controller.js";

import {
  authenticate,
  requirePermission,
} from "../middleware/auth.middleware.js";

const router = Router();

// --------------------------------------------------
// View purchases
// --------------------------------------------------

router.get(
  "/",
  authenticate,
  requirePermission("purchases.view"),
  getPurchases
);

// --------------------------------------------------
// View single purchase
// --------------------------------------------------

router.get(
  "/:id",
  authenticate,
  requirePermission("purchases.view"),
  getPurchaseById
);

// --------------------------------------------------
// Create purchase
// --------------------------------------------------

router.post(
  "/",
  authenticate,
  requirePermission("purchases.create"),
  createPurchase
);

// --------------------------------------------------
// Update purchase
// --------------------------------------------------

router.put(
  "/:id",
  authenticate,
  requirePermission("purchases.edit"),
  updatePurchase
);

// --------------------------------------------------
// Receive purchase + Stock IN
// --------------------------------------------------

router.post(
  "/:id/receive",
  authenticate,
  requirePermission("purchases.receive"),
  receivePurchase
);

// --------------------------------------------------
// Cancel purchase
// --------------------------------------------------

router.post(
  "/:id/cancel",
  authenticate,
  requirePermission("purchases.cancel"),
  cancelPurchase
);

export default router;