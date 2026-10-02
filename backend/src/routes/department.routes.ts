import { Router } from "express";

import {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "../controllers/department.controller.js";

import {
  authenticate,
  requirePermission,
} from "../middleware/auth.middleware.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("departments.view"),
  getDepartments
);

router.get(
  "/:id",
  authenticate,
  requirePermission("departments.view"),
  getDepartmentById
);

router.post(
  "/",
  authenticate,
  requirePermission("departments.create"),
  createDepartment
);

router.put(
  "/:id",
  authenticate,
  requirePermission("departments.edit"),
  updateDepartment
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("departments.delete"),
  deleteDepartment
);

export default router;