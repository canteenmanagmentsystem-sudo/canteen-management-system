import { Response } from "express";
import { prisma } from "../lib/prisma.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

const IN_TYPES = [
  "PURCHASE",
  "ADJUSTMENT_IN",
  "OPENING",
];

const OUT_TYPES = [
  "SALE",
  "WASTAGE",
  "ADJUSTMENT_OUT",
  "RETURN_TO_SUPPLIER",
];

const round3 = (value: number) =>
  Math.round((value + Number.EPSILON) * 1000) / 1000;

const parsePositiveNumber = (value: unknown): number | null => {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }

  return number;
};

/**
 * GET CURRENT STOCK
 *
 * Stock is derived from StockTransaction.
 *
 * IN:
 * PURCHASE
 * OPENING
 * ADJUSTMENT_IN
 *
 * OUT:
 * SALE
 * WASTAGE
 * ADJUSTMENT_OUT
 * RETURN_TO_SUPPLIER
 */
export const getCurrentStock = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    const lowStock =
      req.query.lowStock === "true";

    const items = await prisma.foodItem.findMany({
      where: {
        isActive: true,
        isStockItem: true,
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
              ],
            }
          : {}),
      },
      include: {
        category: true,
        unit: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    const transactions = await prisma.stockTransaction.findMany({
      where: {
        foodItemId: {
          in: items.map((item) => item.id),
        },
      },
      select: {
        foodItemId: true,
        transactionType: true,
        quantity: true,
      },
    });

    const stockMap = new Map<number, number>();

    for (const transaction of transactions) {
      const quantity = Number(transaction.quantity);

      const current =
        stockMap.get(transaction.foodItemId) ?? 0;

      if (
        IN_TYPES.includes(
          transaction.transactionType
        )
      ) {
        stockMap.set(
          transaction.foodItemId,
          current + quantity
        );
      } else if (
        OUT_TYPES.includes(
          transaction.transactionType
        )
      ) {
        stockMap.set(
          transaction.foodItemId,
          current - quantity
        );
      }
    }

    let data = items.map((item) => {
      const currentStock = round3(
        stockMap.get(item.id) ?? 0
      );

      const minimumStock = Number(
        item.minimumStock ?? 0
      );

      const maximumStock = Number(
        item.maximumStock ?? 0
      );

      return {
        id: item.id,
        itemCode: item.itemCode,

        name: item.name,
        nameEn: item.nameEn,
        nameHi: item.nameHi,

        category: item.category
          ? {
              id: item.category.id,
              name: item.category.name,
              nameEn: item.category.nameEn,
              nameHi: item.category.nameHi,
            }
          : null,

        unit: item.unit
          ? {
              id: item.unit.id,
              name: item.unit.name,
              nameEn: item.unit.nameEn,
              nameHi: item.unit.nameHi,
              shortName: item.unit.shortName,
            }
          : null,

        currentStock,
        minimumStock,
        maximumStock,

        isLowStock:
          minimumStock > 0 &&
          currentStock <= minimumStock,

        isOverStock:
          maximumStock > 0 &&
          currentStock > maximumStock,

        isNegativeStock:
          currentStock < 0,
      };
    });

    if (lowStock) {
      data = data.filter(
        (item) => item.isLowStock
      );
    }

    return res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error(
      "Get current stock error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch current stock.",
    });
  }
};

/**
 * GET STOCK MOVEMENTS
 */
export const getStockMovements = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const foodItemId =
      req.query.foodItemId !== undefined
        ? Number(req.query.foodItemId)
        : undefined;

    const transactionType =
      typeof req.query.transactionType === "string"
        ? req.query.transactionType
        : undefined;

    const fromDate =
      typeof req.query.fromDate === "string"
        ? req.query.fromDate
        : undefined;

    const toDate =
      typeof req.query.toDate === "string"
        ? req.query.toDate
        : undefined;

    const where: any = {};

    if (
      foodItemId !== undefined &&
      Number.isInteger(foodItemId)
    ) {
      where.foodItemId = foodItemId;
    }

    if (transactionType) {
      where.transactionType = transactionType;
    }

    if (fromDate || toDate) {
      where.transactionDate = {};

      if (fromDate) {
        where.transactionDate.gte =
          new Date(`${fromDate}T00:00:00`);
      }

      if (toDate) {
        where.transactionDate.lte =
          new Date(`${toDate}T23:59:59.999`);
      }
    }

    const movements =
      await prisma.stockTransaction.findMany({
        where,
        include: {
          foodItem: {
            select: {
              id: true,
              itemCode: true,
              name: true,
              nameEn: true,
              nameHi: true,
              unit: {
                select: {
                  id: true,
                  name: true,
                  nameEn: true,
                  nameHi: true,
                  shortName: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
        },
        orderBy: [
          {
            transactionDate: "desc",
          },
          {
            id: "desc",
          },
        ],
        take: 500,
      });

    const data = movements.map(
      (movement) => {
        const quantity = Number(
          movement.quantity
        );

        const direction =
          IN_TYPES.includes(
            movement.transactionType
          )
            ? "IN"
            : "OUT";

        return {
          id: movement.id,

          transactionDate:
            movement.transactionDate,

          transactionType:
            movement.transactionType,

          direction,

          foodItem: movement.foodItem,

          quantity,

          unitRate:
            movement.unitRate !== null
              ? Number(movement.unitRate)
              : null,

          referenceType:
            movement.referenceType,

          referenceId:
            movement.referenceId,

          remarks:
            movement.remarks,

          createdBy:
            movement.createdBy,
        };
      }
    );

    return res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error(
      "Get stock movements error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch stock movements.",
    });
  }
};

/**
 * GET WASTAGE LIST
 */
export const getWastage = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const foodItemId =
      req.query.foodItemId !== undefined
        ? Number(req.query.foodItemId)
        : undefined;

    const reason =
      typeof req.query.reason === "string"
        ? req.query.reason
        : undefined;

    const where: any = {};

    if (
      foodItemId !== undefined &&
      Number.isInteger(foodItemId)
    ) {
      where.foodItemId = foodItemId;
    }

    if (reason) {
      where.reason = reason;
    }

    const wastage =
      await prisma.wastage.findMany({
        where,
        include: {
          foodItem: {
            select: {
              id: true,
              itemCode: true,
              name: true,
              nameEn: true,
              nameHi: true,
              unit: {
                select: {
                  id: true,
                  name: true,
                  nameEn: true,
                  nameHi: true,
                  shortName: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
        },
        orderBy: {
          wastageDate: "desc",
        },
        take: 500,
      });

    const data = wastage.map(
      (record) => ({
        id: record.id,

        wastageDate:
          record.wastageDate,

        foodItem:
          record.foodItem,

        quantity:
          Number(record.quantity),

        reason:
          record.reason,

        remarks:
          record.remarks,

        createdBy:
          record.createdBy,

        createdAt:
          record.createdAt,
      })
    );

    return res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error(
      "Get wastage error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch wastage.",
    });
  }
};

/**
 * CREATE STOCK ADJUSTMENT
 *
 * adjustmentType:
 * IN
 * OUT
 *
 * Negative stock is blocked.
 */
export const createStockAdjustment = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const {
      foodItemId,
      adjustmentType,
      quantity,
      unitRate,
      reason,
      remarks,
      adjustmentDate,
    } = req.body;

    const parsedFoodItemId =
      Number(foodItemId);

    if (
      !Number.isInteger(
        parsedFoodItemId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid foodItemId is required.",
      });
    }

    if (
      adjustmentType !== "IN" &&
      adjustmentType !== "OUT"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "adjustmentType must be IN or OUT.",
      });
    }

    const parsedQuantity =
      parsePositiveNumber(quantity);

    if (parsedQuantity === null) {
      return res.status(400).json({
        success: false,
        message:
          "Quantity must be greater than zero.",
      });
    }

    if (
      !reason ||
      String(reason).trim().length < 2
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Adjustment reason is required.",
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          const foodItem =
            await tx.foodItem.findFirst({
              where: {
                id: parsedFoodItemId,
                isActive: true,
                isStockItem: true,
              },
            });

          if (!foodItem) {
            throw new Error(
              "FOOD_ITEM_NOT_FOUND"
            );
          }

          if (
            adjustmentType === "OUT"
          ) {
            const transactions =
              await tx.stockTransaction.findMany(
                {
                  where: {
                    foodItemId:
                      parsedFoodItemId,
                  },
                  select: {
                    transactionType: true,
                    quantity: true,
                  },
                }
              );

            let currentStock = 0;

            for (const transaction of transactions) {
              const qty = Number(
                transaction.quantity
              );

              if (
                IN_TYPES.includes(
                  transaction.transactionType
                )
              ) {
                currentStock += qty;
              } else if (
                OUT_TYPES.includes(
                  transaction.transactionType
                )
              ) {
                currentStock -= qty;
              }
            }

            currentStock =
              round3(currentStock);

            if (
              currentStock <
              parsedQuantity
            ) {
              throw new Error(
                `INSUFFICIENT_STOCK:${currentStock}`
              );
            }
          }

          const transaction =
            await tx.stockTransaction.create(
              {
                data: {
                  transactionDate:
                    adjustmentDate
                      ? new Date(
                          adjustmentDate
                        )
                      : new Date(),

                  transactionType:
                    adjustmentType === "IN"
                      ? "ADJUSTMENT_IN"
                      : "ADJUSTMENT_OUT",

                  foodItemId:
                    parsedFoodItemId,

                  quantity:
                    parsedQuantity,

                  unitRate:
                    unitRate !== undefined &&
                    unitRate !== null
                      ? Number(unitRate)
                      : null,

                  referenceType:
                    "ADJUSTMENT",

                  remarks:
                    `${String(reason).trim()}${
                      remarks
                        ? ` - ${String(
                            remarks
                          ).trim()}`
                        : ""
                    }`,

                  createdById:
                    req.user!.userId,
                },
              }
            );

          return transaction;
        }
      );

    return res.status(201).json({
      success: true,
      message:
        "Stock adjustment created successfully.",
      data: {
        id: result.id,
        transactionType:
          result.transactionType,
        foodItemId:
          result.foodItemId,
        quantity:
          Number(result.quantity),
        unitRate:
          result.unitRate !== null
            ? Number(result.unitRate)
            : null,
        referenceType:
          result.referenceType,
        remarks:
          result.remarks,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "FOOD_ITEM_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Stock-controlled food item not found.",
      });
    }

    if (
      error instanceof Error &&
      error.message.startsWith(
        "INSUFFICIENT_STOCK:"
      )
    ) {
      const currentStock =
        error.message.split(":")[1];

      return res.status(400).json({
        success: false,
        message:
          `Insufficient stock. Current stock is ${currentStock}.`,
      });
    }

    console.error(
      "Create stock adjustment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to create stock adjustment.",
    });
  }
};

/**
 * CREATE WASTAGE
 *
 * Creates:
 * 1. Wastage record
 * 2. StockTransaction WASTAGE
 *
 * Both happen atomically.
 */
export const createWastage = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const {
      foodItemId,
      quantity,
      reason,
      remarks,
      wastageDate,
    } = req.body;

    const parsedFoodItemId =
      Number(foodItemId);

    if (
      !Number.isInteger(
        parsedFoodItemId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid foodItemId is required.",
      });
    }

    const parsedQuantity =
      parsePositiveNumber(quantity);

    if (parsedQuantity === null) {
      return res.status(400).json({
        success: false,
        message:
          "Quantity must be greater than zero.",
      });
    }

    const validReasons = [
      "SPOILED",
      "DAMAGED",
      "EXPIRED",
      "OVERCOOKED",
      "LEFTOVER",
      "OTHER",
    ];

    if (
      !validReasons.includes(
        String(reason)
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid wastage reason is required.",
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          const foodItem =
            await tx.foodItem.findFirst({
              where: {
                id: parsedFoodItemId,
                isActive: true,
                isStockItem: true,
              },
            });

          if (!foodItem) {
            throw new Error(
              "FOOD_ITEM_NOT_FOUND"
            );
          }

          const transactions =
            await tx.stockTransaction.findMany(
              {
                where: {
                  foodItemId:
                    parsedFoodItemId,
                },
                select: {
                  transactionType: true,
                  quantity: true,
                },
              }
            );

          let currentStock = 0;

          for (const transaction of transactions) {
            const qty = Number(
              transaction.quantity
            );

            if (
              IN_TYPES.includes(
                transaction.transactionType
              )
            ) {
              currentStock += qty;
            } else if (
              OUT_TYPES.includes(
                transaction.transactionType
              )
            ) {
              currentStock -= qty;
            }
          }

          currentStock =
            round3(currentStock);

          if (
            currentStock <
            parsedQuantity
          ) {
            throw new Error(
              `INSUFFICIENT_STOCK:${currentStock}`
            );
          }

          const wastage =
            await tx.wastage.create({
              data: {
                wastageDate:
                  wastageDate
                    ? new Date(
                        wastageDate
                      )
                    : new Date(),

                foodItemId:
                  parsedFoodItemId,

                quantity:
                  parsedQuantity,

                reason: String(
                  reason
                ) as any,

                remarks:
                  remarks
                    ? String(
                        remarks
                      ).trim()
                    : null,

                createdById:
                  req.user!.userId,
              },
            });

          await tx.stockTransaction.create(
            {
              data: {
                transactionDate:
                  wastage.wastageDate,

                transactionType:
                  "WASTAGE",

                foodItemId:
                  parsedFoodItemId,

                quantity:
                  parsedQuantity,

                unitRate:
                  null,

                referenceType:
                  "WASTAGE",

                referenceId:
                  wastage.id,

                remarks:
                  `Wastage #${wastage.id}${
                    remarks
                      ? ` - ${String(
                          remarks
                        ).trim()}`
                      : ""
                  }`,

                createdById:
                  req.user!.userId,
              },
            }
          );

          return wastage;
        }
      );

    return res.status(201).json({
      success: true,
      message:
        "Wastage recorded successfully and stock has been reduced.",
      data: {
        id: result.id,
        wastageDate:
          result.wastageDate,
        foodItemId:
          result.foodItemId,
        quantity:
          Number(result.quantity),
        reason:
          result.reason,
        remarks:
          result.remarks,
        createdById:
          result.createdById,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "FOOD_ITEM_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Stock-controlled food item not found.",
      });
    }

    if (
      error instanceof Error &&
      error.message.startsWith(
        "INSUFFICIENT_STOCK:"
      )
    ) {
      const currentStock =
        error.message.split(":")[1];

      return res.status(400).json({
        success: false,
        message:
          `Insufficient stock. Current stock is ${currentStock}.`,
      });
    }

    console.error(
      "Create wastage error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to record wastage.",
    });
  }
};