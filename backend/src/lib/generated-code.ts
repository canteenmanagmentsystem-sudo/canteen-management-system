import { randomUUID } from "node:crypto";

export const generateCode = (prefix: string): string =>
  `${prefix}-${randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase()}`;
