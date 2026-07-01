import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const employeeId = searchParams.get("employeeId");
    const deviceId = searchParams.get("deviceId");
    const limit = parseInt(searchParams.get("limit") || "100");

    const where: any = {};

    if (startDate && endDate) {
      where.scanTime = {
        gte: new Date(startDate),
        lte: new Date(endDate + "T23:59:59"),
      };
    }

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (deviceId) {
      where.deviceId = deviceId;
    }

    const logs = await prisma.attendanceLog.findMany({
      where,
      include: {
        employee: { select: { name: true, pin: true, department: true } },
        device: { select: { name: true } },
      },
      orderBy: { scanTime: "desc" },
      take: limit,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("[API] Get attendance logs error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data log absensi" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeId, deviceId, scanTime, verifyMethod, status } = body;

    if (!employeeId || !deviceId || !scanTime) {
      return NextResponse.json(
        { error: "employeeId, deviceId, dan scanTime wajib diisi" },
        { status: 400 }
      );
    }

    // Check for duplicate
    const scanDate = new Date(scanTime);
    const existing = await prisma.attendanceLog.findFirst({
      where: {
        employeeId,
        deviceId,
        scanTime: scanDate,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Data absensi untuk waktu ini sudah ada" },
        { status: 409 }
      );
    }

    // Determine status based on count today (alternate IN/OUT)
    // Calculate WIB date from the scan time
    const wibDate = new Date(scanDate.getTime() + 7 * 60 * 60 * 1000);
    const wibYear = wibDate.getUTCFullYear();
    const wibMonth = String(wibDate.getUTCMonth() + 1).padStart(2, "0");
    const wibDay = String(wibDate.getUTCDate()).padStart(2, "0");
    const wibDateStr = `${wibYear}-${wibMonth}-${wibDay}`;

    const startOfDay = new Date(`${wibDateStr}T00:00:00+07:00`);
    const endOfDay = new Date(`${wibDateStr}T23:59:59.999+07:00`);

    const todayLogCount = await prisma.attendanceLog.count({
      where: {
        employeeId,
        scanTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const autoStatus = todayLogCount % 2 === 0 ? "IN" : "OUT";

    const log = await prisma.attendanceLog.create({
      data: {
        employeeId,
        deviceId,
        scanTime: scanDate,
        verifyMethod: verifyMethod || "1",
        status: status || autoStatus,
        type: "manual",
      },
      include: {
        employee: { select: { name: true, pin: true, department: true } },
        device: { select: { name: true } },
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("[API] Create attendance log error:", error);
    return NextResponse.json(
      { error: "Gagal membuat data absensi" },
      { status: 500 }
    );
  }
}
