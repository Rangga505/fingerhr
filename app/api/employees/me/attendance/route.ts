import { NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

const { auth } = NextAuth(authConfig);

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const employee = await prisma.employee.findFirst({
      where: { email: session.user.email },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Data karyawan tidak ditemukan" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = { employeeId: employee.id };

    if (startDate && endDate) {
      where.scanTime = {
        gte: new Date(startDate),
        lte: new Date(endDate + "T23:59:59"),
      };
    }

    const logs = await prisma.attendanceLog.findMany({
      where,
      include: {
        device: { select: { name: true, ip: true } },
      },
      orderBy: { scanTime: "desc" },
      take: 200,
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayLogs = logs.filter((log) => {
      const scanDate = new Date(log.scanTime);
      return scanDate >= today && scanDate <= todayEnd;
    });

    const totalIn = logs.filter((l) => l.status === "IN").length;
    const totalOut = logs.filter((l) => l.status === "OUT").length;

    let avgWorkHours = 0;
    const dayPairs: { in: Date; out: Date }[] = [];
    const logsByDate = new Map<string, typeof logs>();
    for (const log of logs) {
      const dateKey = new Date(log.scanTime).toISOString().split("T")[0];
      if (!logsByDate.has(dateKey)) logsByDate.set(dateKey, []);
      logsByDate.get(dateKey)!.push(log);
    }
    for (const dayLogs of logsByDate.values()) {
      const inLog = dayLogs.find((l) => l.status === "IN");
      const outLog = dayLogs.find((l) => l.status === "OUT");
      if (inLog && outLog) {
        dayPairs.push({ in: new Date(inLog.scanTime), out: new Date(outLog.scanTime) });
      }
    }
    if (dayPairs.length > 0) {
      const totalMinutes = dayPairs.reduce((sum, p) => sum + (p.out.getTime() - p.in.getTime()) / 60000, 0);
      avgWorkHours = totalMinutes / dayPairs.length / 60;
    }

    const latestLog = logs[0] || null;

    return NextResponse.json({
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        department: employee.department,
        position: employee.position,
      },
      logs: logs.map((log) => ({
        id: log.id,
        scanTime: log.scanTime.toISOString(),
        status: log.status,
        verifyMethod: log.verifyMethod,
        type: log.type,
        device: log.device,
      })),
      todayLogs: todayLogs.map((log) => ({
        id: log.id,
        scanTime: log.scanTime.toISOString(),
        status: log.status,
        device: log.device,
      })),
      summary: {
        totalIn,
        totalOut,
        avgWorkHours: Math.round(avgWorkHours * 10) / 10,
        latestAttendance: latestLog
          ? { scanTime: latestLog.scanTime.toISOString(), status: latestLog.status }
          : null,
      },
    });
  } catch (error) {
    console.error("[API] Get my attendance error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data absensi" },
      { status: 500 }
    );
  }
}
