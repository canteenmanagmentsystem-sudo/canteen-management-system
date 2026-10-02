
import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export const getFoodItems = async (
  req: Request,
  res: Response
) => {
  try {
    const search = String(req.query.search || "").trim();

    const items = await prisma.foodItem.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                {
                  itemCode: {
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
              ],
            }
          : {}),
      },
      include: {
        category: true,
        unit: true,
      },
      orderBy: {
        nameEn: "asc",
      },
    });

    return res.json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve food items.",
    });
  }
};

export const createFoodItem = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      itemCode,
      name,
      nameEn,
      nameHi,
      categoryId,
      unitId,
      purchaseRate,
      saleRate,
      minimumStock,
      maximumStock,
      isStockItem,
    } = req.body;

    const englishName = String(nameEn ?? name ?? "").trim();

    if (!itemCode || !englishName || !categoryId || !unitId) {
      return res.status(400).json({
        success: false,
        message:
          "Item code, English name, category and unit are required.",
      });
    }

    const item = await prisma.foodItem.create({
      data: {
        itemCode: String(itemCode).trim().toUpperCase(),

        // Legacy field
        name: englishName,

        // Bilingual fields
        nameEn: englishName,
        nameHi:
          nameHi !== undefined && nameHi !== null
            ? String(nameHi).trim()
            : null,

        categoryId: Number(categoryId),
        unitId: Number(unitId),

        purchaseRate:
          purchaseRate !== undefined
            ? purchaseRate
            : null,

        saleRate:
          saleRate !== undefined
            ? saleRate
            : 0,

        minimumStock:
          minimumStock !== undefined
            ? minimumStock
            : 0,

        maximumStock:
          maximumStock !== undefined
            ? maximumStock
            : null,

        isStockItem:
          isStockItem !== undefined
            ? Boolean(isStockItem)
            : true,
      },
      include: {
        category: true,
        unit: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Food item created successfully.",
      data: item,
    });
  } catch (error: any) {
    console.error(error);

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Food item code already exists.",
      });
    }

    if (error.code === "P2003") {
      return res.status(400).json({
        success: false,
        message: "Invalid category or unit.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create food item.",
    });
  }
};

