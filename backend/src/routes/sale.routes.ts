import { Router } from "express";

import {
  createSale,
} from "../controllers/sale.controller.js";

import { authenticate, requirePermission } from "../middleware/auth.middleware.js";

const router = Router();

router.post(
  "/",
  authenticate,
  requirePermission("sales.create"),
  createSale
);

export default router;  