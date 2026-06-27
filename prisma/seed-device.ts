/**
 * Seed Device REVO C269248053121C21
 * Run: npx tsx prisma/seed-device.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding device...");

  // Check if device already exists
  const existing = await prisma.device.findUnique({
    where: { cloudId: "C269248053121C21" },
  });

  if (existing) {
    console.log("✅ Device already exists:", existing.name);
    return;
  }

  // Create device
  const device = await prisma.device.create({
    data: {
      cloudId: "C269248053121C21",
      name: "REVO 208",
      type: "REVO",
      ip: null,
      status: "OFFLINE",
      timezone: "Asia/Jakarta",
    },
  });

  console.log("✅ Device created:", device.name);
  console.log("   Cloud ID:", device.cloudId);
  console.log("   Type:", device.type);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding device:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
