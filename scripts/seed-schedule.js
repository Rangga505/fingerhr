const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const existing = await p.schedule.findFirst({ where: { name: "SM1" } });
  if (existing) {
    console.log("SM1 sudah ada:", existing.id);
  } else {
    const s = await p.schedule.create({
      data: { name: "SM1", startTime: "08:30", endTime: "16:30", graceMinutes: 15, isActive: true },
    });
    console.log("SM1 berhasil dibuat:", s.id);
  }
  await p.$disconnect();
}

main();
