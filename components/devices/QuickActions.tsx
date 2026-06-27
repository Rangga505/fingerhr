import { cn } from "@/lib/utils/cn";
import type { CommandType } from "@/types/command";
import { useState } from "react";

export interface QuickActionsProps {
  deviceCloudId: string;
  deviceName: string;
  deviceId: string;
  disabled?: boolean;
  className?: string;
  onCommandExecute?: (command: string, params?: Record<string, any>) => Promise<void>;
}

interface CommandAction {
  type: CommandType;
  label: string;
  icon: string;
}

const commandActions: CommandAction[] = [
  {
    type: "get_device",
    label: "Get Device",
    icon: "M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25",
  },
  {
    type: "set_time",
    label: "Set Time",
    icon: "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  },
  {
    type: "restart_device",
    label: "Restart",
    icon: "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99",
  },
];

export function QuickActions({ deviceCloudId, deviceName, deviceId, disabled, className, onCommandExecute }: QuickActionsProps) {
  const [loading, setLoading] = useState(false);
  const [showDeviceInfo, setShowDeviceInfo] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  const handleCommand = async (commandType: CommandType) => {
    if (disabled || loading) return;

    // Konfirmasi untuk restart
    if (commandType === "restart_device") {
      const confirm = window.confirm(`Yakin ingin restart mesin ${deviceName}?`);
      if (!confirm) return;
    }

    setLoading(true);
    try {
      // Map command type ke command API
      const commandMap: Record<string, string> = {
        get_device: "GET_DEVICE",
        get_attlog: "GET_ATTLOG",
        get_userinfo: "GET_USERINFO",
        get_all_pin: "GET_ALL_PIN",
        set_time: "SET_TIME",
        restart_device: "RESTART",
      };

      const command = commandMap[commandType];

      const res = await fetch(`/api/devices/${deviceId}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          command,
          transId: "1",
          timezone: "Asia/Jakarta",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Gagal menjalankan command");
        return;
      }

      if (data.success) {
        // Jika Get Device, tampilkan info
        if (commandType === "get_device" && data.data) {
          setDeviceInfo(data.data);
          setShowDeviceInfo(true);
        } else {
          alert(`Command ${commandType} berhasil dijalankan!`);
        }
        
        // Call parent handler if exists
        if (onCommandExecute) {
          await onCommandExecute(command);
        }
      } else {
        alert(`Command gagal: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Command error:", error);
      alert("Gagal menjalankan command");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={cn("glass rounded-[2rem] overflow-hidden", className)}>
        <div className="border-b border-white/[0.08] px-6 py-4">
          <h3 className="text-sm font-semibold text-on-surface">Quick Actions</h3>
          <p className="mt-0.5 text-xs text-on-surface-variant">{deviceName}</p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-3 gap-2">
            {commandActions.map((action) => (
              <button
                key={action.type}
                type="button"
                disabled={disabled || loading}
                onClick={() => handleCommand(action.type)}
                className={cn(
                  "group flex flex-col items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-center transition-all",
                  "hover:border-primary/30 hover:bg-primary/5 hover:glow-indigo-sm",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-on-surface-variant transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={action.icon} />
                    </svg>
                  )}
                </div>
                <p className="text-xs font-medium text-on-surface group-hover:text-primary">
                  {action.label}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Device Info Modal */}
      {showDeviceInfo && deviceInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowDeviceInfo(false)}>
          <div className="glass max-w-lg w-full rounded-[2rem] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-on-surface">Informasi Device</h3>
              <button
                onClick={() => setShowDeviceInfo(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              {deviceInfo.data && (
                <>
                  <div className="flex justify-between border-b border-white/[0.08] pb-2">
                    <span className="text-sm text-on-surface-variant">Cloud ID</span>
                    <span className="text-sm font-medium text-on-surface">{deviceInfo.data.cloud_id || "-"}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.08] pb-2">
                    <span className="text-sm text-on-surface-variant">Device Name</span>
                    <span className="text-sm font-medium text-on-surface">{deviceInfo.data.device_name || "-"}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.08] pb-2">
                    <span className="text-sm text-on-surface-variant">Webhook URL</span>
                    <span className="text-sm font-medium text-on-surface truncate max-w-xs">{deviceInfo.data.webhook_url || "-"}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.08] pb-2">
                    <span className="text-sm text-on-surface-variant">Last Activity</span>
                    <span className="text-sm font-medium text-on-surface">{deviceInfo.data.last_activity || "-"}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.08] pb-2">
                    <span className="text-sm text-on-surface-variant">Created At</span>
                    <span className="text-sm font-medium text-on-surface">{deviceInfo.data.created_at || "-"}</span>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setShowDeviceInfo(false)}
              className="mt-6 w-full rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
}
