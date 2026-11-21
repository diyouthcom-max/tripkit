/**
 * Resolves backend API URLs seamlessly across both Web dev/prod and Capacitor iOS/Android builds.
 * In Cursor + Capacitor, set VITE_API_BASE_URL="https://your-cloud-run-domain.run.app" in .env.production.
 */
export function resolveApiUrl(apiPath: string): string {
  const base = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
  const cleanPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  return base ? `${base}${cleanPath}` : cleanPath;
}
