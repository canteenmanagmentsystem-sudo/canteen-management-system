import { Router } from "express";

import {
  getFoodCategories,
  createFoodCategory,
  updateFoodCategory,
  deleteFoodCategory,
} from "../controllers/food-category.controller.js";

import {
  authenticate,
  requirePermission,
} from "../middleware/auth.middleware.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("food.view"),
  getFoodCategories
);

router.post(
  "/",
  authenticate,
  requirePermission("food.create"),
  createFoodCategory
);

router.put(
  "/:id",
  authenticate,
  requirePermission("food.edit"),
  updateFoodCategory
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("food.delete"),
  deleteFoodCategory
);

export default router;