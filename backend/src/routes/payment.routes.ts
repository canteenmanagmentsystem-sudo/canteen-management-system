import { Router } from "express";

import {
  getPayments,
  getPaymentById,
  createPayment,
} from "../controllers/payment.controller.js";

import {
  authenticate,
  requirePermission,
} from "../middleware/auth.middleware.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("payments.view"),
  getPayments
);

router.get(
  "/:id",
  authenticate,
  requirePermission("payments.view"),
  getPaymentById
);

router.post(
  "/",
  authenticate,
  requirePermission("payments.create"),
  createPayment
);

export default router;