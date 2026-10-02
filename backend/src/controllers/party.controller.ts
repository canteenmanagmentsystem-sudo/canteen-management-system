
import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export const getParties = async (
  req: Request,
  res: Response
) => {
  try {
    const search = String(req.query.search || "").trim();

    const parties = await prisma.party.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                {
                  partyCode: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  partyName: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  partyNameEn: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  partyNameHi: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  mobile: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        department: true,
      },
      orderBy: {
        partyNameEn: "asc",
      },
    });

    return res.json({
      success: true,
      data: parties,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve parties.",
    });
  }
};

export const createParty = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      partyCode,
      partyName,
      partyNameEn,
      partyNameHi,
      partyType,
      departmentId,
      mobile,
      email,
      address,
      openingBalance,
    } = req.body;

    const englishPartyName = String(
      partyNameEn ?? partyName ?? ""
    ).trim();

    if (!partyCode || !englishPartyName || !partyType) {
      return res.status(400).json({
        success: false,
        message:
          "Party code, English party name and party type are required.",
      });
    }

    const party = await prisma.party.create({
      data: {
        partyCode: String(partyCode).trim().toUpperCase(),

        // Legacy field
        partyName: englishPartyName,

        // Bilingual fields
        partyNameEn: englishPartyName,
        partyNameHi:
          partyNameHi !== undefined && partyNameHi !== null
            ? String(partyNameHi).trim()
            : null,

        partyType,

        departmentId:
          departmentId !== undefined &&
          departmentId !== null
            ? Number(departmentId)
            : null,

        mobile: mobile
          ? String(mobile).trim()
          : null,

        email: email
          ? String(email).trim()
          : null,

        address: address
          ? String(address).trim()
          : null,

        openingBalance: openingBalance || 0,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Party created successfully.",
      data: party,
    });
  } catch (error: any) {
    console.error(error);

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Party code already exists.",
      });
    }

    if (error.code === "P2003") {
      return res.status(400).json({
        success: false,
        message: "Invalid department.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create party.",
    });
  }
};

export const getPartyById = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);

    const party = await prisma.party.findUnique({
      where: { id },
      include: {
        department: true,
        persons: {
          where: {
            isActive: true,
          },
        },
      },
    });

    if (!party) {
      return res.status(404).json({
        success: false,
        message: "Party not found.",
      });
    }

    return res.json({
      success: true,
      data: party,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve party.",
    });
  }
};

export const updateParty = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);

    const {
      partyName,
      partyNameEn,
      partyNameHi,
      partyType,
      departmentId,
      mobile,
      email,
      address,
    } = req.body;

    const updateData: any = {};

    if (
      partyNameEn !== undefined ||
      partyName !== undefined
    ) {
      const englishName = String(
        partyNameEn ?? partyName
      ).trim();

      updateData.partyNameEn = englishName;

      // Keep legacy field synchronized
      updateData.partyName = englishName;
    }

    if (partyNameHi !== undefined) {
      updateData.partyNameHi =
        partyNameHi === null
          ? null
          : String(partyNameHi).trim();
    }

    if (partyType !== undefined) {
      updateData.partyType = partyType;
    }

    if (departmentId !== undefined) {
      updateData.departmentId =
        departmentId === null
          ? null
          : Number(departmentId);
    }

    if (mobile !== undefined) {
      updateData.mobile = mobile
        ? String(mobile).trim()
        : null;
    }

    if (email !== undefined) {
      updateData.email = email
        ? String(email).trim()
        : null;
    }

    if (address !== undefined) {
      updateData.address = address
        ? String(address).trim()
        : null;
    }

    const party = await prisma.party.update({
      where: { id },
      data: updateData,
    });

    return res.json({
      success: true,
      message: "Party updated successfully.",
      data: party,
    });
  } catch (error: any) {
    console.error(error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Party not found.",
      });
    }

    if (error.code === "P2003") {
      return res.status(400).json({
        success: false,
        message: "Invalid department.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update party.",
    });
  }
};

export const deleteParty = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);

    const party = await prisma.party.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return res.json({
      success: true,
      message: "Party deactivated successfully.",
      data: party,
    });
  } catch (error: any) {
    console.error(error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Party not found.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to deactivate party.",
    });
  }
};

