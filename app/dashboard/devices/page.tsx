"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Badge, Button } from "@/components/ui";
import { Breadcrumbs } from "@/components/layout";
import { DeviceCard } from "@/components/devices/DeviceCard";
import { QuickActions } from "@/components/devices/QuickActions";
import { CommandHistoryPanel } from "@/components/devices/CommandHistoryPanel";
import { LiveWebhookStream } from "@/components/devices/LiveWebhookStream";
import type { WebhookEntry } from "@/components/devices/LiveWebhookStream";

interface Device {
  id: string;
  cloudId: string;
  name: string;
  type: string;
  ip: string | null;
  status: string;
  timezone: string;
  lastSync: string | null;
  totalScans: number;
  createdAt: string;
}

interface ApiLogEntry {
  id: string;
  command: string;
  deviceCloudId: string;
  transId: string | null;
  status: string;
  duration: number | null;
  errorMessage: string | null;
  createdAt: string;
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiLogs, setApiLogs] = useState<ApiLogEntry[]>([]);
  const [webhookEntries, setWebhookEntries] = useState<WebhookEntry[]>([]);
  const [commandLoading, setCommandLoading] = useState(false);

  // Fetch devices
  const fetchDevices = async () => {
    try {
      const res = await fetch("/api/devices");
      const data = await res.json();
      setDevices(data);
    } catch (error) {
      console.error("Failed to fetch devices:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch webhook logs
  const fetchWebhookLogs = async () => {
    try {
      const res = await fetch("/api/logs/webhook?limit=10");
      if (res.ok) {
        const data = await res.json();
        setWebhookEntries(
          (data.logs || []).map((log: any) => ({
            time: new Date(log.createdAt).toLocaleTimeString("id-ID"),
            method: "POST",
            path: "/webhook",
            status: log.status === "SUCCESS" ? 200 : 500,
            message: log.type,
          }))
        );
      }
    } catch (error) {
      // Logs API not yet implemented
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchWebhookLogs();

    // Auto-refresh webhook logs
    const interval = setInterval(fetchWebhookLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  // Execute device command
  const handleCommand = async (command: string, params?: Record<string, any>) => {
    if (!selectedDevice) return;
    setCommandLoading(true);

    try {
      const device = devices.find((d) => d.id === selectedDevice || d.cloudId === selectedDevice);
      if (!device) return;

      const res = await fetch(`/api/devices/${device.id}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, ...params }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Gagal menjalankan command");
        return;
      }

      // Add to command history
      setApiLogs((prev) => [
        {
          id: Date.now().toString(),
          command,
          deviceCloudId: device.cloudId,
          transId: null,
          status: data.success ? "SUCCESS" : "FAILED",
          duration: data.duration,
          errorMessage: null,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);

      // Refresh devices
      fetchDevices();

      if (data.success) {
        alert(`Command ${command} berhasil!`);
      } else {
        alert(`Command ${command} gagal: ${data.error}`);
      }
    } catch (error) {
      alert("Gagal menjalankan command");
    } finally {
      setCommandLoading(false);
    }
  };

  // Wrap QuickActions to pass command handler
  const selectedDeviceObj = devices.find((d) => d.cloudId === selectedDevice);

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Perangkat" },
        ]}
      />

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-on-surface">
            Manajemen Perangkat
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Monitor status mesin absensi dan jalankan perintah
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="md" onClick={() => fetchDevices()}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card variant="glass">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-on-surface-variant">Total Perangkat</p>
                <p className="mt-1 text-2xl font-semibold text-on-surface">{devices.length}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
                <p className="text-xs font-medium text-on-surface-variant">Online</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-400">
                  {devices.filter((d) => d.status === "ONLINE").length}
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
                <p className="text-xs font-medium text-on-surface-variant">Total Scan Hari Ini</p>
                <p className="mt-1 text-2xl font-semibold text-on-surface">
                  {devices.reduce((sum, d) => sum + d.totalScans, 0)}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          {/* Device Cards */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-on-surface">Mesin Absensi</h2>
              <span className="text-sm text-on-surface-variant">{devices.length} perangkat</span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : devices.length === 0 ? (
              <Card variant="glass">
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-on-surface-variant">Belum ada perangkat yang terdaftar</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {devices.map((device) => (
                  <DeviceCard
                    key={device.cloudId}
                    device={{
                      cloudId: device.cloudId,
                      name: device.name,
                      type: device.type as any,
                      ip: device.ip || "-",
                      status: device.status as any,
                      lastSync: device.lastSync || "-",
                      timezone: "",
                      location: "",
                      firmware: "",
                    }}
                    isSelected={selectedDevice === device.cloudId}
                    onSelect={setSelectedDevice}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {selectedDevice && selectedDeviceObj && (
            <QuickActions
              deviceCloudId={selectedDevice}
              deviceName={selectedDeviceObj.name}
              disabled={commandLoading}
            />
          )}

          {/* Command History */}
          <CommandHistoryPanel
            commands={apiLogs.map((log) => ({
              id: log.id,
              deviceCloudId: log.deviceCloudId,
              deviceName: log.deviceCloudId,
              commandType: log.command.toLowerCase() as any,
              transId: log.transId || "",
              status: log.status.toLowerCase() as any,
              requestTime: log.createdAt,
              completedTime: log.createdAt,
              duration: log.duration ? `${log.duration}ms` : "-",
              errorMessage: log.errorMessage || null,
            }))}
          />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <LiveWebhookStream entries={webhookEntries} />
        </div>
      </div>
    </div>
  );
}
