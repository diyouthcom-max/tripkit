import type { TimelineNode } from '../types';

export type MapsTravelMode = 'walking' | 'transit' | 'driving';

export function getConfiguredGoogleMapsApiKey(): string {
  const raw = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'YOUR_GOOGLE_MAPS_API_KEY' || trimmed === 'MY_GOOGLE_MAPS_API_KEY') {
    return '';
  }
  return trimmed;
}

export function buildPlaceQueryString(
  title: string,
  address?: string,
  cityHint?: string
): string {
  const cleanTitle = (title || '').trim();
  const cleanAddress = (address || '').trim();
  const cleanCity = (cityHint || '').trim();

  if (cleanTitle && cleanAddress) {
    if (cleanAddress.toLowerCase().includes(cleanTitle.toLowerCase())) {
      return cleanAddress;
    }
    return `${cleanTitle}, ${cleanAddress}`;
  }
  if (cleanAddress) return cleanAddress;
  if (cleanTitle && cleanCity && !cleanTitle.includes(cleanCity)) {
    return `${cleanTitle}, ${cleanCity}`;
  }
  return cleanTitle || cleanCity;
}

/**
 * Builds an official Cross-Platform Google Maps Search URL (Maps URLs API v1).
 * Works across iOS, Android (opens Google Maps app), and Desktop Web without requiring an API key.
 * Docs: https://developers.google.com/maps/documentation/urls/get-started?utm_campaign=gmp_mcp_codeassist_v1_aistudio
 */
export function buildGoogleMapsSearchUrl(params: {
  title: string;
  address?: string;
  cityHint?: string;
}): string {
  const query = buildPlaceQueryString(params.title, params.address, params.cityHint);
  const url = new URL('https://www.google.com/maps/search/');
  url.searchParams.set('api', '1');
  url.searchParams.set('query', query);
  return url.toString();
}

/**
 * Builds an official Cross-Platform Google Maps Directions URL (Maps URLs API v1).
 * If `origin` is omitted, Google Maps uses the traveler's live GPS location as starting point.
 * Docs: https://developers.google.com/maps/documentation/urls/get-started?utm_campaign=gmp_mcp_codeassist_v1_aistudio
 */
export function buildGoogleMapsDirectionsUrl(params: {
  destination: string;
  origin?: string;
  waypoints?: string[];
  travelMode?: MapsTravelMode;
}): string {
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  if (params.origin && params.origin.trim()) {
    url.searchParams.set('origin', params.origin.trim());
  }
  url.searchParams.set('destination', params.destination.trim());
  if (params.waypoints && params.waypoints.length > 0) {
    const validWaypoints = params.waypoints.map((w) => w.trim()).filter(Boolean).slice(0, 9);
    if (validWaypoints.length > 0) {
      url.searchParams.set('waypoints', validWaypoints.join('|'));
    }
  }
  url.searchParams.set('travelmode', params.travelMode || 'transit');
  return url.toString();
}

export interface ResolvedDayStop {
  id: string;
  orderNumber: number;
  dayNumber?: number;
  time: string;
  title: string;
  district: string;
  address: string;
  query: string;
  isVisited: boolean;
  isSwappedIndoor: boolean;
  isAnchor: boolean;
}

export function resolveDayStopsForMap(
  nodes: TimelineNode[],
  rainSwapped: boolean,
  cityHint: string,
  dayNumber?: number
): ResolvedDayStop[] {
  return nodes.map((node, index) => {
    const isSwappedIndoor = Boolean(rainSwapped && node.isOutdoor && node.rainSwapTitle);
    const title = isSwappedIndoor ? node.rainSwapTitle! : node.title;
    const district =
      isSwappedIndoor && node.rainSwapDistrict ? node.rainSwapDistrict : node.district;
    const address =
      isSwappedIndoor && node.rainSwapAddress ? node.rainSwapAddress : node.address;
    const isVisited = node.visited !== undefined ? node.visited : Boolean(node.logged);

    return {
      id: node.id,
      orderNumber: index + 1,
      dayNumber: dayNumber ?? node.day,
      time: node.time,
      title,
      district,
      address,
      query: buildPlaceQueryString(title, address, cityHint),
      isVisited,
      isSwappedIndoor,
      isAnchor: Boolean(node.isAnchor),
    };
  });
}

export function resolveMultiDayStopsForMap(params: {
  allNodes: TimelineNode[];
  selectedDays: number[];
  rainSwapped: boolean;
  rainSwappedDays?: Record<number, boolean>;
  defaultCityHint: string;
  getDayCityHint: (day: number) => string;
}): ResolvedDayStop[] {
  const {
    allNodes,
    selectedDays,
    rainSwapped,
    rainSwappedDays,
    defaultCityHint,
    getDayCityHint,
  } = params;
  const daySet = new Set(selectedDays);
  const filtered = allNodes
    .filter((n) => daySet.has(n.day ?? 1))
    .slice()
    .sort((a, b) => {
      const da = a.day ?? 1;
      const db = b.day ?? 1;
      if (da !== db) return da - db;
      return (a.time || '').localeCompare(b.time || '');
    });

  return filtered.map((node, index) => {
    const d = node.day ?? 1;
    const cityHint = node.city || getDayCityHint(d) || defaultCityHint;
    const dayRainSwapped =
      rainSwappedDays && d in rainSwappedDays ? Boolean(rainSwappedDays[d]) : rainSwapped;
    const isSwappedIndoor = Boolean(dayRainSwapped && node.isOutdoor && node.rainSwapTitle);
    const title = isSwappedIndoor ? node.rainSwapTitle! : node.title;
    const district =
      isSwappedIndoor && node.rainSwapDistrict ? node.rainSwapDistrict : node.district;
    const address =
      isSwappedIndoor && node.rainSwapAddress ? node.rainSwapAddress : node.address;
    const isVisited = node.visited !== undefined ? node.visited : Boolean(node.logged);

    return {
      id: node.id,
      orderNumber: index + 1,
      dayNumber: d,
      time: node.time,
      title,
      district,
      address,
      query: buildPlaceQueryString(title, address, cityHint),
      isVisited,
      isSwappedIndoor,
      isAnchor: Boolean(node.isAnchor),
    };
  });
}

export function buildFullDayGoogleMapsRouteUrl(
  stops: ResolvedDayStop[],
  travelMode: MapsTravelMode
): string | null {
  if (stops.length === 0) return null;
  if (stops.length === 1) {
    return buildGoogleMapsDirectionsUrl({
      destination: stops[0].query,
      travelMode,
    });
  }
  const origin = stops[0].query;
  const destination = stops[stops.length - 1].query;
  const waypoints = stops.slice(1, -1).map((s) => s.query);
  return buildGoogleMapsDirectionsUrl({
    origin,
    destination,
    waypoints,
    travelMode,
  });
}
