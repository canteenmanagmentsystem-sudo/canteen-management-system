import { Request, Response } from "express";

import { prisma } from "../lib/prisma.js";
import { loginUser } from "../services/auth.service.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

export const login = async (
  req: Request,
  res: Response
) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required.",
      });
    }

    const result = await loginUser(
      String(username).trim(),
      String(password)
    );

    return res.json({
      success: true,
      message: "Login successful.",
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Login failed.";

    return res.status(401).json({
      success: false,
      message,
    });
  }
};

export const getCurrentUser = async (
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

  const user = await prisma.user.findUnique({
  where: {
    id: req.user.userId,
  },
  include: {
    role: {
      include: {
        rolePermissions: {
          where: {
            permission: {
              isActive: true,
            },
          },
          include: {
            permission: true,
          },
        },
      },
    },
  },
});

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

   return res.json({
  success: true,
  user: {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    mobile: user.mobile,
    status: user.status,

    role: {
      id: user.role.id,
      name: user.role.name,
    },

    permissions: user.role.rolePermissions.map(
     (item: { permission: { code: string } }) => item.permission.code
    ),
  },
});
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve current user.",
    });
  }
};

export const logout = async (
  _req: AuthenticatedRequest,
  res: Response
) => {
  return res.json({
    success: true,
    message:
      "Logout successful. Remove the access token from the client.",
  });
};