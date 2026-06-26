import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

interface WebhookPayload {
  type: string;
  cloud_id: string;
  data: Record<string, any>;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: WebhookPayload = await request.json();
    const { type, cloud_id, data } = body;

    console.log("[Webhook] Received:", { type, cloud_id, data });

    // Find device by cloud_id
    const device = await prisma.device.findUnique({
      where: { cloudId: cloud_id },
    });

    if (!device) {
      console.warn("[Webhook] Device not found for cloud_id:", cloud_id);
      return NextResponse.json(
        { status: "error", message: "Device not found" },
        { status: 404 }
      );
    }

    // Update device last sync
    await prisma.device.update({
      where: { id: device.id },
      data: { lastSync: new Date(), status: "ONLINE" },
    });

    // Process based on type
    switch (type) {
      case "attlog":
        await handleAttlog(device.id, data);
        break;
      case "userinfo":
        await handleUserinfo(device.id, data);
        break;
      case "set_userinfo":
        await handleSetUserinfo(device.id, data);
        break;
      case "delete_userinfo":
        await handleDeleteUserinfo(device.id, data);
        break;
      case "get_all_pin":
        await handleGetAllPin(device.id, data);
        break;
      case "set_time":
        await handleSetTime(device.id, data);
        break;
      case "reg_online":
        await handleRegOnline(device.id, data);
        break;
      default:
        console.log("[Webhook] Unknown type:", type);
    }

    // Log webhook
    await prisma.webhookLog.create({
      data: {
        type,
        deviceCloudId: cloud_id,
        status: "SUCCESS",
        payload: body as any,
      },
    });

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[Webhook] Error:", error);

    // Try to log the failed webhook
    try {
      const body = await request.json().catch(() => null);
      if (body) {
        await prisma.webhookLog.create({
          data: {
            type: body.type || "unknown",
            deviceCloudId: body.cloud_id || "unknown",
            status: "FAILED",
        payload: body as any,
          },
        });
      }
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleAttlog(deviceId: string, data: Record<string, any>) {
  const { pin, scan, verify, status_scan } = data;

  if (!pin || !scan) {
    console.warn("[Webhook] Attlog missing required fields:", data);
    return;
  }

  // Find employee by pin
  const employee = await prisma.employee.findUnique({
    where: { pin: String(pin) },
  });

  if (!employee) {
    console.warn("[Webhook] Employee not found for pin:", pin);
    return;
  }

  // Determine status (1=IN, 0=OUT)
  const status = status_scan === "1" || status_scan === 1 ? "IN" : "OUT";

  // Parse scan time
  const scanTime = new Date(scan);

  // Check for duplicate (same employee, same time, same device)
  const existing = await prisma.attendanceLog.findFirst({
    where: {
      employeeId: employee.id,
      deviceId,
      scanTime,
    },
  });

  if (existing) {
    console.log("[Webhook] Duplicate attlog, skipping:", { pin, scan });
    return;
  }

  // Save attendance log
  await prisma.attendanceLog.create({
    data: {
      employeeId: employee.id,
      deviceId,
      scanTime,
      verifyMethod: String(verify || "1"),
      status,
      type: "realtime",
      rawPayload: data,
    },
  });

  console.log("[Webhook] Attlog saved:", { employee: employee.name, status, scan });
}

async function handleUserinfo(deviceId: string, data: Record<string, any>) {
  const { pin, name, card, privilege } = data;

  console.log("[Webhook] Userinfo received:", { pin, name });

  // Update or create employee
  if (pin && name) {
    await prisma.employee.upsert({
      where: { pin: String(pin) },
      update: { name: String(name) },
      create: {
        pin: String(pin),
        name: String(name),
      },
    });
  }
}

async function handleSetUserinfo(deviceId: string, data: Record<string, any>) {
  const { pin, status } = data;
  console.log("[Webhook] Set userinfo response:", { pin, status });
}

async function handleDeleteUserinfo(deviceId: string, data: Record<string, any>) {
  const { pin, status } = data;
  console.log("[Webhook] Delete userinfo response:", { pin, status });
}

async function handleGetAllPin(deviceId: string, data: Record<string, any>) {
  const { pins } = data;
  console.log("[Webhook] All PINs received:", pins);
}

async function handleSetTime(deviceId: string, data: Record<string, any>) {
  const { status, timezone } = data;
  console.log("[Webhook] Set time response:", { status, timezone });
}

async function handleRegOnline(deviceId: string, data: Record<string, any>) {
  const { pin, status } = data;
  console.log("[Webhook] Register online response:", { pin, status });
}
