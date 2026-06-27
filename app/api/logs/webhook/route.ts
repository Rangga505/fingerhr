import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const type = searchParams.get("type");

    const where: Record<string, any> = {};
    if (type) where.type = type;

    const logs = await prisma.webhookLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("[API] Get webhook logs error:", error);
    return NextResponse.json({ logs: [] });
  }
}
