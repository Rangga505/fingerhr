"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, Badge, Input } from "@/components/ui";
import { Breadcrumbs } from "@/components/layout";

interface EmployeeInfo {
  id: string;
  name: string;
  email: string | null;
  department: string | null;
  position: string | null;
}

interface AttendanceLog {
  id: string;
  scanTime: string;
  status: string;
  verifyMethod: string | null;
  type: string;
  device: { name: string; ip: string | null };
}

interface TodayLog {
  id: string;
  scanTime: string;
  status: string;
  device: { name: string };
}

interface Summary {
  totalIn: number;
  totalOut: number;
  avgWorkHours: number;
  latestAttendance: { scanTime: string; status: string } | null;
}

interface DashboardData {
  employee: EmployeeInfo;
  logs: AttendanceLog[];
  todayLogs: TodayLog[];
  summary: Summary;
}

export default function MyAttendancePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/employees/me/attendance?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

  const formatDateTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  const getVerifyMethod = (method: string | null) => {
    switch (method) {
      case "1": return "Password";
      case "2": return "Fingerprint";
      case "3": return "Kartu";
      default: return "-";
    }
  };

  const todayStatus = (() => {
    if (!data) return null;
    const clockIn = data.todayLogs.find((l) => l.status === "IN");
    const clockOut = data.todayLogs.find((l) => l.status === "OUT");
    return { clockIn, clockOut };
  })();

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Absensi Saya" },
        ]}
      />

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-on-surface">
            Absensi Saya
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            {data ? `Selamat datang, ${data.employee.name}` : "Memuat data..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm text-on-surface-variant">Auto-refresh 15 detik</span>
        </div>
      </div>

      {/* Employee Info Card */}
      {data && (
        <Card variant="glass">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary-container to-tertiary-container text-lg font-bold text-white">
                {data.employee.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <p className="text-base font-semibold text-on-surface">{data.employee.name}</p>
                <p className="text-sm text-on-surface-variant">
                  {data.employee.department || "-"} &bull; {data.employee.position || "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card variant="glass">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-on-surface-variant">Total Hadir (IN)</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-400">
                  {loading ? "-" : data?.summary.totalIn ?? 0}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-on-surface-variant">Total Keluar (OUT)</p>
                <p className="mt-1 text-2xl font-semibold text-blue-400">
                  {loading ? "-" : data?.summary.totalOut ?? 0}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-on-surface-variant">Jam Kerja Rata-rata</p>
                <p className="mt-1 text-2xl font-semibold text-on-surface">
                  {loading ? "-" : `${data?.summary.avgWorkHours ?? 0}j`}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Status */}
      {todayStatus && (
        <Card variant="glass-high">
          <div className="border-b border-white/[0.08] px-6 py-4">
            <h3 className="text-sm font-semibold text-on-surface">Status Hari Ini</h3>
          </div>
          <CardContent className="py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                  <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-on-surface-variant">Jam Masuk</p>
                  {todayStatus.clockIn ? (
                    <>
                      <p className="font-mono text-lg font-semibold text-emerald-400">
                        {formatTime(todayStatus.clockIn.scanTime)}
                      </p>
                      <p className="text-xs text-on-surface-variant">{todayStatus.clockIn.device.name}</p>
                    </>
                  ) : (
                    <p className="text-sm text-on-surface-variant">Belum absen masuk</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                  <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-on-surface-variant">Jam Keluar</p>
                  {todayStatus.clockOut ? (
                    <>
                      <p className="font-mono text-lg font-semibold text-blue-400">
                        {formatTime(todayStatus.clockOut.scanTime)}
                      </p>
                      <p className="text-xs text-on-surface-variant">{todayStatus.clockOut.device.name}</p>
                    </>
                  ) : (
                    <p className="text-sm text-on-surface-variant">Belum absen keluar</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Date Range Filter */}
      <Card variant="glass">
        <CardContent className="py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="w-full sm:w-48">
              <Input
                label="Dari Tanggal"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Input
                label="Sampai Tanggal"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-container to-secondary-container px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Filter
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Log Table */}
      <Card variant="glass-high">
        <div className="border-b border-white/[0.08] px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-on-surface">Riwayat Absensi</h3>
            <span className="text-xs text-on-surface-variant">
              {data ? `${data.logs.length} data` : ""}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant">Tanggal & Waktu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant">Perangkat</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant">Verifikasi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant">Tipe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  </td>
                </tr>
              ) : data?.logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-on-surface-variant">
                    Tidak ada data absensi
                  </td>
                </tr>
              ) : (
                data?.logs.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-surface-container/50">
                    <td className="px-6 py-4 text-sm text-on-surface">{formatDateTime(log.scanTime)}</td>
                    <td className="px-6 py-4">
                      <Badge variant={log.status === "IN" ? "success" : "info"} size="sm">
                        {log.status === "IN" ? "Masuk" : "Keluar"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-on-surface">{log.device.name}</p>
                        {log.device.ip && (
                          <p className="text-xs text-on-surface-variant">{log.device.ip}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">
                      {getVerifyMethod(log.verifyMethod)}
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{log.type}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
