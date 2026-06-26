import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const permissionSchema = z.object({
  employeeId: z.string().min(1, "Karyawan wajib dipilih"),
  type: z.enum(["SICK", "CUTI", "IZIN"], { message: "Tipe izin tidak valid" }),
  startDate: z.string().min(1, "Tanggal mulai wajib diisi"),
  endDate: z.string().min(1, "Tanggal selesai wajib diisi"),
  reason: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const type = searchParams.get("type") || "";
    const employeeId = searchParams.get("employeeId") || "";

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (employeeId) {
      where.employeeId = employeeId;
    }

    const permissions = await prisma.permission.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, pin: true, department: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(permissions);
  } catch (error) {
    console.error("[API] Get permissions error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data izin" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = permissionSchema.parse(body);

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

    const permission = await prisma.permission.create({
      data: {
        employeeId: validated.employeeId,
        type: validated.type,
        startDate: new Date(validated.startDate),
        endDate: new Date(validated.endDate),
        reason: validated.reason,
        status: "PENDING",
      },
      include: {
        employee: { select: { name: true } },
      },
    });

    return NextResponse.json(permission, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validasi gagal", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[API] Create permission error:", error);
    return NextResponse.json(
      { error: "Gagal mengajukan izin" },
      { status: 500 }
    );
  }
}
