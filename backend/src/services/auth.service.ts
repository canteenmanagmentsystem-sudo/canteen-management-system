import bcrypt from "bcryptjs";

import { prisma } from "../lib/prisma.js";
import { generateToken } from "../utils/jwt.js";

export interface LoginResult {
  token: string;
  user: {
    id: number;
    username: string;
    fullName: string;
    email: string | null;
    role: {
      id: number;
      name: string;
    };
  };
}

export const loginUser = async (
  username: string,
  password: string
): Promise<LoginResult> => {
  const user = await prisma.user.findUnique({
    where: {
      username,
    },
    include: {
      role: true,
    },
  });

  if (!user) {
    throw new Error("Invalid username or password.");
  }

  if (user.status !== "ACTIVE") {
    throw new Error("User account is not active.");
  }

  const passwordValid = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!passwordValid) {
    throw new Error("Invalid username or password.");
  }

  const token = generateToken({
    userId: user.id,
    username: user.username,
    roleId: user.role.id,
    roleName: user.role.name,
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: {
        id: user.role.id,
        name: user.role.name,
      },
    },
  };
};