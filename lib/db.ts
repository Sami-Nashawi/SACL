import { PrismaClient } from "@prisma/client";

// One shared database connection, reused while the dev server reloads.
const g = globalThis as unknown as { prisma?: PrismaClient };
export const db = g.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.prisma = db;
