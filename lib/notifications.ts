export type NotificationType =
  | "ATTENDANCE_IN"
  | "ATTENDANCE_OUT"
  | "PERMISSION_PENDING"
  | "PERMISSION_APPROVED"
  | "PERMISSION_REJECTED";

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
}

const clientStore = new Map<string, ReadableStreamDefaultController>();

function generateId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function addClient(id: string, controller: ReadableStreamDefaultController) {
  clientStore.set(id, controller);
  console.log(`[Notifications] Client connected: ${id}. Total: ${clientStore.size}`);
}

export function removeClient(id: string) {
  clientStore.delete(id);
  console.log(`[Notifications] Client disconnected: ${id}. Total: ${clientStore.size}`);
}

export function broadcastNotification(data: Omit<NotificationPayload, "id" | "timestamp">) {
  const notification: NotificationPayload = {
    ...data,
    id: generateId(),
    timestamp: new Date().toISOString(),
  };

  const encoded = new TextEncoder().encode(`data: ${JSON.stringify(notification)}\n\n`);

  for (const [id, controller] of clientStore) {
    try {
      controller.enqueue(encoded);
    } catch {
      console.warn(`[Notifications] Failed to send to client ${id}, removing`);
      clientStore.delete(id);
    }
  }

  console.log(`[Notifications] Broadcast sent to ${clientStore.size} clients:`, notification.type);
}
