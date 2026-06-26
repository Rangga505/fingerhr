import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const settings = await prisma.systemSettings.findMany();
    const mapped: Record<string, string> = {};
    for (const s of settings) {
      mapped[s.key] = s.value;
    }
    return NextResponse.json(mapped);
  } catch (error) {
    console.error("[API] Get settings error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil pengaturan" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    for (const [key, value] of Object.entries(body)) {
      await prisma.systemSettings.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    return NextResponse.json({ message: "Pengaturan berhasil disimpan" });
  } catch (error) {
    console.error("[API] Update settings error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan pengaturan" },
      { status: 500 }
    );
  }
}
