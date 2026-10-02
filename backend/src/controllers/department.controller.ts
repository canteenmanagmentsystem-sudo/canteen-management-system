
import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export const getDepartments = async (
  req: Request,
  res: Response
) => {
  try {
    const search = String(req.query.search || "").trim();

    const departments = await prisma.department.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                {
                  name: {
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
                  code: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: {
        nameEn: "asc",
      },
    });

    return res.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve departments.",
    });
  }
};

export const getDepartmentById = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);

    const department = await prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found.",
      });
    }

    return res.json({
      success: true,
      data: department,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve department.",
    });
  }
};

export const createDepartment = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      code,
      name,
      nameEn,
      nameHi,
      description,
      descriptionEn,
      descriptionHi,
    } = req.body;

    const englishName = String(nameEn ?? name ?? "").trim();

    if (!code || !englishName) {
      return res.status(400).json({
        success: false,
        message: "Department code and English name are required.",
      });
    }

    const department = await prisma.department.create({
      data: {
        code: String(code).trim().toUpperCase(),

        // Legacy field
        name: englishName,

        // Bilingual fields
        nameEn: englishName,
        nameHi:
          nameHi !== undefined && nameHi !== null
            ? String(nameHi).trim()
            : null,

        description:
          description !== undefined && description !== null
            ? String(description).trim()
            : null,

        descriptionEn:
          descriptionEn !== undefined && descriptionEn !== null
            ? String(descriptionEn).trim()
            : description
              ? String(description).trim()
              : null,

        descriptionHi:
          descriptionHi !== undefined && descriptionHi !== null
            ? String(descriptionHi).trim()
            : null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Department created successfully.",
      data: department,
    });
  } catch (error: any) {
    console.error(error);

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Department code already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create department.",
    });
  }
};

export const updateDepartment = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);

    const {
      code,
      name,
      nameEn,
      nameHi,
      description,
      descriptionEn,
      descriptionHi,
    } = req.body;

    const updateData: any = {};

    if (code !== undefined) {
      updateData.code = String(code).trim().toUpperCase();
    }

    if (nameEn !== undefined || name !== undefined) {
      const englishName = String(nameEn ?? name).trim();

      updateData.nameEn = englishName;

      // Keep legacy field synchronized
      updateData.name = englishName;
    }

    if (nameHi !== undefined) {
      updateData.nameHi =
        nameHi === null ? null : String(nameHi).trim();
    }

    if (descriptionEn !== undefined || description !== undefined) {
      const englishDescription =
        descriptionEn !== undefined
          ? descriptionEn
          : description;

      updateData.descriptionEn =
        englishDescription === null
          ? null
          : String(englishDescription).trim();

      // Keep legacy field synchronized
      updateData.description =
        englishDescription === null
          ? null
          : String(englishDescription).trim();
    }

    if (descriptionHi !== undefined) {
      updateData.descriptionHi =
        descriptionHi === null
          ? null
          : String(descriptionHi).trim();
    }

    const department = await prisma.department.update({
      where: { id },
      data: updateData,
    });

    return res.json({
      success: true,
      message: "Department updated successfully.",
      data: department,
    });
  } catch (error: any) {
    console.error(error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Department not found.",
      });
    }

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Department code already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update department.",
    });
  }
};

export const deleteDepartment = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);

    const department = await prisma.department.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return res.json({
      success: true,
      message: "Department deactivated successfully.",
      data: department,
    });
  } catch (error: any) {
    console.error(error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Department not found.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to deactivate department.",
    });
  }
};

