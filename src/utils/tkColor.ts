/**
 * Resolve a `--tk-*` CSS custom property to a concrete color string.
 * Used only where native SDKs (Google Maps Polyline / Pin) reject `var(...)`.
 * Zero hex / rgba literals — values always come from :root tokens.
 */

const cache = new Map<string, string>();

export function tkColor(token: string): string {
  const key = token.startsWith('--') ? token : `--${token}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  if (typeof document === 'undefined') {
    return '';
  }

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(key)
    .trim();
  cache.set(key, value);
  return value;
}
