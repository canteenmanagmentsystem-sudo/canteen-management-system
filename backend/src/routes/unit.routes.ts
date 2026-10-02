import { Router } from "express";

import {
  getUnits,
  createUnit,
} from "../controllers/unit.controller.js";

import {
  authenticate,
  requirePermission,
} from "../middleware/auth.middleware.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("food.view"),
  getUnits
);

router.post(
  "/",
  authenticate,
  requirePermission("food.create"),
  createUnit
);

export default router;