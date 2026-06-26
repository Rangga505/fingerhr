"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Badge } from "@/components/ui";
import { Breadcrumbs } from "@/components/layout";

interface ApiLog {
  id: string;
  command: string;
  deviceCloudId: string;
  transId: string | null;
  status: string;
  duration: number | null;
  errorMessage: string | null;
  requestPayload: unknown;
  responsePayload: unknown;
  createdAt: string;
}

export default function ApiLogsPage() {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCommand, setFilterCommand] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null);

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (filterCommand) params.set("command", filterCommand);
      if (filterStatus) params.set("status", filterStatus);

      const res = await fetch(`/api/logs/api?${params.toString()}`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filterCommand, filterStatus]);

  // Auto-refresh setiap 10 detik
  useEffect(() => {
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [filterCommand, filterStatus]);

  const formatDuration = (ms: number | null) => {
    if (!ms) return "-";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Riwayat", href: "/dashboard/logs" },
          { label: "API Logs" },
        ]}
      />

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-on-surface">
          API Logs
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Riwayat panggilan API ke Fingerspot
        </p>
      </div>

      {/* Filters */}
      <Card variant="glass-high">
        <CardContent className="py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <select
              value={filterCommand}
              onChange={(e) => setFilterCommand(e.target.value)}
              className="h-11 rounded-xl border border-white/[0.08] bg-surface-container px-4 text-sm text-on-surface transition-all focus:border-primary/50 focus:bg-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Semua Command</option>
              <option value="GET_ATTLOG">GET_ATTLOG</option>
              <option value="GET_USERINFO">GET_USERINFO</option>
              <option value="SET_USERINFO">SET_USERINFO</option>
              <option value="DELETE_USERINFO">DELETE_USERINFO</option>
              <option value="GET_ALL_PIN">GET_ALL_PIN</option>
              <option value="SET_TIME">SET_TIME</option>
              <option value="RESTART">RESTART</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-11 rounded-xl border border-white/[0.08] bg-surface-container px-4 text-sm text-on-surface transition-all focus:border-primary/50 focus:bg-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Semua Status</option>
              <option value="SUCCESS">Berhasil</option>
              <option value="FAILED">Gagal</option>
              <option value="PENDING">Menunggu</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
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
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Waktu</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Command</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Device</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Durasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="cursor-pointer transition-colors hover:bg-surface-container/50"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="px-6 py-4 text-sm text-on-surface">{formatTime(log.createdAt)}</td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-on-surface">{log.command}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-on-surface-variant">
                        {log.deviceCloudId}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            log.status === "SUCCESS"
                              ? "success"
                              : log.status === "FAILED"
                              ? "error"
                              : "warning"
                          }
                          size="sm"
                        >
                          {log.status === "SUCCESS"
                            ? "Berhasil"
                            : log.status === "FAILED"
                            ? "Gagal"
                            : "Menunggu"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant">
                        {formatDuration(log.duration)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-sm text-on-surface-variant">Belum ada API logs</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass mx-4 w-full max-w-2xl rounded-3xl border border-white/[0.08] p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-on-surface">Detail API Log</h3>
                <p className="mt-1 text-sm text-on-surface-variant">{selectedLog.command}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-white/[0.05]"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
                <span className="text-sm text-on-surface-variant">Waktu</span>
                <span className="text-sm text-on-surface">{formatTime(selectedLog.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
                <span className="text-sm text-on-surface-variant">Status</span>
                <Badge
                  variant={
                    selectedLog.status === "SUCCESS"
                      ? "success"
                      : selectedLog.status === "FAILED"
                      ? "error"
                      : "warning"
                  }
                  size="sm"
                >
                  {selectedLog.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
                <span className="text-sm text-on-surface-variant">Durasi</span>
                <span className="text-sm text-on-surface">{formatDuration(selectedLog.duration)}</span>
              </div>
              {selectedLog.errorMessage && (
                <div className="rounded-xl bg-error/10 px-4 py-3">
                  <p className="text-sm font-medium text-error">Error</p>
                  <p className="mt-1 text-sm text-on-surface-variant">{selectedLog.errorMessage}</p>
                </div>
              )}
              {!!selectedLog.requestPayload && (
                <div className="rounded-xl bg-white/[0.03] px-4 py-3">
                  <p className="text-sm font-medium text-on-surface">Request Payload</p>
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all text-xs text-on-surface-variant">{JSON.stringify(selectedLog.requestPayload, null, 2)}</pre>
                </div>
              )}
              {!!selectedLog.responsePayload && (
                <div className="rounded-xl bg-white/[0.03] px-4 py-3">
                  <p className="text-sm font-medium text-on-surface">Response Payload</p>
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all text-xs text-on-surface-variant">{JSON.stringify(selectedLog.responsePayload, null, 2)}</pre>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-xl bg-white/[0.05] px-4 py-2 text-sm font-medium text-on-surface transition-colors hover:bg-white/[0.1]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
