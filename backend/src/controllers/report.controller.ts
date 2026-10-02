import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

/* =========================================================
   DATE HELPERS
   ========================================================= */

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfNextDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d;
}

function parseDateOnly(value: unknown): Date | null {
  if (!value || typeof value !== "string") {
    return null;
  }

  // Expected: YYYY-MM-DD
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/**
 * Important:
 *
 * fromDate = selected date 00:00:00
 * toDate   = next day 00:00:00 EXCLUSIVE
 *
 * Example:
 * fromDate=2026-09-30
 * toDate=2026-09-30
 *
 * Query:
 * >= 2026-09-30 00:00:00
 * <  2026-10-01 00:00:00
 */
function getDateRange(req: Request) {
  const fromParam =
    typeof req.query.fromDate === "string"
      ? req.query.fromDate
      : undefined;

  const toParam =
    typeof req.query.toDate === "string"
      ? req.query.toDate
      : undefined;

  const from = fromParam ? parseDateOnly(fromParam) : null;
  const to = toParam ? parseDateOnly(toParam) : null;

  if (fromParam && !from) {
    throw new Error("Invalid fromDate. Use YYYY-MM-DD.");
  }

  if (toParam && !to) {
    throw new Error("Invalid toDate. Use YYYY-MM-DD.");
  }

  if (from && to && from > to) {
    throw new Error("fromDate cannot be greater than toDate.");
  }

  const range: {
    gte?: Date;
    lt?: Date;
  } = {};

  if (from) {
    range.gte = startOfDay(from);
  }

  if (to) {
    range.lt = startOfNextDay(to);
  }

  return {
    fromDate: from,
    toDate: to,
    range,
  };
}

/* =========================================================
   STATUS HELPER
   ========================================================= */

function getStatus(req: Request): string {
  if (
    typeof req.query.status === "string" &&
    req.query.status.trim() !== ""
  ) {
    return req.query.status.toUpperCase();
  }

  return "POSTED";
}

/* =========================================================
   CSV HELPER
   ========================================================= */

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r")
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function sendCsv(
  res: Response,
  filename: string,
  headers: string[],
  rows: unknown[][]
) {
  const csvLines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ];

  const csv = "\uFEFF" + csvLines.join("\r\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );

  return res.send(csv);
}

/* =========================================================
   BUILD DATE + STATUS WHERE
   ========================================================= */

function buildSaleWhere(req: Request) {
  const { range } = getDateRange(req);
  const status = getStatus(req);

  const where: any = {};

  if (Object.keys(range).length > 0) {
    where.saleDate = range;
  }

  if (status !== "ALL") {
    where.status = status;
  }

  return where;
}

/* =========================================================
   DASHBOARD
   ========================================================= */

export async function getDashboard(
  req: Request,
  res: Response
) {
  try {
    const { range } = getDateRange(req);

    const dateWhere: any = {};
    const purchaseDateWhere: any = {};
    const paymentDateWhere: any = {};
    const expenseDateWhere: any = {};
    const wastageDateWhere: any = {};

    if (Object.keys(range).length > 0) {
      dateWhere.saleDate = range;
      purchaseDateWhere.purchaseDate = range;
      paymentDateWhere.paymentDate = range;
      expenseDateWhere.expenseDate = range;
      wastageDateWhere.wastageDate = range;
    }

    const postedSaleWhere = {
      ...dateWhere,
      status: "POSTED" as const,
    };

    const [
      sales,
      purchases,
      payments,
      expenses,
      wastage,
      stockItems,
    ] = await Promise.all([
      prisma.sale.aggregate({
        where: postedSaleWhere,
        _sum: {
          grandTotal: true,
        },
        _count: {
          id: true,
        },
      }),

      prisma.purchase.aggregate({
        where: purchaseDateWhere,
        _sum: {
          total: true,
        },
        _count: {
          id: true,
        },
      }),

      prisma.payment.aggregate({
        where: {
          ...paymentDateWhere,
          status: "POSTED",
        },
        _sum: {
          amount: true,
        },
      }),

      prisma.expense.aggregate({
        where: expenseDateWhere,
        _sum: {
          amount: true,
        },
      }),

      prisma.wastage.aggregate({
        where: wastageDateWhere,
        _count: {
          id: true,
        },
      }),

      prisma.foodItem.findMany({
        where: {
          isStockItem: true,
        },
        select: {
          id: true,
          nameEn: true,
          nameHi: true,
          minimumStock: true,
          unit: {
            select: {
              nameEn: true,
              nameHi: true,
              shortName: true,
            },
          },
        },
      }),
    ]);

    /* -----------------------------------------
       Calculate current stock
       ----------------------------------------- */

    const stockTransactions =
      await prisma.stockTransaction.groupBy({
        by: ["foodItemId", "transactionType"],
        _sum: {
          quantity: true,
        },
      });

    const stockMap = new Map<number, number>();

    for (const item of stockTransactions) {
      const qty = Number(item._sum.quantity ?? 0);

      const isIn = [
        "PURCHASE",
        "ADJUSTMENT_IN",
        "OPENING",
      ].includes(item.transactionType);

      const isOut = [
        "SALE",
        "WASTAGE",
        "ADJUSTMENT_OUT",
        "RETURN_TO_SUPPLIER",
      ].includes(item.transactionType);

      const current = stockMap.get(item.foodItemId) ?? 0;

      if (isIn) {
        stockMap.set(item.foodItemId, current + qty);
      }

      if (isOut) {
        stockMap.set(item.foodItemId, current - qty);
      }
    }

    let lowStockCount = 0;

    for (const item of stockItems) {
      const currentStock =
        stockMap.get(item.id) ?? 0;

      const minimumStock =
        Number(item.minimumStock ?? 0);

      if (currentStock <= minimumStock) {
        lowStockCount++;
      }
    }

    return res.json({
      success: true,
      data: {
        sales: {
          count: sales._count.id,
          total: Number(sales._sum.grandTotal ?? 0),
        },

        purchases: {
          count: purchases._count.id,
          total: Number(purchases._sum.total ?? 0),
        },

        collections: Number(
          payments._sum.amount ?? 0
        ),

        expenses: Number(
          expenses._sum.amount ?? 0
        ),

        wastageCount: wastage._count.id,

        lowStockCount,
      },
    });
  } catch (error) {
    console.error("Dashboard report error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to load dashboard report.",
    });
  }
}

/* =========================================================
   SALES REPORT
   ========================================================= */

export async function getSalesReport(
  req: Request,
  res: Response
) {
  try {
    const where = buildSaleWhere(req);

    const sales = await prisma.sale.findMany({
      where,

      include: {
        party: {
          select: {
            id: true,
            partyName: true,
            partyNameEn: true,
            partyNameHi: true,
          },
        },

        person: {
          select: {
            id: true,
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
                name: true,
                nameEn: true,
                nameHi: true,
              },
            },
          },
        },
      },

      orderBy: {
        saleDate: "desc",
      },
    });

    const result = sales.map((sale) => ({
      id: sale.id,
      invoiceNo: sale.invoiceNo,
      saleDate: sale.saleDate,
      saleType: sale.saleType,
      status: sale.status,

      party: sale.party
        ? {
            id: sale.party.id,
            name:
              sale.party.partyNameEn ??
              sale.party.partyName,
            nameEn: sale.party.partyNameEn,
            nameHi: sale.party.partyNameHi,
          }
        : null,

      person: sale.person
        ? {
            id: sale.person.id,
            name:
              sale.person.nameEn ??
              sale.person.name,
            nameEn: sale.person.nameEn,
            nameHi: sale.person.nameHi,
          }
        : null,

      subtotal: Number(sale.subtotal),
      discount: Number(sale.discount),
      tax: Number(sale.tax),
      grandTotal: Number(sale.grandTotal),
      paidAmount: Number(sale.paidAmount),
      outstanding: Number(sale.outstanding),

      items: sale.items.map((item) => ({
        id: item.id,
        foodItemId: item.foodItemId,
        foodItem: {
          id: item.foodItem.id,
          name:
            item.foodItem.nameEn ??
            item.foodItem.name,
          nameEn: item.foodItem.nameEn,
          nameHi: item.foodItem.nameHi,
        },
        quantity: Number(item.quantity),
        rate: Number(item.rate),
        amount: Number(item.amount),
      })),
    }));

    if (req.query.format === "csv") {
      const rows = result.map((sale) => [
        sale.invoiceNo,
        sale.saleDate,
        sale.saleType,
        sale.status,
        sale.party?.name ?? "",
        sale.person?.name ?? "",
        sale.subtotal,
        sale.discount,
        sale.tax,
        sale.grandTotal,
        sale.paidAmount,
        sale.outstanding,
      ]);

      return sendCsv(
        res,
        "sales-report.csv",
        [
          "Invoice No",
          "Sale Date",
          "Sale Type",
          "Status",
          "Party",
          "Person",
          "Subtotal",
          "Discount",
          "Tax",
          "Grand Total",
          "Paid Amount",
          "Outstanding",
        ],
        rows
      );
    }

    return res.json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error("Sales report error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to load sales report.",
    });
  }
}

/* =========================================================
   SALES BY FOOD ITEM
   ========================================================= */

export async function getSalesByFoodItem(
  req: Request,
  res: Response
) {
  try {
    const where = buildSaleWhere(req);

    const sales = await prisma.sale.findMany({
      where,

      select: {
        items: {
          select: {
            foodItemId: true,
            quantity: true,
            amount: true,

            foodItem: {
              select: {
                id: true,
                name: true,
                nameEn: true,
                nameHi: true,
              },
            },
          },
        },
      },
    });

    const map = new Map<
      number,
      {
        foodItemId: number;
        name: string;
        nameEn: string | null;
        nameHi: string | null;
        quantity: number;
        amount: number;
      }
    >();

    for (const sale of sales) {
      for (const item of sale.items) {
        const existing = map.get(item.foodItemId);

        if (existing) {
          existing.quantity += Number(item.quantity);
          existing.amount += Number(item.amount);
        } else {
          map.set(item.foodItemId, {
            foodItemId: item.foodItemId,
            name:
              item.foodItem.nameEn ??
              item.foodItem.name,
            nameEn: item.foodItem.nameEn,
            nameHi: item.foodItem.nameHi,
            quantity: Number(item.quantity),
            amount: Number(item.amount),
          });
        }
      }
    }

    const result = Array.from(map.values()).sort(
      (a, b) => b.amount - a.amount
    );

    if (req.query.format === "csv") {
      const rows = result.map((item) => [
        item.foodItemId,
        item.nameEn,
        item.nameHi,
        item.quantity,
        item.amount,
      ]);

      return sendCsv(
        res,
        "sales-by-food-item.csv",
        [
          "Food Item ID",
          "Food Item English",
          "Food Item Hindi",
          "Quantity",
          "Amount",
        ],
        rows
      );
    }

    return res.json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error(
      "Sales by food item report error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to load sales by food item report.",
    });
  }
}

/* =========================================================
   SALES BY DEPARTMENT
   ========================================================= */

export async function getSalesByDepartment(
  req: Request,
  res: Response
) {
  try {
    const where = buildSaleWhere(req);

    const sales = await prisma.sale.findMany({
      where,

      select: {
        grandTotal: true,

        party: {
          select: {
            departmentId: true,

            department: {
              select: {
                id: true,
                name: true,
                nameEn: true,
                nameHi: true,
              },
            },
          },
        },
      },
    });

    const map = new Map<
      number | string,
      {
        departmentId: number | null;
        departmentName: string;
        departmentNameEn: string | null;
        departmentNameHi: string | null;
        total: number;
        count: number;
      }
    >();

    for (const sale of sales) {
      const departmentId =
        sale.party?.departmentId ?? null;

      const key = departmentId ?? "NO_DEPARTMENT";

      const departmentName =
        sale.party?.department?.nameEn ??
        sale.party?.department?.name ??
        "No Department";

      const existing = map.get(key);

      if (existing) {
        existing.total += Number(sale.grandTotal);
        existing.count += 1;
      } else {
        map.set(key, {
          departmentId,
          departmentName,
          departmentNameEn:
            sale.party?.department?.nameEn ?? null,
          departmentNameHi:
            sale.party?.department?.nameHi ?? null,
          total: Number(sale.grandTotal),
          count: 1,
        });
      }
    }

    const result = Array.from(map.values()).sort(
      (a, b) => b.total - a.total
    );

    if (req.query.format === "csv") {
      const rows = result.map((item) => [
        item.departmentId ?? "",
        item.departmentNameEn ?? "",
        item.departmentNameHi ?? "",
        item.count,
        item.total,
      ]);

      return sendCsv(
        res,
        "sales-by-department.csv",
        [
          "Department ID",
          "Department English",
          "Department Hindi",
          "Sale Count",
          "Total",
        ],
        rows
      );
    }

    return res.json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error(
      "Sales by department report error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to load sales by department report.",
    });
  }
}

/* =========================================================
   PURCHASE REPORT
   ========================================================= */

export async function getPurchaseReport(
  req: Request,
  res: Response
) {
  try {
    const { range } = getDateRange(req);

    const where: any = {};

    if (Object.keys(range).length > 0) {
      where.purchaseDate = range;
    }

    const purchases = await prisma.purchase.findMany({
      where,

      include: {
        supplier: {
          select: {
            id: true,
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

    const result = purchases.map((purchase) => ({
      id: purchase.id,
      purchaseNo: purchase.purchaseNo,
      purchaseDate: purchase.purchaseDate,
      status: purchase.status,

      supplier: purchase.supplier
        ? {
            id: purchase.supplier.id,
            name:
              purchase.supplier.nameEn ??
              purchase.supplier.name,
            nameEn: purchase.supplier.nameEn,
            nameHi: purchase.supplier.nameHi,
          }
        : null,

      subtotal: Number(purchase.subtotal),
      discount: Number(purchase.discount),
      tax: Number(purchase.tax),
      total: Number(purchase.total),

      invoiceNo: purchase.invoiceNo,

      items: purchase.items.map((item) => ({
        id: item.id,
        foodItemId: item.foodItemId,
        foodItem: {
          id: item.foodItem.id,
          name:
            item.foodItem.nameEn ??
            item.foodItem.name,
          nameEn: item.foodItem.nameEn,
          nameHi: item.foodItem.nameHi,
        },
        quantity: Number(item.quantity),
        rate: Number(item.rate),
        amount: Number(item.amount),
      })),
    }));

    if (req.query.format === "csv") {
      const rows = result.map((purchase) => [
        purchase.purchaseNo,
        purchase.purchaseDate,
        purchase.status,
        purchase.supplier?.name ?? "",
        purchase.invoiceNo ?? "",
        purchase.subtotal,
        purchase.discount,
        purchase.tax,
        purchase.total,
      ]);

      return sendCsv(
        res,
        "purchase-report.csv",
        [
          "Purchase No",
          "Purchase Date",
          "Status",
          "Supplier",
          "Supplier Invoice",
          "Subtotal",
          "Discount",
          "Tax",
          "Total",
        ],
        rows
      );
    }

    return res.json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error("Purchase report error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to load purchase report.",
    });
  }
}

/* =========================================================
   COLLECTION REPORT
   ========================================================= */

export async function getCollectionReport(
  req: Request,
  res: Response
) {
  try {
    const { range } = getDateRange(req);

    const where: any = {
      status: "POSTED",
    };

    if (Object.keys(range).length > 0) {
      where.paymentDate = range;
    }

    const payments = await prisma.payment.findMany({
      where,

      include: {
        party: {
          select: {
            id: true,
            partyName: true,
            partyNameEn: true,
            partyNameHi: true,
          },
        },
      },

      orderBy: {
        paymentDate: "desc",
      },
    });

    const result = payments.map((payment) => ({
      id: payment.id,
      receiptNo: payment.receiptNo,
      paymentDate: payment.paymentDate,
      amount: Number(payment.amount),
      paymentMode: payment.paymentMode,
      referenceNo: payment.referenceNo,
      remarks: payment.remarks,

      party: {
        id: payment.party.id,
        name:
          payment.party.partyNameEn ??
          payment.party.partyName,
        nameEn: payment.party.partyNameEn,
        nameHi: payment.party.partyNameHi,
      },
    }));

    if (req.query.format === "csv") {
      const rows = result.map((payment) => [
        payment.receiptNo,
        payment.paymentDate,
        payment.party.name,
        payment.paymentMode,
        payment.amount,
        payment.referenceNo ?? "",
        payment.remarks ?? "",
      ]);

      return sendCsv(
        res,
        "collection-report.csv",
        [
          "Receipt No",
          "Payment Date",
          "Party",
          "Payment Mode",
          "Amount",
          "Reference No",
          "Remarks",
        ],
        rows
      );
    }

    return res.json({
      success: true,
      count: result.length,
      total: result.reduce(
        (sum, item) => sum + item.amount,
        0
      ),
      data: result,
    });
  } catch (error) {
    console.error("Collection report error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to load collection report.",
    });
  }
}

/* =========================================================
   OUTSTANDING REPORT
   ========================================================= */

export async function getOutstandingReport(
  req: Request,
  res: Response
) {
  try {
    const ledgerSummary = await prisma.ledgerEntry.groupBy({
      by: ["partyId"],

      _sum: {
        debit: true,
        credit: true,
      },

      orderBy: {
        partyId: "asc",
      },
    });

    const partyIds = ledgerSummary.map(
      (item) => item.partyId
    );

    if (partyIds.length === 0) {
      return res.json({
        success: true,
        count: 0,
        data: [],
      });
    }

    const parties = await prisma.party.findMany({
      where: {
        id: {
          in: partyIds,
        },
      },

      select: {
        id: true,
        partyName: true,
        partyNameEn: true,
        partyNameHi: true,
      },

      orderBy: {
        partyName: "asc",
      },
    });

    const partyMap = new Map(
      parties.map((party) => [
        party.id,
        party,
      ])
    );

    const result = ledgerSummary
      .map((summary) => {
        const party = partyMap.get(
          summary.partyId
        );

        const debit = Number(
          summary._sum.debit ?? 0
        );

        const credit = Number(
          summary._sum.credit ?? 0
        );

        return {
          partyId: summary.partyId,

          partyName:
            party?.partyNameEn ??
            party?.partyName ??
            "Unknown Party",

          partyNameEn:
            party?.partyNameEn ?? null,

          partyNameHi:
            party?.partyNameHi ?? null,

          debit,
          credit,

          outstanding: debit - credit,
        };
      })
      .filter(
        (party) => party.outstanding !== 0
      );

    if (req.query.format === "csv") {
      const rows = result.map((party) => [
        party.partyId,
        party.partyNameEn ?? "",
        party.partyNameHi ?? "",
        party.debit,
        party.credit,
        party.outstanding,
      ]);

      return sendCsv(
        res,
        "outstanding-report.csv",
        [
          "Party ID",
          "Party English",
          "Party Hindi",
          "Debit",
          "Credit",
          "Outstanding",
        ],
        rows
      );
    }

    return res.json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error(
      "Outstanding report error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to load outstanding report.",
    });
  }
}

/* =========================================================
   EXPENSE REPORT
   ========================================================= */

export async function getExpenseReport(
  req: Request,
  res: Response
) {
  try {
    const { range } = getDateRange(req);

    const where: any = {};

    if (Object.keys(range).length > 0) {
      where.expenseDate = range;
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: {
        expenseDate: "desc",
      },
    });

    const result = expenses.map((expense) => ({
      id: expense.id,
      expenseDate: expense.expenseDate,
      category: expense.category,
      amount: Number(expense.amount),
      description: expense.description,
      referenceNo: expense.referenceNo,
    }));

    if (req.query.format === "csv") {
      const rows = result.map((expense) => [
        expense.expenseDate,
        expense.category,
        expense.amount,
        expense.description ?? "",
        expense.referenceNo ?? "",
      ]);

      return sendCsv(
        res,
        "expense-report.csv",
        [
          "Expense Date",
          "Category",
          "Amount",
          "Description",
          "Reference No",
        ],
        rows
      );
    }

    return res.json({
      success: true,
      count: result.length,
      total: result.reduce(
        (sum, item) => sum + item.amount,
        0
      ),
      data: result,
    });
  } catch (error) {
    console.error("Expense report error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to load expense report.",
    });
  }
}

/* =========================================================
   STOCK REPORT
   ========================================================= */

export async function getStockReport(
  req: Request,
  res: Response
) {
  try {
    const foodItems = await prisma.foodItem.findMany({
      where: {
        isStockItem: true,
      },

      select: {
        id: true,
        name: true,
        nameEn: true,
        nameHi: true,
        minimumStock: true,
        maximumStock: true,

        unit: {
          select: {
            name: true,
            nameEn: true,
            nameHi: true,
            shortName: true,
          },
        },
      },

      orderBy: {
        name: "asc",
      },
    });

    const transactions =
      await prisma.stockTransaction.groupBy({
        by: ["foodItemId", "transactionType"],
        _sum: {
          quantity: true,
        },
      });

    const stockMap = new Map<number, number>();

    for (const transaction of transactions) {
      const qty = Number(
        transaction._sum.quantity ?? 0
      );

      const current =
        stockMap.get(transaction.foodItemId) ?? 0;

      if (
        [
          "PURCHASE",
          "ADJUSTMENT_IN",
          "OPENING",
        ].includes(transaction.transactionType)
      ) {
        stockMap.set(
          transaction.foodItemId,
          current + qty
        );
      }

      if (
        [
          "SALE",
          "WASTAGE",
          "ADJUSTMENT_OUT",
          "RETURN_TO_SUPPLIER",
        ].includes(transaction.transactionType)
      ) {
        stockMap.set(
          transaction.foodItemId,
          current - qty
        );
      }
    }

    const result = foodItems.map((item) => {
      const currentStock =
        stockMap.get(item.id) ?? 0;

      const minimumStock =
        Number(item.minimumStock ?? 0);

      const maximumStock =
        item.maximumStock !== null
          ? Number(item.maximumStock)
          : null;

      let stockStatus = "NORMAL";

      if (currentStock <= minimumStock) {
        stockStatus = "LOW";
      }

      if (
        maximumStock !== null &&
        currentStock > maximumStock
      ) {
        stockStatus = "OVER";
      }

      return {
        foodItemId: item.id,

        name:
          item.nameEn ??
          item.name,

        nameEn: item.nameEn,
        nameHi: item.nameHi,

        unit: item.unit
          ? {
              name:
                item.unit.nameEn ??
                item.unit.name,
              nameEn: item.unit.nameEn,
              nameHi: item.unit.nameHi,
              shortName: item.unit.shortName,
            }
          : null,

        currentStock,
        minimumStock,
        maximumStock,
        stockStatus,
      };
    });

    if (req.query.format === "csv") {
      const rows = result.map((item) => [
        item.foodItemId,
        item.nameEn ?? "",
        item.nameHi ?? "",
        item.unit?.shortName ?? "",
        item.currentStock,
        item.minimumStock,
        item.maximumStock ?? "",
        item.stockStatus,
      ]);

      return sendCsv(
        res,
        "stock-report.csv",
        [
          "Food Item ID",
          "Food Item English",
          "Food Item Hindi",
          "Unit",
          "Current Stock",
          "Minimum Stock",
          "Maximum Stock",
          "Stock Status",
        ],
        rows
      );
    }

    return res.json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error("Stock report error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to load stock report.",
    });
  }
}

/* =========================================================
   STOCK MOVEMENT REPORT
   ========================================================= */

export async function getStockMovementReport(
  req: Request,
  res: Response
) {
  try {
    const { range } = getDateRange(req);

    const where: any = {};

    if (Object.keys(range).length > 0) {
      where.transactionDate = range;
    }

    const movements =
      await prisma.stockTransaction.findMany({
        where,

        include: {
          foodItem: {
            select: {
              id: true,
              name: true,
              nameEn: true,
              nameHi: true,
            },
          },
        },

        orderBy: {
          transactionDate: "desc",
        },
      });

    const result = movements.map((movement) => ({
      id: movement.id,
      transactionDate:
        movement.transactionDate,

      transactionType:
        movement.transactionType,

      foodItemId:
        movement.foodItemId,

      foodItem: {
        id: movement.foodItem.id,
        name:
          movement.foodItem.nameEn ??
          movement.foodItem.name,
        nameEn: movement.foodItem.nameEn,
        nameHi: movement.foodItem.nameHi,
      },

      quantity: Number(movement.quantity),
      unitRate: Number(movement.unitRate ?? 0),

      referenceType:
        movement.referenceType,

      referenceId:
        movement.referenceId,

      remarks:
        movement.remarks,
    }));

    if (req.query.format === "csv") {
      const rows = result.map((movement) => [
        movement.transactionDate,
        movement.transactionType,
        movement.foodItem.nameEn ?? "",
        movement.foodItem.nameHi ?? "",
        movement.quantity,
        movement.unitRate,
        movement.referenceType ?? "",
        movement.referenceId ?? "",
        movement.remarks ?? "",
      ]);

      return sendCsv(
        res,
        "stock-movement-report.csv",
        [
          "Transaction Date",
          "Transaction Type",
          "Food Item English",
          "Food Item Hindi",
          "Quantity",
          "Unit Rate",
          "Reference Type",
          "Reference ID",
          "Remarks",
        ],
        rows
      );
    }

    return res.json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error(
      "Stock movement report error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to load stock movement report.",
    });
  }
}

/* =========================================================
   WASTAGE REPORT
   ========================================================= */

export async function getWastageReport(
  req: Request,
  res: Response
) {
  try {
    const { range } = getDateRange(req);

    const where: any = {};

    if (Object.keys(range).length > 0) {
      where.wastageDate = range;
    }

    const wastage = await prisma.wastage.findMany({
      where,

      include: {
        foodItem: {
          select: {
            id: true,
            name: true,
            nameEn: true,
            nameHi: true,
          },
        },
      },

      orderBy: {
        wastageDate: "desc",
      },
    });

    const result = wastage.map((item) => ({
      id: item.id,
      wastageDate: item.wastageDate,

      foodItemId: item.foodItemId,

      foodItem: {
        id: item.foodItem.id,
        name:
          item.foodItem.nameEn ??
          item.foodItem.name,
        nameEn: item.foodItem.nameEn,
        nameHi: item.foodItem.nameHi,
      },

      quantity: Number(item.quantity),
      reason: item.reason,
      remarks: item.remarks,
    }));

    if (req.query.format === "csv") {
      const rows = result.map((item) => [
        item.wastageDate,
        item.foodItem.nameEn ?? "",
        item.foodItem.nameHi ?? "",
        item.quantity,
        item.reason,
        item.remarks ?? "",
      ]);

      return sendCsv(
        res,
        "wastage-report.csv",
        [
          "Wastage Date",
          "Food Item English",
          "Food Item Hindi",
          "Quantity",
          "Reason",
          "Remarks",
        ],
        rows
      );
    }

    return res.json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error("Wastage report error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to load wastage report.",
    });
  }
}