import { Response } from "express";
import crypto from "node:crypto";

import { prisma } from "../lib/prisma.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

type SaleItemInput = {
  foodItemId: number;
  quantity: number;
};

const roundMoney = (value: number): number => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

const generateDocumentNo = (
  prefix: string
): string => {
  const now = new Date();

  const datePart =
    `${now.getFullYear()}` +
    `${String(now.getMonth() + 1).padStart(2, "0")}` +
    `${String(now.getDate()).padStart(2, "0")}`;

  const timePart =
    `${String(now.getHours()).padStart(2, "0")}` +
    `${String(now.getMinutes()).padStart(2, "0")}` +
    `${String(now.getSeconds()).padStart(2, "0")}`;

  const randomPart = crypto
    .randomBytes(2)
    .toString("hex")
    .toUpperCase();

  return `${prefix}-${datePart}-${timePart}-${randomPart}`;
};

export const createSale = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const {
      saleType,
      partyId,
      personId,
      discount = 0,
      tax = 0,
      paymentMode,
      paidAmount = 0,
      notes,
      items,
      saleDate,
    } = req.body as {
      saleType?: string;
      partyId?: number;
      personId?: number;
      discount?: number;
      tax?: number;
      paymentMode?: string;
      paidAmount?: number;
      notes?: string;
      items?: SaleItemInput[];
      saleDate?: string;
    };

    // --------------------------------------------------
    // 1. Basic validation
    // --------------------------------------------------

    if (!saleType) {
      return res.status(400).json({
        success: false,
        message: "saleType is required.",
      });
    }

    const allowedSaleTypes = [
      "INDIVIDUAL",
      "BULK",
      "DEPARTMENT",
      "COUNTER",
    ];

    if (!allowedSaleTypes.includes(saleType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid saleType.",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one sale item is required.",
      });
    }

    const numericDiscount = Number(discount);
    const numericTax = Number(tax);
    const numericPaidAmount = Number(paidAmount);

    if (
      !Number.isFinite(numericDiscount) ||
      numericDiscount < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid discount amount.",
      });
    }

    if (
      !Number.isFinite(numericTax) ||
      numericTax < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid tax amount.",
      });
    }

    if (
      !Number.isFinite(numericPaidAmount) ||
      numericPaidAmount < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid paid amount.",
      });
    }

    // --------------------------------------------------
    // 2. Sale-type validation
    // --------------------------------------------------

    if (
      saleType === "INDIVIDUAL" &&
      !personId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "personId is required for INDIVIDUAL sale.",
      });
    }

    if (
      saleType === "DEPARTMENT" &&
      !partyId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "partyId is required for DEPARTMENT sale.",
      });
    }

    /*
     * COUNTER sales should use the generic
     * CASH CUSTOMER party.
     *
     * Example:
     * partyCode = CASH001
     * partyName = Cash Customer
     */
    if (
      saleType === "COUNTER" &&
      !partyId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "partyId is required for COUNTER sale. Use the CASH CUSTOMER party.",
      });
    }

    if (
      saleType === "BULK" &&
      !partyId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "partyId is required for BULK sale.",
      });
    }

    // --------------------------------------------------
    // 3. Database transaction
    // --------------------------------------------------

    const result = await prisma.$transaction(
      async (tx) => {
        const transactionDate = saleDate
          ? new Date(saleDate)
          : new Date();

        if (Number.isNaN(transactionDate.getTime())) {
          throw new Error("Invalid saleDate.");
        }

        // ------------------------------------------------
        // 3A. Validate Party
        // ------------------------------------------------

        let party = null;

        if (partyId) {
          party = await tx.party.findUnique({
            where: {
              id: Number(partyId),
            },
          });

          if (!party || !party.isActive) {
            throw new Error(
              "Selected party does not exist or is inactive."
            );
          }
        }

        // ------------------------------------------------
        // 3B. Validate Person
        // ------------------------------------------------

        let person = null;

        if (personId) {
          person = await tx.person.findUnique({
            where: {
              id: Number(personId),
            },
          });

          if (!person || !person.isActive) {
            throw new Error(
              "Selected person does not exist or is inactive."
            );
          }

          /*
           * If person belongs to a party, make sure the
           * requested party matches the person's party.
           */
          if (
            person.partyId &&
            partyId &&
            person.partyId !== Number(partyId)
          ) {
            throw new Error(
              "Selected person does not belong to the selected party."
            );
          }
        }

        // ------------------------------------------------
        // 3C. Merge duplicate food items
        // ------------------------------------------------

        const quantityMap = new Map<number, number>();

        for (const item of items) {
          const foodItemId = Number(item.foodItemId);
          const quantity = Number(item.quantity);

          if (
            !Number.isInteger(foodItemId) ||
            foodItemId <= 0
          ) {
            throw new Error(
              "Invalid foodItemId."
            );
          }

          if (
            !Number.isFinite(quantity) ||
            quantity <= 0
          ) {
            throw new Error(
              `Invalid quantity for food item ${foodItemId}.`
            );
          }

          const existing =
            quantityMap.get(foodItemId) ?? 0;

          quantityMap.set(
            foodItemId,
            existing + quantity
          );
        }

        const foodItemIds =
          Array.from(quantityMap.keys());

        // ------------------------------------------------
        // 3D. Load food items
        // ------------------------------------------------

        const foodItems =
          await tx.foodItem.findMany({
            where: {
              id: {
                in: foodItemIds,
              },
              isActive: true,
            },
          });

        if (
          foodItems.length !== foodItemIds.length
        ) {
          throw new Error(
            "One or more selected food items do not exist or are inactive."
          );
        }

        // ------------------------------------------------
        // 3E. Calculate Sale Items
        // ------------------------------------------------

        const saleItems: Array<{
          foodItemId: number;
          quantity: number;
          rate: number;
          amount: number;
        }> = [];

        for (const foodItem of foodItems) {
          const quantity =
            quantityMap.get(foodItem.id) ?? 0;

          /*
           * RateMaster is the authoritative selling rate.
           */
          const rateMaster =
            await tx.rateMaster.findFirst({
              where: {
                foodItemId: foodItem.id,
                isActive: true,
                effectiveFrom: {
                  lte: transactionDate,
                },
                OR: [
                  {
                    effectiveTo: null,
                  },
                  {
                    effectiveTo: {
                      gte: transactionDate,
                    },
                  },
                ],
              },
              orderBy: {
                effectiveFrom: "desc",
              },
            });

          /*
           * For now, fall back to FoodItem.saleRate
           * only when no RateMaster exists.
           *
           * We can later make RateMaster mandatory.
           */
          const rate = rateMaster
            ? Number(rateMaster.rate)
            : Number(foodItem.saleRate);

          if (
            !Number.isFinite(rate) ||
            rate < 0
          ) {
            throw new Error(
              `Invalid selling rate for ${foodItem.name}.`
            );
          }

          if (rate === 0) {
            throw new Error(
              `No valid selling rate found for ${foodItem.name}.`
            );
          }

          const amount = roundMoney(
            quantity * rate
          );

          saleItems.push({
            foodItemId: foodItem.id,
            quantity,
            rate,
            amount,
          });
        }

        // ------------------------------------------------
        // 3F. Calculate totals
        // ------------------------------------------------

        const subtotal = roundMoney(
          saleItems.reduce(
            (sum, item) => sum + item.amount,
            0
          )
        );

        if (numericDiscount > subtotal) {
          throw new Error(
            "Discount cannot exceed subtotal."
          );
        }

        const taxableAmount = roundMoney(
          subtotal - numericDiscount
        );

        const grandTotal = roundMoney(
          taxableAmount + numericTax
        );

        if (
          numericPaidAmount > grandTotal
        ) {
          throw new Error(
            "Paid amount cannot exceed grand total."
          );
        }

        const outstanding = roundMoney(
          grandTotal - numericPaidAmount
        );

        // ------------------------------------------------
        // 3G. Payment validation
        // ------------------------------------------------

        if (
          numericPaidAmount > 0 &&
          !paymentMode
        ) {
          throw new Error(
            "paymentMode is required when paidAmount is greater than zero."
          );
        }

        // ------------------------------------------------
        // 3H. Generate invoice number
        // ------------------------------------------------

        const invoiceNo =
          generateDocumentNo("CAN");

        // ------------------------------------------------
        // 3I. Create Sale
        // ------------------------------------------------

        const sale = await tx.sale.create({
          data: {
            invoiceNo,
            saleDate: transactionDate,

            saleType:
              saleType as
                | "INDIVIDUAL"
                | "BULK"
                | "DEPARTMENT"
                | "COUNTER",

            status: "POSTED",

            partyId: party
              ? party.id
              : null,

            personId: person
              ? person.id
              : null,

            subtotal,
            discount: numericDiscount,
            tax: numericTax,
            grandTotal,
            paidAmount: numericPaidAmount,
            outstanding,

            notes: notes ?? null,

            createdById: req.user!.userId,
          },
        });

        // ------------------------------------------------
        // 3J. Create Sale Items
        // ------------------------------------------------

        await tx.saleItem.createMany({
          data: saleItems.map((item) => ({
            saleId: sale.id,
            foodItemId: item.foodItemId,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
          })),
        });

        // ------------------------------------------------
        // 3K. Create Payment
        // ------------------------------------------------

        let payment = null;

        if (numericPaidAmount > 0) {
          const receiptNo =
            generateDocumentNo("RCP");

          payment =
            await tx.payment.create({
              data: {
                receiptNo,
                paymentDate: transactionDate,
                amount: numericPaidAmount,

                paymentMode:
                  paymentMode as
                    | "CASH"
                    | "UPI"
                    | "CARD"
                    | "BANK_TRANSFER"
                    | "CHEQUE"
                    | "ADJUSTMENT"
                    | "OTHER",

                status: "POSTED",

                partyId:
                  party!.id,

                referenceNo:
                  invoiceNo,

                remarks:
                  `Payment against ${invoiceNo}`,

                createdById:
                  req.user!.userId,
              },
            });
        }

        // ------------------------------------------------
        // 3L. Ledger - SALE
        // ------------------------------------------------

        /*
         * Party is mandatory for a posted sale because
         * LedgerEntry.partyId is mandatory.
         */
        if (!party) {
          throw new Error(
            "A party is required for ledger posting."
          );
        }

        await tx.ledgerEntry.create({
          data: {
            entryDate: transactionDate,
            entryType: "SALE",

            partyId: party.id,

            saleId: sale.id,

            debit: grandTotal,
            credit: 0,

            description:
              `Sale ${invoiceNo}`,
          },
        });

        // ------------------------------------------------
        // 3M. Ledger - PAYMENT
        // ------------------------------------------------

        if (payment) {
          await tx.ledgerEntry.create({
            data: {
              entryDate: transactionDate,
              entryType: "PAYMENT",

              partyId: party.id,

              paymentId: payment.id,

              debit: 0,
              credit: numericPaidAmount,

              description:
                `Payment ${payment.receiptNo} against ${invoiceNo}`,
            },
          });
        }

        // ------------------------------------------------
        // 3N. Stock Transactions
        // ------------------------------------------------

        for (const item of saleItems) {
          const foodItem =
            foodItems.find(
              (food) =>
                food.id === item.foodItemId
            );

          /*
           * Non-stock items such as some service/charge
           * items should not affect inventory.
           */
          if (
            foodItem &&
            foodItem.isStockItem
          ) {
            await tx.stockTransaction.create({
              data: {
                transactionDate,

                transactionType: "SALE",

                foodItemId:
                  item.foodItemId,

                quantity:
                  item.quantity,

                unitRate:
                  item.rate,

                referenceType: "SALE",

                referenceId:
                  sale.id,

                remarks:
                  `Stock issued against ${invoiceNo}`,

                createdById:
                  req.user!.userId,
              },
            });
          }
        }

        // ------------------------------------------------
        // 3O. Return complete sale
        // ------------------------------------------------

        return tx.sale.findUnique({
          where: {
            id: sale.id,
          },

          include: {
            party: true,
            person: true,

            items: {
              include: {
                foodItem: {
                  include: {
                    unit: true,
                    category: true,
                  },
                },
              },
            },

            ledgerEntries: {
              include: { payment: true },
            },
          },
        });
      },
      {
        timeout: 10000,
      }
    );

    return res.status(201).json({
      success: true,
      message: "Sale created successfully.",
      data: result,
    });
  } catch (error) {
    console.error(
      "CREATE SALE ERROR:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to create sale.",
    });
  }
};