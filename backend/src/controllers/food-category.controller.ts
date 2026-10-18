import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export const getFoodCategories = async (
  _req: Request,
  res: Response
) => {
  try {
    const categories = await prisma.foodCategory.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        nameEn: "asc",
      },
    });

    return res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve food categories.",
    });
  }
};

export const createFoodCategory = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      name,
      nameEn,
      nameHi,
      description,
      descriptionEn,
      descriptionHi,
    } = req.body;

    const englishName = String(
      nameEn ?? name ?? ""
    ).trim();

    if (!englishName) {
      return res.status(400).json({
        success: false,
        message: "English category name is required.",
      });
    }

    const category = await prisma.foodCategory.create({
      data: {
        // Legacy field
        name: englishName,

        // Bilingual fields
        nameEn: englishName,

        nameHi:
          nameHi !== undefined && nameHi !== null
            ? String(nameHi).trim()
            : null,

        description:
          description !== undefined &&
          description !== null
            ? String(description).trim()
            : null,

        descriptionEn:
          descriptionEn !== undefined &&
          descriptionEn !== null
            ? String(descriptionEn).trim()
            : description
              ? String(description).trim()
              : null,

        descriptionHi:
          descriptionHi !== undefined &&
          descriptionHi !== null
            ? String(descriptionHi).trim()
            : null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Food category created successfully.",
      data: category,
    });
  } catch (error: any) {
    console.error(error);

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Food category already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create food category.",
    });
  }
};

export const updateFoodCategory = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid food category ID.",
      });
    }

    const existing = await prisma.foodCategory.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Food category not found.",
      });
    }

    const { name, nameEn, nameHi, description, descriptionEn, descriptionHi } = req.body;
    const englishName = String(nameEn ?? name ?? existing.nameEn).trim();
    if (!englishName) {
      return res.status(400).json({
        success: false,
        message: "English category name is required.",
      });
    }

    const category = await prisma.foodCategory.update({
      where: { id },
      data: {
        name: englishName,
        nameEn: englishName,
        ...(nameHi !== undefined
          ? { nameHi: nameHi === null ? null : String(nameHi).trim() }
          : {}),
        ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
        ...(descriptionEn !== undefined
          ? { descriptionEn: descriptionEn ? String(descriptionEn).trim() : null }
          : {}),
        ...(descriptionHi !== undefined
          ? { descriptionHi: descriptionHi ? String(descriptionHi).trim() : null }
          : {}),
      },
    });

    return res.json({
      success: true,
      message: "Food category updated successfully.",
      data: category,
    });
  } catch (error: any) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Food category already exists.",
      });
    }
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Food category not found.",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Unable to update food category.",
    });
  }
};

export const deleteFoodCategory = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid food category ID." });
    }

    const category = await prisma.foodCategory.update({
      where: { id },
      data: { isActive: false },
    });

    return res.json({ success: true, message: "Food category deactivated successfully.", data: category });
  } catch (error: any) {
    console.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ success: false, message: "Food category not found." });
    }
    return res.status(500).json({ success: false, message: "Unable to deactivate food category." });
  }
};