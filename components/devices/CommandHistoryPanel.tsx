import { cn } from "@/lib/utils/cn";
import type { CommandHistory, CommandStatus, CommandType } from "@/types/command";

export interface CommandHistoryPanelProps {
  commands: CommandHistory[];
  className?: string;
}

const statusConfig: Record<CommandStatus, { label: string; dot: string; bg: string; text: string }> = {
  pending: {
    label: "Pending",
    dot: "bg-blue-500",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
  },
  success: {
    label: "Success",
    dot: "bg-emerald-500",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
  },
  failed: {
    label: "Failed",
    dot: "bg-red-500",
    bg: "bg-red-500/10",
    text: "text-red-400",
  },
  timeout: {
    label: "Timeout",
    dot: "bg-amber-500",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
  },
};

const commandTypeLabels: Record<CommandType, string> = {
  get_device: "Get Device",
  get_attlog: "Get Attlog",
  get_userinfo: "Get Userinfo",
  get_all_pin: "Get All PIN",
  set_time: "Set Time",
  restart_device: "Restart Device",
  set_userinfo: "Set Userinfo",
  delete_userinfo: "Delete Userinfo",
  reg_online: "Reg Online",
};

function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function CommandHistoryPanel({ commands, className }: CommandHistoryPanelProps) {
  return (
    <div className={cn("glass rounded-[2rem] overflow-hidden", className)}>
      <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
        <div>
          <h3 className="text-sm font-semibold text-on-surface">Command History</h3>
          <p className="mt-0.5 text-xs text-on-surface-variant">{commands.length} recent commands</p>
        </div>
        <button
          type="button"
          className="text-xs font-medium text-primary transition-colors hover:text-primary-container"
        >
          View All
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.05]">
              <th className="px-6 py-3 text-xs font-medium text-on-surface-variant/60 uppercase tracking-wider">Command</th>
              <th className="px-6 py-3 text-xs font-medium text-on-surface-variant/60 uppercase tracking-wider">Device</th>
              <th className="px-6 py-3 text-xs font-medium text-on-surface-variant/60 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-xs font-medium text-on-surface-variant/60 uppercase tracking-wider">Time</th>
              <th className="px-6 py-3 text-xs font-medium text-on-surface-variant/60 uppercase tracking-wider">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {commands.map((cmd) => {
              const config = statusConfig[cmd.status];
              return (
                <tr key={cmd.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-6 py-4">
                    <span className="font-medium text-on-surface">
                      {commandTypeLabels[cmd.commandType]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-on-surface-variant">{cmd.deviceName}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                        config.bg,
                        config.text
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
                      {config.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">
                    {formatDateShort(cmd.requestTime)}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-on-surface-variant">
                    {cmd.duration ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {commands.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-on-surface-variant">No commands sent yet</p>
        </div>
      )}
    </div>
  );
}
