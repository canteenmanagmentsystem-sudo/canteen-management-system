import { Response } from "express";
import { prisma } from "../lib/prisma.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

/**
 * GET /api/ledger
 */
export const getLedger = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const {
      partyId,
      entryType,
      fromDate,
      toDate,
      search,
    } = req.query;

    const where: any = {};

    if (partyId) {
      where.partyId = Number(partyId);
    }

    if (entryType) {
      where.entryType = String(entryType);
    }

    if (fromDate || toDate) {
      where.entryDate = {};

      if (fromDate) {
        where.entryDate.gte = new Date(`${fromDate}T00:00:00`);
      }

      if (toDate) {
        where.entryDate.lte = new Date(`${toDate}T23:59:59`);
      }
    }

    if (search) {
      where.party = {
        OR: [
          {
            partyName: {
              contains: String(search),
              mode: "insensitive",
            },
          },
          {
            partyNameEn: {
              contains: String(search),
              mode: "insensitive",
            },
          },
          {
            partyNameHi: {
              contains: String(search),
              mode: "insensitive",
            },
          },
          {
            partyCode: {
              contains: String(search),
              mode: "insensitive",
            },
          },
        ],
      };
    }

    const entries = await prisma.ledgerEntry.findMany({
      where,
      include: {
        party: {
          select: {
            id: true,
            partyCode: true,
            partyName: true,
            partyNameEn: true,
            partyNameHi: true,
            partyType: true,
          },
        },
        sale: {
          select: {
            id: true,
            invoiceNo: true,
            saleDate: true,
            grandTotal: true,
          },
        },
        payment: {
          select: {
            id: true,
            receiptNo: true,
            paymentDate: true,
            amount: true,
            paymentMode: true,
          },
        },
      },
      orderBy: {
        entryDate: "desc",
      },
    });

    return res.json({
      success: true,
      count: entries.length,
      data: entries,
    });
  } catch (error) {
    console.error("Get ledger error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch ledger.",
    });
  }
};

/**
 * GET /api/ledger/party/:partyId
 */
export const getPartyLedger = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const partyId = Number(req.params.partyId);

    if (!Number.isInteger(partyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid party ID.",
      });
    }

    const party = await prisma.party.findUnique({
      where: {
        id: partyId,
      },
      select: {
        id: true,
        partyCode: true,
        partyName: true,
        partyNameEn: true,
        partyNameHi: true,
        partyType: true,
      },
    });

    if (!party) {
      return res.status(404).json({
        success: false,
        message: "Party not found.",
      });
    }

    const entries = await prisma.ledgerEntry.findMany({
      where: {
        partyId,
      },
      include: {
        sale: {
          select: {
            id: true,
            invoiceNo: true,
            saleDate: true,
            grandTotal: true,
          },
        },
        payment: {
          select: {
            id: true,
            receiptNo: true,
            paymentDate: true,
            amount: true,
            paymentMode: true,
          },
        },
      },
      orderBy: [
        {
          entryDate: "asc",
        },
        {
          id: "asc",
        },
      ],
    });

    let runningBalance = 0;

    const ledger = entries.map((entry) => {
      const debit = Number(entry.debit);
      const credit = Number(entry.credit);

      runningBalance += debit - credit;

      return {
        ...entry,
        debit,
        credit,
        runningBalance,
      };
    });

    const totalDebit = ledger.reduce(
      (sum, item) => sum + item.debit,
      0
    );

    const totalCredit = ledger.reduce(
      (sum, item) => sum + item.credit,
      0
    );

    const outstanding = totalDebit - totalCredit;

    return res.json({
      success: true,
      data: {
        party,
        totalDebit,
        totalCredit,
        outstanding,
        ledger,
      },
    });
  } catch (error) {
    console.error("Party ledger error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch party ledger.",
    });
  }
};

/**
 * GET /api/ledger/monthly?partyId=1&month=9&year=2026
 * Returns one party's monthly statement and outstanding summary.
 */
export const getPartyMonthlyLedger = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const partyId = Number(req.query.partyId);
    const month = Number(req.query.month);
    const year = Number(req.query.year);

    if (!Number.isInteger(partyId) || !Number.isInteger(month) || !Number.isInteger(year) || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: "Valid partyId, month and year are required." });
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const party = await prisma.party.findUnique({
      where: { id: partyId },
      select: { id: true, partyCode: true, partyName: true, partyNameEn: true, partyNameHi: true, partyType: true },
    });

    if (!party) return res.status(404).json({ success: false, message: "Party not found." });

    const entries = await prisma.ledgerEntry.findMany({
      where: { partyId, entryDate: { lt: end } },
      include: {
        sale: { include: { items: { include: { foodItem: { select: { id: true, name: true, nameEn: true, nameHi: true } } } } } },
        payment: { select: { id: true, receiptNo: true, paymentDate: true, amount: true, paymentMode: true, status: true } },
      },
      orderBy: [{ entryDate: "asc" }, { id: "asc" }],
    });

    const validEntries = entries.filter((entry) => {
      if (entry.sale && entry.sale.status !== "POSTED") return false;
      if (entry.payment && entry.payment.status !== "POSTED") return false;
      return true;
    });

    const openingOutstanding = validEntries
      .filter(e => e.entryDate < start)
      .reduce((sum,e) => sum + Number(e.debit) - Number(e.credit), 0);

    const periodEntries = validEntries.filter(e => e.entryDate >= start && e.entryDate < end);
    const totalSales = periodEntries.filter(e => e.entryType === "SALE").reduce((sum,e) => sum + Number(e.debit),0);
    const totalPaid = periodEntries.filter(e => e.entryType === "PAYMENT").reduce((sum,e) => sum + Number(e.credit),0);

    const transactions: any[] = [];
    for (const entry of periodEntries) {
      if (entry.sale) {
        const grandTotal = Number(entry.sale.grandTotal);
        const paid = Number(entry.sale.paidAmount);
        for (const item of entry.sale.items) {
          const amount = Number(item.amount);
          const itemPaid = grandTotal > 0 ? Math.min(amount, paid * amount / grandTotal) : 0;
          transactions.push({
            id: `sale-${entry.id}-${item.id}`,
            date: entry.sale.saleDate,
            billNo: entry.sale.invoiceNo,
            itemName: item.foodItem.nameEn || item.foodItem.name,
            itemNameEn: item.foodItem.nameEn,
            itemNameHi: item.foodItem.nameHi,
            quantity: Number(item.quantity),
            rate: Number(item.rate),
            amount,
            paid: itemPaid,
            credit: Math.max(0, amount - itemPaid),
            status: paid >= grandTotal ? "PAID" : itemPaid > 0 ? "PARTIAL" : "CREDIT",
          });
        }
      } else if (entry.payment) {
        transactions.push({
          id: `payment-${entry.id}`,
          date: entry.payment.paymentDate,
          receiptNo: entry.payment.receiptNo,
          amount: Number(entry.payment.amount),
          paid: Number(entry.payment.amount),
          credit: 0,
          status: "PAYMENT",
          description: `Payment (${entry.payment.paymentMode})`,
        });
      }
    }

    const paymentsAgainstOutstanding = Math.min(totalPaid, Math.max(0, openingOutstanding));
    const paymentAppliedToCurrentSales = Math.max(0, totalPaid - paymentsAgainstOutstanding);
    const currentMonthCredit = Math.max(0, totalSales - paymentAppliedToCurrentSales);
    const closingOutstanding = Math.max(0, openingOutstanding + totalSales - totalPaid);

    return res.json({
      success: true,
      data: {
        party,
        periodLabel: start.toLocaleString("en-IN", { month: "long", year: "numeric" }),
        summary: {
          openingOutstanding,
          totalSales,
          totalPaid,
          currentMonthCredit,
          paymentsAgainstOutstanding,
          closingOutstanding,
        },
        transactions,
      },
    });
  } catch (error) {
    console.error("Party monthly ledger error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch monthly party ledger." });
  }
};

/**
 * GET /api/ledger/outstanding
 */
export const getOutstanding = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const parties = await prisma.party.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        partyCode: true,
        partyName: true,
        partyNameEn: true,
        partyNameHi: true,
        partyType: true,
      },
      orderBy: {
        partyName: "asc",
      },
    });

    const partyIds = parties.map((party) => party.id);

    const entries = await prisma.ledgerEntry.findMany({
      where: {
        partyId: {
          in: partyIds,
        },
      },
      select: {
        partyId: true,
        debit: true,
        credit: true,
      },
    });

    const balanceMap = new Map<
      number,
      {
        debit: number;
        credit: number;
      }
    >();

    for (const entry of entries) {
      const current = balanceMap.get(entry.partyId) || {
        debit: 0,
        credit: 0,
      };

      current.debit += Number(entry.debit);
      current.credit += Number(entry.credit);

      balanceMap.set(entry.partyId, current);
    }

    const result = parties
      .map((party) => {
        const balance = balanceMap.get(party.id) || {
          debit: 0,
          credit: 0,
        };

        const outstanding =
          balance.debit - balance.credit;

        return {
          ...party,
          totalDebit: balance.debit,
          totalCredit: balance.credit,
          outstanding,
        };
      })
      .filter((party) => party.outstanding !== 0);

    return res.json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error("Outstanding error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to calculate outstanding.",
    });
  }
};

/**
 * GET /api/ledger/outstanding/:partyId
 */
export const getPartyOutstanding = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const partyId = Number(req.params.partyId);

    if (!Number.isInteger(partyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid party ID.",
      });
    }

    const party = await prisma.party.findUnique({
      where: {
        id: partyId,
      },
      select: {
        id: true,
        partyCode: true,
        partyName: true,
        partyNameEn: true,
        partyNameHi: true,
        partyType: true,
      },
    });

    if (!party) {
      return res.status(404).json({
        success: false,
        message: "Party not found.",
      });
    }

    const aggregate = await prisma.ledgerEntry.aggregate({
      where: {
        partyId,
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const totalDebit = Number(aggregate._sum.debit || 0);
    const totalCredit = Number(aggregate._sum.credit || 0);

    const outstanding = totalDebit - totalCredit;

    return res.json({
      success: true,
      data: {
        party,
        totalDebit,
        totalCredit,
        outstanding,
      },
    });
  } catch (error) {
    console.error("Party outstanding error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to calculate outstanding.",
    });
  }
};