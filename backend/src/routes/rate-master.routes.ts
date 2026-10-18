import { Router } from "express";
import {
  getRateMasters,
  createRateMaster,
  updateRateMaster,
  deleteRateMaster,
} from "../controllers/rate-master.controller.js";
import { authenticate, requirePermission } from "../middleware/auth.middleware.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("rates.view"),
  getRateMasters
);

router.post(
  "/",
  authenticate,
  requirePermission("rates.create"),
  createRateMaster
);

router.put(
  "/:id",
  authenticate,
  requirePermission("rates.edit"),
  updateRateMaster
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("rates.edit"),
  deleteRateMaster
);

export default router;