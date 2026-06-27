import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAllPin, getUserInfo, setUserInfo, deleteUserInfo, registerOnline } from "@/lib/fingerspot";

/**
 * POST /api/employees/sync
 * Trigger sync dari device: GetAllPin → GetUserinfo untuk setiap PIN → save ke database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, employeeId, pin, name, password, card, privilege, transId } = body;

    const device = await prisma.device.findFirst();
    if (!device) {
      return NextResponse.json(
        { error: "Tidak ada perangkat yang terdaftar" },
        { status: 400 }
      );
    }

    switch (action) {
      case "sync-from-device": {
        // Trigger GetAllPin - response via webhook
        const result = await getAllPin(transId || "1");
        
        if (!result.success) {
          return NextResponse.json(
            { error: "Gagal mengambil data PIN dari mesin", details: result.error },
            { status: 500 }
          );
        }

        // Log the command
        await prisma.apiLog.create({
          data: {
            command: "GET_ALL_PIN",
            deviceCloudId: device.cloudId,
            status: "SUCCESS",
            requestPayload: { action: "sync-from-device" },
            responsePayload: result.data,
          },
        });

        return NextResponse.json({
          success: true,
          message: "Sync dari mesin sedang diproses. Data akan muncul secara otomatis.",
          data: result.data,
        });
      }

      case "get-userinfo": {
        // Get user info untuk PIN tertentu
        if (!pin) {
          return NextResponse.json(
            { error: "PIN wajib diisi" },
            { status: 400 }
          );
        }

        const result = await getUserInfo(pin);
        
        await prisma.apiLog.create({
          data: {
            command: "GET_USERINFO",
            deviceCloudId: device.cloudId,
            status: result.success ? "SUCCESS" : "FAILED",
            requestPayload: { pin },
            responsePayload: result.data,
            errorMessage: result.success ? null : result.error,
          },
        });

        return NextResponse.json({
          success: result.success,
          data: result.data,
          error: result.error,
        });
      }

      case "set-userinfo": {
        // Set user info ke device
        if (!pin || !name) {
          return NextResponse.json(
            { error: "PIN dan Nama wajib diisi" },
            { status: 400 }
          );
        }

        const result = await setUserInfo({
          pin,
          name,
          password: password || "",
          card: card || "",
          privilege: privilege || "0",
        });

        await prisma.apiLog.create({
          data: {
            command: "SET_USERINFO",
            deviceCloudId: device.cloudId,
            status: result.success ? "SUCCESS" : "FAILED",
            requestPayload: { pin, name, privilege },
            responsePayload: result.data,
            errorMessage: result.success ? null : result.error,
          },
        });

        return NextResponse.json({
          success: result.success,
          data: result.data,
          error: result.error,
        });
      }

      case "register-online": {
        // Register online untuk PIN tertentu
        if (!pin) {
          return NextResponse.json(
            { error: "PIN wajib diisi" },
            { status: 400 }
          );
        }

        const result = await registerOnline(pin);
        
        await prisma.apiLog.create({
          data: {
            command: "REG_ONLINE",
            deviceCloudId: device.cloudId,
            status: result.success ? "SUCCESS" : "FAILED",
            requestPayload: { pin },
            responsePayload: result.data,
            errorMessage: result.success ? null : result.error,
          },
        });

        return NextResponse.json({
          success: result.success,
          data: result.data,
          error: result.error,
        });
      }

      case "delete-from-device": {
        // Hapus user dari mesin
        if (!pin) {
          return NextResponse.json(
            { error: "PIN wajib diisi" },
            { status: 400 }
          );
        }

        const result = await deleteUserInfo(pin);
        
        await prisma.apiLog.create({
          data: {
            command: "DELETE_USERINFO",
            deviceCloudId: device.cloudId,
            status: result.success ? "SUCCESS" : "FAILED",
            requestPayload: { pin },
            responsePayload: result.data,
            errorMessage: result.success ? null : result.error,
          },
        });

        return NextResponse.json({
          success: result.success,
          data: result.data,
          error: result.error,
        });
      }

      case "add-to-device": {
        // Tambah karyawan baru ke device + database
        if (!pin || !name) {
          return NextResponse.json(
            { error: "PIN dan Nama wajib diisi" },
            { status: 400 }
          );
        }

        // Check if PIN already exists in database
        const existing = await prisma.employee.findUnique({
          where: { pin },
        });

        if (existing) {
          return NextResponse.json(
            { error: "PIN sudah digunakan oleh karyawan lain" },
            { status: 400 }
          );
        }

        // Set user info ke device
        const setResult = await setUserInfo({
          pin,
          name,
          password: password || "",
          card: card || "",
          privilege: privilege || "0",
        });

        await prisma.apiLog.create({
          data: {
            command: "SET_USERINFO",
            deviceCloudId: device.cloudId,
            status: setResult.success ? "SUCCESS" : "FAILED",
            requestPayload: { pin, name, privilege },
            responsePayload: setResult.data,
            errorMessage: setResult.success ? null : setResult.error,
          },
        });

        if (!setResult.success) {
          return NextResponse.json(
            { error: "Gagal mengirim data ke mesin", details: setResult.error },
            { status: 500 }
          );
        }

        // Register online
        const regResult = await registerOnline(pin);
        
        await prisma.apiLog.create({
          data: {
            command: "REG_ONLINE",
            deviceCloudId: device.cloudId,
            status: regResult.success ? "SUCCESS" : "FAILED",
            requestPayload: { pin },
            responsePayload: regResult.data,
            errorMessage: regResult.success ? null : regResult.error,
          },
        });

        // Save to database
        const employee = await prisma.employee.create({
          data: {
            pin,
            name,
            isActive: true,
          },
        });

        return NextResponse.json({
          success: true,
          message: `Berhasil menambahkan ${name} ke mesin dan database`,
          employee,
          deviceResult: setResult.data,
          registerResult: regResult.data,
        });
      }

      default:
        return NextResponse.json(
          { error: "Action tidak dikenal" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[API] Sync employee error:", error);
    return NextResponse.json(
      { error: "Gagal sinkronisasi karyawan" },
      { status: 500 }
    );
  }
}
