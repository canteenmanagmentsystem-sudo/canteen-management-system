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