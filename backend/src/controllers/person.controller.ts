
import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export const getPersons = async (
  req: Request,
  res: Response
) => {
  try {
    const search = String(req.query.search || "").trim();

    const persons = await prisma.person.findMany({
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
                  employeeCode: {
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
        party: true,
        department: true,
      },
      orderBy: {
        nameEn: "asc",
      },
    });

    return res.json({
      success: true,
      data: persons,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve persons.",
    });
  }
};

export const createPerson = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      employeeCode,
      name,
      nameEn,
      nameHi,
      gender,
      mobile,
      email,
      partyId,
      departmentId,
    } = req.body;

    const englishName = String(nameEn ?? name ?? "").trim();

    if (!englishName) {
      return res.status(400).json({
        success: false,
        message: "English person name is required.",
      });
    }

    const person = await prisma.person.create({
      data: {
        employeeCode: employeeCode
          ? String(employeeCode).trim()
          : null,

        // Legacy field
        name: englishName,

        // Bilingual fields
        nameEn: englishName,
        nameHi:
          nameHi !== undefined && nameHi !== null
            ? String(nameHi).trim()
            : null,

        gender: gender || null,

        mobile: mobile
          ? String(mobile).trim()
          : null,

        email: email
          ? String(email).trim()
          : null,

        partyId:
          partyId !== undefined && partyId !== null
            ? Number(partyId)
            : null,

        departmentId:
          departmentId !== undefined &&
          departmentId !== null
            ? Number(departmentId)
            : null,
      },
      include: {
        party: true,
        department: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Person created successfully.",
      data: person,
    });
  } catch (error: any) {
    console.error(error);

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Employee code already exists.",
      });
    }

    if (error.code === "P2003") {
      return res.status(400).json({
        success: false,
        message: "Invalid party or department.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create person.",
    });
  }
};

export const updatePerson = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);

    const {
      name,
      nameEn,
      nameHi,
      gender,
      mobile,
      email,
      partyId,
      departmentId,
    } = req.body;

    const updateData: any = {};

    if (
      nameEn !== undefined ||
      name !== undefined
    ) {
      const englishName = String(
        nameEn ?? name
      ).trim();

      updateData.nameEn = englishName;

      // Keep legacy field synchronized
      updateData.name = englishName;
    }

    if (nameHi !== undefined) {
      updateData.nameHi =
        nameHi === null
          ? null
          : String(nameHi).trim();
    }

    if (gender !== undefined) {
      updateData.gender = gender;
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

    if (partyId !== undefined) {
      updateData.partyId =
        partyId === null
          ? null
          : Number(partyId);
    }

    if (departmentId !== undefined) {
      updateData.departmentId =
        departmentId === null
          ? null
          : Number(departmentId);
    }

    const person = await prisma.person.update({
      where: { id },
      data: updateData,
      include: {
        party: true,
        department: true,
      },
    });

    return res.json({
      success: true,
      message: "Person updated successfully.",
      data: person,
    });
  } catch (error: any) {
    console.error(error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Person not found.",
      });
    }

    if (error.code === "P2003") {
      return res.status(400).json({
        success: false,
        message: "Invalid party or department.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update person.",
    });
  }
};
