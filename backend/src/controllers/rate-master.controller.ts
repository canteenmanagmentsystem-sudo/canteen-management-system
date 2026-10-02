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