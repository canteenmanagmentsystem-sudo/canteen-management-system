import { Router } from "express";

import {
  getParties,
  getPartyById,
  createParty,
  updateParty,
  deleteParty,
} from "../controllers/party.controller.js";

import {
  authenticate,
  requirePermission,
} from "../middleware/auth.middleware.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("parties.view"),
  getParties
);

router.get(
  "/:id",
  authenticate,
  requirePermission("parties.view"),
  getPartyById
);

router.post(
  "/",
  authenticate,
  requirePermission("parties.create"),
  createParty
);

router.put(
  "/:id",
  authenticate,
  requirePermission("parties.edit"),
  updateParty
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("parties.delete"),
  deleteParty
);

export default router;