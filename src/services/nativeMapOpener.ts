import { Capacitor, registerPlugin } from '@capacitor/core';

export interface NativeMapOpenerPlugin {
  openMap(options: {
    url?: string;
    query?: string;
    lat?: number;
    lng?: number;
  }): Promise<{ opened?: boolean }>;
}

const NativeMapOpener = registerPlugin<NativeMapOpenerPlugin>('NativeMapOpener');

export function isNativeMapOpenerAvailable(): boolean {
  return (
    Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('NativeMapOpener')
  );
}

/**
 * Prefer the OS Maps app on Capacitor; fall back to a new browser tab on Web.
 * Never throws — silent no-op if both paths fail.
 */
export async function openMapExternally(options: {
  url?: string;
  query?: string;
  lat?: number;
  lng?: number;
}): Promise<boolean> {
  const url = options.url?.trim();
  const query = options.query?.trim();
  if (!url && !query && (options.lat == null || options.lng == null)) {
    return false;
  }

  if (isNativeMapOpenerAvailable()) {
    try {
      await NativeMapOpener.openMap({
        url: url || undefined,
        query: query || undefined,
        lat: options.lat,
        lng: options.lng,
      });
      return true;
    } catch (err) {
      console.warn('[TripKit] NativeMapOpener failed; falling back to window.open');
    }
  }

  const href =
    url ||
    (options.lat != null && options.lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${options.lat},${options.lng}`
      : query
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
        : '');
  if (!href) return false;
  try {
    window.open(href, '_blank', 'noopener,noreferrer');
    return true;
  } catch {
    return false;
  }
}
