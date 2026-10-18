import { Router } from "express";

import {
  getUnits,
  createUnit,
  updateUnit,
  deleteUnit,
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

router.put(
  "/:id",
  authenticate,
  requirePermission("food.edit"),
  updateUnit
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("food.delete"),
  deleteUnit
);

export default router;