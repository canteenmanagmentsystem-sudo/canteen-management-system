
import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { generateCode } from "../lib/generated-code.js";

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

    if (!englishName || !categoryId || !unitId) {
      return res.status(400).json({
        success: false,
        message:
          "English name, category and unit are required.",
      });
    }

    const item = await prisma.foodItem.create({
      data: {
        itemCode: generateCode("ITEM"),

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

export const updateFoodItem = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid food item ID.",
      });
    }

    const existingItem = await prisma.foodItem.findUnique({ where: { id } });
    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: "Food item not found.",
      });
    }

    const {
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
    const englishName = String(nameEn ?? name ?? existingItem.nameEn).trim();

    if (!englishName) {
      return res.status(400).json({
        success: false,
        message: "English name is required.",
      });
    }

    const item = await prisma.foodItem.update({
      where: { id },
      data: {
        name: englishName,
        nameEn: englishName,
        ...(nameHi !== undefined
          ? { nameHi: nameHi === null ? null : String(nameHi).trim() }
          : {}),
        ...(categoryId !== undefined ? { categoryId: Number(categoryId) } : {}),
        ...(unitId !== undefined ? { unitId: Number(unitId) } : {}),
        ...(purchaseRate !== undefined
          ? { purchaseRate: purchaseRate === "" || purchaseRate === null ? null : Number(purchaseRate) }
          : {}),
        ...(saleRate !== undefined ? { saleRate: Number(saleRate) } : {}),
        ...(minimumStock !== undefined ? { minimumStock: Number(minimumStock) } : {}),
        ...(maximumStock !== undefined
          ? { maximumStock: maximumStock === "" || maximumStock === null ? null : Number(maximumStock) }
          : {}),
        ...(isStockItem !== undefined ? { isStockItem: Boolean(isStockItem) } : {}),
      },
      include: {
        category: true,
        unit: true,
      },
    });

    return res.json({
      success: true,
      message: "Food item updated successfully.",
      data: item,
    });
  } catch (error: any) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Food item name already exists.",
      });
    }
    if (error.code === "P2003") {
      return res.status(400).json({
        success: false,
        message: "Invalid category or unit.",
      });
    }
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Food item, category or unit not found.",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Unable to update food item.",
    });
  }
};

export const deleteFoodItem = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid food item ID." });
    }

    const item = await prisma.foodItem.update({
      where: { id },
      data: { isActive: false },
    });

    return res.json({ success: true, message: "Food item deactivated successfully.", data: item });
  } catch (error: any) {
    console.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ success: false, message: "Food item not found." });
    }
    return res.status(500).json({ success: false, message: "Unable to deactivate food item." });
  }
};
