import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { setUserInfo } from "@/lib/fingerspot";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeId } = body;

    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID wajib diisi" },
        { status: 400 }
      );
    }

    // Find employee
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Karyawan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Find device (use first device for now)
    const device = await prisma.device.findFirst();

    if (!device) {
      return NextResponse.json(
        { error: "Tidak ada perangkat yang terdaftar" },
        { status: 400 }
      );
    }

    // Create API log
    const apiLog = await prisma.apiLog.create({
      data: {
        command: "SET_USERINFO",
        deviceCloudId: device.cloudId,
        status: "PENDING",
        requestPayload: {
          pin: employee.pin,
          name: employee.name,
        },
      },
    });

    // Send to device
    const result = await setUserInfo({
      pin: employee.pin,
      name: employee.name,
      privilege: "0",
    });

    // Update API log
    await prisma.apiLog.update({
      where: { id: apiLog.id },
      data: {
        status: result.success ? "SUCCESS" : "FAILED",
        responsePayload: result as any,
        errorMessage: result.success ? null : result.error,
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "Gagal sinkronisasi ke mesin", details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil sinkronisasi ${employee.name} ke mesin`,
    });
  } catch (error) {
    console.error("[API] Sync employee error:", error);
    return NextResponse.json(
      { error: "Gagal sinkronisasi karyawan" },
      { status: 500 }
    );
  }
}
