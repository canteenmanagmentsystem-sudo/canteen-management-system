import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export const getRateMasters = async (
  _req: Request,
  res: Response
) => {
  try {
    const rates = await prisma.rateMaster.findMany({
      where: {
        isActive: true,
      },
      include: {
        foodItem: true,
      },
      orderBy: {
        effectiveFrom: "desc",
      },
    });

    return res.json({
      success: true,
      data: rates,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch rate masters.",
    });
  }
};


export const createRateMaster = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      foodItemId,
      rate,
      effectiveFrom,
      effectiveTo,
    } = req.body;

    if (!foodItemId || rate === undefined || !effectiveFrom) {
      return res.status(400).json({
        success: false,
        message: "foodItemId, rate and effectiveFrom are required.",
      });
    }

    const foodItem = await prisma.foodItem.findUnique({
      where: {
        id: Number(foodItemId),
      },
    });

    if (!foodItem || !foodItem.isActive) {
      return res.status(400).json({
        success: false,
        message: "Food item does not exist or is inactive.",
      });
    }

    const newRate = await prisma.rateMaster.create({
      data: {
        foodItemId: Number(foodItemId),
        rate: Number(rate),
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo
          ? new Date(effectiveTo)
          : null,
      },
      include: {
        foodItem: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Rate created successfully.",
      data: newRate,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to create rate.",
    });
  }
};

export const updateRateMaster = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid rate ID.",
      });
    }

    const existing = await prisma.rateMaster.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Rate not found.",
      });
    }

    const { foodItemId, rate, effectiveFrom, effectiveTo } = req.body;
    const finalFoodItemId = foodItemId === undefined
      ? existing.foodItemId
      : Number(foodItemId);
    const finalRate = rate === undefined ? Number(existing.rate) : Number(rate);
    const finalEffectiveFrom = effectiveFrom === undefined
      ? existing.effectiveFrom
      : new Date(effectiveFrom);
    const finalEffectiveTo = effectiveTo === undefined
      ? existing.effectiveTo
      : effectiveTo
        ? new Date(effectiveTo)
        : null;

    if (!Number.isFinite(finalRate) || Number.isNaN(finalEffectiveFrom.getTime()) ||
      (finalEffectiveTo && Number.isNaN(finalEffectiveTo.getTime()))) {
      return res.status(400).json({
        success: false,
        message: "Valid rate and effective dates are required.",
      });
    }

    const foodItem = await prisma.foodItem.findUnique({
      where: { id: finalFoodItemId },
    });
    if (!foodItem || !foodItem.isActive) {
      return res.status(400).json({
        success: false,
        message: "Food item does not exist or is inactive.",
      });
    }

    const updatedRate = await prisma.rateMaster.update({
      where: { id },
      data: {
        foodItemId: finalFoodItemId,
        rate: finalRate,
        effectiveFrom: finalEffectiveFrom,
        effectiveTo: finalEffectiveTo,
      },
      include: { foodItem: true },
    });

    return res.json({
      success: true,
      message: "Rate updated successfully.",
      data: updatedRate,
    });
  } catch (error: any) {
    console.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Rate or food item not found.",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to update rate.",
    });
  }
};

export const deleteRateMaster = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid rate ID." });
    }

    const rate = await prisma.rateMaster.update({
      where: { id },
      data: { isActive: false },
    });

    return res.json({ success: true, message: "Rate deactivated successfully.", data: rate });
  } catch (error: any) {
    console.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ success: false, message: "Rate not found." });
    }
    return res.status(500).json({ success: false, message: "Unable to deactivate rate." });
  }
};