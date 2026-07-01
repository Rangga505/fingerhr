import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const scheduleSchema = z.object({
  name: z.string().min(1, "Nama jadwal wajib diisi"),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format jam: HH:MM"),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format jam: HH:MM"),
  breakStart: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format jam: HH:MM").optional().nullable(),
  breakEnd: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format jam: HH:MM").optional().nullable(),
  overtimeStart: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format jam: HH:MM").optional().nullable(),
  overtimeRate: z.number().min(1).max(5).optional().default(1.5),
  graceMinutes: z.number().min(0).max(120).optional().default(15),
});

export async function GET() {
  try {
    const schedules = await prisma.schedule.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { employees: true },
        },
      },
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error("[API] Get schedules error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data jadwal" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = scheduleSchema.parse(body);

    const schedule = await prisma.schedule.create({
      data: {
        name: validated.name,
        startTime: validated.startTime,
        endTime: validated.endTime,
        breakStart: validated.breakStart,
        breakEnd: validated.breakEnd,
        overtimeStart: validated.overtimeStart,
        overtimeRate: validated.overtimeRate ?? 1.5,
        graceMinutes: validated.graceMinutes ?? 15,
      },
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validasi gagal", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[API] Create schedule error:", error);
    return NextResponse.json(
      { error: "Gagal membuat jadwal" },
      { status: 500 }
    );
  }
}
