import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const assignSchema = z.object({
  employeeId: z.string().min(1, "Karyawan wajib dipilih"),
  scheduleId: z.string().min(1, "Jadwal wajib dipilih"),
  effectiveFrom: z.string().min(1, "Tanggal berlaku wajib diisi"),
  effectiveTo: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");

    const where: any = {};
    if (employeeId) {
      where.employeeId = employeeId;
    }

    const assignments = await prisma.employeeSchedule.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, pin: true } },
        schedule: true,
      },
      orderBy: { effectiveFrom: "desc" },
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error("[API] Get assignments error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data penugasan" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = assignSchema.parse(body);

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: validated.employeeId },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Karyawan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check if schedule exists
    const schedule = await prisma.schedule.findUnique({
      where: { id: validated.scheduleId },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Jadwal tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check for existing assignment on same date
    const existing = await prisma.employeeSchedule.findFirst({
      where: {
        employeeId: validated.employeeId,
        effectiveFrom: new Date(validated.effectiveFrom),
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Karyawan sudah memiliki jadwal pada tanggal tersebut" },
        { status: 400 }
      );
    }

    const assignment = await prisma.employeeSchedule.create({
      data: {
        employeeId: validated.employeeId,
        scheduleId: validated.scheduleId,
        effectiveFrom: new Date(validated.effectiveFrom),
        effectiveTo: validated.effectiveTo ? new Date(validated.effectiveTo) : null,
      },
      include: {
        employee: { select: { name: true } },
        schedule: true,
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validasi gagal", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[API] Assign schedule error:", error);
    return NextResponse.json(
      { error: "Gagal menugaskan jadwal" },
      { status: 500 }
    );
  }
}
