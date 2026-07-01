import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  getAttendanceLog,
  getUserInfo,
  getAllPin,
  setDeviceTime,
  restartDevice,
  setUserInfo,
  deleteUserInfo,
  getDevice,
  formatDateForAPI,
} from "@/lib/fingerspot";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { command, startDate, endDate, pin, userData, timezone, transId } = body;

    // Find device
    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      return NextResponse.json(
        { error: "Perangkat tidak ditemukan" },
        { status: 404 }
      );
    }

    const startTime = Date.now();
    let result;
    let status = "SUCCESS";

    // Create API log
    const apiLog = await prisma.apiLog.create({
      data: {
        command,
        deviceCloudId: device.cloudId,
        status: "PENDING",
        requestPayload: body,
      },
    });

    try {
      switch (command) {
        case "GET_DEVICE":
          result = await getDevice(transId || "1");
          break;

        case "GET_ATTLOG": {
          const start = startDate || formatDateForAPI(new Date(Date.now() - 86400000));
          const end = endDate || formatDateForAPI(new Date());
          result = await getAttendanceLog(start, end);

          if (result.success && result.data) {
            // Save attendance logs to database
            const logs = result.data.data || result.data.attlog || [];
            for (const log of logs) {
              const employee = await prisma.employee.findUnique({
                where: { pin: String(log.pin) },
              });

              if (employee) {
                // Parse scan time - device sends local time in WIB (Asia/Jakarta, UTC+7)
                const scanTimeStr = String(log.scan).replace(" ", "T") + "+07:00";
                const scanTime = new Date(scanTimeStr);

                // Count existing logs for this employee today (in WIB timezone)
                const wibDate = new Date(scanTime.getTime() + 7 * 60 * 60 * 1000);
                const wibYear = wibDate.getUTCFullYear();
                const wibMonth = String(wibDate.getUTCMonth() + 1).padStart(2, "0");
                const wibDay = String(wibDate.getUTCDate()).padStart(2, "0");
                const wibDateStr = `${wibYear}-${wibMonth}-${wibDay}`;

                const startOfDay = new Date(`${wibDateStr}T00:00:00+07:00`);
                const endOfDay = new Date(`${wibDateStr}T23:59:59.999+07:00`);

                const todayLogCount = await prisma.attendanceLog.count({
                  where: {
                    employeeId: employee.id,
                    scanTime: {
                      gte: startOfDay,
                      lte: endOfDay,
                    },
                  },
                });

                const statusScan = todayLogCount % 2 === 0 ? "IN" : "OUT";

                // Check duplicate
                const existing = await prisma.attendanceLog.findFirst({
                  where: {
                    employeeId: employee.id,
                    deviceId: device.id,
                    scanTime,
                  },
                });

                if (!existing) {
                  await prisma.attendanceLog.create({
                    data: {
                      employeeId: employee.id,
                      deviceId: device.id,
                      scanTime,
                      verifyMethod: String(log.verify || "1"),
                      status: statusScan,
                      type: "manual",
                      rawPayload: log,
                    },
                  });
                }
              }
            }
          }
          break;
        }

        case "GET_USERINFO":
          result = await getUserInfo(pin);
          break;

        case "SET_USERINFO":
          result = await setUserInfo({
            pin: userData.pin,
            name: userData.name,
            password: userData.password,
            card: userData.card,
            privilege: userData.privilege,
          });
          break;

        case "DELETE_USERINFO":
          result = await deleteUserInfo(pin);
          break;

        case "GET_ALL_PIN":
          result = await getAllPin();
          break;

        case "SET_TIME":
          result = await setDeviceTime(timezone || "Asia/Jakarta");
          break;

        case "RESTART":
          result = await restartDevice(transId || "1");
          break;

        default:
          return NextResponse.json(
            { error: `Command tidak dikenal: ${command}` },
            { status: 400 }
          );
      }

      status = result?.success ? "SUCCESS" : "FAILED";
    } catch (err) {
      status = "FAILED";
      result = { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }

    const duration = Date.now() - startTime;

    // Update API log
    await prisma.apiLog.update({
      where: { id: apiLog.id },
      data: {
        status,
        responsePayload: result as any,
        errorMessage: result?.success ? null : result?.error,
        duration,
      },
    });

    return NextResponse.json({
      success: result?.success ?? false,
      command,
      duration,
      data: result?.data,
      error: result?.error,
    });
  } catch (error) {
    console.error("[API] Device command error:", error);
    return NextResponse.json(
      { error: "Gagal menjalankan command" },
      { status: 500 }
    );
  }
}
