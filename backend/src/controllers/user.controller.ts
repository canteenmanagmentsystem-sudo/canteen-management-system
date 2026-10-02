import { Request, Response } from "express";
import bcrypt from "bcryptjs";

import { prisma } from "../lib/prisma.js";

export const getUsers = async (
  _req: Request,
  res: Response
) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        mobile: true,
        status: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        fullName: "asc",
      },
    });

    return res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve users.",
    });
  }
};

export const createUser = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      username,
      password,
      fullName,
      email,
      mobile,
      roleId,
    } = req.body;

    if (!username || !password || !fullName || !roleId) {
      return res.status(400).json({
        success: false,
        message:
          "Username, password, full name and role are required.",
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        username: String(username).trim(),
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Username already exists.",
      });
    }

    const role = await prisma.role.findUnique({
      where: {
        id: Number(roleId),
      },
    });

    if (!role || !role.isActive) {
      return res.status(400).json({
        success: false,
        message: "Invalid or inactive role.",
      });
    }

    const passwordHash = await bcrypt.hash(
      String(password),
      12
    );

    const user = await prisma.user.create({
      data: {
        username: String(username).trim(),
        passwordHash,
        fullName: String(fullName).trim(),
        email: email ? String(email).trim() : null,
        mobile: mobile ? String(mobile).trim() : null,
        roleId: Number(roleId),
        status: "ACTIVE",
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        mobile: true,
        status: true,
        roleId: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully.",
      data: user,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to create user.",
    });
  }
};