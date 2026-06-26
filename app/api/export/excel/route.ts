import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import ExcelJS from "exceljs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const employeeId = searchParams.get("employeeId");

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

    const logs = await prisma.attendanceLog.findMany({
      where,
      include: {
        employee: { select: { name: true, pin: true, department: true } },
        device: { select: { name: true } },
      },
      orderBy: { scanTime: "desc" },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "FingerHR";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Laporan Absensi");

    // Header styling
    sheet.columns = [
      { header: "Tanggal", key: "date", width: 12 },
      { header: "Jam", key: "time", width: 10 },
      { header: "PIN", key: "pin", width: 10 },
      { header: "Nama", key: "name", width: 25 },
      { header: "Departemen", key: "department", width: 20 },
      { header: "Status", key: "status", width: 10 },
      { header: "Metode", key: "method", width: 15 },
      { header: "Sumber", key: "source", width: 12 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF6366F1" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    // Add data rows
    for (const log of logs) {
      const verifyMethod =
        log.verifyMethod === "1"
          ? "Password"
          : log.verifyMethod === "2"
          ? "Fingerprint"
          : log.verifyMethod === "3"
          ? "Card"
          : "-";

      sheet.addRow({
        date: new Date(log.scanTime).toLocaleDateString("id-ID"),
        time: new Date(log.scanTime).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        pin: log.employee.pin,
        name: log.employee.name,
        department: log.employee.department || "-",
        status: log.status === "IN" ? "Masuk" : "Keluar",
        method: verifyMethod,
        source: log.type === "realtime" ? "Realtime" : "Manual",
      });
    }

    // Auto-filter
    sheet.autoFilter = {
      from: "A1",
      to: `H${logs.length + 1}`,
    };

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=laporan-absensi-${
          startDate || "all"
        }.xlsx`,
      },
    });
  } catch (error) {
    console.error("[API] Export Excel error:", error);
    return NextResponse.json(
      { error: "Gagal export data" },
      { status: 500 }
    );
  }
}
