import { Response } from "express";
import { prisma } from "../lib/prisma.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

const getLocalizedText = (
  valueEn?: unknown,
  valueHi?: unknown
) => {
  const en = valueEn !== undefined && valueEn !== null
    ? String(valueEn).trim()
    : "";

  const hi = valueHi !== undefined && valueHi !== null
    ? String(valueHi).trim()
    : "";

  return {
    en,
    hi,
  };
};

// GET /api/suppliers
export const getSuppliers = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    const includeInactive =
      String(req.query.includeInactive).toLowerCase() === "true";

    const where: any = {};

    if (!includeInactive) {
      where.isActive = true;
    }

    if (search) {
      where.OR = [
        {
          supplierCode: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          nameEn: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          nameHi: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          mobile: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          gstNo: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: {
        nameEn: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      count: suppliers.length,
      data: suppliers,
    });
  } catch (error) {
    console.error("Get suppliers error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch suppliers.",
    });
  }
};

// GET /api/suppliers/:id
export const getSupplierById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID.",
      });
    }

    const supplier = await prisma.supplier.findUnique({
      where: {
        id,
      },
      include: {
        purchases: {
          orderBy: {
            purchaseDate: "desc",
          },
          take: 20,
        },
      },
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    console.error("Get supplier error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch supplier.",
    });
  }
};

// POST /api/suppliers
export const createSupplier = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const {
      supplierCode,
      name,
      nameEn,
      nameHi,
      address,
      addressEn,
      addressHi,
      mobile,
      email,
      gstNo,
      isActive,
    } = req.body;

    const code = String(supplierCode ?? "").trim();

    const localizedName = getLocalizedText(
      nameEn ?? name,
      nameHi
    );

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Supplier code is required.",
      });
    }

    if (!localizedName.en) {
      return res.status(400).json({
        success: false,
        message: "English supplier name is required.",
      });
    }

    const existingCode = await prisma.supplier.findUnique({
      where: {
        supplierCode: code,
      },
    });

    if (existingCode) {
      return res.status(409).json({
        success: false,
        message: "Supplier code already exists.",
      });
    }

    const existingName = await prisma.supplier.findFirst({
      where: {
        nameEn: {
          equals: localizedName.en,
          mode: "insensitive",
        },
      },
    });

    if (existingName) {
      return res.status(409).json({
        success: false,
        message: "Supplier name already exists.",
      });
    }

    const supplier = await prisma.supplier.create({
      data: {
        supplierCode: code,

        // Legacy English field retained temporarily
        name: localizedName.en,

        // Bilingual fields
        nameEn: localizedName.en,
        nameHi: localizedName.hi || null,

        address:
          address !== undefined && address !== null
            ? String(address).trim() || null
            : null,

        addressEn:
          addressEn !== undefined && addressEn !== null
            ? String(addressEn).trim() || null
            : null,

        addressHi:
          addressHi !== undefined && addressHi !== null
            ? String(addressHi).trim() || null
            : null,

        mobile:
          mobile !== undefined && mobile !== null
            ? String(mobile).trim() || null
            : null,

        email:
          email !== undefined && email !== null
            ? String(email).trim() || null
            : null,

        gstNo:
          gstNo !== undefined && gstNo !== null
            ? String(gstNo).trim() || null
            : null,

        isActive:
          isActive === undefined
            ? true
            : Boolean(isActive),
      },
    });

    return res.status(201).json({
      success: true,
      message: "Supplier created successfully.",
      data: supplier,
    });
  } catch (error) {
    console.error("Create supplier error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create supplier.",
    });
  }
};

// PUT /api/suppliers/:id
export const updateSupplier = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID.",
      });
    }

    const existingSupplier = await prisma.supplier.findUnique({
      where: {
        id,
      },
    });

    if (!existingSupplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
    }

    const {
      supplierCode,
      name,
      nameEn,
      nameHi,
      address,
      addressEn,
      addressHi,
      mobile,
      email,
      gstNo,
      isActive,
    } = req.body;

    const finalCode =
      supplierCode !== undefined
        ? String(supplierCode).trim()
        : existingSupplier.supplierCode;

    const finalNameEn =
      nameEn !== undefined || name !== undefined
        ? String(nameEn ?? name).trim()
        : existingSupplier.nameEn;

    const finalNameHi =
      nameHi !== undefined
        ? String(nameHi).trim()
        : existingSupplier.nameHi;

    if (!finalCode) {
      return res.status(400).json({
        success: false,
        message: "Supplier code is required.",
      });
    }

    if (!finalNameEn) {
      return res.status(400).json({
        success: false,
        message: "English supplier name is required.",
      });
    }

    const duplicateCode = await prisma.supplier.findFirst({
      where: {
        supplierCode: finalCode,
        NOT: {
          id,
        },
      },
    });

    if (duplicateCode) {
      return res.status(409).json({
        success: false,
        message: "Supplier code already exists.",
      });
    }

    const duplicateName = await prisma.supplier.findFirst({
      where: {
        nameEn: {
          equals: finalNameEn,
          mode: "insensitive",
        },
        NOT: {
          id,
        },
      },
    });

    if (duplicateName) {
      return res.status(409).json({
        success: false,
        message: "Supplier name already exists.",
      });
    }

    const supplier = await prisma.supplier.update({
      where: {
        id,
      },
      data: {
        supplierCode: finalCode,

        // Legacy English field
        name: finalNameEn,

        // Bilingual fields
        nameEn: finalNameEn,
        nameHi:
          finalNameHi || null,

        address:
          address !== undefined
            ? String(address).trim() || null
            : existingSupplier.address,

        addressEn:
          addressEn !== undefined
            ? String(addressEn).trim() || null
            : existingSupplier.addressEn,

        addressHi:
          addressHi !== undefined
            ? String(addressHi).trim() || null
            : existingSupplier.addressHi,

        mobile:
          mobile !== undefined
            ? String(mobile).trim() || null
            : existingSupplier.mobile,

        email:
          email !== undefined
            ? String(email).trim() || null
            : existingSupplier.email,

        gstNo:
          gstNo !== undefined
            ? String(gstNo).trim() || null
            : existingSupplier.gstNo,

        isActive:
          isActive !== undefined
            ? Boolean(isActive)
            : existingSupplier.isActive,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Supplier updated successfully.",
      data: supplier,
    });
  } catch (error) {
    console.error("Update supplier error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update supplier.",
    });
  }
};

// DELETE /api/suppliers/:id
// Soft delete
export const deleteSupplier = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID.",
      });
    }

    const supplier = await prisma.supplier.findUnique({
      where: {
        id,
      },
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
    }

    const updatedSupplier = await prisma.supplier.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Supplier deactivated successfully.",
      data: updatedSupplier,
    });
  } catch (error) {
    console.error("Delete supplier error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to deactivate supplier.",
    });
  }
};