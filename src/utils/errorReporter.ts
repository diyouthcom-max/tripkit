export type ClientErrorSource = 'boundary' | 'window' | 'rejection';

export interface ClientErrorPayload {
  message: string;
  stack?: string;
  url?: string;
  source: ClientErrorSource;
  extra?: Record<string, unknown>;
}

const DEDUPE_WINDOW_MS = 10_000;
const recentByMessage = new Map<string, number>();

function shouldSkipDuplicate(message: string): boolean {
  const key = message.slice(0, 200);
  const now = Date.now();
  const last = recentByMessage.get(key);
  if (last != null && now - last < DEDUPE_WINDOW_MS) return true;
  recentByMessage.set(key, now);
  // Bound map size to avoid unbounded growth in long sessions.
  if (recentByMessage.size > 80) {
    const cutoff = now - DEDUPE_WINDOW_MS;
    for (const [k, ts] of recentByMessage) {
      if (ts < cutoff) recentByMessage.delete(k);
    }
  }
  return false;
}

/**
 * Fire-and-forget client error reporter. Never throws; failures are silent.
 */
export function reportClientError(payload: ClientErrorPayload): void {
  try {
    const message = String(payload?.message ?? '').slice(0, 2000);
    if (!message) return;
    if (shouldSkipDuplicate(`${payload.source}:${message}`)) return;

    const body = {
      message,
      stack:
        typeof payload.stack === 'string'
          ? payload.stack.slice(0, 8000)
          : undefined,
      url:
        typeof payload.url === 'string' ? payload.url.slice(0, 500) : undefined,
      source: payload.source,
      extra:
        payload.extra && typeof payload.extra === 'object'
          ? payload.extra
          : undefined,
      ts: Date.now(),
    };

    void fetch('/api/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {
      // Silent — reporting must never affect UX.
    });
  } catch {
    // Silent.
  }
}
