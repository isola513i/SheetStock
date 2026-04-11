import 'server-only';

import { fetchInventoryFromGoogleSheets, invalidateInventoryCache, setNotifyClients } from './inventory';

// --- SSE Client Management ---

type SSEClient = ReadableStreamDefaultController;

const clients = new Set<SSEClient>();
const encoder = new TextEncoder();

export function subscribe(controller: SSEClient) {
  clients.add(controller);
  if (clients.size === 1) startPolling();
}

export function unsubscribe(controller: SSEClient) {
  clients.delete(controller);
  if (clients.size === 0) stopPolling();
}

function notifyClients() {
  const payload = encoder.encode(
    `data: ${JSON.stringify({ type: 'inventory-updated', timestamp: Date.now() })}\n\n`,
  );
  const dead: SSEClient[] = [];
  for (const client of clients) {
    try {
      client.enqueue(payload);
    } catch {
      dead.push(client);
    }
  }
  for (const d of dead) clients.delete(d);
}

// Register so inventory.ts can notify SSE clients on local writes
setNotifyClients(notifyClients);

// --- Change Detection via Polling ---

const POLL_INTERVAL = process.env.NODE_ENV === 'production' ? 30_000 : 10_000; // 30s prod, 10s dev

let pollingTimer: ReturnType<typeof setTimeout> | null = null;
let lastHash: string | null = null;

async function computeHash(data: unknown[]): Promise<string> {
  const raw = JSON.stringify(data);
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(raw));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Uses setTimeout chaining so the next poll starts only after the previous one completes
async function pollLoop() {
  if (clients.size === 0) {
    pollingTimer = null;
    return;
  }
  try {
    const data = await fetchInventoryFromGoogleSheets();
    const hash = await computeHash(data);
    // First poll sets baseline hash; subsequent polls detect changes
    if (lastHash !== null && hash !== lastHash) {
      invalidateInventoryCache();
      notifyClients();
    }
    lastHash = hash;
  } catch (err) {
    console.error('[inventory-events] poll error:', err);
  }
  pollingTimer = setTimeout(pollLoop, POLL_INTERVAL);
}

function startPolling() {
  if (pollingTimer) return;
  lastHash = null;
  pollLoop();
}

function stopPolling() {
  if (pollingTimer) {
    clearTimeout(pollingTimer);
    pollingTimer = null;
  }
  lastHash = null;
}
