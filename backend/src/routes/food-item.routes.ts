import { Router } from "express";

import {
  getFoodItems,
  createFoodItem,
  updateFoodItem,
  deleteFoodItem,
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

router.put(
  "/:id",
  authenticate,
  requirePermission("food.edit"),
  updateFoodItem
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("food.delete"),
  deleteFoodItem
);

export default router;