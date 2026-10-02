import { Router } from "express";
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "../controllers/supplier.controller.js";
import {
  authenticate,
  requirePermission,
} from "../middleware/auth.middleware.js";

const router = Router();

// View suppliers
router.get(
  "/",
  authenticate,
  requirePermission("suppliers.view"),
  getSuppliers
);

// View single supplier
router.get(
  "/:id",
  authenticate,
  requirePermission("suppliers.view"),
  getSupplierById
);

// Create supplier
router.post(
  "/",
  authenticate,
  requirePermission("suppliers.create"),
  createSupplier
);

// Update supplier
router.put(
  "/:id",
  authenticate,
  requirePermission("suppliers.edit"),
  updateSupplier
);

// Soft delete supplier
router.delete(
  "/:id",
  authenticate,
  requirePermission("suppliers.delete"),
  deleteSupplier
);

export default router;