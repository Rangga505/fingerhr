"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Badge, Button, Input } from "@/components/ui";
import { Breadcrumbs } from "@/components/layout";

interface AttendanceLog {
  id: string;
  scanTime: string;
  verifyMethod: string | null;
  status: string;
  type: string;
  employee: { name: string; pin: string; department: string | null };
  device: { name: string };
}

interface Employee {
  id: string;
  name: string;
  pin: string;
}

export default function RawReportsPage() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 86400000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [filterEmployee, setFilterEmployee] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("startDate", startDate);
      params.set("endDate", endDate);
      if (filterEmployee) params.set("employeeId", filterEmployee);

      const res = await fetch(`/api/attendance/logs?${params.toString()}`);
      const data = await res.json();
      setLogs(data);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [startDate, endDate, filterEmployee]);

  // Auto-refresh setiap 30 detik
  useEffect(() => {
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, [startDate, endDate, filterEmployee]);

  const handleDownloadFromDevice = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/devices", {
        method: "GET",
      });
      const devices = await res.json();

      if (devices.length === 0) {
        alert("Tidak ada perangkat yang terdaftar");
        return;
      }

      // Use first device
      const device = devices[0];
      const cmdRes = await fetch(`/api/devices/${device.id}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: "GET_ATTLOG",
          startDate,
          endDate,
        }),
      });

      const result = await cmdRes.json();

      if (!cmdRes.ok) {
        alert(result.error || "Gagal mengambil data dari mesin");
        return;
      }

      if (result.success) {
        alert("Berhasil mengambil data dari mesin!");
        fetchLogs(); // Refresh logs
      } else {
        alert(`Gagal: ${result.error}`);
      }
    } catch (error) {
      alert("Gagal mengambil data dari mesin");
    } finally {
      setDownloading(false);
    }
  };

  const getVerifyMethod = (method: string | null) => {
    switch (method) {
      case "1":
        return "Password";
      case "2":
        return "Fingerprint";
      case "3":
        return "Card";
      default:
        return "-";
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Laporan", href: "/dashboard/reports" },
          { label: "Absensi Perangkat" },
        ]}
      />

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-on-surface">
            Laporan Absensi Perangkat
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Data mentah dari mesin absensi (realtime + manual download)
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={handleDownloadFromDevice}
          disabled={downloading}
        >
          {downloading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          )}
          Download dari Mesin
        </Button>
      </div>

      {/* Filters */}
      <Card variant="glass-high">
        <CardContent className="py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Input
              label="Tanggal Mulai"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="Tanggal Akhir"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <div className="w-full sm:w-48">
              <label className="mb-2 block text-sm font-medium text-on-surface">Karyawan</label>
              <select
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}
                className="h-11 w-full rounded-xl border border-white/[0.08] bg-surface-container px-4 text-sm text-on-surface transition-all focus:border-primary/50 focus:bg-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Semua Karyawan</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
            <Button variant="secondary" onClick={fetchLogs}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card variant="glass-high">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Tanggal</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Jam</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">PIN</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Nama</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Metode</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Sumber</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {logs.map((log) => (
                    <tr key={log.id} className="transition-colors hover:bg-surface-container/50">
                      <td className="px-6 py-4 text-sm text-on-surface">{formatDate(log.scanTime)}</td>
                      <td className="px-6 py-4 font-mono text-sm text-on-surface">{formatTime(log.scanTime)}</td>
                      <td className="px-6 py-4 font-mono text-sm text-on-surface">{log.employee.pin}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-on-surface">{log.employee.name}</p>
                          <p className="text-xs text-on-surface-variant">{log.employee.department || "-"}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={log.status === "IN" ? "success" : "info"} size="sm">
                          {log.status === "IN" ? "Masuk" : "Keluar"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant">
                        {getVerifyMethod(log.verifyMethod)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={log.type === "realtime" ? "success" : "default"} size="sm">
                          {log.type === "realtime" ? "Realtime" : "Manual"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-sm text-on-surface-variant">Belum ada data absensi</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
