import { Router } from "express";

import {
  getUsers,
  createUser,
} from "../controllers/user.controller.js";

import {
  authenticate,
  requirePermission,
} from "../middleware/auth.middleware.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("users.view"),
  getUsers
);

router.post(
  "/",
  authenticate,
  requirePermission("users.create"),
  createUser
);

export default router;