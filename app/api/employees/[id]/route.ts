import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const employeeUpdateSchema = z.object({
  pin: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        attendanceLogs: {
          take: 10,
          orderBy: { scanTime: "desc" },
          include: { device: { select: { name: true } } },
        },
        schedules: {
          include: { schedule: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Karyawan tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error("[API] Get employee error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data karyawan" },
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
    const validated = employeeUpdateSchema.parse(body);

    // Check if employee exists
    const existing = await prisma.employee.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Karyawan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check PIN uniqueness if changed
    if (validated.pin && validated.pin !== existing.pin) {
      const pinExists = await prisma.employee.findUnique({
        where: { pin: validated.pin },
      });
      if (pinExists) {
        return NextResponse.json(
          { error: "PIN sudah digunakan oleh karyawan lain" },
          { status: 400 }
        );
      }
    }

    // Check email uniqueness if changed
    if (validated.email && validated.email !== existing.email) {
      const emailExists = await prisma.employee.findUnique({
        where: { email: validated.email },
      });
      if (emailExists) {
        return NextResponse.json(
          { error: "Email sudah digunakan oleh karyawan lain" },
          { status: 400 }
        );
      }
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: validated,
    });

    return NextResponse.json(employee);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validasi gagal", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[API] Update employee error:", error);
    return NextResponse.json(
      { error: "Gagal mengupdate karyawan" },
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

    const existing = await prisma.employee.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Karyawan tidak ditemukan" },
        { status: 404 }
      );
    }

    await prisma.employee.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Karyawan berhasil dihapus" });
  } catch (error) {
    console.error("[API] Delete employee error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus karyawan" },
      { status: 500 }
    );
  }
}
