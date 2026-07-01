import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { broadcastNotification } from "@/lib/notifications";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Status tidak valid" },
        { status: 400 }
      );
    }

    const permission = await prisma.permission.findUnique({
      where: { id },
      include: { employee: { select: { name: true } } },
    });

    if (!permission) {
      return NextResponse.json(
        { error: "Izin tidak ditemukan" },
        { status: 404 }
      );
    }

    const updated = await prisma.permission.update({
      where: { id },
      data: { status, notes: notes || null },
      include: {
        employee: { select: { name: true } },
      },
    });

    const typeLabel =
      permission.type === "SICK"
        ? "Sakit"
        : permission.type === "CUTI"
        ? "Cuti"
        : "Izin";

    if (status === "APPROVED") {
      broadcastNotification({
        type: "PERMISSION_APPROVED",
        title: "Izin Disetujui",
        message: `Izin ${typeLabel} untuk ${permission.employee.name} telah disetujui`,
      });
    } else {
      broadcastNotification({
        type: "PERMISSION_REJECTED",
        title: "Izin Ditolak",
        message: `Izin ${typeLabel} untuk ${permission.employee.name} telah ditolak`,
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[API] Update permission error:", error);
    return NextResponse.json(
      { error: "Gagal mengupdate izin" },
      { status: 500 }
    );
  }
}
