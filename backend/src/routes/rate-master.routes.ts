import { Router } from "express";
import {
  getRateMasters,
  createRateMaster,
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

export default router;