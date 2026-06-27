import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "IDs wajib diisi" },
        { status: 400 }
      );
    }

    const result = await prisma.employee.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({
      success: true,
      message: `${result.count} karyawan berhasil dihapus`,
      count: result.count,
    });
  } catch (error) {
    console.error("[API] Bulk delete employees error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus karyawan" },
      { status: 500 }
    );
  }
}
