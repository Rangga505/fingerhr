import { addClient, removeClient } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "CONNECTED", clientId })}\n\n`));

      addClient(clientId, controller);

      // Keep-alive ping every 30s
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          clearInterval(keepAlive);
        }
      }, 30000);

      // Store interval so we can clean it up
      (controller as any)._keepAliveInterval = keepAlive;
    },
    cancel(controller) {
      const interval = (controller as any)._keepAliveInterval;
      if (interval) clearInterval(interval);
      removeClient(clientId);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
