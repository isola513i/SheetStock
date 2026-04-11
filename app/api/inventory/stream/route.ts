import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/api-auth';
import { subscribe, unsubscribe } from '@/lib/server/inventory-events';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const guard = await requireUser(request);
  if (!guard.ok) return guard.response;
  const encoder = new TextEncoder();
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let controller: ReadableStreamDefaultController | undefined;

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
      subscribe(ctrl);

      // Initial connected event
      ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

      // Heartbeat every 30s to keep connection alive
      heartbeatTimer = setInterval(() => {
        try {
          ctrl.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeatTimer);
          unsubscribe(ctrl);
        }
      }, 30_000);
    },
    cancel() {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (controller) unsubscribe(controller);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
