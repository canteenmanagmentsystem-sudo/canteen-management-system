import { Router } from "express";

import {
  getLedger,
  getPartyLedger,
  getPartyMonthlyLedger,
  getOutstanding,
  getPartyOutstanding,
} from "../controllers/ledger.controller.js";

import {
  authenticate,
  requirePermission,
} from "../middleware/auth.middleware.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("ledger.view"),
  getLedger
);

router.get(
  "/party/:partyId",
  authenticate,
  requirePermission("ledger.view"),
  getPartyLedger
);

router.get(
  "/monthly",
  authenticate,
  requirePermission("ledger.view"),
  getPartyMonthlyLedger
);

router.get(
  "/outstanding",
  authenticate,
  requirePermission("ledger.view"),
  getOutstanding
);

router.get(
  "/outstanding/:partyId",
  authenticate,
  requirePermission("ledger.view"),
  getPartyOutstanding
);

export default router;