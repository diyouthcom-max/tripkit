import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  BedDouble,
  Check,
  Crosshair,
  ExternalLink,
  Loader2,
  MapPin,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import type {
  AffiliatePartnerConfig,
  AppLanguage,
  BudgetTier,
  TimelineNode,
} from '../types';
import { getNearbyHotelsCopy } from '../i18n/packs/itineraryViewPack';
import { AiRequestError, fetchAiJsonWithRetry } from '../services/apiUrl';
import { getConfiguredGoogleMapsApiKey, buildGoogleMapsSearchUrl } from '../utils/googleMapsHelpers';
import { buildTripComHotelUrl } from '../utils/affiliateHelpers';
import { useGooglePhotoBlob } from '../hooks/useGooglePhotoBlob';
import { GooglePhotoCredit } from './GooglePhotoCredit';

const PLACES_LANG_MAP: Record<AppLanguage, string> = {
  'zh-CN': 'zh-CN',
  'en-US': 'en-US',
  'en-GB': 'en-GB',
  'es-MX': 'es-419',
  'fr-FR': 'fr',
  'de-DE': 'de',
  'pt-BR': 'pt-BR',
  'ja-JP': 'ja',
};

const PLACE_FIELDS = [
  'displayName',
  'formattedAddress',
  'location',
  'rating',
  'userRatingCount',
  'googleMapsURI',
  'photos',
  'id',
] as const;

type AnchorStop = {
  title: string;
  district: string;
  address: string;
  lat: number;
  lng: number;
};

type LiveHotelCard = {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  rating?: number;
  userRatingCount?: number;
  googleMapsURI?: string;
  photoUri?: string;
  photoAuthor?: string;
  photoAuthorUri?: string;
  walkMinutes: number | null;
  nearestStopTitle: string;
};

type AiHotelCard = {
  name: string;
  district: string;
  address: string;
  lat?: number;
  lng?: number;
  walkMinutes: number | null;
  nearestStopTitle: string;
  estNightlyLocal: number;
  reason: string;
};

type DisplayHotel = {
  key: string;
  name: string;
  address: string;
  placeId?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  userRatingCount?: number;
  googleMapsURI?: string;
  photoUri?: string;
  photoAuthor?: string;
  photoAuthorUri?: string;
  walkMinutes: number | null;
  nearestStopTitle: string;
  estNightlyLocal?: number;
  reason?: string;
  source: 'live' | 'ai';
};

const liveHotelMemoryCache = new Map<string, LiveHotelCard[]>();

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function filterAnchorStops(dayNodes: TimelineNode[]): AnchorStop[] {
  return dayNodes
    .filter(
      (n) =>
        n.stopType !== 'hotel' &&
        n.stopType !== 'transit' &&
        typeof n.lat === 'number' &&
        typeof n.lng === 'number' &&
        Number.isFinite(n.lat) &&
        Number.isFinite(n.lng)
    )
    .map((n) => ({
      title: n.title,
      district: n.district || '',
      address: n.address || '',
      lat: n.lat as number,
      lng: n.lng as number,
    }));
}

function computeCenter(anchors: AnchorStop[]): { lat: number; lng: number } | null {
  if (anchors.length === 0) return null;
  const lat = anchors.reduce((s, a) => s + a.lat, 0) / anchors.length;
  const lng = anchors.reduce((s, a) => s + a.lng, 0) / anchors.length;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function nearestWalk(
  hotel: { lat?: number; lng?: number },
  anchors: AnchorStop[]
): { walkMinutes: number | null; nearestStopTitle: string } {
  if (
    typeof hotel.lat !== 'number' ||
    typeof hotel.lng !== 'number' ||
    !Number.isFinite(hotel.lat) ||
    !Number.isFinite(hotel.lng) ||
    anchors.length === 0
  ) {
    return {
      walkMinutes: null,
      nearestStopTitle: anchors[0]?.title || '',
    };
  }
  let best = Infinity;
  let title = anchors[0].title;
  for (const a of anchors) {
    const m = haversineMeters(
      { lat: hotel.lat, lng: hotel.lng },
      { lat: a.lat, lng: a.lng }
    );
    if (m < best) {
      best = m;
      title = a.title;
    }
  }
  return {
    walkMinutes: Math.max(1, Math.round(best / 80)),
    nearestStopTitle: title,
  };
}

function HotelThumb({ photoUri }: { photoUri?: string }) {
  const { url: blobUrl, failed } = useGooglePhotoBlob(photoUri);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [photoUri]);

  const showImg = Boolean(photoUri && blobUrl && !failed && !imgFailed);

  return (
    <div className="shrink-0 w-[72px]">
      {showImg ? (
        <img
          src={blobUrl!}
          alt=""
          onError={() => setImgFailed(true)}
          className="h-[72px] w-[72px] rounded-xl object-cover tk-bg-paper"
        />
      ) : (
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-xl tk-bg-forest">
          <BedDouble className="h-7 w-7 text-white" strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
}

function HotelCardActions({
  hotel,
  city,
  copy,
  affiliatePartners,
  onSetStay,
}: {
  hotel: DisplayHotel;
  city: string;
  copy: ReturnType<typeof getNearbyHotelsCopy>;
  affiliatePartners?: AffiliatePartnerConfig;
  onSetStay: NearbyHotelsPanelProps['onSetStay'];
}) {
  const ratesHref = buildTripComHotelUrl(`${hotel.name} ${city}`, affiliatePartners);
  const mapHref =
    hotel.googleMapsURI ||
    buildGoogleMapsSearchUrl({
      title: hotel.name,
      address: hotel.address,
      cityHint: city,
    });

  return (
    <div className="flex items-center gap-1.5 w-full">
      <button
        type="button"
        onClick={() =>
          onSetStay({
            placeName: hotel.name,
            address: hotel.address || `${hotel.name}, ${city}`,
            placeId: hotel.placeId,
            lat: hotel.lat,
            lng: hotel.lng,
          })
        }
        className="flex-1 min-w-0 inline-flex items-center justify-center gap-1 rounded-xl tk-bg-forest px-2 py-1.5 text-[10.5px] font-bold text-white hover:tk-bg-press whitespace-nowrap cursor-pointer"
      >
        <Check className="h-3 w-3 shrink-0" strokeWidth={1.5} />
        <span className="truncate">{copy.setAsStay}</span>
      </button>
      <a
        href={ratesHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 min-w-0 inline-flex items-center justify-center gap-1 rounded-xl border tk-bc-hair tk-bg-card px-2 py-1.5 text-[10.5px] font-semibold tk-text-forest hover:tk-bg-forest-tint whitespace-nowrap"
      >
        <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={1.5} />
        <span className="truncate">{copy.checkRates}</span>
      </a>
      <a
        href={mapHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 min-w-0 inline-flex items-center justify-center gap-1 rounded-xl border tk-bc-hair tk-bg-card px-2 py-1.5 text-[10.5px] font-semibold tk-text-ink2 hover:tk-bc-forest hover:tk-text-forest whitespace-nowrap"
      >
        <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.5} />
        <span className="truncate">{copy.map}</span>
      </a>
    </div>
  );
}

function LiveNearbyHotels({
  city,
  language,
  anchors,
  center,
  refreshNonce,
  onResults,
  onFallback,
}: {
  city: string;
  language: AppLanguage;
  anchors: AnchorStop[];
  center: { lat: number; lng: number } | null;
  refreshNonce: number;
  onResults: (hotels: LiveHotelCard[]) => void;
  onFallback: () => void;
}) {
  const placesLib = useMapsLibrary('places');
  const cancelledRef = useRef(false);
  const settledRef = useRef(false);
  const watchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onResultsRef = useRef(onResults);
  const onFallbackRef = useRef(onFallback);
  onResultsRef.current = onResults;
  onFallbackRef.current = onFallback;
  const placesLang = PLACES_LANG_MAP[language] || 'en-US';
  const centerKey = center
    ? `${center.lat.toFixed(4)},${center.lng.toFixed(4)}`
    : 'nocenter';
  const anchorsKey = anchors
    .map((a) => `${a.title}|${a.lat.toFixed(4)}|${a.lng.toFixed(4)}`)
    .join(';');

  const clearWatchdog = () => {
    if (watchdogTimerRef.current != null) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
  };

  const markSettled = () => {
    settledRef.current = true;
    clearWatchdog();
  };

  // 12s watchdog: SDK hang / placesLib never resolving must fall back to AI.
  useEffect(() => {
    settledRef.current = false;
    clearWatchdog();
    watchdogTimerRef.current = setTimeout(() => {
      if (!settledRef.current) {
        settledRef.current = true;
        onFallbackRef.current();
      }
    }, 12_000);
    return () => {
      clearWatchdog();
    };
  }, [refreshNonce, city, centerKey, anchorsKey]);

  useEffect(() => {
    cancelledRef.current = false;
    if (!placesLib) return;

    const run = async () => {
      try {
        const cacheKey = `${city}|${centerKey}|1800|${refreshNonce}`;

        const cached = liveHotelMemoryCache.get(cacheKey);
        if (cached && cached.length > 0) {
          if (settledRef.current || cancelledRef.current) return;
          markSettled();
          onResultsRef.current(cached);
          return;
        }

        const resolveName = (place: google.maps.places.Place): string => {
          const raw = place.displayName as unknown;
          if (typeof raw === 'string') return raw.trim();
          if (raw && typeof raw === 'object' && 'text' in (raw as object)) {
            return String((raw as { text?: string }).text || '').trim();
          }
          return '';
        };

        const mapPlace = (place: google.maps.places.Place): LiveHotelCard | null => {
          const name = resolveName(place);
          if (!name) return null;
          const loc = place.location
            ? {
                lat: place.location.lat(),
                lng: place.location.lng(),
              }
            : undefined;
          const walk = nearestWalk(loc || {}, anchors);
          let photoUri: string | undefined;
          let photoAuthor: string | undefined;
          let photoAuthorUri: string | undefined;
          try {
            const photo = place.photos?.[0];
            if (photo) {
              photoUri = photo.getURI({ maxWidth: 400, maxHeight: 400 });
              photoAuthor = photo.authorAttributions?.[0]?.displayName || undefined;
              photoAuthorUri = photo.authorAttributions?.[0]?.uri || undefined;
            }
          } catch {
            /* photo optional */
          }
          return {
            id: place.id || `${name}_${loc?.lat || 0}`,
            name,
            address: place.formattedAddress || '',
            lat: loc?.lat,
            lng: loc?.lng,
            rating: typeof place.rating === 'number' ? place.rating : undefined,
            userRatingCount:
              typeof place.userRatingCount === 'number'
                ? place.userRatingCount
                : undefined,
            googleMapsURI: place.googleMapsURI || undefined,
            photoUri,
            photoAuthor,
            photoAuthorUri,
            walkMinutes: walk.walkMinutes,
            nearestStopTitle: walk.nearestStopTitle,
          };
        };

        let places: google.maps.places.Place[] = [];

        if (center) {
          const nearby = await placesLib.Place.searchNearby({
            fields: [...PLACE_FIELDS],
            includedPrimaryTypes: ['lodging'],
            locationRestriction: { center, radius: 1800 },
            maxResultCount: 8,
            language: placesLang,
            internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
          });
          places = nearby.places || [];

          if (places.length < 4) {
            const wider = await placesLib.Place.searchNearby({
              fields: [...PLACE_FIELDS],
              includedPrimaryTypes: ['lodging'],
              locationRestriction: { center, radius: 4000 },
              maxResultCount: 8,
              language: placesLang,
              internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
            });
            places = wider.places || places;
          }
        }

        if (places.length === 0) {
          const district = anchors[0]?.district || anchors[0]?.title || city;
          const text = await placesLib.Place.searchByText({
            textQuery: `hotel ${city} ${district}`,
            fields: [...PLACE_FIELDS],
            maxResultCount: 8,
            language: placesLang,
            internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
          });
          places = text.places || [];
        }

        if (settledRef.current || cancelledRef.current) return;

        const cards = places
          .map(mapPlace)
          .filter((c): c is LiveHotelCard => Boolean(c))
          .sort((a, b) => {
            if (a.walkMinutes == null && b.walkMinutes == null) return 0;
            if (a.walkMinutes == null) return 1;
            if (b.walkMinutes == null) return -1;
            return a.walkMinutes - b.walkMinutes;
          })
          .slice(0, 4);

        if (cards.length === 0) {
          markSettled();
          onFallbackRef.current();
          return;
        }

        markSettled();
        liveHotelMemoryCache.set(cacheKey, cards);
        onResultsRef.current(cards);
      } catch {
        if (settledRef.current || cancelledRef.current) return;
        markSettled();
        onFallbackRef.current();
      }
    };

    void run();
    return () => {
      cancelledRef.current = true;
    };
    // anchors captured via anchorsKey signature; center via centerKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placesLib, city, centerKey, anchorsKey, refreshNonce, placesLang]);

  return null;
}

export interface NearbyHotelsPanelProps {
  day: number;
  city: string;
  displayCity: string;
  dayNodes: TimelineNode[];
  language: AppLanguage;
  budgetTier: BudgetTier | string;
  currencyCode: string;
  currencySymbol: string;
  tripStyle?: string;
  affiliatePartners?: AffiliatePartnerConfig;
  onSetStay: (stay: {
    placeName: string;
    address: string;
    placeId?: string;
    lat?: number;
    lng?: number;
  }) => void;
}

export const NearbyHotelsPanel: React.FC<NearbyHotelsPanelProps> = ({
  day,
  city,
  displayCity,
  dayNodes,
  language,
  budgetTier,
  currencyCode,
  currencySymbol,
  tripStyle,
  affiliatePartners,
  onSetStay,
}) => {
  const copy = useMemo(() => getNearbyHotelsCopy(language), [language]);
  const hasMapsKey = Boolean(getConfiguredGoogleMapsApiKey());

  const anchors = useMemo(() => filterAnchorStops(dayNodes), [dayNodes]);
  const center = useMemo(() => computeCenter(anchors), [anchors]);
  const anchorStopTitle =
    anchors[0]?.title || dayNodes.find((n) => n.stopType !== 'hotel')?.title || displayCity || city;

  const [refreshNonce, setRefreshNonce] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [source, setSource] = useState<'live' | 'ai'>('live');
  const [hotels, setHotels] = useState<DisplayHotel[]>([]);
  const [useAi, setUseAi] = useState(!hasMapsKey);
  const [mountLive, setMountLive] = useState(hasMapsKey);

  const loadAi = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    setSource('ai');
    setMountLive(false);
    try {
      const stopsPayload = dayNodes
        .filter((n) => n.stopType !== 'hotel' && n.stopType !== 'transit')
        .map((n) => ({
          title: n.title,
          district: n.district || '',
          address: n.address || '',
          lat: typeof n.lat === 'number' ? n.lat : undefined,
          lng: typeof n.lng === 'number' ? n.lng : undefined,
        }));

      const data = (await fetchAiJsonWithRetry('/api/ai/recommend-nearby-hotels', {
        city: city || displayCity,
        day,
        budgetTier,
        currencyCode,
        currencySymbol,
        tripStyle,
        stops: stopsPayload,
        language,
      })) as { hotels?: AiHotelCard[] };

      const list = Array.isArray(data.hotels) ? data.hotels : [];
      const mapped: DisplayHotel[] = list.slice(0, 4).map((h, idx) => {
        const walk =
          typeof h.walkMinutes === 'number' && Number.isFinite(h.walkMinutes)
            ? Math.max(1, Math.round(h.walkMinutes))
            : nearestWalk(
                {
                  lat: typeof h.lat === 'number' ? h.lat : undefined,
                  lng: typeof h.lng === 'number' ? h.lng : undefined,
                },
                anchors
              ).walkMinutes;
        return {
          key: `ai_${idx}_${h.name}`,
          name: h.name,
          address: h.address || h.district || '',
          lat: typeof h.lat === 'number' ? h.lat : undefined,
          lng: typeof h.lng === 'number' ? h.lng : undefined,
          walkMinutes: walk,
          nearestStopTitle: h.nearestStopTitle || anchorStopTitle,
          estNightlyLocal:
            typeof h.estNightlyLocal === 'number' ? h.estNightlyLocal : undefined,
          reason: h.reason,
          source: 'ai',
        };
      });

      setHotels(mapped);
      if (mapped.length === 0) {
        setErrorMsg(null);
      }
    } catch (err) {
      const msg =
        err instanceof AiRequestError
          ? err.kind === 'timeout' || err.kind === 'network'
            ? copy.errorWithRetry
            : err.message || copy.errorWithRetry
          : copy.errorWithRetry;
      setErrorMsg(msg);
      setHotels([]);
    } finally {
      setLoading(false);
      setUseAi(true);
    }
  }, [
    dayNodes,
    city,
    displayCity,
    day,
    budgetTier,
    currencyCode,
    currencySymbol,
    tripStyle,
    language,
    anchors,
    anchorStopTitle,
    copy.errorWithRetry,
  ]);

  const handleLiveResults = useCallback((cards: LiveHotelCard[]) => {
    setSource('live');
    setHotels(
      cards.map((c) => ({
        key: c.id,
        name: c.name,
        address: c.address,
        placeId: c.id,
        lat: c.lat,
        lng: c.lng,
        rating: c.rating,
        userRatingCount: c.userRatingCount,
        googleMapsURI: c.googleMapsURI,
        photoUri: c.photoUri,
        photoAuthor: c.photoAuthor,
        photoAuthorUri: c.photoAuthorUri,
        walkMinutes: c.walkMinutes,
        nearestStopTitle: c.nearestStopTitle || anchorStopTitle,
        source: 'live' as const,
      }))
    );
    setLoading(false);
    setErrorMsg(null);
    setUseAi(false);
  }, [anchorStopTitle]);

  const handleFallback = useCallback(() => {
    void loadAi();
  }, [loadAi]);

  useEffect(() => {
    if (!hasMapsKey) {
      void loadAi();
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setMountLive(true);
    setUseAi(false);
  }, [hasMapsKey, refreshNonce, city, day]); // eslint-disable-line react-hooks/exhaustive-deps

  // Outer 16s safety net: never spin forever if Live watchdog / Places path stalls.
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      void loadAi();
    }, 16_000);
    return () => clearTimeout(timer);
  }, [loading, refreshNonce, loadAi]);

  const handleRefresh = () => {
    const prefix = `${city}|`;
    for (const key of [...liveHotelMemoryCache.keys()]) {
      if (key.startsWith(prefix) || key.includes(`|${city}|`)) {
        liveHotelMemoryCache.delete(key);
      }
    }
    // Also clear any key containing this city/day signature
    for (const key of [...liveHotelMemoryCache.keys()]) {
      if (key.includes(city)) liveHotelMemoryCache.delete(key);
    }
    setRefreshNonce((n) => n + 1);
    setHotels([]);
    setErrorMsg(null);
    setLoading(true);
    if (hasMapsKey) {
      setMountLive(true);
      setUseAi(false);
    } else {
      void loadAi();
    }
  };

  return (
    <div className="border-t tk-bc-hair pt-4 space-y-3">
      {hasMapsKey && mountLive && !useAi ? (
        <LiveNearbyHotels
          city={city || displayCity}
          language={language}
          anchors={anchors}
          center={center}
          refreshNonce={refreshNonce}
          onResults={handleLiveResults}
          onFallback={handleFallback}
        />
      ) : null}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-bold tk-text-ink leading-snug">
              {copy.title(anchorStopTitle)}
            </h4>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                source === 'live'
                  ? 'tk-bg-forest-tint tk-text-forest'
                  : 'tk-bg-warning-tint tk-text-warning'
              }`}
            >
              {source === 'live' ? (
                <Crosshair className="h-3 w-3 shrink-0" strokeWidth={1.5} />
              ) : (
                <Sparkles className="h-3 w-3 shrink-0" strokeWidth={1.5} />
              )}
              <span>{source === 'live' ? copy.googleLive : copy.aiEstimate}</span>
            </span>
          </div>
          <p className="tk-t-cap tk-text-ink2 leading-snug">{copy.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-xl border tk-bc-hair tk-bg-card px-2.5 py-1.5 text-[11px] font-semibold tk-text-ink2 hover:tk-text-forest hover:tk-bc-forest disabled:opacity-50 shrink-0 cursor-pointer"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
            strokeWidth={1.5}
          />
          <span>{copy.refresh}</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border tk-bc-hair tk-bg-card p-3.5 animate-pulse"
            >
              <div className="flex gap-3">
                <div className="h-[72px] w-[72px] rounded-xl tk-bg-paper shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="h-3.5 w-3/4 rounded tk-bg-paper" />
                  <div className="h-3 w-1/2 rounded tk-bg-paper" />
                  <div className="h-3 w-full rounded tk-bg-paper" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : errorMsg ? (
        <div className="rounded-2xl border tk-bc-danger-hair tk-bg-danger-tint p-3.5 space-y-2">
          <p className="text-xs font-semibold tk-text-danger leading-snug">{errorMsg}</p>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1 rounded-xl tk-bg-forest px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>{copy.retry}</span>
          </button>
        </div>
      ) : hotels.length === 0 ? (
        <div className="rounded-2xl border tk-bc-hair tk-bg-paper p-3.5">
          <p className="text-xs tk-text-ink2 leading-snug">{copy.empty}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {hotels.map((hotel) => (
            <div
              key={hotel.key}
              className="rounded-2xl border tk-bc-hair tk-bg-card p-3.5 space-y-2.5"
            >
              <div className="flex gap-3 items-start">
                <HotelThumb photoUri={hotel.photoUri} />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="text-sm font-bold tk-text-ink leading-snug">
                    {hotel.name}
                  </div>
                  {hotel.source === 'live' &&
                  typeof hotel.rating === 'number' &&
                  hotel.rating > 0 ? (
                    <div className="text-[11px] font-semibold tk-text-warning leading-snug">
                      ★ {hotel.rating.toFixed(1)}
                      {typeof hotel.userRatingCount === 'number'
                        ? ` (${hotel.userRatingCount})`
                        : ''}
                    </div>
                  ) : null}
                  <div className="text-[11px] tk-text-ink2 leading-snug">
                    {hotel.walkMinutes != null && hotel.nearestStopTitle
                      ? copy.walkTo(hotel.walkMinutes, hotel.nearestStopTitle)
                      : copy.walkUnknown}
                  </div>
                  {hotel.address ? (
                    <div className="text-[11px] tk-text-ink2 leading-snug break-words">
                      {hotel.address}
                    </div>
                  ) : null}
                  {hotel.source === 'ai' && hotel.estNightlyLocal != null ? (
                    <div className="text-[11px] font-semibold tk-text-forest leading-snug">
                      {copy.perNight(
                        `${currencySymbol}${Math.round(hotel.estNightlyLocal).toLocaleString()}`
                      )}
                    </div>
                  ) : null}
                  {hotel.source === 'ai' && hotel.reason ? (
                    <div className="text-[11px] tk-text-ink2 leading-snug">
                      <span className="font-semibold">{copy.reasonLabel}: </span>
                      {hotel.reason}
                    </div>
                  ) : null}
                </div>
              </div>
              <HotelCardActions
                hotel={hotel}
                city={city || displayCity}
                copy={copy}
                affiliatePartners={affiliatePartners}
                onSetStay={onSetStay}
              />
              {hotel.photoAuthor ? (
                <div className="min-w-0 max-w-full overflow-hidden text-[10px] leading-snug [&_a]:text-[10px] [&_span]:text-[10px] [&_a]:whitespace-nowrap [&_span]:whitespace-nowrap [&_a]:truncate [&_span]:truncate [&_a]:break-normal [&_span]:break-normal">
                  <GooglePhotoCredit
                    variant="inline"
                    displayName={hotel.photoAuthor}
                    uri={hotel.photoAuthorUri}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p className="tk-t-cap tk-text-ink2 inline-flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>{copy.loading}</span>
        </p>
      ) : null}
    </div>
  );
};
