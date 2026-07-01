"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  totalDevices: number;
  onlineDevices: number;
  todayAttendance: number;
  pendingPermissions: number;
}

interface RecentAttendance {
  id: string;
  scanTime: string;
  status: string;
  employee: {
    name: string;
    department: string | null;
  };
  device: {
    name: string;
  };
}

interface RecentPermission {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
  employee: {
    name: string;
    department: string | null;
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    totalDevices: 0,
    onlineDevices: 0,
    todayAttendance: 0,
    pendingPermissions: 0,
  });
  const [recentAttendance, setRecentAttendance] = useState<RecentAttendance[]>([]);
  const [recentPermissions, setRecentPermissions] = useState<RecentPermission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      // Fetch employees
      const empRes = await fetch("/api/employees");
      const empData = await empRes.json();
      const employees = empData.employees || [];

      // Fetch devices
      const devRes = await fetch("/api/devices");
      const devices = await devRes.json();

      // Fetch today's attendance
      const today = new Date().toISOString().split("T")[0];
      const attRes = await fetch(`/api/attendance/logs?startDate=${today}&endDate=${today}`);
      const attendance = await attRes.json();

      // Fetch pending permissions
      const permRes = await fetch("/api/permissions?status=PENDING");
      const permissions = await permRes.json();

      // Fetch recent permissions (all statuses)
      const recentPermRes = await fetch("/api/permissions");
      const recentPerms = await recentPermRes.json();

      setStats({
        totalEmployees: employees.length,
        activeEmployees: employees.filter((e: any) => e.isActive).length,
        totalDevices: devices.length,
        onlineDevices: devices.filter((d: any) => d.status === "ONLINE").length,
        todayAttendance: attendance.length,
        pendingPermissions: permissions.length,
      });

      setRecentAttendance(attendance.slice(0, 10));
      setRecentPermissions(recentPerms.slice(0, 5));
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh setiap 30 detik
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-on-surface">
            Dashboard
          </h1>
          <p className="mt-1 text-on-surface-variant">
            Monitoring real-time kehadiran dan perangkat absensi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm text-on-surface-variant">Live</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card variant="glass">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-on-surface-variant">Total Karyawan</p>
                <p className="mt-1 text-2xl font-semibold text-on-surface">
                  {loading ? "-" : stats.totalEmployees}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-on-surface-variant">Hadir Hari Ini</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-400">
                  {loading ? "-" : stats.todayAttendance}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-on-surface-variant">Perangkat Online</p>
                <p className="mt-1 text-2xl font-semibold text-on-surface">
                  {loading ? "-" : `${stats.onlineDevices}/${stats.totalDevices}`}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-on-surface-variant">Izin Pending</p>
                <p className="mt-1 text-2xl font-semibold text-amber-400">
                  {loading ? "-" : stats.pendingPermissions}
                </p>
              </div>
              <a
                href="/dashboard/attendance/permissions"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 transition-colors hover:bg-amber-500/20"
              >
                <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Attendance */}
      <Card variant="glass-high">
        <div className="border-b border-white/[0.08] px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-on-surface">Absensi Terakhir</h3>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-on-surface-variant">Live</span>
            </div>
          </div>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : recentAttendance.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-on-surface-variant">Belum ada absensi hari ini</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {recentAttendance.map((log) => (
                <div key={log.id} className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-surface-container/50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-container to-tertiary-container text-sm font-medium text-white">
                    {log.employee.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-on-surface">{log.employee.name}</p>
                    <p className="text-xs text-on-surface-variant">
                      {log.employee.department || "-"} &bull; {log.device.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm text-primary">{formatTime(log.scanTime)}</p>
                    <p
                      className={cn(
                        "text-xs font-medium",
                        log.status === "IN" ? "text-emerald-400" : "text-blue-400"
                      )}
                    >
                      {log.status === "IN" ? "Masuk" : "Keluar"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Permissions */}
      <Card variant="glass-high">
        <div className="border-b border-white/[0.08] px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-on-surface">Izin Terbaru</h3>
            <a href="/dashboard/attendance/permissions" className="text-xs text-primary hover:underline">
              Lihat Semua
            </a>
          </div>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : recentPermissions.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-on-surface-variant">Belum ada data izin</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {recentPermissions.map((perm) => (
                <div key={perm.id} className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-surface-container/50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-container to-tertiary-container text-sm font-medium text-white">
                    {perm.employee.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-on-surface">{perm.employee.name}</p>
                    <p className="text-xs text-on-surface-variant">
                      {perm.type === "SICK" ? "Sakit" : perm.type === "CUTI" ? "Cuti" : "Izin"} &bull;{" "}
                      {new Date(perm.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={cn(
                        "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                        perm.status === "APPROVED"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : perm.status === "REJECTED"
                          ? "bg-error/10 text-error"
                          : "bg-amber-500/10 text-amber-400"
                      )}
                    >
                      {perm.status === "APPROVED" ? "Disetujui" : perm.status === "REJECTED" ? "Ditolak" : "Menunggu"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
