import { Capacitor } from '@capacitor/core';

let warnedMissingNativeApiBase = false;

/**
 * Resolves backend API URLs seamlessly across both Web dev/prod and Capacitor iOS/Android builds.
 * In Cursor + Capacitor, set VITE_API_BASE_URL="https://your-cloud-run-domain.run.app" in .env.production.
 */
export function resolveApiUrl(apiPath: string): string {
  const base = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
  const cleanPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  if (
    !base &&
    Capacitor.isNativePlatform() &&
    !warnedMissingNativeApiBase
  ) {
    warnedMissingNativeApiBase = true;
    console.error(
      '[TripKit] VITE_API_BASE_URL is empty in this native build. AI and /api/* calls will hit the WebView origin and fail. Set VITE_API_BASE_URL in .env.production before `npm run build` + `npx cap sync`.'
    );
  }
  return base ? `${base}${cleanPath}` : cleanPath;
}

export type AiRequestErrorKind = 'timeout' | 'network' | 'server' | 'business';

export class AiRequestError extends Error {
  readonly kind: AiRequestErrorKind;
  readonly status?: number;

  constructor(kind: AiRequestErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'AiRequestError';
    this.kind = kind;
    this.status = status;
  }
}

function defaultTimeoutMsForPath(apiPath: string): number {
  if (apiPath.includes('plan-trip')) return 120_000;
  if (apiPath.includes('generate-packing-list')) return 90_000;
  return 90_000;
}

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = (err as { name?: string }).name;
  return name === 'AbortError';
}

function isNetworkLayerFailure(err: unknown): boolean {
  if (isAbortError(err)) return false;
  if (err instanceof TypeError) return true;
  if (!(err instanceof Error)) return false;
  return /Load failed|Failed to fetch|NetworkError|network error|ECONNRESET|ETIMEDOUT/i.test(
    err.message
  );
}

export interface FetchAiJsonOptions {
  timeoutMs?: number;
  /** Extra attempts after the first try. Default 1 (total 2 attempts). */
  retries?: number;
  onRetry?: () => void;
}

/**
 * POST JSON to an /api/ai/* path with AbortController timeout + one automatic retry
 * on network / timeout / 5xx. Never surfaces raw WebKit "Load failed" strings.
 */
export async function fetchAiJsonWithRetry(
  apiPath: string,
  body: unknown,
  options?: FetchAiJsonOptions
): Promise<unknown> {
  const timeoutMs = options?.timeoutMs ?? defaultTimeoutMsForPath(apiPath);
  const retries = options?.retries ?? 1;
  const url = resolveApiUrl(apiPath);
  let lastError: AiRequestError | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      options?.onRetry?.();
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      let data: { error?: string } | unknown = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      window.clearTimeout(timer);

      if (!res.ok) {
        const fallback =
          typeof data === 'object' &&
          data &&
          'error' in data &&
          typeof (data as { error?: unknown }).error === 'string'
            ? (data as { error: string }).error
            : `Request failed (${res.status})`;
        const kind: AiRequestErrorKind = res.status >= 500 ? 'server' : 'business';
        const err = new AiRequestError(kind, fallback, res.status);
        if (kind === 'server' && attempt < retries) {
          lastError = err;
          continue;
        }
        throw err;
      }

      return data;
    } catch (err) {
      window.clearTimeout(timer);

      if (err instanceof AiRequestError) {
        if (err.kind === 'server' && attempt < retries) {
          lastError = err;
          continue;
        }
        throw err;
      }

      let normalized: AiRequestError;
      if (isAbortError(err)) {
        normalized = new AiRequestError('timeout', 'AI request timed out');
      } else if (isNetworkLayerFailure(err)) {
        normalized = new AiRequestError('network', 'AI network interrupted');
      } else {
        normalized = new AiRequestError('network', 'AI network interrupted');
      }

      if (attempt < retries) {
        lastError = normalized;
        continue;
      }
      throw normalized;
    }
  }

  throw lastError ?? new AiRequestError('network', 'AI network interrupted');
}
