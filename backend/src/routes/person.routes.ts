import { Router } from "express";

import {
  getPersons,
  createPerson,
  updatePerson,
} from "../controllers/person.controller.js";

import {
  authenticate,
  requirePermission,
} from "../middleware/auth.middleware.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("persons.view"),
  getPersons
);

router.post(
  "/",
  authenticate,
  requirePermission("persons.create"),
  createPerson
);

router.put(
  "/:id",
  authenticate,
  requirePermission("persons.edit"),
  updatePerson
);

export default router;