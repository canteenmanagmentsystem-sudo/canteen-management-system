import { Router } from "express";

import {
  getFoodItems,
  createFoodItem,
} from "../controllers/food-item.controller.js";

import {
  authenticate,
  requirePermission,
} from "../middleware/auth.middleware.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("food.view"),
  getFoodItems
);

router.post(
  "/",
  authenticate,
  requirePermission("food.create"),
  createFoodItem
);

export default router;