import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const scheduleUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  startTime: z.string().regex(/^([01]?[2-9]|1[0-2]):[0-5][0-9]$/).optional(),
  endTime: z.string().regex(/^([01]?[2-9]|1[0-2]):[0-5][0-9]$/).optional(),
  graceMinutes: z.number().min(0).max(120).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const schedule = await prisma.schedule.findUnique({
      where: { id },
      include: {
        employees: {
          include: {
            employee: { select: { id: true, name: true, pin: true } },
          },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Jadwal tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("[API] Get schedule error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data jadwal" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = scheduleUpdateSchema.parse(body);

    const existing = await prisma.schedule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Jadwal tidak ditemukan" },
        { status: 404 }
      );
    }

    const schedule = await prisma.schedule.update({
      where: { id },
      data: validated,
    });

    return NextResponse.json(schedule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validasi gagal", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[API] Update schedule error:", error);
    return NextResponse.json(
      { error: "Gagal mengupdate jadwal" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.schedule.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Jadwal tidak ditemukan" },
        { status: 404 }
      );
    }

    if (existing._count.employees > 0) {
      return NextResponse.json(
        { error: "Tidak bisa menghapus jadwal yang masih ditugaskan ke karyawan" },
        { status: 400 }
      );
    }

    await prisma.schedule.delete({ where: { id } });

    return NextResponse.json({ message: "Jadwal berhasil dihapus" });
  } catch (error) {
    console.error("[API] Delete schedule error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus jadwal" },
      { status: 500 }
    );
  }
}
