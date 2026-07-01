"use client";

import { useState } from "react";
import { Card, CardContent, Button, Input } from "@/components/ui";
import { Breadcrumbs } from "@/components/layout";

interface ReportData {
  type: string;
  date: string;
  dateRange: { start: string; end: string };
  summary: {
    totalEmployees: number;
    totalPresent: number;
    totalAbsent: number;
    totalLate: number;
    totalOvertime: number;
  };
  reports: {
    employeeId: string;
    employeeName: string;
    pin: string;
    department: string | null;
    totalPresent: number;
    totalAbsent: number;
    totalLate: number;
    totalOvertime: number;
    totalWorkHours: number;
  }[];
}

export default function AutoReportsPage() {
  const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: reportType, date }),
      });

      if (!res.ok) {
        alert("Gagal generate laporan");
        return;
      }

      const data = await res.json();
      setReportData(data);
    } catch (error) {
      alert("Gagal generate laporan");
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (!reportData) return;

    const startDate = reportData.dateRange.start.split("T")[0];
    const endDate = reportData.dateRange.end.split("T")[0];

    const params = new URLSearchParams({ startDate, endDate });
    const res = await fetch(`/api/export/excel?${params.toString()}`);

    if (!res.ok) {
      alert("Gagal export Excel");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-${reportType}-${date}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const typeLabels = { daily: "Harian", weekly: "Mingguan", monthly: "Bulanan" };

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Laporan", href: "/dashboard/reports" },
          { label: "Laporan Otomatis" },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-on-surface">
            Laporan Otomatis
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Generate laporan kehadiran otomatis berdasarkan periode
          </p>
        </div>
        {reportData && (
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
            <div className="w-full sm:w-48">
              <label className="mb-2 block text-sm font-medium text-on-surface">Jenis Laporan</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as typeof reportType)}
                className="h-11 w-full rounded-xl border border-white/[0.08] bg-surface-container px-4 text-sm text-on-surface transition-all focus:border-primary/50 focus:bg-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="daily">Harian</option>
                <option value="weekly">Mingguan</option>
                <option value="monthly">Bulanan</option>
              </select>
            </div>
            <Input
              label="Tanggal"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Button variant="primary" onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "Generate Laporan"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {reportData && (
        <>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-6 py-3">
            <p className="text-sm text-on-surface-variant">
              Periode: <span className="font-medium text-on-surface">{typeLabels[reportData.type as keyof typeof typeLabels]}</span>
              {" "} | {new Date(reportData.dateRange.start).toLocaleDateString("id-ID")} - {new Date(reportData.dateRange.end).toLocaleDateString("id-ID")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Card variant="glass">
              <CardContent className="py-4 text-center">
                <p className="text-xs font-medium text-on-surface-variant">Total Karyawan</p>
                <p className="mt-1 text-2xl font-semibold text-on-surface">{reportData.summary.totalEmployees}</p>
              </CardContent>
            </Card>
            <Card variant="glass">
              <CardContent className="py-4 text-center">
                <p className="text-xs font-medium text-on-surface-variant">Total Hadir</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-400">{reportData.summary.totalPresent}</p>
              </CardContent>
            </Card>
            <Card variant="glass">
              <CardContent className="py-4 text-center">
                <p className="text-xs font-medium text-on-surface-variant">Total Terlambat</p>
                <p className="mt-1 text-2xl font-semibold text-amber-400">{reportData.summary.totalLate}</p>
              </CardContent>
            </Card>
            <Card variant="glass">
              <CardContent className="py-4 text-center">
                <p className="text-xs font-medium text-on-surface-variant">Total Lembur</p>
                <p className="mt-1 text-2xl font-semibold text-blue-400">{reportData.summary.totalOvertime}</p>
              </CardContent>
            </Card>
            <Card variant="glass">
              <CardContent className="py-4 text-center">
                <p className="text-xs font-medium text-on-surface-variant">Total Alpha</p>
                <p className="mt-1 text-2xl font-semibold text-error">{reportData.summary.totalAbsent}</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Report Table */}
      {reportData && reportData.reports.length > 0 && (
        <Card variant="glass-high">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Nama</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">PIN</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Departemen</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-on-surface-variant">Hadir</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-on-surface-variant">Terlambat</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-on-surface-variant">Lembur</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-on-surface-variant">Alpha</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-on-surface-variant">Jam Kerja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {reportData.reports.map((row) => (
                    <tr key={row.employeeId} className="transition-colors hover:bg-surface-container/50">
                      <td className="px-6 py-4 text-sm font-medium text-on-surface">{row.employeeName}</td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant">{row.pin}</td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant">{row.department || "-"}</td>
                      <td className="px-6 py-4 text-center text-sm text-emerald-400">{row.totalPresent}</td>
                      <td className="px-6 py-4 text-center text-sm text-amber-400">{row.totalLate}</td>
                      <td className="px-6 py-4 text-center text-sm text-blue-400">{row.totalOvertime}</td>
                      <td className="px-6 py-4 text-center text-sm text-error">{row.totalAbsent}</td>
                      <td className="px-6 py-4 text-center text-sm text-on-surface">{row.totalWorkHours.toFixed(1)}j</td>
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
