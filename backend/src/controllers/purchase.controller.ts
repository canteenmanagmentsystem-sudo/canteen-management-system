import { Response } from "express";
import { prisma } from "../lib/prisma.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

type PurchaseItemInput = {
  foodItemId: number;
  quantity: number;
  rate: number;
};

const round2 = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const round3 = (value: number) =>
  Math.round((value + Number.EPSILON) * 1000) / 1000;

const generatePurchaseNo = () => {
  const now = new Date();

  const datePart =
    `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

  const timePart =
    `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;

  const randomPart = Math.floor(100 + Math.random() * 900);

  return `PUR-${datePart}-${timePart}-${randomPart}`;
};

const parseDate = (value: unknown, fallback: Date) => {
  if (!value) {
    return fallback;
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid purchase date.");
  }

  return date;
};

const validateItems = (items: unknown): PurchaseItemInput[] => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("At least one purchase item is required.");
  }

  const normalized = items.map((item: any, index) => {
    const foodItemId = Number(item?.foodItemId);
    const quantity = Number(item?.quantity);
    const rate = Number(item?.rate);

    if (!Number.isInteger(foodItemId) || foodItemId <= 0) {
      throw new Error(
        `Invalid food item ID at item ${index + 1}.`
      );
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(
        `Quantity must be greater than zero at item ${index + 1}.`
      );
    }

    if (!Number.isFinite(rate) || rate < 0) {
      throw new Error(
        `Rate cannot be negative at item ${index + 1}.`
      );
    }

    return {
      foodItemId,
      quantity: round3(quantity),
      rate: round2(rate),
    };
  });

  // Merge duplicate food items
  const merged = new Map<number, PurchaseItemInput>();

  for (const item of normalized) {
    const existing = merged.get(item.foodItemId);

    if (existing) {
      existing.quantity = round3(
        existing.quantity + item.quantity
      );

      // Keep the latest supplied rate
      existing.rate = item.rate;
    } else {
      merged.set(item.foodItemId, { ...item });
    }
  }

  return Array.from(merged.values());
};

// --------------------------------------------------
// GET /api/purchases
// --------------------------------------------------

export const getPurchases = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    const status =
      typeof req.query.status === "string"
        ? req.query.status.trim()
        : "";

    const supplierId =
      req.query.supplierId !== undefined
        ? Number(req.query.supplierId)
        : undefined;

    const where: any = {};

    if (status) {
      const allowedStatuses = [
        "DRAFT",
        "RECEIVED",
        "PARTIAL",
        "CANCELLED",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase status.",
        });
      }

      where.status = status;
    }

    if (
      supplierId !== undefined &&
      (!Number.isInteger(supplierId) || supplierId <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID.",
      });
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (search) {
      where.OR = [
        {
          purchaseNo: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          invoiceNo: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          supplier: {
            supplierCode: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          supplier: {
            nameEn: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          supplier: {
            nameHi: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    const purchases = await prisma.purchase.findMany({
      where,
      include: {
        supplier: {
          select: {
            id: true,
            supplierCode: true,
            name: true,
            nameEn: true,
            nameHi: true,
          },
        },
        items: {
          include: {
            foodItem: {
              select: {
                id: true,
                itemCode: true,
                name: true,
                nameEn: true,
                nameHi: true,
              },
            },
          },
        },
      },
      orderBy: {
        purchaseDate: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      count: purchases.length,
      data: purchases,
    });
  } catch (error) {
    console.error("Get purchases error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch purchases.",
    });
  }
};

// --------------------------------------------------
// GET /api/purchases/:id
// --------------------------------------------------

export const getPurchaseById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase ID.",
      });
    }

    const purchase = await prisma.purchase.findUnique({
      where: {
        id,
      },
      include: {
        supplier: {
          select: {
            id: true,
            supplierCode: true,
            name: true,
            nameEn: true,
            nameHi: true,
            address: true,
            addressEn: true,
            addressHi: true,
            mobile: true,
            email: true,
            gstNo: true,
          },
        },
        items: {
          include: {
            foodItem: {
              select: {
                id: true,
                itemCode: true,
                name: true,
                nameEn: true,
                nameHi: true,
                purchaseRate: true,
                saleRate: true,
                minimumStock: true,
                maximumStock: true,
                isStockItem: true,
              },
            },
          },
        },
      },
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: purchase,
    });
  } catch (error) {
    console.error("Get purchase error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch purchase.",
    });
  }
};

// --------------------------------------------------
// POST /api/purchases
// --------------------------------------------------

export const createPurchase = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const {
      supplierId,
      purchaseDate,
      invoiceNo,
      discount,
      tax,
      remarks,
      items,
      status,
    } = req.body;

    const parsedSupplierId = Number(supplierId);

    if (
      !Number.isInteger(parsedSupplierId) ||
      parsedSupplierId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid supplier ID is required.",
      });
    }

    const supplier = await prisma.supplier.findUnique({
      where: {
        id: parsedSupplierId,
      },
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
    }

    if (!supplier.isActive) {
      return res.status(400).json({
        success: false,
        message: "Selected supplier is inactive.",
      });
    }

    const purchaseItems = validateItems(items);

    const purchaseStatus =
      status === undefined ? "DRAFT" : String(status);

    // At this stage we allow only DRAFT.
    // RECEIVED must go through the receive endpoint so
    // stock movement cannot be accidentally skipped.
    if (purchaseStatus !== "DRAFT") {
      return res.status(400).json({
        success: false,
        message:
          "New purchases must be created as DRAFT. Use the receive API to receive the purchase.",
      });
    }

    const foodItemIds = purchaseItems.map(
      (item) => item.foodItemId
    );

    const foodItems = await prisma.foodItem.findMany({
      where: {
        id: {
          in: foodItemIds,
        },
        isActive: true,
      },
      select: {
        id: true,
        itemCode: true,
        name: true,
        nameEn: true,
        nameHi: true,
        purchaseRate: true,
        isStockItem: true,
      },
    });

    if (foodItems.length !== foodItemIds.length) {
      const foundIds = new Set(
        foodItems.map((item) => item.id)
      );

      const missingIds = foodItemIds.filter(
        (id) => !foundIds.has(id)
      );

      return res.status(400).json({
        success: false,
        message: "One or more food items are invalid or inactive.",
        invalidFoodItemIds: missingIds,
      });
    }

    const nonStockItems = foodItems.filter(
      (item) => !item.isStockItem
    );

    if (nonStockItems.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Only stock items can be entered in a purchase.",
        items: nonStockItems.map((item) => ({
          id: item.id,
          itemCode: item.itemCode,
          nameEn: item.nameEn,
          nameHi: item.nameHi,
        })),
      });
    }

    const parsedDiscount =
      discount === undefined ? 0 : Number(discount);

    const parsedTax =
      tax === undefined ? 0 : Number(tax);

    if (
      !Number.isFinite(parsedDiscount) ||
      parsedDiscount < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Discount cannot be negative.",
      });
    }

    if (!Number.isFinite(parsedTax) || parsedTax < 0) {
      return res.status(400).json({
        success: false,
        message: "Tax cannot be negative.",
      });
    }

    const subtotal = round2(
      purchaseItems.reduce(
        (sum, item) =>
          sum + item.quantity * item.rate,
        0
      )
    );

    const finalDiscount = round2(parsedDiscount);

    if (finalDiscount > subtotal) {
      return res.status(400).json({
        success: false,
        message: "Discount cannot be greater than subtotal.",
      });
    }

    const taxableAmount = round2(
      subtotal - finalDiscount
    );

    const finalTax = round2(parsedTax);

    const total = round2(
      taxableAmount + finalTax
    );

    const finalPurchaseDate = parseDate(
      purchaseDate,
      new Date()
    );

    const generatedPurchaseNo =
      generatePurchaseNo();

    const purchase = await prisma.$transaction(
      async (tx) => {
        const createdPurchase =
          await tx.purchase.create({
            data: {
              purchaseNo: generatedPurchaseNo,
              purchaseDate: finalPurchaseDate,
              status: "DRAFT",
              supplierId: parsedSupplierId,

              subtotal,
              discount: finalDiscount,
              tax: finalTax,
              total,

              invoiceNo:
                invoiceNo !== undefined &&
                invoiceNo !== null
                  ? String(invoiceNo).trim() || null
                  : null,

              remarks:
                remarks !== undefined &&
                remarks !== null
                  ? String(remarks).trim() || null
                  : null,

              createdById: Number(
                req.user!.userId
              ),

              items: {
                create: purchaseItems.map(
                  (item) => ({
                    foodItemId: item.foodItemId,
                    quantity: item.quantity,
                    rate: item.rate,
                    amount: round2(
                      item.quantity * item.rate
                    ),
                  })
                ),
              },
            },
            include: {
              supplier: {
                select: {
                  id: true,
                  supplierCode: true,
                  name: true,
                  nameEn: true,
                  nameHi: true,
                },
              },
              items: {
                include: {
                  foodItem: {
                    select: {
                      id: true,
                      itemCode: true,
                      name: true,
                      nameEn: true,
                      nameHi: true,
                    },
                  },
                },
              },
            },
          });

        return createdPurchase;
      }
    );

    return res.status(201).json({
      success: true,
      message: "Purchase created successfully as DRAFT.",
      data: purchase,
    });
  } catch (error: any) {
    console.error("Create purchase error:", error);

    return res.status(500).json({
      success: false,
      message:
        error?.message || "Unable to create purchase.",
    });
  }
};

// --------------------------------------------------
// PUT /api/purchases/:id
// --------------------------------------------------

export const updatePurchase = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase ID.",
      });
    }

    const existingPurchase =
      await prisma.purchase.findUnique({
        where: {
          id,
        },
        include: {
          items: true,
        },
      });

    if (!existingPurchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found.",
      });
    }

    if (existingPurchase.status !== "DRAFT") {
      return res.status(400).json({
        success: false,
        message:
          "Only DRAFT purchases can be edited.",
      });
    }

    const {
      supplierId,
      purchaseDate,
      invoiceNo,
      discount,
      tax,
      remarks,
      items,
    } = req.body;

    const finalSupplierId =
      supplierId !== undefined
        ? Number(supplierId)
        : existingPurchase.supplierId;

    if (
      !Number.isInteger(finalSupplierId) ||
      finalSupplierId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid supplier ID is required.",
      });
    }

    const supplier = await prisma.supplier.findUnique({
      where: {
        id: finalSupplierId,
      },
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
    }

    if (!supplier.isActive) {
      return res.status(400).json({
        success: false,
        message: "Selected supplier is inactive.",
      });
    }

    const purchaseItems = validateItems(
      items ?? existingPurchase.items
    );

    const foodItemIds = purchaseItems.map(
      (item) => item.foodItemId
    );

    const foodItems = await prisma.foodItem.findMany({
      where: {
        id: {
          in: foodItemIds,
        },
        isActive: true,
      },
      select: {
        id: true,
        itemCode: true,
        nameEn: true,
        nameHi: true,
        isStockItem: true,
      },
    });

    if (foodItems.length !== foodItemIds.length) {
      return res.status(400).json({
        success: false,
        message:
          "One or more food items are invalid or inactive.",
      });
    }

    const nonStockItems = foodItems.filter(
      (item) => !item.isStockItem
    );

    if (nonStockItems.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Only stock items can be entered in a purchase.",
      });
    }

    const parsedDiscount =
      discount === undefined
        ? Number(existingPurchase.discount)
        : Number(discount);

    const parsedTax =
      tax === undefined
        ? Number(existingPurchase.tax)
        : Number(tax);

    if (
      !Number.isFinite(parsedDiscount) ||
      parsedDiscount < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Discount cannot be negative.",
      });
    }

    if (!Number.isFinite(parsedTax) || parsedTax < 0) {
      return res.status(400).json({
        success: false,
        message: "Tax cannot be negative.",
      });
    }

    const subtotal = round2(
      purchaseItems.reduce(
        (sum, item) =>
          sum + item.quantity * item.rate,
        0
      )
    );

    const finalDiscount = round2(parsedDiscount);

    if (finalDiscount > subtotal) {
      return res.status(400).json({
        success: false,
        message: "Discount cannot be greater than subtotal.",
      });
    }

    const finalTax = round2(parsedTax);

    const total = round2(
      subtotal - finalDiscount + finalTax
    );

    const finalPurchaseDate =
      purchaseDate !== undefined
        ? parseDate(
            purchaseDate,
            existingPurchase.purchaseDate
          )
        : existingPurchase.purchaseDate;

    const purchase = await prisma.$transaction(
      async (tx) => {
        await tx.purchaseItem.deleteMany({
          where: {
            purchaseId: id,
          },
        });

        return tx.purchase.update({
          where: {
            id,
          },
          data: {
            supplierId: finalSupplierId,
            purchaseDate: finalPurchaseDate,

            subtotal,
            discount: finalDiscount,
            tax: finalTax,
            total,

            invoiceNo:
              invoiceNo !== undefined
                ? String(invoiceNo).trim() || null
                : existingPurchase.invoiceNo,

            remarks:
              remarks !== undefined
                ? String(remarks).trim() || null
                : existingPurchase.remarks,

            items: {
              create: purchaseItems.map(
                (item) => ({
                  foodItemId: item.foodItemId,
                  quantity: item.quantity,
                  rate: item.rate,
                  amount: round2(
                    item.quantity * item.rate
                  ),
                })
              ),
            },
          },
          include: {
            supplier: {
              select: {
                id: true,
                supplierCode: true,
                name: true,
                nameEn: true,
                nameHi: true,
              },
            },
            items: {
              include: {
                foodItem: {
                  select: {
                    id: true,
                    itemCode: true,
                    name: true,
                    nameEn: true,
                    nameHi: true,
                  },
                },
              },
            },
          },
        });
      }
    );

    return res.status(200).json({
      success: true,
      message: "Purchase updated successfully.",
      data: purchase,
    });
  } catch (error: any) {
    console.error("Update purchase error:", error);

    return res.status(500).json({
      success: false,
      message:
        error?.message || "Unable to update purchase.",
    });
  }
};

// --------------------------------------------------
// POST /api/purchases/:id/receive
// --------------------------------------------------

export const receivePurchase = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase ID.",
      });
    }

    const existingPurchase =
      await prisma.purchase.findUnique({
        where: {
          id,
        },
        include: {
          items: true,
        },
      });

    if (!existingPurchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found.",
      });
    }

    if (existingPurchase.status !== "DRAFT") {
      return res.status(400).json({
        success: false,
        message:
          "Only DRAFT purchases can be received.",
      });
    }

    if (existingPurchase.items.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot receive a purchase without items.",
      });
    }

    const purchase = await prisma.$transaction(
      async (tx) => {
        const updatedPurchase =
          await tx.purchase.update({
            where: {
              id,
            },
            data: {
              status: "RECEIVED",
            },
            include: {
              supplier: {
                select: {
                  id: true,
                  supplierCode: true,
                  name: true,
                  nameEn: true,
                  nameHi: true,
                },
              },
              items: {
                include: {
                  foodItem: {
                    select: {
                      id: true,
                      itemCode: true,
                      name: true,
                      nameEn: true,
                      nameHi: true,
                      isStockItem: true,
                    },
                  },
                },
              },
            },
          });

        // Stock IN for every purchase item
        await tx.stockTransaction.createMany({
          data: existingPurchase.items.map(
            (item) => ({
              transactionDate:
                existingPurchase.purchaseDate,

              transactionType: "PURCHASE",

              foodItemId: item.foodItemId,

              // Purchase is a stock-IN transaction.
              quantity: item.quantity,

              unitRate: item.rate,

              referenceType: "PURCHASE",

              referenceId: existingPurchase.id,

              remarks:
                `Purchase ${existingPurchase.purchaseNo}`,

              createdById: Number(
                req.user!.userId
              ),
            })
          ),
        });

        return updatedPurchase;
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "Purchase received successfully and stock has been increased.",
      data: purchase,
    });
  } catch (error) {
    console.error("Receive purchase error:", error);

    return res.status(500).json({
      success: false,
      message:
        "Unable to receive purchase.",
    });
  }
};

// --------------------------------------------------
// POST /api/purchases/:id/cancel
// --------------------------------------------------

export const cancelPurchase = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase ID.",
      });
    }

    const purchase =
      await prisma.purchase.findUnique({
        where: {
          id,
        },
      });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found.",
      });
    }

    if (purchase.status !== "DRAFT") {
      return res.status(400).json({
        success: false,
        message:
          "Only DRAFT purchases can be cancelled. Received purchases require a stock reversal/return process.",
      });
    }

    const cancelledPurchase =
      await prisma.purchase.update({
        where: {
          id,
        },
        data: {
          status: "CANCELLED",
        },
        include: {
          supplier: {
            select: {
              id: true,
              supplierCode: true,
              name: true,
              nameEn: true,
              nameHi: true,
            },
          },
        },
      });

    return res.status(200).json({
      success: true,
      message: "Purchase cancelled successfully.",
      data: cancelledPurchase,
    });
  } catch (error) {
    console.error("Cancel purchase error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to cancel purchase.",
    });
  }
};