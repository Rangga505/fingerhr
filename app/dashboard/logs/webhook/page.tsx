"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Badge } from "@/components/ui";
import { Breadcrumbs } from "@/components/layout";

interface WebhookLog {
  id: string;
  type: string;
  deviceCloudId: string;
  status: string;
  payload: unknown;
  createdAt: string;
}

export default function WebhookLogsPage() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (filterType) params.set("type", filterType);
      if (filterStatus) params.set("status", filterStatus);

      const res = await fetch(`/api/logs/webhook?${params.toString()}`);
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
  }, [filterType, filterStatus]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, []);

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
          { label: "Webhook Logs" },
        ]}
      />

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-on-surface">
          Webhook Logs
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Riwayat webhook yang diterima dari Fingerspot (auto-refresh 10 detik)
        </p>
      </div>

      {/* Filters */}
      <Card variant="glass-high">
        <CardContent className="py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-11 rounded-xl border border-white/[0.08] bg-surface-container px-4 text-sm text-on-surface transition-all focus:border-primary/50 focus:bg-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Semua Tipe</option>
              <option value="attlog">Attlog</option>
              <option value="userinfo">Userinfo</option>
              <option value="set_userinfo">Set Userinfo</option>
              <option value="delete_userinfo">Delete Userinfo</option>
              <option value="get_all_pin">Get All PIN</option>
              <option value="set_time">Set Time</option>
              <option value="reg_online">Reg Online</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-11 rounded-xl border border-white/[0.08] bg-surface-container px-4 text-sm text-on-surface transition-all focus:border-primary/50 focus:bg-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Semua Status</option>
              <option value="SUCCESS">Berhasil</option>
              <option value="FAILED">Gagal</option>
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
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Tipe</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Device</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Status</th>
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
                        <span className="font-mono text-sm text-on-surface">{log.type}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-on-surface-variant">
                        {log.deviceCloudId}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={log.status === "SUCCESS" ? "success" : "error"}
                          size="sm"
                        >
                          {log.status === "SUCCESS" ? "Berhasil" : "Gagal"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-sm text-on-surface-variant">Belum ada webhook logs</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass mx-4 w-full max-w-lg rounded-3xl border border-white/[0.08] p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-on-surface">Detail Webhook Log</h3>
                <p className="mt-1 text-sm text-on-surface-variant">{selectedLog.type}</p>
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
                <span className="text-sm text-on-surface-variant">Tipe</span>
                <span className="font-mono text-sm text-on-surface">{selectedLog.type}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
                <span className="text-sm text-on-surface-variant">Status</span>
                <Badge
                  variant={selectedLog.status === "SUCCESS" ? "success" : "error"}
                  size="sm"
                >
                  {selectedLog.status}
                </Badge>
              </div>
              {!!selectedLog.payload && (
                <div className="rounded-xl bg-white/[0.03] px-4 py-3">
                  <p className="text-sm font-medium text-on-surface">Payload</p>
                  <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-all text-xs text-on-surface-variant">{JSON.stringify(selectedLog.payload, null, 2)}</pre>
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
