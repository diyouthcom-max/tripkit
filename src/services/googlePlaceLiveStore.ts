import { useEffect, useState, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type { AppLanguage, StopType, TimelineNode } from '../types';
import {
  buildPlaceQueryString,
  getConfiguredGoogleMapsApiKey,
} from '../utils/googleMapsHelpers';

export interface PlacePhotoAttribution {
  displayName: string;
  uri?: string;
}

export interface LiveGooglePlaceInfo {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  location?: { lat: number; lng: number };
  rating?: number;
  userRatingCount?: number;
  thumbPhotoUri?: string;
  heroPhotoUris: string[];
  photoAttributions: PlacePhotoAttribution[];
  weekdayDescriptions: string[];
  websiteUri?: string;
  googleMapsUri?: string;
  nationalPhoneNumber?: string;
  editorialSummary?: string;
  primaryTypeDisplayName?: string;
  fetchedAtMs: number;
}

/**
 * In-memory session cache keyed by lookup key or placeId.
 * Per Google Maps Platform Terms of Service, non-geospatial Place attributes
 * (ratings, opening hours, photos, summaries) are held strictly in volatile memory
 * for the active session while only `placeId` is persisted on the trip node.
 */
const livePlaceMemoryCache: Record<string, LiveGooglePlaceInfo> = {};
const inFlightLookups: Record<string, Promise<LiveGooglePlaceInfo | null>> = {};

/** Session cache for city-cover lookups (null = known miss). Keys: gcover:{lang}:{city} */
const cityCoverResultCache: Record<string, GoogleCityCoverResult | null> = {};
const inFlightCityCoverLookups: Record<string, Promise<GoogleCityCoverResult | null>> = {};

export const PLACES_LANG_MAP: Record<AppLanguage, string> = {
  'zh-CN': 'zh-CN',
  'en-US': 'en-US',
  'en-GB': 'en-GB',
  'es-MX': 'es-419',
  'fr-FR': 'fr',
  'de-DE': 'de',
  'pt-BR': 'pt-BR',
  'ja-JP': 'ja',
};

export interface GoogleCityCoverResult {
  photoUri: string;
  attribution: PlacePhotoAttribution;
  placeDisplayName?: string;
}

export function getCachedLivePlace(key: string | undefined): LiveGooglePlaceInfo | null {
  if (!key) return null;
  return livePlaceMemoryCache[key] ?? null;
}

/**
 * Places API (New) city landmark photo for trip header covers.
 * Caches under `gcover:{lang}:{city}` in livePlaceMemoryCache (+ result cache).
 * Returns null on failure / no photos (caller falls back to local preset).
 */
export async function resolveGoogleCityCoverPhoto(params: {
  placesLib: google.maps.PlacesLibrary;
  city: string;
  language: AppLanguage;
}): Promise<GoogleCityCoverResult | null> {
  const city = String(params.city || '').trim();
  if (!city || !params.placesLib?.Place) return null;

  const placesLang = PLACES_LANG_MAP[params.language] || 'en-US';
  const cityKey = city.toLowerCase();
  const cacheKey = `gcover:${placesLang}:${cityKey}`;

  if (Object.prototype.hasOwnProperty.call(cityCoverResultCache, cacheKey)) {
    return cityCoverResultCache[cacheKey];
  }
  const cachedPlace = livePlaceMemoryCache[cacheKey];
  if (cachedPlace?.heroPhotoUris?.[0] && cachedPlace.photoAttributions[0]) {
    const hit: GoogleCityCoverResult = {
      photoUri: cachedPlace.heroPhotoUris[0],
      attribution: cachedPlace.photoAttributions[0],
      placeDisplayName: cachedPlace.displayName,
    };
    cityCoverResultCache[cacheKey] = hit;
    return hit;
  }
  if (inFlightCityCoverLookups[cacheKey] !== undefined) {
    return inFlightCityCoverLookups[cacheKey];
  }

  const textQuery = `${city} city landmark skyline`;
  const task = (async (): Promise<GoogleCityCoverResult | null> => {
    try {
      const { places } = await params.placesLib.Place.searchByText({
        textQuery,
        fields: ['id', 'displayName', 'photos'],
        maxResultCount: 1,
        language: placesLang,
        internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
      });
      const first = places?.[0];
      if (!first) {
        cityCoverResultCache[cacheKey] = null;
        return null;
      }

      const photos = Array.isArray(first.photos) ? first.photos : [];
      if (photos.length === 0) {
        cityCoverResultCache[cacheKey] = null;
        return null;
      }

      let photoUri: string | undefined;
      try {
        photoUri = photos[0].getURI({ maxWidth: 1200, maxHeight: 800 });
      } catch {
        photoUri = undefined;
      }
      if (!photoUri) {
        cityCoverResultCache[cacheKey] = null;
        return null;
      }

      const attributions = extractPhotoAttributionList(photos);
      const attribution = attributions[0] || {
        displayName: first.displayName || city,
      };

      const mapped = mapPlaceInstanceToLiveInfo(first, city, city);
      if (mapped) {
        // Prefer the cover-sized URI as hero[0] for this gcover cache entry.
        livePlaceMemoryCache[cacheKey] = {
          ...mapped,
          heroPhotoUris: [photoUri, ...mapped.heroPhotoUris.filter((u) => u !== photoUri)],
          thumbPhotoUri: mapped.thumbPhotoUri || photoUri,
          photoAttributions:
            attributions.length > 0 ? attributions : mapped.photoAttributions,
        };
      }

      const result: GoogleCityCoverResult = {
        photoUri,
        attribution,
        placeDisplayName: first.displayName || city,
      };
      cityCoverResultCache[cacheKey] = result;
      return result;
    } catch (err) {
      console.warn('Google city cover lookup failed for:', city, err);
      cityCoverResultCache[cacheKey] = null;
      return null;
    } finally {
      delete inFlightCityCoverLookups[cacheKey];
    }
  })();

  inFlightCityCoverLookups[cacheKey] = task;
  return task;
}

function extractPhotoAttributionList(
  photos: google.maps.places.Photo[] | null | undefined
): PlacePhotoAttribution[] {
  if (!Array.isArray(photos) || photos.length === 0) return [];
  const seen: Record<string, boolean> = {};
  const list: PlacePhotoAttribution[] = [];
  for (const photo of photos.slice(0, 4)) {
    const attrs = photo.authorAttributions || [];
    for (const attr of attrs) {
      const name = (attr?.displayName || '').trim();
      if (!name || seen[name]) continue;
      seen[name] = true;
      list.push({
        displayName: name,
        uri: attr?.uri || undefined,
      });
    }
  }
  return list;
}

function mapPlaceInstanceToLiveInfo(
  place: google.maps.places.Place,
  fallbackTitle: string,
  fallbackAddress: string
): LiveGooglePlaceInfo | null {
  const placeId = place.id || '';
  if (!placeId && !place.displayName && !place.location) return null;

  const photos = Array.isArray(place.photos) ? place.photos : [];
  let thumbPhotoUri: string | undefined;
  const heroPhotoUris: string[] = [];

  photos.slice(0, 4).forEach((photo, idx) => {
    try {
      if (idx === 0) {
        thumbPhotoUri = photo.getURI({ maxWidth: 420, maxHeight: 420 });
      }
      const heroUri = photo.getURI({ maxWidth: 1080, maxHeight: 760 });
      if (heroUri) {
        heroPhotoUris.push(heroUri);
      }
    } catch {
      // Ignore individual photo URI failure
    }
  });

  const loc = place.location;
  const location = loc ? { lat: loc.lat(), lng: loc.lng() } : undefined;
  const rating =
    typeof place.rating === 'number' && place.rating > 0
      ? Math.round(place.rating * 10) / 10
      : undefined;
  const userRatingCount =
    typeof place.userRatingCount === 'number' && place.userRatingCount > 0
      ? place.userRatingCount
      : undefined;

  const weekdayDescriptions = Array.isArray(place.regularOpeningHours?.weekdayDescriptions)
    ? place.regularOpeningHours!.weekdayDescriptions.filter(Boolean)
    : [];

  // Handle editorialSummary across string orLocalizedText shapes safely
  const rawEditorial = (place as unknown as { editorialSummary?: unknown }).editorialSummary;
  let editorialSummary: string | undefined;
  if (typeof rawEditorial === 'string' && rawEditorial.trim()) {
    editorialSummary = rawEditorial.trim();
  } else if (
    rawEditorial &&
    typeof rawEditorial === 'object' &&
    'text' in (rawEditorial as Record<string, unknown>) &&
    typeof (rawEditorial as { text?: unknown }).text === 'string'
  ) {
    editorialSummary = ((rawEditorial as { text: string }).text || '').trim() || undefined;
  }

  const rawTypeDisplay = (place as unknown as { primaryTypeDisplayName?: unknown })
    .primaryTypeDisplayName;
  let primaryTypeDisplayName: string | undefined;
  if (typeof rawTypeDisplay === 'string' && rawTypeDisplay.trim()) {
    primaryTypeDisplayName = rawTypeDisplay.trim();
  } else if (
    rawTypeDisplay &&
    typeof rawTypeDisplay === 'object' &&
    'text' in (rawTypeDisplay as Record<string, unknown>) &&
    typeof (rawTypeDisplay as { text?: unknown }).text === 'string'
  ) {
    primaryTypeDisplayName = ((rawTypeDisplay as { text: string }).text || '').trim() || undefined;
  }

  return {
    placeId,
    displayName: place.displayName || fallbackTitle,
    formattedAddress: place.formattedAddress || fallbackAddress,
    location,
    rating,
    userRatingCount,
    thumbPhotoUri: thumbPhotoUri || heroPhotoUris[0],
    heroPhotoUris,
    photoAttributions: extractPhotoAttributionList(photos),
    weekdayDescriptions,
    websiteUri: place.websiteURI || undefined,
    googleMapsUri: place.googleMapsURI || undefined,
    nationalPhoneNumber: place.nationalPhoneNumber || place.internationalPhoneNumber || undefined,
    editorialSummary,
    primaryTypeDisplayName,
    fetchedAtMs: Date.now(),
  };
}

const RICH_PLACE_FIELDS: string[] = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'rating',
  'userRatingCount',
  'photos',
  'regularOpeningHours',
  'websiteURI',
  'googleMapsURI',
  'nationalPhoneNumber',
  'editorialSummary',
  'primaryTypeDisplayName',
];

async function resolveRichGooglePlace(params: {
  placesLib: google.maps.PlacesLibrary;
  placeId?: string;
  query: string;
  fallbackTitle: string;
  fallbackAddress: string;
  language: string;
}): Promise<LiveGooglePlaceInfo | null> {
  const { placesLib, placeId, query, fallbackTitle, fallbackAddress, language } = params;
  const cacheKey = placeId ? `pid:${placeId}` : `q:${language}:${query.toLowerCase()}`;

  if (livePlaceMemoryCache[cacheKey]) {
    return livePlaceMemoryCache[cacheKey];
  }
  if (placeId && livePlaceMemoryCache[`pid:${placeId}`]) {
    return livePlaceMemoryCache[`pid:${placeId}`];
  }
  if (inFlightLookups[cacheKey] !== undefined) {
    return inFlightLookups[cacheKey];
  }

  const task = (async (): Promise<LiveGooglePlaceInfo | null> => {
    try {
      // Path A: Direct Place ID lookup via Places API (New) Place.fetchFields
      if (placeId) {
        const place = new placesLib.Place({
          id: placeId,
          requestedLanguage: language,
        });
        await place.fetchFields({
          fields: RICH_PLACE_FIELDS,
        });
        const mapped = mapPlaceInstanceToLiveInfo(place, fallbackTitle, fallbackAddress);
        if (mapped) {
          livePlaceMemoryCache[cacheKey] = mapped;
          if (mapped.placeId) {
            livePlaceMemoryCache[`pid:${mapped.placeId}`] = mapped;
          }
          livePlaceMemoryCache[`q:${language}:${query.toLowerCase()}`] = mapped;
          return mapped;
        }
      }

      // Path B: Text Search via Places API (New) Place.searchByText
      const { places } = await placesLib.Place.searchByText({
        textQuery: query,
        fields: RICH_PLACE_FIELDS,
        maxResultCount: 1,
        language,
        internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
      });
      const first = places?.[0];
      if (!first) return null;
      const mapped = mapPlaceInstanceToLiveInfo(first, fallbackTitle, fallbackAddress);
      if (mapped) {
        livePlaceMemoryCache[cacheKey] = mapped;
        if (mapped.placeId) {
          livePlaceMemoryCache[`pid:${mapped.placeId}`] = mapped;
        }
        livePlaceMemoryCache[`q:${language}:${query.toLowerCase()}`] = mapped;
        return mapped;
      }
      return null;
    } catch (err) {
      // Fallback if editorialSummary or primaryTypeDisplayName isn't supported in a regional SKU
      try {
        const coreFields = [
          'id',
          'displayName',
          'formattedAddress',
          'location',
          'rating',
          'userRatingCount',
          'photos',
          'regularOpeningHours',
          'websiteURI',
          'googleMapsURI',
        ];
        const { places } = await placesLib.Place.searchByText({
          textQuery: query,
          fields: coreFields,
          maxResultCount: 1,
          language,
          internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
        });
        const first = places?.[0];
        if (!first) return null;
        const mapped = mapPlaceInstanceToLiveInfo(first, fallbackTitle, fallbackAddress);
        if (mapped) {
          livePlaceMemoryCache[cacheKey] = mapped;
          if (mapped.placeId) {
            livePlaceMemoryCache[`pid:${mapped.placeId}`] = mapped;
          }
          return mapped;
        }
      } catch {
        console.warn('Places API (New) enrichment unavailable for:', query, err);
      }
      return null;
    } finally {
      delete inFlightLookups[cacheKey];
    }
  })();

  inFlightLookups[cacheKey] = task;
  return task;
}

export interface StopEnrichmentTarget {
  nodeId: string;
  placeId?: string;
  title: string;
  address: string;
  cityHint: string;
}

/**
 * Inner hook mounted strictly when `VITE_GOOGLE_MAPS_API_KEY` is configured (inside `<APIProvider>`).
 */
function useConfiguredDayStopsPlaces(
  targets: StopEnrichmentTarget[],
  lang: AppLanguage,
  onPlaceIdDiscovered?: (nodeId: string, placeId: string, coords?: { lat: number; lng: number }) => void
): {
  placesByNodeId: Record<string, LiveGooglePlaceInfo>;
  loadingByNodeId: Record<string, boolean>;
} {
  const placesLib = useMapsLibrary('places');
  const [placesByNodeId, setPlacesByNodeId] = useState<Record<string, LiveGooglePlaceInfo>>({});
  const [loadingByNodeId, setLoadingByNodeId] = useState<Record<string, boolean>>({});
  const callbackRef = useRef(onPlaceIdDiscovered);
  callbackRef.current = onPlaceIdDiscovered;

  const placesLang = PLACES_LANG_MAP[lang] || 'en-US';
  const targetsSignature = targets
    .map((t) => `${t.nodeId}|${t.placeId || ''}|${t.title}|${t.address}|${t.cityHint}`)
    .join(';;');

  useEffect(() => {
    let cancelled = false;
    if (!placesLib || targets.length === 0) {
      setLoadingByNodeId({});
      return;
    }

    const hydrate = async () => {
      const nextLoading: Record<string, boolean> = {};
      targets.forEach((t) => {
        const query = buildPlaceQueryString(t.title, t.address, t.cityHint);
        const cached =
          (t.placeId && livePlaceMemoryCache[`pid:${t.placeId}`]) ||
          livePlaceMemoryCache[`q:${placesLang}:${query.toLowerCase()}`];
        if (cached) {
          setPlacesByNodeId((prev) =>
            prev[t.nodeId] === cached ? prev : { ...prev, [t.nodeId]: cached }
          );
        } else {
          nextLoading[t.nodeId] = true;
        }
      });

      if (Object.keys(nextLoading).length > 0) {
        setLoadingByNodeId((prev) => ({ ...prev, ...nextLoading }));
      }

      // Resolve in parallel batches of 3 for snappy UX without hammering browser connections
      const queue = [...targets];
      const workers = Array.from({ length: Math.min(3, queue.length) }, async () => {
        while (queue.length > 0 && !cancelled) {
          const item = queue.shift();
          if (!item) break;
          const query = buildPlaceQueryString(item.title, item.address, item.cityHint);
          const info = await resolveRichGooglePlace({
            placesLib,
            placeId: item.placeId,
            query,
            fallbackTitle: item.title,
            fallbackAddress: item.address,
            language: placesLang,
          });
          if (cancelled) return;
          setLoadingByNodeId((prev) => {
            if (!prev[item.nodeId]) return prev;
            const copy = { ...prev };
            delete copy[item.nodeId];
            return copy;
          });
          if (info) {
            setPlacesByNodeId((prev) => ({
              ...prev,
              [item.nodeId]: info,
            }));
            if (info.placeId && info.placeId !== item.placeId && callbackRef.current) {
              callbackRef.current(item.nodeId, info.placeId, info.location);
            }
          }
        }
      });

      await Promise.all(workers);
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placesLib, targetsSignature, placesLang]);

  return { placesByNodeId, loadingByNodeId };
}

function useUnconfiguredDayStopsPlaces(): {
  placesByNodeId: Record<string, LiveGooglePlaceInfo>;
  loadingByNodeId: Record<string, boolean>;
} {
  return { placesByNodeId: {}, loadingByNodeId: {} };
}

/**
 * Safe hook wrapper: uses Google Places API (New) when API key is configured,
 * and cleanly returns empty maps when offline or unconfigured.
 */
export const useDayStopsGooglePlaces: typeof useConfiguredDayStopsPlaces =
  getConfiguredGoogleMapsApiKey()
    ? useConfiguredDayStopsPlaces
    : (useUnconfiguredDayStopsPlaces as unknown as typeof useConfiguredDayStopsPlaces);

/**
 * Infers a realistic default stay duration (in minutes) when `node.durationMinutes` is not explicitly set.
 */
export function resolveStopDurationMinutes(node: Pick<TimelineNode, 'durationMinutes' | 'stopType' | 'title'>): number {
  if (typeof node.durationMinutes === 'number' && node.durationMinutes >= 15) {
    return node.durationMinutes;
  }
  switch (node.stopType) {
    case 'dining':
      return 60;
    case 'shopping':
      return 75;
    case 'transit':
      return 30;
    case 'hotel':
      return 45;
    case 'attraction':
    default:
      if (/博物馆|美术馆|乐园|公园|神社|神宫|宫|寺|museum|palace|park|shrine|disney|universal/i.test(node.title)) {
        return 90;
      }
      return 60;
  }
}

export function formatStayDurationLabel(
  minutes: number,
  lang: AppLanguage = 'zh-CN'
): string {
  const safe = Math.max(15, Math.round(minutes));
  const hours = safe / 60;
  if (lang !== 'zh-CN') {
    if (safe < 60) return `${safe} min`;
    if (Number.isInteger(hours)) {
      return hours === 1 ? '1 hr' : `${hours} hrs`;
    }
    return `${hours.toFixed(1).replace(/\.0$/, '')} hrs`;
  }
  if (safe < 60) return `${safe} 分钟`;
  if (Number.isInteger(hours)) {
    return `${hours} 小时`;
  }
  return `${hours.toFixed(1).replace(/\.0$/, '')} 小时`;
}

/**
 * Matches the itinerary day's weekday against Google's `weekdayDescriptions`
 * (which normally start on Monday at index 0 .. Sunday at index 6, or contain weekday prefixes).
 */
export function resolveDayOpeningHoursLine(
  weekdayDescriptions: string[] | undefined,
  departureDateIso: string | undefined,
  dayNumber: number,
  lang: AppLanguage = 'zh-CN'
): string | null {
  if (!weekdayDescriptions || weekdayDescriptions.length === 0) return null;

  let jsDay = new Date().getDay(); // 0 = Sun .. 6 = Sat
  if (departureDateIso) {
    const parsed = new Date(`${departureDateIso}T12:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      parsed.setDate(parsed.getDate() + Math.max(0, dayNumber - 1));
      jsDay = parsed.getDay();
    }
  }

  const enNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const zhNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const zhShort = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  const targetEn = enNames[jsDay].toLowerCase();
  const targetZh = zhNames[jsDay];
  const targetZhShort = zhShort[jsDay];

  const matched =
    weekdayDescriptions.find((line) => {
      const lower = line.toLowerCase();
      return (
        lower.startsWith(targetEn) ||
        line.startsWith(targetZh) ||
        line.startsWith(targetZhShort)
      );
    }) ||
    // Google Places weekdayDescriptions index 0 = Monday .. 6 = Sunday
    weekdayDescriptions[(jsDay + 6) % 7] ||
    weekdayDescriptions[0];

  if (!matched) return null;
  if (lang !== 'zh-CN') return matched;
  return matched;
}
