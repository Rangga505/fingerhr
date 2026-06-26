import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const employeeSchema = z.object({
  pin: z.string().min(1, "PIN wajib diisi"),
  name: z.string().min(1, "Nama wajib diisi"),
  email: z.string().email("Email tidak valid").optional().nullable(),
  phone: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const department = searchParams.get("department") || "";
    const status = searchParams.get("status") || "";

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { pin: { contains: search } },
      ];
    }

    if (department) {
      where.department = department;
    }

    if (status === "active") {
      where.isActive = true;
    } else if (status === "inactive") {
      where.isActive = false;
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        attendanceLogs: {
          take: 1,
          orderBy: { scanTime: "desc" },
          select: { scanTime: true },
        },
      },
    });

    // Get departments for filter
    const departments = await prisma.employee.findMany({
      select: { department: true },
      where: { department: { not: null } },
      distinct: ["department"],
    });

    // Format response
    const formatted = employees.map((emp) => ({
      id: emp.id,
      pin: emp.pin,
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      department: emp.department,
      position: emp.position,
      isActive: emp.isActive,
      lastAttendance: emp.attendanceLogs[0]?.scanTime?.toISOString() || null,
      createdAt: emp.createdAt.toISOString(),
    }));

    return NextResponse.json({
      employees: formatted,
      departments: departments.map((d) => d.department).filter(Boolean),
    });
  } catch (error) {
    console.error("[API] Get employees error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data karyawan" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = employeeSchema.parse(body);

    // Check if PIN already exists
    const existing = await prisma.employee.findUnique({
      where: { pin: validated.pin },
    });

    if (existing) {
      return NextResponse.json(
        { error: "PIN sudah digunakan oleh karyawan lain" },
        { status: 400 }
      );
    }

    // Check email uniqueness if provided
    if (validated.email) {
      const existingEmail = await prisma.employee.findUnique({
        where: { email: validated.email },
      });
      if (existingEmail) {
        return NextResponse.json(
          { error: "Email sudah digunakan oleh karyawan lain" },
          { status: 400 }
        );
      }
    }

    const employee = await prisma.employee.create({
      data: {
        pin: validated.pin,
        name: validated.name,
        email: validated.email,
        phone: validated.phone,
        department: validated.department,
        position: validated.position,
        isActive: validated.isActive ?? true,
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validasi gagal", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[API] Create employee error:", error);
    return NextResponse.json(
      { error: "Gagal membuat karyawan" },
      { status: 500 }
    );
  }
}
