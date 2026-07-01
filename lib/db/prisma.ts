import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const url = process.env.DATABASE_URL || "";
  // Disable prepared statements for Supabase PgBouncer compatibility
  const separator = url.includes("?") ? "&" : "?";
  const finalUrl = `${url}${separator}prepared_statement_cache_size=0`;

  return new PrismaClient({
    datasourceUrl: finalUrl,
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
