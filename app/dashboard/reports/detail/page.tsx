"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Button, Input } from "@/components/ui";
import { Breadcrumbs } from "@/components/layout";

interface Employee {
  id: string;
  name: string;
  pin: string;
  department: string | null;
  position: string | null;
}

interface AttendanceLog {
  scanTime: string;
  status: string;
}

interface Schedule {
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
}

interface DailyReport {
  date: string;
  dayName: string;
  schedule: Schedule | null;
  clockIn: string | null;
  clockOut: string | null;
  status: string;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  workDuration: string;
  notes: string;
}

interface ReportSummary {
  totalDays: number;
  present: number;
  late: number;
  earlyLeave: number;
  absent: number;
  permission: number;
}

export default function DetailReportsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    }
  };

  const generateReport = async () => {
    if (!selectedEmployee) return;
    setLoading(true);

    try {
      // Get attendance logs for the month
      const startDate = `${month}-01`;
      const endDate = `${month}-31`;

      const res = await fetch(
        `/api/attendance/logs?startDate=${startDate}&endDate=${endDate}&employeeId=${selectedEmployee.id}`
      );
      const logs: AttendanceLog[] = await res.json();

      // Get schedule (default SM1)
      const scheduleRes = await fetch("/api/attendance/schedule");
      const schedules = await scheduleRes.json();
      const schedule = schedules[0] || {
        name: "SM1",
        startTime: "08:30",
        endTime: "16:30",
        graceMinutes: 15,
      };

      // Generate daily reports
      const year = parseInt(month.split("-")[0]);
      const monthNum = parseInt(month.split("-")[1]);
      const daysInMonth = new Date(year, monthNum, 0).getDate();
      const reports: DailyReport[] = [];

      let present = 0;
      let late = 0;
      let earlyLeave = 0;
      let absent = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, monthNum - 1, day);
        const dateStr = date.toISOString().split("T")[0];
        const dayName = date.toLocaleDateString("id-ID", { weekday: "long" });

        // Skip weekends
        if (date.getDay() === 0 || date.getDay() === 6) {
          continue;
        }

        // Find logs for this day
        const dayLogs = logs.filter((log) => log.scanTime.startsWith(dateStr));
        const clockInLog = dayLogs.find((log) => log.status === "IN");
        const clockOutLog = dayLogs.find((log) => log.status === "OUT");

        const clockIn = clockInLog
          ? new Date(clockInLog.scanTime).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : null;
        const clockOut = clockOutLog
          ? new Date(clockOutLog.scanTime).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : null;

        // Calculate late
        let lateMinutes = 0;
        if (clockIn) {
          const [startHour, startMin] = schedule.startTime.split(":").map(Number);
          const [clockHour, clockMin] = clockIn.split(":").map(Number);
          const startTotal = startHour * 60 + startMin;
          const clockTotal = clockHour * 60 + clockMin;
          if (clockTotal > startTotal + schedule.graceMinutes) {
            lateMinutes = clockTotal - startTotal;
          }
        }

        // Calculate early leave
        let earlyLeaveMinutes = 0;
        if (clockOut) {
          const [endHour, endMin] = schedule.endTime.split(":").map(Number);
          const [clockHour, clockMin] = clockOut.split(":").map(Number);
          const endTotal = endHour * 60 + endMin;
          const clockTotal = clockHour * 60 + clockMin;
          if (clockTotal < endTotal) {
            earlyLeaveMinutes = endTotal - clockTotal;
          }
        }

        // Determine status
        let status = "Alpha";
        let notes = "Tidak hadir";

        if (clockIn) {
          present++;
          if (lateMinutes > 0) {
            status = "Terlambat";
            notes = `Terlambat ${lateMinutes} menit`;
            late++;
          } else {
            status = "Hadir";
            notes = "Tepat waktu";
          }

          if (earlyLeaveMinutes > 0) {
            notes += `, Pulang cepat ${earlyLeaveMinutes} menit`;
            earlyLeave++;
          }
        } else {
          absent++;
        }

        // Calculate work duration
        let workDuration = "-";
        if (clockIn && clockOut) {
          const [inH, inM] = clockIn.split(":").map(Number);
          const [outH, outM] = clockOut.split(":").map(Number);
          const diff = outH * 60 + outM - (inH * 60 + inM);
          const hours = Math.floor(diff / 60);
          const mins = diff % 60;
          workDuration = `${hours}j ${mins}m`;
        }

        reports.push({
          date: dateStr,
          dayName,
          schedule,
          clockIn,
          clockOut,
          status,
          lateMinutes,
          earlyLeaveMinutes,
          workDuration,
          notes,
        });
      }

      setDailyReports(reports);
      setSummary({
        totalDays: reports.length,
        present,
        late,
        earlyLeave,
        absent,
        permission: 0,
      });
    } catch (error) {
      console.error("Failed to generate report:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleExportExcel = async () => {
    if (!selectedEmployee || dailyReports.length === 0) return;

    try {
      const [year, monthNum] = month.split("-");
      const startDate = `${month}-01`;
      const endDate = `${year}-${monthNum}-${new Date(parseInt(year), parseInt(monthNum), 0).getDate()}`;

      const params = new URLSearchParams({
        employeeId: selectedEmployee.id,
        startDate,
        endDate,
      });

      const res = await fetch(`/api/export/excel?${params.toString()}`);

      if (!res.ok) {
        alert("Gagal export Excel");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan-${selectedEmployee.name}-${month}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert("Gagal export Excel");
    }
  };

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Laporan", href: "/dashboard/reports" },
          { label: "Detail Kehadiran" },
        ]}
      />

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-on-surface">
            Laporan Detail Kehadiran
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Laporan kehadiran berdasarkan jadwal kerja + export Excel
          </p>
        </div>
        {dailyReports.length > 0 && (
          <Button variant="primary" size="md" onClick={handleExportExcel}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export Excel
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card variant="glass-high">
        <CardContent className="py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="w-full sm:w-64">
              <label className="mb-2 block text-sm font-medium text-on-surface">Karyawan *</label>
              <select
                value={selectedEmployee?.id || ""}
                onChange={(e) => {
                  const emp = employees.find((emp) => emp.id === e.target.value);
                  setSelectedEmployee(emp || null);
                }}
                className="h-11 w-full rounded-xl border border-white/[0.08] bg-surface-container px-4 text-sm text-on-surface transition-all focus:border-primary/50 focus:bg-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Pilih Karyawan</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.pin})
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Bulan"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
            <Button
              variant="primary"
              onClick={generateReport}
              disabled={!selectedEmployee || loading}
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "Generate Laporan"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Employee Info + Summary */}
      {selectedEmployee && summary && (
        <>
          <Card variant="glass">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-container to-tertiary-container text-xl font-bold text-white">
                  {selectedEmployee.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-on-surface">{selectedEmployee.name}</h2>
                  <p className="text-sm text-on-surface-variant">
                    PIN: {selectedEmployee.pin} | {selectedEmployee.department || "-"} |{" "}
                    {selectedEmployee.position || "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Card variant="glass">
              <CardContent className="py-4 text-center">
                <p className="text-xs font-medium text-on-surface-variant">Total Hari Kerja</p>
                <p className="mt-1 text-2xl font-semibold text-on-surface">{summary.totalDays}</p>
              </CardContent>
            </Card>
            <Card variant="glass">
              <CardContent className="py-4 text-center">
                <p className="text-xs font-medium text-on-surface-variant">Hadir</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-400">{summary.present}</p>
              </CardContent>
            </Card>
            <Card variant="glass">
              <CardContent className="py-4 text-center">
                <p className="text-xs font-medium text-on-surface-variant">Terlambat</p>
                <p className="mt-1 text-2xl font-semibold text-amber-400">{summary.late}</p>
              </CardContent>
            </Card>
            <Card variant="glass">
              <CardContent className="py-4 text-center">
                <p className="text-xs font-medium text-on-surface-variant">Pulang Cepat</p>
                <p className="mt-1 text-2xl font-semibold text-blue-400">{summary.earlyLeave}</p>
              </CardContent>
            </Card>
            <Card variant="glass">
              <CardContent className="py-4 text-center">
                <p className="text-xs font-medium text-on-surface-variant">Alpha</p>
                <p className="mt-1 text-2xl font-semibold text-error">{summary.absent}</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Daily Report Table */}
      {dailyReports.length > 0 && (
        <Card variant="glass-high">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Tanggal</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Hari</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Shift</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Masuk</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Pulang</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Absensi</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Durasi</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {dailyReports.map((report) => (
                    <tr key={report.date} className="transition-colors hover:bg-surface-container/50">
                      <td className="px-6 py-4 text-sm text-on-surface">{report.date}</td>
                      <td className="px-6 py-4 text-sm text-on-surface">{report.dayName}</td>
                      <td className="px-6 py-4 text-sm text-on-surface">{report.schedule?.name || "-"}</td>
                      <td className="px-6 py-4 font-mono text-sm text-on-surface">{report.clockIn || "-"}</td>
                      <td className="px-6 py-4 font-mono text-sm text-on-surface">{report.clockOut || "-"}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            report.status === "Hadir"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : report.status === "Terlambat"
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {report.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface">{report.workDuration}</td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant">{report.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
