import { Router } from "express";

import {
  getFoodCategories,
  createFoodCategory,
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

export default router;