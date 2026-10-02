
import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export const getUnits = async (
  _req: Request,
  res: Response
) => {
  try {
    const units = await prisma.unit.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        nameEn: "asc",
      },
    });

    return res.json({
      success: true,
      data: units,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve units.",
    });
  }
};

export const createUnit = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      name,
      nameEn,
      nameHi,
      shortName,
    } = req.body;

    const englishName = String(nameEn ?? name ?? "").trim();

    if (!englishName || !shortName) {
      return res.status(400).json({
        success: false,
        message:
          "English unit name and short name are required.",
      });
    }

    const unit = await prisma.unit.create({
      data: {
        // Legacy field
        name: englishName,

        // Bilingual fields
        nameEn: englishName,

        nameHi:
          nameHi !== undefined && nameHi !== null
            ? String(nameHi).trim()
            : null,

        shortName: String(shortName).trim(),
      },
    });

    return res.status(201).json({
      success: true,
      message: "Unit created successfully.",
      data: unit,
    });
  } catch (error: any) {
    console.error(error);

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Unit name or short name already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create unit.",
    });
  }
};
