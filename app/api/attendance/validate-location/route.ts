import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

interface OfficeLocation {
  name: string;
  lat: number;
  lng: number;
  radius: number; // meters
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeId, latitude, longitude, wifiSsid } = body;

    if (!employeeId || latitude == null || longitude == null) {
      return NextResponse.json(
        { error: "employeeId, latitude, dan longitude wajib diisi" },
        { status: 400 }
      );
    }

    // Fetch office locations from system_settings
    const setting = await prisma.systemSettings.findUnique({
      where: { key: "office_locations" },
    });

    if (!setting) {
      return NextResponse.json(
        { valid: true, distance: 0, nearestOffice: "Tidak ada lokasi kantor dikonfigurasi" },
        { status: 200 }
      );
    }

    let offices: OfficeLocation[];
    try {
      offices = JSON.parse(setting.value);
    } catch {
      return NextResponse.json(
        { valid: true, distance: 0, nearestOffice: "Konfigurasi lokasi kantor tidak valid" },
        { status: 200 }
      );
    }

    if (!Array.isArray(offices) || offices.length === 0) {
      return NextResponse.json(
        { valid: true, distance: 0, nearestOffice: "Tidak ada lokasi kantor dikonfigurasi" },
        { status: 200 }
      );
    }

    // Find nearest office
    let minDistance = Infinity;
    let nearestOffice = offices[0];

    for (const office of offices) {
      const dist = haversineDistance(latitude, longitude, office.lat, office.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearestOffice = office;
      }
    }

    const valid = minDistance <= nearestOffice.radius;

    return NextResponse.json({
      valid,
      distance: Math.round(minDistance),
      nearestOffice: nearestOffice.name,
      radius: nearestOffice.radius,
      wifiSsid: wifiSsid || null,
    });
  } catch (error) {
    console.error("[API] Validate location error:", error);
    return NextResponse.json(
      { error: "Gagal memvalidasi lokasi" },
      { status: 500 }
    );
  }
}
