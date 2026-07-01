import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

interface EmployeeReport {
  employeeId: string;
  employeeName: string;
  pin: string;
  department: string | null;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalOvertime: number;
  totalWorkHours: number;
}

function getDateRange(type: string, date: string) {
  const d = new Date(date);
  let start: Date;
  let end: Date;

  if (type === "daily") {
    start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
    end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
  } else if (type === "weekly") {
    const dayOfWeek = d.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    start = new Date(d.getFullYear(), d.getMonth(), d.getDate() + mondayOffset, 0, 0, 0);
    end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59);
  } else {
    // monthly
    start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0);
    end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
  }

  return { start, end };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, date, employeeId } = body;

    if (!type || !date) {
      return NextResponse.json(
        { error: "type dan date wajib diisi" },
        { status: 400 }
      );
    }

    if (!["daily", "weekly", "monthly"].includes(type)) {
      return NextResponse.json(
        { error: "type harus daily, weekly, atau monthly" },
        { status: 400 }
      );
    }

    const { start, end } = getDateRange(type, date);

    // Get employees
    const employeeWhere: any = { isActive: true };
    if (employeeId) {
      employeeWhere.id = employeeId;
    }

    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      orderBy: { name: "asc" },
    });

    // Get schedules for reference
    const schedules = await prisma.schedule.findMany({
      where: { isActive: true },
    });
    const defaultSchedule = schedules[0] || {
      startTime: "08:30",
      endTime: "16:30",
      graceMinutes: 15,
    };

    const reports: EmployeeReport[] = [];
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalOvertime = 0;

    for (const emp of employees) {
      const logs = await prisma.attendanceLog.findMany({
        where: {
          employeeId: emp.id,
          scanTime: { gte: start, lte: end },
        },
        orderBy: { scanTime: "asc" },
      });

      // Group logs by date
      const logsByDate = new Map<string, typeof logs>();
      for (const log of logs) {
        const dateKey = log.scanTime.toISOString().split("T")[0];
        if (!logsByDate.has(dateKey)) {
          logsByDate.set(dateKey, []);
        }
        logsByDate.get(dateKey)!.push(log);
      }

      let empPresent = 0;
      let empAbsent = 0;
      let empLate = 0;
      let empOvertime = 0;
      let empWorkHours = 0;

      // Iterate working days in range
      const current = new Date(start);
      while (current <= end) {
        // Skip weekends
        if (current.getDay() !== 0 && current.getDay() !== 6) {
          const dateKey = current.toISOString().split("T")[0];
          const dayLogs = logsByDate.get(dateKey) || [];
          const clockInLog = dayLogs.find((l) => l.status === "IN");
          const clockOutLog = dayLogs.find((l) => l.status === "OUT");

          if (clockInLog) {
            empPresent++;

            // Check late
            const [startH, startM] = defaultSchedule.startTime.split(":").map(Number);
            const clockInTime = clockInLog.scanTime;
            const clockMinutes = clockInTime.getHours() * 60 + clockInTime.getMinutes();
            const scheduleMinutes = startH * 60 + startM;

            if (clockMinutes > scheduleMinutes + defaultSchedule.graceMinutes) {
              empLate++;
            }

              // Calculate work hours
              if (clockOutLog) {
                const outTime = clockOutLog.scanTime;
                const diffMs = outTime.getTime() - clockInTime.getTime();
                const diffHours = diffMs / (1000 * 60 * 60);
                empWorkHours += diffHours;

                // Check overtime (after 17:00)
                const outMinutes = outTime.getHours() * 60 + outTime.getMinutes();
                if (outMinutes > 17 * 60) {
                  empOvertime++;
                }
              }
          } else {
            empAbsent++;
          }
        }
        current.setDate(current.getDate() + 1);
      }

      reports.push({
        employeeId: emp.id,
        employeeName: emp.name,
        pin: emp.pin,
        department: emp.department,
        totalPresent: empPresent,
        totalAbsent: empAbsent,
        totalLate: empLate,
        totalOvertime: empOvertime,
        totalWorkHours: Math.round(empWorkHours * 100) / 100,
      });

      totalPresent += empPresent;
      totalAbsent += empAbsent;
      totalLate += empLate;
      totalOvertime += empOvertime;
    }

    return NextResponse.json({
      type,
      date,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      summary: {
        totalEmployees: employees.length,
        totalPresent,
        totalAbsent,
        totalLate,
        totalOvertime,
      },
      reports,
    });
  } catch (error) {
    console.error("[API] Generate report error:", error);
    return NextResponse.json(
      { error: "Gagal generate laporan" },
      { status: 500 }
    );
  }
}
