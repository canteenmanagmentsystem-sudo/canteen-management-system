import { Response } from "express";
import { prisma } from "../lib/prisma.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

const generateReceiptNo = () => {
  const now = new Date();

  const datePart =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");

  const timePart =
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");

  return `PAY-${datePart}-${timePart}-${Math.floor(
    Math.random() * 1000
  )
    .toString()
    .padStart(3, "0")}`;
};

/**
 * GET /api/payments
 */
export const getPayments = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { partyId, paymentMode, fromDate, toDate, search } = req.query;

    const where: any = {
      status: "POSTED",
    };

    if (partyId) {
      where.partyId = Number(partyId);
    }

    if (paymentMode) {
      where.paymentMode = String(paymentMode);
    }

    if (fromDate || toDate) {
      where.paymentDate = {};

      if (fromDate) {
        where.paymentDate.gte = new Date(`${fromDate}T00:00:00`);
      }

      if (toDate) {
        where.paymentDate.lte = new Date(`${toDate}T23:59:59`);
      }
    }

    if (search) {
      where.OR = [
        {
          receiptNo: {
            contains: String(search),
            mode: "insensitive",
          },
        },
        {
          referenceNo: {
            contains: String(search),
            mode: "insensitive",
          },
        },
        {
          party: {
            partyName: {
              contains: String(search),
              mode: "insensitive",
            },
          },
        },
        {
          party: {
            partyNameEn: {
              contains: String(search),
              mode: "insensitive",
            },
          },
        },
        {
          party: {
            partyNameHi: {
              contains: String(search),
              mode: "insensitive",
            },
          },
        },
      ];
    }

    const payments = await prisma.payment.findMany({
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
        createdBy: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        paymentDate: "desc",
      },
    });

    return res.json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    console.error("Get payments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch payments.",
    });
  }
};

/**
 * GET /api/payments/:id
 */
export const getPaymentById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID.",
      });
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        party: true,
        createdBy: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        ledgerEntries: true,
      },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found.",
      });
    }

    return res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("Get payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment.",
    });
  }
};

/**
 * POST /api/payments
 */
export const createPayment = async (
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
      partyId,
      amount,
      paymentMode,
      paymentDate,
      referenceNo,
      remarks,
    } = req.body;

    const parsedPartyId = Number(partyId);
    const parsedAmount = Number(amount);

    if (!Number.isInteger(parsedPartyId)) {
      return res.status(400).json({
        success: false,
        message: "Valid partyId is required.",
      });
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be greater than zero.",
      });
    }

    const validPaymentModes = [
      "CASH",
      "UPI",
      "CARD",
      "BANK_TRANSFER",
      "CHEQUE",
      "ADJUSTMENT",
      "OTHER",
    ];

    if (!validPaymentModes.includes(paymentMode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment mode.",
      });
    }

    const party = await prisma.party.findUnique({
      where: {
        id: parsedPartyId,
      },
    });

    if (!party) {
      return res.status(404).json({
        success: false,
        message: "Party not found.",
      });
    }

    if (!party.isActive) {
      return res.status(400).json({
        success: false,
        message: "Selected party is inactive.",
      });
    }

    const receiptNo = generateReceiptNo();

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          receiptNo,
          paymentDate: paymentDate
            ? new Date(paymentDate)
            : new Date(),
          amount: parsedAmount,
          paymentMode,
          status: "POSTED",
          partyId: parsedPartyId,
          referenceNo: referenceNo || null,
          remarks: remarks || null,
          createdById: Number(req.user!.userId),
        },
      });

      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          entryDate: payment.paymentDate,
          entryType: "PAYMENT",
          partyId: parsedPartyId,
          paymentId: payment.id,
          debit: 0,
          credit: parsedAmount,
          description:
            remarks ||
            `Payment received - ${receiptNo}`,
        },
      });

      return {
        payment,
        ledgerEntry,
      };
    });

    return res.status(201).json({
      success: true,
      message: "Payment created successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Create payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create payment.",
    });
  }
};