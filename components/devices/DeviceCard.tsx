"use client";

import { cn } from "@/lib/utils/cn";
import { DeviceStatusBadge } from "./DeviceStatusBadge";
import type { Device } from "@/types/device";

export interface DeviceCardProps {
  device: Device;
  isSelected?: boolean;
  onSelect?: (cloudId: string) => void;
  className?: string;
}

function formatDate(dateString: string | null): string {
  if (!dateString || dateString === "-") return "Never";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Never";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}

export function DeviceCard({ device, isSelected, onSelect, className }: DeviceCardProps) {
  return (
    <div
      className={cn(
        "group glass rounded-[2rem] p-6 transition-all",
        "hover:border-primary/20 hover:glow-indigo-sm",
        isSelected && "border-primary/30 glow-indigo",
        className
      )}
      onClick={() => onSelect?.(device.cloudId)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(device.cloudId);
        }
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-on-surface">{device.name}</h3>
            <DeviceStatusBadge status={device.status} />
          </div>
          <p className="mt-1 text-sm text-on-surface-variant">{device.location}</p>
        </div>
      </div>

      {/* Details Grid */}
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-on-surface-variant/60">Room</p>
          <p className="mt-0.5 text-sm font-medium text-on-surface">{device.location}</p>
        </div>
        <div>
          <p className="text-xs text-on-surface-variant/60">Cloud ID</p>
          <p className="mt-0.5 font-mono text-xs font-medium text-primary">{device.cloudId}</p>
        </div>
        <div>
          <p className="text-xs text-on-surface-variant/60">IP Address</p>
          <p className="mt-0.5 font-mono text-sm text-on-surface">{device.ip}</p>
        </div>
        <div>
          <p className="text-xs text-on-surface-variant/60">Last Sync</p>
          <p className={cn(
            "mt-0.5 text-sm",
            device.lastSync ? "text-on-surface" : "text-on-surface-variant/40 italic"
          )}>
            {formatDate(device.lastSync)}
          </p>
        </div>
        <div>
          <p className="text-xs text-on-surface-variant/60">Firmware</p>
          <p className="mt-0.5 font-mono text-sm text-on-surface">{device.firmware}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 flex items-center gap-2">
        <button
          type="button"
          className="flex-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-on-surface transition-all hover:bg-white/[0.08] hover:text-on-surface"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          Restart
        </button>
        <button
          type="button"
          className="flex-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-on-surface transition-all hover:bg-white/[0.08] hover:text-on-surface"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          Logs
        </button>
      </div>
    </div>
  );
}
