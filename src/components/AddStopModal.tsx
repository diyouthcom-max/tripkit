import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  X,
  Sparkles,
  Search,
  Link2,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Compass,
  Utensils,
  BedDouble,
  Train,
  ShoppingBag,
  Plus,
  Check,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  ExternalLink,
  AlertTriangle,
  Crosshair,
  Upload,
  Heart,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import type { AppLanguage, StopType, TimelineNode } from '../types';
import { normalizeAppLanguage } from '../utils/preferencesHelpers';
import { getCityForDay, getPrimaryCityName, getStopTypeLabel } from '../utils/itineraryHelpers';
import {
  buildGoogleMapsSearchUrl,
  buildPlaceQueryString,
  getConfiguredGoogleMapsApiKey,
} from '../utils/googleMapsHelpers';
import { resolveNodeGeoCoords } from '../utils/geoRouteHelpers';
import {
  PlaceAutocompleteInput,
  extractPlaceDetails,
  type SelectedGooglePlace,
} from './PlaceAutocompleteInput';
import { resolveApiUrl } from '../services/apiUrl';
import { AiVoiceInputButton } from './AiVoiceInputButton';
import { HorizontalChipScroller } from './HorizontalChipScroller';
import { getAddStopModalCopy } from '../i18n/packs/addStopModalPack';
import { tkColor } from '../utils/tkColor';

interface AddStopModalProps {
  open: boolean;
  onClose: () => void;
  cities: string[];
  cityDays?: number[];
  totalDays: number;
  activeDay: number;
  timeline: TimelineNode[];
  currencyCode: string;
  currencySymbol?: string;
  wishlist?: string[];
  onConsumeWishlistItem?: (item: string) => void;
  initialMapCoords?: { lat: number; lng: number } | null;
  onSelectDay: (day: number) => void;
  onAddNode: (day: number, node: Omit<TimelineNode, 'id' | 'day' | 'logged'>) => void;
  onOpenAiAssistant?: (initialPrompt?: string) => void;
}

type AddModeTab = 'for_you' | 'search' | 'link' | 'screenshot';
type ForYouSubCategory = 'for_you' | 'top_attractions' | 'local_dining' | 'wishlist';

export interface CandidateStopItem {
  key: string;
  day?: number;
  time?: string;
  closeTime?: string;
  durationMinutes?: number;
  stopType: StopType;
  searchQuery?: string;
  title: string;
  district: string;
  address: string;
  placeId?: string;
  lat?: number;
  lng?: number;
  estLocal: number;
  reason?: string;
  transitNote?: string;
  isOutdoor?: boolean;
  rainSwapTitle?: string;
  rainSwapDistrict?: string;
  rainSwapAddress?: string;
  isAnchor?: boolean;
  // Authentic Google Places live attributes (strictly from Places SDK, never LLM-fabricated)
  fromGooglePlaces?: boolean;
  rating?: number;
  userRatingCount?: number;
  photoUri?: string;
  photoAuthor?: string;
  wishlistSourceItem?: string;
}

const STOP_TYPE_DEFAULTS: Array<{
  id: StopType;
  defaultClose: string;
  defaultEst: string;
}> = [
  { id: 'attraction', defaultClose: '18:30', defaultEst: '15' },
  { id: 'dining', defaultClose: '22:30', defaultEst: '28' },
  { id: 'hotel', defaultClose: '23:59', defaultEst: '0' },
  { id: 'transit', defaultClose: '23:59', defaultEst: '12' },
  { id: 'shopping', defaultClose: '20:30', defaultEst: '0' },
];

const DEFAULT_FALLBACK_CENTER: google.maps.LatLngLiteral = {
  lat: 48.8566,
  lng: 2.3522,
};

const PLACE_FIELDS_FULL = [
  'id',
  'displayName',
  'formattedAddress',
  'addressComponents',
  'location',
  'primaryType',
  'types',
  'regularOpeningHours',
  'rating',
  'userRatingCount',
  'photos',
];

function computeSmartGapTime(dayNodes: TimelineNode[], extraOffsetMinutes = 0): string {
  if (dayNodes.length === 0) {
    const mins = Math.min(21 * 60 + 30, 9 * 60 + 30 + extraOffsetMinutes);
    return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  }
  const lastNode = dayNodes[dayNodes.length - 1];
  const match = /^(\d{1,2}):(\d{2})$/.exec((lastNode?.time || '').trim());
  const baseMins = match ? Number(match[1]) * 60 + Number(match[2]) + 90 : 14 * 60 + 30;
  const totalMins = Math.min(22 * 60, baseMins + extraOffsetMinutes);
  const hh = String(Math.floor(totalMins / 60)).padStart(2, '0');
  const mm = String(totalMins % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm || '').trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function hasEnoughQueryChars(trimmed: string): boolean {
  if (!trimmed) return false;
  const hasCjk = /[\u3400-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF]/.test(trimmed);
  return hasCjk ? trimmed.length >= 1 : trimmed.length >= 2;
}

async function compressImageFileToBase64(file: File): Promise<{
  base64: string;
  mimeType: string;
  previewDataUrl: string;
}> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new window.Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Failed to decode image'));
    el.src = rawDataUrl;
  });

  const maxEdge = 1280;
  const scale = Math.min(1, maxEdge / Math.max(img.width || 1, img.height || 1));
  const targetW = Math.max(1, Math.round(img.width * scale));
  const targetH = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const base64Fallback = rawDataUrl.split(',')[1] || '';
    return {
      base64: base64Fallback,
      mimeType: file.type || 'image/jpeg',
      previewDataUrl: rawDataUrl,
    };
  }
  ctx.drawImage(img, 0, 0, targetW, targetH);
  const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.84);
  const base64 = compressedDataUrl.split(',')[1] || '';
  return {
    base64,
    mimeType: 'image/jpeg',
    previewDataUrl: compressedDataUrl,
  };
}

function mapGooglePlaceToCandidate(
  place: google.maps.places.Place,
  targetPrimaryCity: string,
  idx: number
): CandidateStopItem | null {
  const details = extractPlaceDetails(place);
  if (!details.name) return null;

  const stopType = details.inferredStopType || 'attraction';
  const typeSpec = STOP_TYPE_DEFAULTS.find((s) => s.id === stopType) || STOP_TYPE_DEFAULTS[0];
  let photoUri: string | undefined;
  let photoAuthor: string | undefined;

  if (Array.isArray(place.photos) && place.photos.length > 0) {
    try {
      photoUri = place.photos[0].getURI({ maxWidth: 320, maxHeight: 320 });
      photoAuthor = place.photos[0].authorAttributions?.[0]?.displayName || undefined;
    } catch {
      // Ignore individual photo URI errors
    }
  }

  const userRatingCount =
    typeof place.userRatingCount === 'number' && place.userRatingCount > 0
      ? place.userRatingCount
      : undefined;

  return {
    key: details.placeId ? `gp_${details.placeId}` : `gp_${idx}_${details.name}`,
    stopType,
    closeTime: details.closeTimeHint || typeSpec.defaultClose,
    durationMinutes: stopType === 'dining' ? 75 : stopType === 'attraction' ? 90 : 60,
    title: details.name,
    district: details.district || targetPrimaryCity,
    address: details.formattedAddress || `${details.name}, ${targetPrimaryCity}`,
    placeId: details.placeId,
    lat: details.location?.lat,
    lng: details.location?.lng,
    estLocal: Number(typeSpec.defaultEst) || 0,
    isOutdoor: Boolean(details.isOutdoorHint),
    fromGooglePlaces: true,
    rating: details.ratingHint,
    userRatingCount,
    photoUri,
    photoAuthor,
  };
}

const StopCategoryAvatar: React.FC<{
  stopType: StopType;
  photoUri?: string;
  title: string;
}> = ({ stopType, photoUri, title }) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [photoUri]);

  if (photoUri && !imgFailed) {
    return (
      <img
        src={photoUri}
        alt={title}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className="h-16 w-16 rounded-xl object-cover shrink-0 tk-bg-forest-plate"
      />
    );
  }

  const iconMap: Record<StopType, React.ReactNode> = {
    attraction: <Compass className="h-6 w-6 tk-text-forest" />,
    dining: <Utensils className="h-6 w-6 tk-text-ink2" />,
    hotel: <BedDouble className="h-6 w-6 tk-text-ink2" />,
    transit: <Train className="h-6 w-6 tk-text-ink2" />,
    shopping: <ShoppingBag className="h-6 w-6 tk-text-ink2" />,
  };

    const bgMap: Record<StopType, string> = {
    attraction: 'tk-bg-forest-plate',
    dining: 'tk-bg-warning-tint',
    hotel: 'tk-bg-forest-plate',
    transit: 'tk-bg-forest-plate',
    shopping: 'tk-bg-swatch-4',
  };

  return (
    <div
      className={`h-16 w-16 rounded-xl ${bgMap[stopType] || 'tk-bg-forest-plate'} flex items-center justify-center shrink-0`}
    >
      {iconMap[stopType] || <MapPin className="h-6 w-6 tk-text-forest" />}
    </div>
  );
};

/**
 * Mounted strictly when `VITE_GOOGLE_MAPS_API_KEY` is configured (inside `<APIProvider>`).
 * Powers live Google Places (New) discovery for For-You pills, Search cards, Wishlist enrichment,
 * and AI/Screenshot place enrichment while respecting volatile in-memory ToS rules.
 */
const PlacesDiscoveryBridge: React.FC<{
  activeTab: AddModeTab;
  forYouSub: ForYouSubCategory;
  targetPrimaryCity: string;
  lastStopDistrict: string;
  nextSmartTime: string;
  existingTitlesLower: Set<string>;
  wishlist: string[];
  liveSearchQuery: string;
  placesLang: AppLanguage;
  enrichQueue: CandidateStopItem[] | null;
  onForYouPlacesResult: (
    cacheKey: string,
    items: CandidateStopItem[] | null,
    failed: boolean
  ) => void;
  onWishlistPlacesResult: (items: CandidateStopItem[]) => void;
  onSearchPlacesResult: (items: CandidateStopItem[], loading: boolean) => void;
  onEnrichComplete: (enriched: CandidateStopItem[]) => void;
}> = ({
  activeTab,
  forYouSub,
  targetPrimaryCity,
  lastStopDistrict,
  nextSmartTime,
  existingTitlesLower,
  wishlist,
  liveSearchQuery,
  placesLang,
  enrichQueue,
  onForYouPlacesResult,
  onWishlistPlacesResult,
  onSearchPlacesResult,
  onEnrichComplete,
}) => {
  const placesLib = useMapsLibrary('places');
  const sessionDiscoveryCacheRef = useRef<Record<string, CandidateStopItem[]>>({});
  const lastEnrichBatchRef = useRef<CandidateStopItem[] | null>(null);

  // 1. For-You sub-category live Google Places discovery
  useEffect(() => {
    if (!placesLib || activeTab !== 'for_you' || forYouSub === 'wishlist' || !targetPrimaryCity) {
      return;
    }

    const hourNum = Number(nextSmartTime.split(':')[0] || 14);
    const mealWindow =
      (hourNum >= 11 && hourNum <= 13) || (hourNum >= 17 && hourNum <= 20);
    const areaHint = lastStopDistrict ? `${lastStopDistrict} ${targetPrimaryCity}` : targetPrimaryCity;

    const cacheKey = `${placesLang}::${targetPrimaryCity}::${lastStopDistrict}::${forYouSub}::${
      forYouSub === 'for_you' ? (mealWindow ? 'meal' : 'sight') : 'std'
    }`;

    if (sessionDiscoveryCacheRef.current[cacheKey]) {
      onForYouPlacesResult(cacheKey, sessionDiscoveryCacheRef.current[cacheKey], false);
      return;
    }

    let textQuery = `top sights and cafes in ${areaHint}`;
    if (forYouSub === 'top_attractions') {
      textQuery = `top attractions museums landmarks in ${targetPrimaryCity}`;
    } else if (forYouSub === 'local_dining') {
      textQuery = `popular local restaurants bistros cafes in ${areaHint}`;
    } else if (mealWindow) {
      textQuery = `highly rated local restaurant bistro cafe near ${areaHint}`;
    } else {
      textQuery = `must visit sights galleries neighborhoods near ${areaHint}`;
    }

    let cancelled = false;
    placesLib.Place.searchByText({
      textQuery,
      fields: PLACE_FIELDS_FULL,
      maxResultCount: 8,
      language: placesLang,
      internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
    })
      .then(({ places }) => {
        if (cancelled) return;
        const mapped = (places || [])
          .map((p, idx) => mapGooglePlaceToCandidate(p, targetPrimaryCity, idx))
          .filter((item): item is CandidateStopItem => Boolean(item))
          .filter((item) => !existingTitlesLower.has(item.title.trim().toLowerCase()))
          .slice(0, 6);

        if (mapped.length > 0) {
          sessionDiscoveryCacheRef.current[cacheKey] = mapped;
          onForYouPlacesResult(cacheKey, mapped, false);
        } else {
          onForYouPlacesResult(cacheKey, null, true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          onForYouPlacesResult(cacheKey, null, true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    placesLib,
    activeTab,
    forYouSub,
    targetPrimaryCity,
    lastStopDistrict,
    nextSmartTime,
    existingTitlesLower,
    placesLang,
    onForYouPlacesResult,
  ]);

  // 2. Wishlist enrichment via Google Places
  const wishlistKey = wishlist.join('||');
  useEffect(() => {
    if (!placesLib || activeTab !== 'for_you' || forYouSub !== 'wishlist') return;
    if (wishlist.length === 0) {
      onWishlistPlacesResult([]);
      return;
    }

    let cancelled = false;
    const enrichWishlist = async () => {
      const results: CandidateStopItem[] = [];
      for (let i = 0; i < Math.min(wishlist.length, 8); i += 1) {
        if (cancelled) return;
        const rawItem = wishlist[i];
        try {
          const query = rawItem.toLowerCase().includes(targetPrimaryCity.toLowerCase())
            ? rawItem
            : `${rawItem} ${targetPrimaryCity}`;
          const { places } = await placesLib.Place.searchByText({
            textQuery: query,
            fields: PLACE_FIELDS_FULL,
            maxResultCount: 1,
            language: placesLang,
            internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
          });
          const first = places?.[0];
          const mapped = first ? mapGooglePlaceToCandidate(first, targetPrimaryCity, i) : null;
          if (mapped) {
            results.push({
              ...mapped,
              key: `wish_${i}_${rawItem}`,
              title: mapped.title || rawItem,
              wishlistSourceItem: rawItem,
            });
            continue;
          }
        } catch {
          // Fallback to clean plain wishlist card below
        }
        results.push({
          key: `wish_${i}_${rawItem}`,
          stopType: 'attraction',
          title: rawItem,
          district: targetPrimaryCity,
          address: `${rawItem}, ${targetPrimaryCity}`,
          estLocal: 0,
          wishlistSourceItem: rawItem,
        });
      }
      if (!cancelled) {
        onWishlistPlacesResult(results);
      }
    };

    void enrichWishlist();
    return () => {
      cancelled = true;
    };
  }, [
    placesLib,
    activeTab,
    forYouSub,
    wishlistKey,
    wishlist,
    targetPrimaryCity,
    placesLang,
    onWishlistPlacesResult,
  ]);

  // 3. Live Search visual result cards
  useEffect(() => {
    if (!placesLib || activeTab !== 'search') return;
    const trimmed = liveSearchQuery.trim();
    if (!hasEnoughQueryChars(trimmed)) {
      onSearchPlacesResult([], false);
      return;
    }

    let cancelled = false;
    onSearchPlacesResult([], true);
    const timer = window.setTimeout(() => {
      const query = trimmed.toLowerCase().includes(targetPrimaryCity.toLowerCase())
        ? trimmed
        : `${trimmed} ${targetPrimaryCity}`;
      placesLib.Place.searchByText({
        textQuery: query,
        fields: PLACE_FIELDS_FULL,
        maxResultCount: 5,
        language: placesLang,
        internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
      })
        .then(({ places }) => {
          if (cancelled) return;
          const mapped = (places || [])
            .map((p, idx) => mapGooglePlaceToCandidate(p, targetPrimaryCity, idx))
            .filter((item): item is CandidateStopItem => Boolean(item));
          onSearchPlacesResult(mapped, false);
        })
        .catch(() => {
          if (!cancelled) {
            onSearchPlacesResult([], false);
          }
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    placesLib,
    activeTab,
    liveSearchQuery,
    targetPrimaryCity,
    placesLang,
    onSearchPlacesResult,
  ]);

  // 4. Enrich AI-extracted stops (from Link & AI or Screenshot) with authentic Google Places photo/rating/placeId
  useEffect(() => {
    if (!placesLib || !enrichQueue || enrichQueue.length === 0) return;
    if (lastEnrichBatchRef.current === enrichQueue) return;
    lastEnrichBatchRef.current = enrichQueue;

    let cancelled = false;
    const runEnrich = async () => {
      const enriched: CandidateStopItem[] = [];
      for (let i = 0; i < enrichQueue.length; i += 1) {
        const item = enrichQueue[i];
        if (cancelled) return;
        try {
          const query = item.searchQuery || `${item.title} ${targetPrimaryCity}`;
          const { places } = await placesLib.Place.searchByText({
            textQuery: query,
            fields: PLACE_FIELDS_FULL,
            maxResultCount: 1,
            language: placesLang,
            internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
          });
          const first = places?.[0];
          const gp = first ? mapGooglePlaceToCandidate(first, targetPrimaryCity, i) : null;
          if (gp) {
            enriched.push({
              ...item,
              placeId: gp.placeId || item.placeId,
              lat: gp.lat ?? item.lat,
              lng: gp.lng ?? item.lng,
              district: gp.district || item.district,
              address: gp.address || item.address,
              closeTime: gp.closeTime || item.closeTime,
              fromGooglePlaces: true,
              rating: gp.rating,
              userRatingCount: gp.userRatingCount,
              photoUri: gp.photoUri,
              photoAuthor: gp.photoAuthor,
            });
            continue;
          }
        } catch {
          // Keep original AI item if Places lookup fails
        }
        enriched.push(item);
      }
      if (!cancelled) {
        onEnrichComplete(enriched);
      }
    };

    void runEnrich();
    return () => {
      cancelled = true;
    };
  }, [placesLib, enrichQueue, targetPrimaryCity, placesLang, onEnrichComplete]);

  return null;
};

interface ExistingMapStop {
  id: string;
  orderNumber: number;
  title: string;
  query: string;
  position: google.maps.LatLngLiteral;
}

const MapLocationPickerCanvas: React.FC<{
  targetCity: string;
  dayNodes: TimelineNode[];
  pickedLocation: google.maps.LatLngLiteral | null;
  centerCityTrigger: number;
  placesLang: AppLanguage;
  onMapClickSelect: (
    coords: google.maps.LatLngLiteral,
    place: SelectedGooglePlace | null
  ) => void;
  onResolvingChange: (resolving: boolean) => void;
  onStatusMessage: (msg: string | null) => void;
}> = ({
  targetCity,
  dayNodes,
  pickedLocation,
  centerCityTrigger,
  placesLang,
  onMapClickSelect,
  onResolvingChange,
  onStatusMessage,
}) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const copy = useMemo(() => getAddStopModalCopy(placesLang), [placesLang]);

  const coordCacheRef = useRef<Record<string, google.maps.LatLngLiteral>>({});
  const [existingStops, setExistingStops] = useState<ExistingMapStop[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!map || !placesLib || !targetCity) return;

    const focusCity = async () => {
      const cacheKey = `city::${targetCity}`;
      const cached = coordCacheRef.current[cacheKey];
      if (cached) {
        if (!pickedLocation || centerCityTrigger > 0) {
          map.panTo(cached);
          map.setZoom(13);
        }
        return;
      }

      try {
        const { places } = await placesLib.Place.searchByText({
          textQuery: targetCity,
          fields: ['location'],
          maxResultCount: 1,
          language: placesLang,
          internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
        });
        if (cancelled) return;
        const loc = places?.[0]?.location;
        if (loc) {
          const coords = { lat: loc.lat(), lng: loc.lng() };
          coordCacheRef.current[cacheKey] = coords;
          if (!pickedLocation || centerCityTrigger > 0) {
            map.panTo(coords);
            map.setZoom(13);
          }
        }
      } catch {
        // Silent fallback
      }
    };

    void focusCity();
    return () => {
      cancelled = true;
    };
  }, [map, placesLib, targetCity, centerCityTrigger, pickedLocation, placesLang]);

  useEffect(() => {
    let cancelled = false;
    if (!placesLib || dayNodes.length === 0) {
      setExistingStops([]);
      return;
    }

    const resolveExisting = async () => {
      const nextStops: ExistingMapStop[] = [];
      for (let i = 0; i < Math.min(dayNodes.length, 8); i += 1) {
        if (cancelled) return;
        const node = dayNodes[i];
        if (typeof node.lat === 'number' && typeof node.lng === 'number') {
          nextStops.push({
            id: node.id,
            orderNumber: i + 1,
            title: node.title,
            query: node.title,
            position: { lat: node.lat, lng: node.lng },
          });
          continue;
        }
        const query = buildPlaceQueryString(node.title, node.address, targetCity);
        const cached = coordCacheRef.current[query];
        if (cached) {
          nextStops.push({
            id: node.id,
            orderNumber: i + 1,
            title: node.title,
            query,
            position: cached,
          });
          continue;
        }
        try {
          const { places } = await placesLib.Place.searchByText({
            textQuery: query,
            fields: ['location'],
            maxResultCount: 1,
            internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
          });
          if (cancelled) return;
          const loc = places?.[0]?.location;
          if (loc) {
            const coords = { lat: loc.lat(), lng: loc.lng() };
            coordCacheRef.current[query] = coords;
            nextStops.push({
              id: node.id,
              orderNumber: i + 1,
              title: node.title,
              query,
              position: coords,
            });
          }
        } catch {
          // Ignore background context lookup errors
        }
      }
      if (!cancelled) {
        setExistingStops(nextStops);
      }
    };

    void resolveExisting();
    return () => {
      cancelled = true;
    };
  }, [placesLib, dayNodes, targetCity]);

  useEffect(() => {
    if (!map || !pickedLocation) return;
    map.panTo(pickedLocation);
    const z = map.getZoom();
    if (typeof z !== 'number' || z < 14) {
      map.setZoom(15);
    }
  }, [map, pickedLocation]);

  const resolveNearestPlace = useCallback(
    async (coords: google.maps.LatLngLiteral, placeId: string | null | undefined) => {
      onMapClickSelect(coords, null);
      if (!placesLib) return;

      onResolvingChange(true);
      onStatusMessage(null);
      try {
        if (placeId) {
          const place = new placesLib.Place({ id: placeId });
          await place.fetchFields({ fields: PLACE_FIELDS_FULL });
          const details = extractPlaceDetails(place);
          onMapClickSelect(details.location || coords, details);
          return;
        }

        const { places } = await placesLib.Place.searchNearby({
          locationRestriction: { center: coords, radius: 160 },
          maxResultCount: 1,
          rankPreference: 'DISTANCE',
          language: placesLang,
          fields: PLACE_FIELDS_FULL,
          internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
        });

        let matched = places?.[0];
        if (!matched) {
          const wider = await placesLib.Place.searchNearby({
            locationRestriction: { center: coords, radius: 420 },
            maxResultCount: 1,
            rankPreference: 'DISTANCE',
            language: placesLang,
            fields: PLACE_FIELDS_FULL,
            internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
          });
          matched = wider.places?.[0];
        }

        if (matched) {
          const details = extractPlaceDetails(matched);
          onMapClickSelect(coords, details);
        } else {
          onStatusMessage(copy.coordsPinnedCustom);
        }
      } catch {
        onStatusMessage(copy.coordsPinnedAdd);
      } finally {
        onResolvingChange(false);
      }
    },
    [placesLib, placesLang, copy, onMapClickSelect, onResolvingChange, onStatusMessage]
  );

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener(
      'click',
      (e: google.maps.MapMouseEvent & { placeId?: string | null }) => {
        if (!e.latLng) return;
        if (e.placeId) {
          e.stop();
        }
        const coords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        void resolveNearestPlace(coords, e.placeId);
      }
    );
    return () => {
      listener.remove();
    };
  }, [map, resolveNearestPlace]);

  const handleMarkerDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const coords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      void resolveNearestPlace(coords, null);
    },
    [resolveNearestPlace]
  );

  return (
    <>
      {existingStops.map((stop) => (
        <AdvancedMarker
          key={`ctx_${stop.id}`}
          position={stop.position}
          title={copy.existingStopMarkerTitle(stop.orderNumber, stop.title)}
        >
          <Pin
            background={tkColor('--tk-ink-2')}
            borderColor={tkColor('--tk-card')}
            glyphColor={tkColor('--tk-card')}
            glyphText={String(stop.orderNumber)}
            scale={0.85}
          />
        </AdvancedMarker>
      ))}

      {pickedLocation && (
        <AdvancedMarker
          position={pickedLocation}
          draggable
          onDragEnd={handleMarkerDragEnd}
          title={copy.selectedStopPinTitle}
          zIndex={20}
        >
          <Pin
            background={tkColor('--tk-forest')}
            borderColor={tkColor('--tk-card')}
            glyphColor={tkColor('--tk-card')}
            glyphText="+"
            scale={1.2}
          />
        </AdvancedMarker>
      )}
    </>
  );
};

const LeafletFallbackLocationPicker: React.FC<{
  targetCity: string;
  dayNodes: TimelineNode[];
  pickedLocation: { lat: number; lng: number } | null;
  centerCityTrigger: number;
  dragPinTitle: string;
  onPickCoords: (coords: { lat: number; lng: number }) => void;
}> = ({
  targetCity,
  dayNodes,
  pickedLocation,
  centerCityTrigger,
  dragPinTitle,
  onPickCoords,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const onPickRef = useRef(onPickCoords);
  onPickRef.current = onPickCoords;

  const cityCenter = useMemo(
    () =>
      resolveNodeGeoCoords(
        {
          title: targetCity,
          address: '',
          district: '',
          city: targetCity,
        },
        targetCity
      ),
    [targetCity]
  );

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const initialCenter = pickedLocation ?? {
      lat: cityCenter.lat,
      lng: cityCenter.lng,
    };
    const map = L.map(el, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: pickedLocation ? 15 : 13,
      zoomControl: false,
      attributionControl: false,
    });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control
      .attribution({ position: 'bottomleft', prefix: false })
      .addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap · CARTO',
      subdomains: 'abcd',
      maxZoom: 20,
      crossOrigin: 'anonymous',
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    layerGroupRef.current = group;
    mapRef.current = map;

    map.on('click', (e: L.LeafletMouseEvent) => {
      onPickRef.current({
        lat: Number(e.latlng.lat.toFixed(6)),
        lng: Number(e.latlng.lng.toFixed(6)),
      });
    });

    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!pickedLocation || centerCityTrigger > 0) {
      map.setView([cityCenter.lat, cityCenter.lng], 13, { animate: true });
    }
  }, [cityCenter.lat, cityCenter.lng, centerCityTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;
    group.clearLayers();

    dayNodes.slice(0, 10).forEach((node, idx) => {
      const geo = resolveNodeGeoCoords(
        {
          title: node.title,
          address: node.address,
          district: node.district,
          city: node.city || targetCity,
          lat: node.lat,
          lng: node.lng,
        },
        targetCity
      );
      const mk = L.marker([geo.lat, geo.lng], {
        icon: L.divIcon({
          className: 'leaflet-div-icon',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          html: `<div style="width:24px;height:24px;border-radius:9999px;background:var(--tk-ink-2);border:2px solid var(--tk-card);box-shadow:var(--tk-sh-card);color:var(--tk-card);font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;">${idx + 1}</div>`,
        }),
        interactive: false,
      });
      mk.addTo(group);
    });

    if (pickedLocation) {
      const pinMk = L.marker([pickedLocation.lat, pickedLocation.lng], {
        draggable: true,
        zIndexOffset: 600,
        title: dragPinTitle,
        icon: L.divIcon({
          className: 'leaflet-div-icon',
          iconSize: [34, 40],
          iconAnchor: [17, 38],
          html: `<div style="display:flex;flex-direction:column;align-items:center;">
            <div style="width:30px;height:30px;border-radius:9999px;background:var(--tk-forest);border:2.5px solid var(--tk-card);box-shadow:var(--tk-sh-btn);color:var(--tk-card);font-size:16px;font-weight:800;display:flex;align-items:center;justify-content:center;">+</div>
            <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid var(--tk-forest);margin-top:-1px;"></div>
          </div>`,
        }),
      }).addTo(group);

      pinMk.on('dragend', () => {
        const pos = pinMk.getLatLng();
        onPickRef.current({
          lat: Number(pos.lat.toFixed(6)),
          lng: Number(pos.lng.toFixed(6)),
        });
      });

      map.panTo([pickedLocation.lat, pickedLocation.lng], { animate: true });
    }
  }, [dayNodes, targetCity, pickedLocation, dragPinTitle]);

  return (
    <div
      ref={mountRef}
      className="h-full w-full min-h-[272px]"
      data-tk-map-attribution="osm"
    />
  );
};

export const AddStopModal: React.FC<AddStopModalProps> = ({
  open,
  onClose,
  cities,
  cityDays,
  totalDays,
  activeDay,
  timeline,
  currencyCode,
  currencySymbol,
  wishlist = [],
  onConsumeWishlistItem,
  initialMapCoords = null,
  onSelectDay,
  onAddNode,
  onOpenAiAssistant,
}) => {
  const { i18n } = useTranslation();
  const activeLang: AppLanguage = normalizeAppLanguage(i18n.language, 'en-US');
  const copy = useMemo(() => getAddStopModalCopy(activeLang), [activeLang]);
  const apiKey = getConfiguredGoogleMapsApiKey();
  const safeDaysCount = Math.max(1, totalDays);
  const pricePrefix = currencySymbol || `${currencyCode} `;

  // Header & Mode State
  const [addTargetDay, setAddTargetDay] = useState<number>(activeDay);
  const [dayStripOpen, setDayStripOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AddModeTab>('for_you');
  const [forYouSub, setForYouSub] = useState<ForYouSubCategory>('for_you');

  // Added keys tracking during current modal session (supports smooth multi-add)
  const [addedKeys, setAddedKeys] = useState<Record<string, boolean>>({});
  const [sessionAddCount, setSessionAddCount] = useState(0);

  // Tab 1: For You state
  const [forYouPlacesMap, setForYouPlacesMap] = useState<Record<string, CandidateStopItem[]>>({});
  const [forYouAiCache, setForYouAiCache] = useState<Record<string, CandidateStopItem[]>>({});
  const [forYouLoading, setForYouLoading] = useState(false);
  const [forYouError, setForYouError] = useState<string | null>(null);
  const [wishlistItemsResolved, setWishlistItemsResolved] = useState<CandidateStopItem[]>([]);

  // Tab 2: Search + Collapsible Map Picker state
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<CandidateStopItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [mapResolving, setMapResolving] = useState(false);
  const [mapStatusMsg, setMapStatusMsg] = useState<string | null>(null);
  const [centerCityTrigger, setCenterCityTrigger] = useState(0);

  // Tab 3: Link & AI state
  const [linkOrPromptText, setLinkOrPromptText] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSummaryTip, setLinkSummaryTip] = useState<string | null>(null);
  const [linkExtractedStops, setLinkExtractedStops] = useState<CandidateStopItem[]>([]);

  // Tab 4: Screenshot state
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotNote, setScreenshotNote] = useState('');
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [screenshotSummaryTip, setScreenshotSummaryTip] = useState<string | null>(null);
  const [screenshotStops, setScreenshotStops] = useState<CandidateStopItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Places Enrichment Queue for Link & Screenshot results
  const [enrichTarget, setEnrichTarget] = useState<{
    source: 'link' | 'screenshot';
    items: CandidateStopItem[];
  } | null>(null);

  // Progressive Bottom Composer & Fine-Tune Drawer state
  const [composerOpen, setComposerOpen] = useState(false);
  const [fineTuneExpanded, setFineTuneExpanded] = useState(false);
  const [newStopType, setNewStopType] = useState<StopType>('attraction');
  const [newTitle, setNewTitle] = useState('');
  const [newDistrict, setNewDistrict] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newTime, setNewTime] = useState('14:30');
  const [newCloseTime, setNewCloseTime] = useState('18:30');
  const [newEst, setNewEst] = useState('15');
  const [newTransit, setNewTransit] = useState('');
  const [newIsOutdoor, setNewIsOutdoor] = useState(false);
  const [newRainTitle, setNewRainTitle] = useState('');
  const [newRainDistrict, setNewRainDistrict] = useState('');
  const [newRainAddress, setNewRainAddress] = useState('');
  const [newIsAnchor, setNewIsAnchor] = useState(false);
  const [newRating, setNewRating] = useState<number>(4.6);
  const [pickedPlaceId, setPickedPlaceId] = useState<string | undefined>(undefined);
  const [stagedWishlistKey, setStagedWishlistKey] = useState<string | undefined>(undefined);

  const wasOpenRef = useRef(false);
  const aiInFlightKeysRef = useRef<Record<string, boolean>>({});

  const targetDayNodes = useMemo(
    () => timeline.filter((n) => (n.day ?? 1) === addTargetDay),
    [timeline, addTargetDay]
  );

  const targetCityLabel = useMemo(
    () => getCityForDay(cities, addTargetDay, safeDaysCount, targetDayNodes, activeLang, cityDays),
    [cities, addTargetDay, safeDaysCount, targetDayNodes, activeLang, cityDays]
  );
  const targetPrimaryCity = useMemo(
    () => getPrimaryCityName(targetCityLabel),
    [targetCityLabel]
  );

  const lastStopDistrict = useMemo(() => {
    if (targetDayNodes.length === 0) return '';
    const last = targetDayNodes[targetDayNodes.length - 1];
    return (last?.district || '').trim();
  }, [targetDayNodes]);

  const existingTitlesLower = useMemo(() => {
    const s = new Set<string>();
    for (const n of timeline) {
      if (n.title) s.add(n.title.trim().toLowerCase());
    }
    return s;
  }, [timeline]);

  const nextSmartTime = useMemo(
    () => computeSmartGapTime(targetDayNodes, sessionAddCount * 90),
    [targetDayNodes, sessionAddCount]
  );

  // Reset cleanly on closed -> open transition
  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;

    const initialNodes = timeline.filter((n) => (n.day ?? 1) === activeDay);
    setAddTargetDay(activeDay);
    setDayStripOpen(false);
    setAddedKeys({});
    setSessionAddCount(0);
    setSearchInput('');
    setSearchResults([]);
    setLinkOrPromptText('');
    setLinkError(null);
    setLinkSummaryTip(null);
    setLinkExtractedStops([]);
    setScreenshotPreview(null);
    setScreenshotNote('');
    setScreenshotError(null);
    setScreenshotSummaryTip(null);
    setScreenshotStops([]);
    setEnrichTarget(null);
    setFineTuneExpanded(false);
    setNewStopType('attraction');
    setNewTitle('');
    setNewDistrict('');
    setNewAddress('');
    setNewTime(computeSmartGapTime(initialNodes));
    setNewCloseTime('18:30');
    setNewEst('15');
    setNewTransit('');
    setNewIsOutdoor(false);
    setNewRainTitle('');
    setNewRainDistrict('');
    setNewRainAddress('');
    setNewIsAnchor(false);
    setNewRating(4.6);
    setPickedPlaceId(undefined);
    setStagedWishlistKey(undefined);
    setCenterCityTrigger(0);

    if (
      initialMapCoords &&
      Number.isFinite(initialMapCoords.lat) &&
      Number.isFinite(initialMapCoords.lng)
    ) {
      setActiveTab('search');
      setShowMapPicker(true);
      setPickedLocation({
        lat: initialMapCoords.lat,
        lng: initialMapCoords.lng,
      });
      setComposerOpen(true);
      setMapStatusMsg(copy.pinLockedStatus);
    } else {
      setActiveTab('for_you');
      setForYouSub('for_you');
      setShowMapPicker(false);
      setPickedLocation(null);
      setComposerOpen(false);
      setMapStatusMsg(null);
    }
  }, [open, activeDay, timeline, initialMapCoords, copy]);

  // Escape key closes modal
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  // Plain wishlist fallback when Google Maps API key is not configured
  useEffect(() => {
    if (apiKey || activeTab !== 'for_you' || forYouSub !== 'wishlist') return;
    setWishlistItemsResolved(
      wishlist.map((item, idx) => ({
        key: `wish_plain_${idx}_${item}`,
        stopType: 'attraction',
        title: item,
        district: targetPrimaryCity,
        address: `${item}, ${targetPrimaryCity}`,
        estLocal: 0,
        wishlistSourceItem: item,
      }))
    );
  }, [apiKey, activeTab, forYouSub, wishlist, targetPrimaryCity]);

  // Fetch AI For-You recommendations when apiKey is unconfigured OR when Places API fallback triggers
  const fetchAiForYou = useCallback(
    async (category: Exclude<ForYouSubCategory, 'wishlist'>) => {
      const cacheKey = `${activeLang}::D${addTargetDay}::${targetPrimaryCity}::${category}`;
      if (forYouAiCache[cacheKey] || aiInFlightKeysRef.current[cacheKey]) return;

      aiInFlightKeysRef.current[cacheKey] = true;
      setForYouLoading(true);
      setForYouError(null);
      try {
        const existingStops = timeline.map((n) => ({
          day: n.day ?? 1,
          time: n.time,
          title: n.title,
          district: n.district,
        }));
        const res = await fetch(resolveApiUrl('/api/ai/extract-stops'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'for_you',
            forYouCategory: category,
            activeDay: addTargetDay,
            totalDays: safeDaysCount,
            targetCity: targetPrimaryCity,
            cities,
            currencyCode,
            existingStops,
            language: activeLang,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || copy.loadRecFailed);
        }
        const validTypes: StopType[] = ['attraction', 'dining', 'hotel', 'transit', 'shopping'];
        const rawStops: Array<Record<string, unknown>> = Array.isArray(data.stops)
          ? data.stops
          : [];
        const mapped: CandidateStopItem[] = rawStops.map((s, idx) => {
          const st = validTypes.includes(s.stopType as StopType)
            ? (s.stopType as StopType)
            : 'attraction';
          return {
            key: `ai_fy_${cacheKey}_${idx}`,
            day: Number(s.day) || addTargetDay,
            time: typeof s.time === 'string' ? s.time : undefined,
            closeTime: typeof s.closeTime === 'string' ? s.closeTime : '20:00',
            durationMinutes: Number(s.durationMinutes) || 90,
            stopType: st,
            searchQuery: String(s.searchQuery || s.title || ''),
            title: String(s.title || ''),
            district: String(s.district || targetPrimaryCity),
            address: String(s.address || `${s.title}, ${targetPrimaryCity}`),
            lat: typeof s.lat === 'number' && Number.isFinite(s.lat) ? s.lat : undefined,
            lng: typeof s.lng === 'number' && Number.isFinite(s.lng) ? s.lng : undefined,
            estLocal: Math.max(0, Number(s.estLocal) || 0),
            reason: String(s.reason || ''),
            transitNote: String(s.transitNote || ''),
            isOutdoor: Boolean(s.isOutdoor),
            rainSwapTitle: String(s.rainSwapTitle || ''),
            rainSwapDistrict: String(s.rainSwapDistrict || ''),
            rainSwapAddress: String(s.rainSwapAddress || ''),
            isAnchor: Boolean(s.isAnchor),
            fromGooglePlaces: false,
          };
        });
        setForYouAiCache((prev) => ({ ...prev, [cacheKey]: mapped }));
      } catch (err: unknown) {
        setForYouError(
          err instanceof Error ? err.message : copy.loadRecFallback
        );
      } finally {
        aiInFlightKeysRef.current[cacheKey] = false;
        setForYouLoading(false);
      }
    },
    [
      activeLang,
      addTargetDay,
      targetPrimaryCity,
      forYouAiCache,
      timeline,
      safeDaysCount,
      cities,
      currencyCode,
      copy,
    ]
  );

  useEffect(() => {
    if (!open || activeTab !== 'for_you' || forYouSub === 'wishlist') return;
    if (!apiKey) {
      void fetchAiForYou(forYouSub);
    }
  }, [open, activeTab, forYouSub, apiKey, fetchAiForYou]);

  const handleForYouPlacesResult = useCallback(
    (cacheKey: string, items: CandidateStopItem[] | null, failed: boolean) => {
      if (items && items.length > 0) {
        setForYouPlacesMap((prev) => ({ ...prev, [cacheKey]: items }));
        setForYouLoading(false);
        setForYouError(null);
      } else if (failed && forYouSub !== 'wishlist') {
        void fetchAiForYou(forYouSub);
      }
    },
    [forYouSub, fetchAiForYou]
  );

  const handleSearchPlacesResult = useCallback(
    (items: CandidateStopItem[], loading: boolean) => {
      setSearchResults(items);
      setSearchLoading(loading);
    },
    []
  );

  const handleEnrichComplete = useCallback(
    (enriched: CandidateStopItem[]) => {
      if (!enrichTarget) return;
      if (enrichTarget.source === 'link') {
        setLinkExtractedStops(enriched);
      } else {
        setScreenshotStops(enriched);
      }
    },
    [enrichTarget]
  );

  // Stage any candidate stop into the bottom composer for fine-tuning
  const stageCandidateInComposer = useCallback(
    (item: CandidateStopItem, openFineTuneDrawer: boolean) => {
      const targetD =
        item.day && item.day >= 1 && item.day <= safeDaysCount ? item.day : addTargetDay;
      if (targetD !== addTargetDay) {
        setAddTargetDay(targetD);
      }
      const typeSpec =
        STOP_TYPE_DEFAULTS.find((s) => s.id === item.stopType) || STOP_TYPE_DEFAULTS[0];
      setNewStopType(item.stopType);
      setNewTitle(item.title);
      setNewDistrict(item.district || targetPrimaryCity);
      setNewAddress(item.address || `${item.title}, ${targetPrimaryCity}`);
      setNewTime(
        item.time && /^\d{2}:\d{2}$/.test(item.time) ? item.time : nextSmartTime
      );
      setNewCloseTime(item.closeTime || typeSpec.defaultClose);
      setNewEst(String(Math.max(0, Number(item.estLocal ?? typeSpec.defaultEst) || 0)));
      setNewTransit(item.transitNote || '');
      setNewIsOutdoor(Boolean(item.isOutdoor));
      setNewRainTitle(item.rainSwapTitle || '');
      setNewRainDistrict(item.rainSwapDistrict || '');
      setNewRainAddress(item.rainSwapAddress || '');
      setNewIsAnchor(Boolean(item.isAnchor));
      if (item.rating) setNewRating(item.rating);
      setPickedPlaceId(item.placeId);
      setStagedWishlistKey(item.wishlistSourceItem);
      if (typeof item.lat === 'number' && typeof item.lng === 'number') {
        setPickedLocation({ lat: item.lat, lng: item.lng });
      }
      setComposerOpen(true);
      setFineTuneExpanded(openFineTuneDrawer);
    },
    [addTargetDay, safeDaysCount, targetPrimaryCity, nextSmartTime]
  );

  // 1-Tap Instant Add for any CandidateStopItem
  const handleQuickAddCandidate = useCallback(
    (item: CandidateStopItem, customOffsetIndex = 0) => {
      if (addedKeys[item.key]) return;
      const targetD =
        item.day && item.day >= 1 && item.day <= safeDaysCount ? item.day : addTargetDay;
      const dayNodesForTarget = timeline.filter((n) => (n.day ?? 1) === targetD);
      const arrivalTime =
        item.time && /^\d{2}:\d{2}$/.test(item.time)
          ? item.time
          : computeSmartGapTime(dayNodesForTarget, (sessionAddCount + customOffsetIndex) * 90);
      const cityLabelForTarget = getCityForDay(
        cities,
        targetD,
        safeDaysCount,
        dayNodesForTarget,
        activeLang,
        cityDays
      );
      const primaryCityForTarget = getPrimaryCityName(cityLabelForTarget);

      onAddNode(targetD, {
        city: cityLabelForTarget,
        stopType: item.stopType,
        time: arrivalTime,
        closeTime: item.closeTime || '20:00',
        durationMinutes: item.durationMinutes,
        title: item.title.trim(),
        district: item.district.trim() || primaryCityForTarget,
        address: item.address.trim() || `${item.title.trim()}, ${primaryCityForTarget}`,
        placeId: item.placeId,
        lat: item.lat,
        lng: item.lng,
        estLocal: Math.max(0, Number(item.estLocal) || 0),
        rating: item.rating ?? 4.6,
        visited: false,
        isAnchor: Boolean(item.isAnchor),
        isOutdoor: Boolean(item.isOutdoor),
        transitNote: item.transitNote?.trim() || copy.defaultTransitNote,
        rainSwapTitle:
          item.isOutdoor && item.rainSwapTitle?.trim() ? item.rainSwapTitle.trim() : undefined,
        rainSwapDistrict:
          item.isOutdoor && item.rainSwapTitle?.trim() && item.rainSwapDistrict?.trim()
            ? item.rainSwapDistrict.trim()
            : undefined,
        rainSwapAddress:
          item.isOutdoor && item.rainSwapTitle?.trim() && item.rainSwapAddress?.trim()
            ? item.rainSwapAddress.trim()
            : undefined,
      });

      if (item.wishlistSourceItem && onConsumeWishlistItem) {
        onConsumeWishlistItem(item.wishlistSourceItem);
      }

      setAddedKeys((prev) => ({ ...prev, [item.key]: true }));
      setSessionAddCount((c) => c + 1);
      if (targetD !== activeDay) {
        onSelectDay(targetD);
      }
    },
    [
      addedKeys,
      addTargetDay,
      safeDaysCount,
      timeline,
      sessionAddCount,
      cities,
      activeLang,
      onAddNode,
      copy,
      onConsumeWishlistItem,
      activeDay,
      onSelectDay,
    ]
  );

  const handleBatchAddCandidates = useCallback(
    (items: CandidateStopItem[]) => {
      const pending = items.filter((item) => !addedKeys[item.key]);
      pending.forEach((item, idx) => {
        handleQuickAddCandidate(item, idx);
      });
    },
    [addedKeys, handleQuickAddCandidate]
  );

  // Autocomplete & Map Pin selection handlers (Search tab)
  const applySelectedGooglePlace = useCallback(
    (place: SelectedGooglePlace) => {
      const stopType = place.inferredStopType || 'attraction';
      const spec = STOP_TYPE_DEFAULTS.find((o) => o.id === stopType) || STOP_TYPE_DEFAULTS[0];
      setNewStopType(stopType);
      if (place.name) setNewTitle(place.name);
      if (place.district) setNewDistrict(place.district);
      if (place.formattedAddress) setNewAddress(place.formattedAddress);
      if (place.placeId) setPickedPlaceId(place.placeId);
      if (place.location) setPickedLocation(place.location);
      setNewCloseTime(place.closeTimeHint || spec.defaultClose);
      setNewEst(spec.defaultEst);
      setNewIsOutdoor(Boolean(place.isOutdoorHint));
      if (place.ratingHint) setNewRating(place.ratingHint);
      setNewTime(nextSmartTime);
      setStagedWishlistKey(undefined);
      setComposerOpen(true);
      setMapStatusMsg(null);
    },
    [nextSmartTime]
  );

  const handleMapClickSelect = useCallback(
    (coords: google.maps.LatLngLiteral, place: SelectedGooglePlace | null) => {
      setPickedLocation(coords);
      setComposerOpen(true);
      if (place) {
        applySelectedGooglePlace({
          ...place,
          location: place.location || coords,
        });
        setSearchInput(place.name || searchInput);
      } else if (!newTitle.trim() && searchInput.trim()) {
        setNewTitle(searchInput.trim());
      }
    },
    [applySelectedGooglePlace, newTitle, searchInput]
  );

  // Tab 3: Parse Link / Xiaohongshu Post / Natural-Language AI Prompt
  const handleExtractFromLinkOrText = async (overrideText?: string) => {
    const query = (overrideText ?? linkOrPromptText).trim();
    if (!query) return;

    setLinkLoading(true);
    setLinkError(null);
    setLinkSummaryTip(null);
    setLinkExtractedStops([]);

    try {
      const existingStops = timeline.map((n) => ({
        day: n.day ?? 1,
        time: n.time,
        title: n.title,
        district: n.district,
      }));
      const res = await fetch(resolveApiUrl('/api/ai/extract-stops'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'link_or_text',
          inputText: query,
          activeDay: addTargetDay,
          totalDays: safeDaysCount,
          targetCity: targetPrimaryCity,
          cities,
          currencyCode,
          existingStops,
          language: activeLang,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || copy.extractStopFailed);
      }

      const validTypes: StopType[] = ['attraction', 'dining', 'hotel', 'transit', 'shopping'];
      const rawStops: Array<Record<string, unknown>> = Array.isArray(data.stops)
        ? data.stops
        : [];
      const parsedItems: CandidateStopItem[] = rawStops.map((s, idx) => ({
        key: `link_${Date.now()}_${idx}`,
        day: Math.min(safeDaysCount, Math.max(1, Number(s.day) || addTargetDay)),
        time: typeof s.time === 'string' ? s.time : undefined,
        closeTime: typeof s.closeTime === 'string' ? s.closeTime : '20:00',
        durationMinutes: Number(s.durationMinutes) || 90,
        stopType: validTypes.includes(s.stopType as StopType)
          ? (s.stopType as StopType)
          : 'attraction',
        searchQuery: String(s.searchQuery || s.title || ''),
        title: String(s.title || query),
        district: String(s.district || targetPrimaryCity),
        address: String(s.address || `${s.title || query}, ${targetPrimaryCity}`),
        lat: typeof s.lat === 'number' && Number.isFinite(s.lat) ? s.lat : undefined,
        lng: typeof s.lng === 'number' && Number.isFinite(s.lng) ? s.lng : undefined,
        estLocal: Math.max(0, Number(s.estLocal) || 0),
        reason: String(s.reason || ''),
        transitNote: String(s.transitNote || ''),
        isOutdoor: Boolean(s.isOutdoor),
        rainSwapTitle: String(s.rainSwapTitle || ''),
        rainSwapDistrict: String(s.rainSwapDistrict || ''),
        rainSwapAddress: String(s.rainSwapAddress || ''),
        isAnchor: Boolean(s.isAnchor),
      }));

      setLinkSummaryTip(String(data.summaryTip || '').trim() || null);
      setLinkExtractedStops(parsedItems);

      if (parsedItems.length === 1) {
        stageCandidateInComposer(parsedItems[0], false);
      }
      if (apiKey && parsedItems.length > 0) {
        setEnrichTarget({ source: 'link', items: parsedItems });
      }
    } catch (err: unknown) {
      setLinkError(
        err instanceof Error ? err.message : copy.extractLinkFailed
      );
    } finally {
      setLinkLoading(false);
    }
  };

  // Tab 4: Handle Screenshot Upload & Multimodal Place Extraction
  const handleScreenshotFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setScreenshotError(copy.invalidImgError);
      return;
    }

    setScreenshotLoading(true);
    setScreenshotError(null);
    setScreenshotSummaryTip(null);
    setScreenshotStops([]);

    try {
      const { base64, mimeType, previewDataUrl } = await compressImageFileToBase64(file);
      setScreenshotPreview(previewDataUrl);

      const existingStops = timeline.map((n) => ({
        day: n.day ?? 1,
        time: n.time,
        title: n.title,
        district: n.district,
      }));

      const res = await fetch(resolveApiUrl('/api/ai/extract-stops'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'screenshot',
          imageBase64: base64,
          mimeType,
          inputText: screenshotNote.trim(),
          activeDay: addTargetDay,
          totalDays: safeDaysCount,
          targetCity: targetPrimaryCity,
          cities,
          currencyCode,
          existingStops,
          language: activeLang,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || copy.recognizeImgFailed);
      }

      const validTypes: StopType[] = ['attraction', 'dining', 'hotel', 'transit', 'shopping'];
      const rawStops: Array<Record<string, unknown>> = Array.isArray(data.stops)
        ? data.stops
        : [];
      const parsedItems: CandidateStopItem[] = rawStops.map((s, idx) => ({
        key: `shot_${Date.now()}_${idx}`,
        day: Math.min(safeDaysCount, Math.max(1, Number(s.day) || addTargetDay)),
        time: typeof s.time === 'string' ? s.time : undefined,
        closeTime: typeof s.closeTime === 'string' ? s.closeTime : '20:00',
        durationMinutes: Number(s.durationMinutes) || 90,
        stopType: validTypes.includes(s.stopType as StopType)
          ? (s.stopType as StopType)
          : 'attraction',
        searchQuery: String(s.searchQuery || s.title || ''),
        title: String(s.title || ''),
        district: String(s.district || targetPrimaryCity),
        address: String(s.address || `${s.title}, ${targetPrimaryCity}`),
        lat: typeof s.lat === 'number' && Number.isFinite(s.lat) ? s.lat : undefined,
        lng: typeof s.lng === 'number' && Number.isFinite(s.lng) ? s.lng : undefined,
        estLocal: Math.max(0, Number(s.estLocal) || 0),
        reason: String(s.reason || ''),
        transitNote: String(s.transitNote || ''),
        isOutdoor: Boolean(s.isOutdoor),
        rainSwapTitle: String(s.rainSwapTitle || ''),
        rainSwapDistrict: String(s.rainSwapDistrict || ''),
        rainSwapAddress: String(s.rainSwapAddress || ''),
        isAnchor: Boolean(s.isAnchor),
      }));

      setScreenshotSummaryTip(String(data.summaryTip || '').trim() || null);
      setScreenshotStops(parsedItems);

      if (apiKey && parsedItems.length > 0) {
        setEnrichTarget({ source: 'screenshot', items: parsedItems });
      }
    } catch (err: unknown) {
      setScreenshotError(
        err instanceof Error ? err.message : copy.recognizeImgFallback
      );
    } finally {
      setScreenshotLoading(false);
    }
  };

  const handleStopTypeChange = (typeId: StopType) => {
    setNewStopType(typeId);
    const spec = STOP_TYPE_DEFAULTS.find((o) => o.id === typeId);
    if (!spec) return;
    setNewCloseTime(spec.defaultClose);
    if (['0', '12', '15', '28', ''].includes(newEst.trim())) {
      setNewEst(spec.defaultEst);
    }
  };

  const handleConfirmComposerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = (newTitle.trim() || searchInput.trim()).trim();
    if (!cleanTitle) return;

    onAddNode(addTargetDay, {
      city: targetCityLabel,
      stopType: newStopType,
      time: newTime || nextSmartTime,
      closeTime: newCloseTime || '20:00',
      title: cleanTitle,
      district: newDistrict.trim() || targetPrimaryCity,
      address: newAddress.trim() || `${cleanTitle}, ${targetPrimaryCity}`,
      placeId: pickedPlaceId,
      lat: pickedLocation?.lat,
      lng: pickedLocation?.lng,
      estLocal: Math.max(0, parseFloat(newEst) || 0),
      rating: newRating,
      visited: false,
      isAnchor: newIsAnchor,
      isOutdoor: newIsOutdoor,
      transitNote: newTransit.trim() || copy.defaultTransitNote,
      rainSwapTitle:
        newIsOutdoor && newRainTitle.trim() ? newRainTitle.trim() : undefined,
      rainSwapDistrict:
        newIsOutdoor && newRainTitle.trim() && newRainDistrict.trim()
          ? newRainDistrict.trim()
          : undefined,
      rainSwapAddress:
        newIsOutdoor && newRainTitle.trim() && newRainAddress.trim()
          ? newRainAddress.trim()
          : undefined,
    });

    if (stagedWishlistKey && onConsumeWishlistItem) {
      onConsumeWishlistItem(stagedWishlistKey);
    }

    if (addTargetDay !== activeDay) {
      onSelectDay(addTargetDay);
    }
    onClose();
  };

  if (!open) return null;

  // Resolve active For-You list
  const hourNum = Number(nextSmartTime.split(':')[0] || 14);
  const mealWindow =
    (hourNum >= 11 && hourNum <= 13) || (hourNum >= 17 && hourNum <= 20);
  const gpForYouKey = `${activeLang}::${targetPrimaryCity}::${lastStopDistrict}::${forYouSub}::${
    forYouSub === 'for_you' ? (mealWindow ? 'meal' : 'sight') : 'std'
  }`;
  const aiForYouKey = `${activeLang}::D${addTargetDay}::${targetPrimaryCity}::${forYouSub}`;

  const activeForYouItems: CandidateStopItem[] =
    forYouSub === 'wishlist'
      ? wishlistItemsResolved
      : forYouPlacesMap[gpForYouKey] || forYouAiCache[aiForYouKey] || [];

  const isForYouBusy =
    forYouSub !== 'wishlist' &&
    activeForYouItems.length === 0 &&
    (forYouLoading || (Boolean(apiKey) && !forYouError));

  const arrivalMins = toMinutes(newTime);
  const closeMins = toMinutes(newCloseTime);
  const showClosingWarning =
    arrivalMins !== null &&
    closeMins !== null &&
    closeMins > 0 &&
    arrivalMins >= closeMins;

  const renderCandidateCard = (item: CandidateStopItem) => {
    const isAdded = Boolean(addedKeys[item.key]);
    const typeLabel = getStopTypeLabel(item.stopType, activeLang);

    return (
      <div
        key={item.key}
        className="rounded-2xl border tk-bc-hair tk-bg-card p-3 sm:p-3.5 flex items-center gap-3 hover:tk-bc-hair transition-colors"
      >
        <StopCategoryAvatar
          stopType={item.stopType}
          photoUri={item.photoUri}
          title={item.title}
        />

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <h4 className="text-sm font-bold tk-text-ink truncate">{item.title}</h4>
          </div>

          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs tk-text-ink2 tabular-nums">
            {item.fromGooglePlaces && typeof item.rating === 'number' ? (
              <>
                <span className="font-semibold tk-text-ink">
                  ★ {item.rating.toFixed(1)}
                  {item.userRatingCount
                    ? ` (${item.userRatingCount.toLocaleString()})`
                    : ''}
                </span>
                <span aria-hidden="true">·</span>
              </>
            ) : null}
            <span>{typeLabel}</span>
            {item.district ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate max-w-[140px]">{item.district}</span>
              </>
            ) : null}
            {item.estLocal > 0 ? (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  {copy.estLabel} {pricePrefix}
                  {item.estLocal}
                </span>
              </>
            ) : null}
          </div>

          <p className="text-xs tk-text-ink2 truncate">
            {item.reason || item.address}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isAdded && (
            <button
              type="button"
              onClick={() => stageCandidateInComposer(item, true)}
              title={copy.tuneBtnTitle}
              className="min-h-[40px] px-2.5 rounded-xl text-xs font-semibold tk-text-ink2 hover:tk-bg-paper hover:tk-text-ink transition-colors whitespace-nowrap cursor-pointer"
            >
              {copy.tuneBtn}
            </button>
          )}

          <button
            type="button"
            disabled={isAdded}
            onClick={() => handleQuickAddCandidate(item)}
            className={`min-h-[40px] px-3.5 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
 isAdded
 ? 'tk-bg-paper tk-text-forest cursor-default'
 : 'tk-bg-forest tk-text-card hover:tk-bg-press'
 }`}
          >
            {isAdded ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>{copy.addedBtn}</span>
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                <span>{copy.addBtn}</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderSkeletonList = () => (
    <div className="space-y-2.5" aria-busy="true">
      {[0, 1, 2, 3, 4].map((idx) => (
        <div
          key={idx}
          className="rounded-2xl border tk-bc-hair tk-bg-card p-3.5 flex items-center gap-3.5 animate-pulse"
        >
          <div className="h-16 w-16 rounded-xl tk-bg-forest-plate shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-3/5 rounded-md tk-bg-forest-plate" />
            <div className="h-3 w-2/5 rounded-md tk-bg-forest-plate" />
            <div className="h-3 w-4/5 rounded-md tk-bg-forest-plate" />
          </div>
          <div className="h-9 w-16 rounded-xl tk-bg-forest-plate shrink-0" />
        </div>
      ))}
    </div>
  );

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-stop-modal-title"
      className="fixed inset-0 z-50 tk-bg-overlay p-0 sm:p-4 md:p-6 flex items-end sm:items-center justify-center"
    >
      {Boolean(apiKey) && (
        <PlacesDiscoveryBridge
          activeTab={activeTab}
          forYouSub={forYouSub}
          targetPrimaryCity={targetPrimaryCity}
          lastStopDistrict={lastStopDistrict}
          nextSmartTime={nextSmartTime}
          existingTitlesLower={existingTitlesLower}
          wishlist={wishlist}
          liveSearchQuery={searchInput}
          placesLang={activeLang}
          enrichQueue={enrichTarget?.items ?? null}
          onForYouPlacesResult={handleForYouPlacesResult}
          onWishlistPlacesResult={setWishlistItemsResolved}
          onSearchPlacesResult={handleSearchPlacesResult}
          onEnrichComplete={handleEnrichComplete}
        />
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${
 activeTab === 'search' && showMapPicker ? 'sm:max-w-3xl' : 'sm:max-w-2xl'
 } rounded-t-3xl sm:rounded-3xl border tk-bc-hair tk-bg-card shadow-2xl overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[86vh] transition-all`}
      >
        {/* Mobile Sheet Grab Handle */}
        <div
          aria-hidden="true"
          className="w-10 h-1.5 rounded-full tk-bg-paper mx-auto mt-2.5 sm:hidden shrink-0"
        />

        {/* 1. Minimalist Packy-Style Single-Row Header */}
        <div className="px-5 pt-3 pb-2.5 sm:pt-4 sm:pb-3 tk-bg-card flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              id="add-stop-modal-title"
              onClick={() => setDayStripOpen((v) => !v)}
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl px-2 -ml-2 text-base sm:text-lg font-extrabold tracking-tight tk-text-ink hover:tk-bg-paper transition-colors cursor-pointer min-w-0"
            >
              <span className="truncate">
                {copy.addToDayTitle(addTargetDay, targetPrimaryCity)}
              </span>
              <ChevronDown
                className={`h-4 w-4 tk-text-ink2 shrink-0 transition-transform duration-150 ${
 dayStripOpen ? 'rotate-180' : ''
 }`}
              />
            </button>

            <span className="text-xs tk-text-ink2 tabular-nums whitespace-nowrap hidden xs:inline">
              · {copy.stopCount(targetDayNodes.length)}
            </span>

            {sessionAddCount > 0 && (
              <span className="text-xs font-semibold tk-text-forest tabular-nums whitespace-nowrap">
                · {copy.sessionAdded(sessionAddCount)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={copy.closeSheetAria}
            className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-full tk-text-ink2 hover:tk-bg-forest-plate hover:tk-text-ink transition-colors cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Collapsible Horizontal Day Selector Strip (when "Add to Day X v" is tapped) */}
        {dayStripOpen && (
          <div className="px-5 pb-3 border-b tk-bc-hair tk-bg-card shrink-0">
            <HorizontalChipScroller
              activeKey={addTargetDay}
              fadeBgClassName="from-white"
              ariaLabel={copy.selectDayAria}
            >
              {Array.from({ length: safeDaysCount }, (_, idx) => {
                const d = idx + 1;
                const nodesOnD = timeline.filter((n) => (n.day ?? 1) === d);
                const cityOnD = getPrimaryCityName(
                  getCityForDay(cities, d, safeDaysCount, nodesOnD, activeLang, cityDays)
                );
                const isSelected = d === addTargetDay;
                return (
                  <button
                    key={d}
                    type="button"
                    data-chip-active={isSelected ? 'true' : undefined}
                    onClick={() => {
                      setAddTargetDay(d);
                      setNewTime(computeSmartGapTime(nodesOnD));
                      setPickedLocation(null);
                      setCenterCityTrigger((n) => n + 1);
                      setDayStripOpen(false);
                    }}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-colors tabular-nums cursor-pointer ${
 isSelected
 ? 'tk-bg-forest tk-text-card'
 : 'border tk-bc-hair tk-bg-paper tk-text-ink2 hover:tk-bg-paper'
 }`}
                  >
                    D{d} {cityOnD} ({nodesOnD.length})
                  </button>
                );
              })}
            </HorizontalChipScroller>
          </div>
        )}

        {/* 2. Packy-Style 4-Way Segmented Mode Switcher */}
        <div className="px-5 pb-3 tk-bg-card shrink-0">
          <div
            role="tablist"
            aria-label={copy.modeTabAria}
            className="grid grid-cols-4 gap-1 rounded-2xl tk-bg-paper p-1"
          >
            {(
              [
                {
                  id: 'for_you' as AddModeTab,
                  icon: Sparkles,
                  label: copy.tabForYou,
                },
                {
                  id: 'search' as AddModeTab,
                  icon: Search,
                  label: copy.tabSearch,
                },
                {
                  id: 'link' as AddModeTab,
                  icon: Link2,
                  label: copy.tabLink,
                },
                {
                  id: 'screenshot' as AddModeTab,
                  icon: ImageIcon,
                  label: copy.tabScreenshot,
                },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-h-[52px] rounded-xl px-2 py-1.5 flex flex-col items-center justify-center gap-1 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
 isActive
 ? 'tk-bg-card tk-text-ink shadow-xs font-bold'
 : 'tk-text-ink2 hover:tk-text-ink font-medium'
 }`}
                >
                  <Icon
                    className={`h-4 w-4 ${
 isActive ? 'tk-text-forest' : 'tk-text-ink2'
 }`}
                  />
                  <span className="text-[11px] sm:text-xs leading-none truncate max-w-full">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Scrollable Mode Content Area */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-3.5 min-h-[260px]">
          {/* TAB 1: FOR YOU */}
          {activeTab === 'for_you' && (
            <>
              <HorizontalChipScroller
                activeKey={forYouSub}
                fadeBgClassName="from-white"
                ariaLabel={copy.recCatAria}
              >
                {(
                  [
                    {
                      id: 'for_you' as ForYouSubCategory,
                      label: copy.pillForYou,
                    },
                    {
                      id: 'top_attractions' as ForYouSubCategory,
                      label: copy.pillTopAttractions,
                    },
                    {
                      id: 'local_dining' as ForYouSubCategory,
                      label: copy.pillLocalDining,
                    },
                    {
                      id: 'wishlist' as ForYouSubCategory,
                      label: copy.pillWishlist(wishlist.length),
                    },
                  ] as const
                ).map((pill) => {
                  const isActive = forYouSub === pill.id;
                  return (
                    <button
                      key={pill.id}
                      type="button"
                      data-chip-active={isActive ? 'true' : undefined}
                      onClick={() => setForYouSub(pill.id)}
                      className={`min-h-[38px] px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
 isActive
 ? 'tk-bg-forest tk-text-card'
 : 'border tk-bc-hair tk-bg-card tk-text-ink hover:tk-bg-paper'
 }`}
                    >
                      {pill.label}
                    </button>
                  );
                })}
              </HorizontalChipScroller>

              {forYouSub === 'wishlist' ? (
                wishlist.length === 0 ? (
                  <div className="rounded-2xl border tk-bc-hair tk-bg-paper px-5 py-10 text-center space-y-2">
                    <Heart className="h-6 w-6 tk-text-ink2 mx-auto" />
                    <p className="text-sm font-bold tk-text-ink">
                      {copy.wishlistEmptyTitle}
                    </p>
                    <p className="text-xs tk-text-ink2 max-w-sm mx-auto">
                      {copy.wishlistEmptyBody}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {wishlistItemsResolved.map((item) => renderCandidateCard(item))}
                  </div>
                )
              ) : isForYouBusy ? (
                renderSkeletonList()
              ) : forYouError && activeForYouItems.length === 0 ? (
                <div className="rounded-2xl border tk-bc-hair tk-bg-paper p-4 text-xs tk-text-ink2 flex items-center justify-between gap-3">
                  <span>{forYouError}</span>
                  <button
                    type="button"
                    onClick={() => void fetchAiForYou(forYouSub)}
                    className="min-h-[36px] px-3 rounded-xl tk-bg-card border tk-bc-hair font-bold tk-text-ink2 hover:tk-bg-paper whitespace-nowrap cursor-pointer"
                  >
                    {copy.retryBtn}
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeForYouItems.map((item) => renderCandidateCard(item))}
                </div>
              )}
            </>
          )}

          {/* TAB 2: SEARCH + COLLAPSIBLE MAP PICKER */}
          {activeTab === 'search' && (
            <div className="space-y-3.5">
              <div className="flex items-start gap-2 overflow-visible">
                <div className="relative z-20 flex-1 min-w-0 overflow-visible">
                  <PlaceAutocompleteInput
                    value={searchInput}
                    onChange={(val) => {
                      setSearchInput(val);
                      setNewTitle(val);
                    }}
                    onSelectPlace={(place) => {
                      setSearchInput(place.name);
                      applySelectedGooglePlace(place);
                    }}
                    cityHint={targetPrimaryCity}
                    leftIcon={
                      <Search className="h-4 w-4 tk-text-forest absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    }
                    placeholder={copy.searchPlaceholder(targetPrimaryCity)}
                    className="w-full rounded-xl border tk-bc-hair tk-bg-paper pl-10 pr-3 py-2.5 text-sm tk-text-ink focus:tk-bc-forest focus:tk-bg-card focus:outline-none"
                  />
                </div>

                <AiVoiceInputButton
                  compact
                  contextHint="itinerary"
                  onInterimTranscript={(t) => setSearchInput(t)}
                  onTranscript={(t) => {
                    setSearchInput(t);
                    setNewTitle(t);
                  }}
                />

                <button
                  type="button"
                  onClick={() => setShowMapPicker((v) => !v)}
                  className={`min-h-[42px] px-3 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
 showMapPicker
 ? 'tk-bc-forest tk-bg-forest tk-text-card'
 : 'tk-bc-hair tk-bg-card tk-text-ink hover:tk-bg-paper'
 }`}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{copy.mapPinBtn}</span>
                </button>
              </div>

              {/* Collapsible Interactive Map Pin Picker */}
              {showMapPicker && (
                <div className="rounded-2xl border tk-bc-hair tk-bg-paper overflow-hidden">
                  <div className="px-3.5 py-2 border-b tk-bc-hair tk-bg-card flex items-center justify-between gap-2 text-xs">
                    <span className="tk-text-ink2 truncate">
                      {mapResolving
                        ? copy.mapResolving
                        : mapStatusMsg || copy.mapTapHint}
                    </span>

                    <button
                      type="button"
                      onClick={() => setCenterCityTrigger((n) => n + 1)}
                      className="min-h-[32px] px-2.5 rounded-lg border tk-bc-hair tk-bg-paper text-[11px] font-semibold tk-text-ink2 hover:tk-bg-paper inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Crosshair className="h-3 w-3 tk-text-forest" />
                      <span>{targetPrimaryCity}</span>
                    </button>
                  </div>

                  {/* +32px vs 240/280 so Google logo + .gm-style-cc stay fully visible */}
                  <div
                    className="relative h-[272px] sm:h-[312px] w-full"
                    data-tk-map-attribution="google"
                  >
                    {apiKey ? (
                      <GoogleMap
                        mapId="DEMO_MAP_ID"
                        defaultCenter={pickedLocation || DEFAULT_FALLBACK_CENTER}
                        defaultZoom={pickedLocation ? 15 : 13}
                        gestureHandling="greedy"
                        disableDefaultUI={false}
                        streetViewControl={false}
                        mapTypeControl={false}
                        fullscreenControl={false}
                        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                        className="h-full w-full"
                      >
                        <MapLocationPickerCanvas
                          targetCity={targetPrimaryCity}
                          dayNodes={targetDayNodes}
                          pickedLocation={pickedLocation}
                          centerCityTrigger={centerCityTrigger}
                          placesLang={activeLang}
                          onMapClickSelect={handleMapClickSelect}
                          onResolvingChange={setMapResolving}
                          onStatusMessage={setMapStatusMsg}
                        />
                      </GoogleMap>
                    ) : (
                      <LeafletFallbackLocationPicker
                        targetCity={targetPrimaryCity}
                        dayNodes={targetDayNodes}
                        pickedLocation={pickedLocation}
                        centerCityTrigger={centerCityTrigger}
                        dragPinTitle={copy.dragFineTunePin}
                        onPickCoords={(coords) => {
                          setPickedLocation(coords);
                          setComposerOpen(true);
                          setMapStatusMsg(
                            copy.leafletPinned(coords.lat.toFixed(4), coords.lng.toFixed(4))
                          );
                        }}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Search Result Cards + Custom Quick-Add Escape Hatch */}
              {searchLoading ? (
                renderSkeletonList()
              ) : (
                <div className="space-y-2.5">
                  {searchResults.map((item) => renderCandidateCard(item))}

                  {searchInput.trim().length > 0 && (
                    <div className="rounded-2xl border border-dashed tk-bc-hair tk-bg-paper p-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold tk-text-ink truncate">
                          {copy.useCustomDirect(searchInput.trim(), addTargetDay)}
                        </p>
                        <p className="text-[11px] tk-text-ink2 leading-snug">
                          {copy.useCustomMeta(targetPrimaryCity, nextSmartTime)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            stageCandidateInComposer(
                              {
                                key: `custom_${searchInput.trim()}`,
                                stopType: newStopType,
                                title: searchInput.trim(),
                                district: newDistrict || targetPrimaryCity,
                                address:
                                  newAddress || `${searchInput.trim()}, ${targetPrimaryCity}`,
                                lat: pickedLocation?.lat,
                                lng: pickedLocation?.lng,
                                estLocal: Number(newEst) || 0,
                              },
                              true
                            )
                          }
                          className="min-h-[38px] px-2.5 rounded-xl text-xs font-semibold tk-text-ink2 hover:tk-bg-paper whitespace-nowrap cursor-pointer"
                        >
                          {copy.tuneBtn}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleQuickAddCandidate({
                              key: `custom_${searchInput.trim()}`,
                              stopType: newStopType,
                              title: searchInput.trim(),
                              district: newDistrict || targetPrimaryCity,
                              address:
                                newAddress || `${searchInput.trim()}, ${targetPrimaryCity}`,
                              lat: pickedLocation?.lat,
                              lng: pickedLocation?.lng,
                              estLocal: Number(newEst) || 0,
                            });
                            onClose();
                          }}
                          className="min-h-[38px] px-3.5 rounded-xl tk-bg-forest text-xs font-bold tk-text-card hover:tk-bg-press inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>{copy.addBtn}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {!searchInput.trim() && !showMapPicker && (
                    <div className="rounded-2xl border tk-bc-hair tk-bg-paper px-4 py-7 text-center space-y-1.5">
                      <Search className="h-5 w-5 tk-text-ink2 mx-auto" />
                      <p className="text-xs font-semibold tk-text-ink2">
                        {copy.searchEmptyHint(targetPrimaryCity)}
                      </p>
                      {searchInput.trim() === '' && (
                        <a
                          href={buildGoogleMapsSearchUrl({ title: targetPrimaryCity })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold tk-text-forest hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>{copy.browseGoogleMaps}</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LINK & AI NATURAL LANGUAGE */}
          {activeTab === 'link' && (
            <div className="space-y-3.5">
              <div className="rounded-2xl border tk-bc-hair tk-bg-paper p-3.5 space-y-2.5">
                <textarea
                  rows={3}
                  value={linkOrPromptText}
                  onChange={(e) => setLinkOrPromptText(e.target.value)}
                  placeholder={copy.linkPlaceholder(targetPrimaryCity)}
                  className="w-full rounded-xl border tk-bc-hair tk-bg-card px-3.5 py-2.5 text-xs sm:text-sm tk-text-ink placeholder:tk-text-ink2 focus:tk-bc-forest focus:outline-none resize-none"
                />

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AiVoiceInputButton
                      compact
                      contextHint="itinerary"
                      disabled={linkLoading}
                      onError={(msg) => setLinkError(msg)}
                      onInterimTranscript={(text) => setLinkOrPromptText(text)}
                      onTranscript={(text) => {
                        setLinkOrPromptText(text);
                        void handleExtractFromLinkOrText(text);
                      }}
                    />

                    {linkOrPromptText.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          setLinkOrPromptText('');
                          setLinkExtractedStops([]);
                          setLinkSummaryTip(null);
                          setLinkError(null);
                        }}
                        className="min-h-[38px] px-2.5 rounded-xl text-xs font-semibold tk-text-ink2 hover:tk-bg-paper cursor-pointer"
                      >
                        {copy.clearBtn}
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={linkLoading || !linkOrPromptText.trim()}
                    onClick={() => void handleExtractFromLinkOrText()}
                    className="min-h-[40px] px-4 rounded-xl tk-bg-forest text-xs font-bold tk-text-card hover:tk-bg-press disabled:opacity-50 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    {linkLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {linkLoading ? copy.extractingBtn : copy.extractPlacesBtn}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <HorizontalChipScroller
                  fadeBgClassName="from-white"
                  ariaLabel={copy.quickExamplesAria}
                  className="flex-1"
                >
                  {copy.samplePrompts(targetPrimaryCity).map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => {
                        setLinkOrPromptText(sample);
                        void handleExtractFromLinkOrText(sample);
                      }}
                      className="min-h-[34px] px-3 py-1 rounded-full border tk-bc-hair tk-bg-card text-[11px] font-medium tk-text-ink2 hover:tk-bc-forest hover:tk-text-forest whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {sample}
                    </button>
                  ))}
                </HorizontalChipScroller>

                {onOpenAiAssistant && (
                  <button
                    type="button"
                    onClick={() => {
                      const draft = linkOrPromptText.trim();
                      onClose();
                      onOpenAiAssistant(draft || undefined);
                    }}
                    className="text-[11px] font-bold tk-text-forest hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {copy.fullAiCopilot}
                  </button>
                )}
              </div>

              {linkError && (
                <div className="rounded-xl border tk-bc-hair tk-bg-paper px-3.5 py-2.5 text-xs tk-text-ink2">
                  {linkError}
                </div>
              )}

              {linkSummaryTip && (
                <p className="text-xs font-medium tk-text-forest px-0.5">{linkSummaryTip}</p>
              )}

              {linkLoading ? (
                renderSkeletonList()
              ) : linkExtractedStops.length > 0 ? (
                <div className="space-y-2.5">
                  {linkExtractedStops.length > 1 && (
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-xs font-semibold tk-text-ink2 tabular-nums">
                        {copy.recognizedStopsCount(linkExtractedStops.length)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleBatchAddCandidates(linkExtractedStops)}
                        className="min-h-[36px] px-3.5 rounded-xl tk-bg-forest text-xs font-bold tk-text-card hover:tk-bg-press whitespace-nowrap cursor-pointer"
                      >
                        {copy.addAllBtn(linkExtractedStops.length)}
                      </button>
                    </div>
                  )}
                  {linkExtractedStops.map((item) => renderCandidateCard(item))}
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 4: MULTIMODAL SCREENSHOT PLACE RECOGNITION */}
          {activeTab === 'screenshot' && (
            <div className="space-y-3.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleScreenshotFile(f);
                  e.target.value = '';
                }}
              />

              {!screenshotPreview ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) void handleScreenshotFile(f);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-colors cursor-pointer ${
 dragActive
 ? 'tk-bc-forest tk-bg-forest-tint'
 : 'tk-bc-hair tk-bg-paper hover:tk-bc-forest'
 }`}
                >
                  <div className="h-12 w-12 rounded-2xl tk-bg-paper tk-text-forest flex items-center justify-center mx-auto mb-3">
                    <Upload className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-bold tk-text-ink">
                    {copy.screenshotUploadTitle}
                  </p>
                  <p className="text-xs tk-text-ink2 mt-1 max-w-md mx-auto">
                    {copy.screenshotUploadSub}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border tk-bc-hair tk-bg-paper p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={screenshotPreview}
                      alt={copy.screenshotAlt}
                      referrerPolicy="no-referrer"
                      className="h-14 w-14 rounded-xl object-cover border tk-bc-hair shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold tk-text-ink truncate">
                        {screenshotLoading
                          ? copy.recognizingImg
                          : screenshotSummaryTip || copy.screenshotAnalyzed}
                      </p>
                      <p className="text-[11px] tk-text-ink2">
                        {copy.targetDayCity(addTargetDay, targetPrimaryCity)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={screenshotLoading}
                      onClick={() => fileInputRef.current?.click()}
                      className="min-h-[36px] px-3 rounded-xl border tk-bc-hair tk-bg-card text-xs font-semibold tk-text-ink hover:tk-bg-paper whitespace-nowrap cursor-pointer"
                    >
                      {copy.changeBtn}
                    </button>
                    <button
                      type="button"
                      disabled={screenshotLoading}
                      onClick={() => {
                        setScreenshotPreview(null);
                        setScreenshotStops([]);
                        setScreenshotSummaryTip(null);
                        setScreenshotError(null);
                      }}
                      aria-label={copy.removeScreenshotAria}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl tk-text-ink2 hover:tk-bg-paper hover:tk-text-ink cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {screenshotError && (
                <div className="rounded-xl border tk-bc-hair tk-bg-paper px-3.5 py-2.5 text-xs tk-text-ink2">
                  {screenshotError}
                </div>
              )}

              {screenshotLoading ? (
                renderSkeletonList()
              ) : screenshotStops.length > 0 ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-xs font-semibold tk-text-ink2 tabular-nums">
                      {copy.foundPlacesCount(screenshotStops.length)}
                    </span>
                    {screenshotStops.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleBatchAddCandidates(screenshotStops)}
                        className="min-h-[36px] px-3.5 rounded-xl tk-bg-forest text-xs font-bold tk-text-card hover:tk-bg-press whitespace-nowrap cursor-pointer"
                      >
                        {copy.addAllBtn(screenshotStops.length)}
                      </button>
                    )}
                  </div>
                  {screenshotStops.map((item) => renderCandidateCard(item))}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* 4. Progressive Selected-Stop Composer & Fine-Tune Drawer */}
        {composerOpen && (
          <form
            onSubmit={handleConfirmComposerSubmit}
            className="border-t tk-bc-hair tk-bg-paper px-5 py-3.5 space-y-3 shrink-0"
          >
            {/* Collapsible Power Controls (Time / Cost / StopType / Meetup Anchor / Rain Backup) */}
            {fineTuneExpanded && (
              <div className="space-y-3 pb-2 border-b tk-bc-hair max-h-[36vh] overflow-y-auto pr-0.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold tk-text-ink2 mb-1">
                      {copy.stopTitleLabel}
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder={copy.stopTitlePlaceholder}
                      className="w-full rounded-xl border tk-bc-hair tk-bg-card px-3 py-2 text-xs font-semibold tk-text-ink focus:tk-bc-forest focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold tk-text-ink2 mb-1">
                      {copy.areaLabel}
                    </label>
                    <input
                      type="text"
                      value={newDistrict}
                      onChange={(e) => setNewDistrict(e.target.value)}
                      placeholder={targetPrimaryCity}
                      className="w-full rounded-xl border tk-bc-hair tk-bg-card px-3 py-2 text-xs tk-text-ink focus:tk-bc-forest focus:outline-none"
                    />
                  </div>
                </div>

                {/* 5-Way Stop Type Selector */}
                <div>
                  <span className="block text-[11px] font-bold tk-text-ink2 mb-1">
                    {copy.stopCategoryLabel}
                  </span>
                  <HorizontalChipScroller fadeBgClassName="">
                    {STOP_TYPE_DEFAULTS.map((opt) => {
                      const active = newStopType === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleStopTypeChange(opt.id)}
                          className={`min-h-[34px] px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
 active
 ? 'tk-bg-forest tk-text-card'
 : 'border tk-bc-hair tk-bg-card tk-text-ink2 hover:tk-bg-paper'
 }`}
                        >
                          {getStopTypeLabel(opt.id, activeLang)}
                        </button>
                      );
                    })}
                  </HorizontalChipScroller>
                </div>

                {/* Time, Close Time & Spend */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold tk-text-ink2 mb-1">
                      {copy.arrivalLabel}
                    </label>
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full rounded-xl border tk-bc-hair tk-bg-card px-2.5 py-1.5 font-mono text-xs tk-text-ink tabular-nums focus:tk-bc-forest focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold tk-text-ink2 mb-1">
                      {copy.closesAtLabel}
                    </label>
                    <input
                      type="time"
                      value={newCloseTime}
                      onChange={(e) => setNewCloseTime(e.target.value)}
                      className="w-full rounded-xl border tk-bc-hair tk-bg-card px-2.5 py-1.5 font-mono text-xs tk-text-ink tabular-nums focus:tk-bc-forest focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold tk-text-ink2 mb-1">
                      {copy.estCostLabel(currencyCode)}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={newEst}
                      onChange={(e) => setNewEst(e.target.value)}
                      className="w-full rounded-xl border tk-bc-hair tk-bg-card px-2.5 py-1.5 font-mono text-xs tk-text-ink tabular-nums focus:tk-bc-forest focus:outline-none"
                    />
                  </div>
                </div>

                {showClosingWarning && (
                  <div className="rounded-xl border tk-bc-hair tk-bg-paper px-3 py-2 text-[11px] tk-text-ink2 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 tk-text-warning" />
                    <span>{copy.closingWarning(newTime, newCloseTime)}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold tk-text-ink2 mb-1">
                      {copy.streetAddressLabel}
                    </label>
                    <input
                      type="text"
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      placeholder={copy.streetAddressPlaceholder}
                      className="w-full rounded-xl border tk-bc-hair tk-bg-card px-3 py-2 text-xs tk-text-ink focus:tk-bc-forest focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold tk-text-ink2 mb-1">
                      {copy.transitNoteLabel}
                    </label>
                    <input
                      type="text"
                      value={newTransit}
                      onChange={(e) => setNewTransit(e.target.value)}
                      placeholder={copy.transitNotePlaceholder}
                      className="w-full rounded-xl border tk-bc-hair tk-bg-card px-3 py-2 text-xs tk-text-ink focus:tk-bc-forest focus:outline-none"
                    />
                  </div>
                </div>

                {/* Anchor & Rain Backup Toggles */}
                <div className="flex flex-wrap items-center gap-4 pt-0.5">
                  <label className="inline-flex items-center gap-2 text-xs font-medium tk-text-ink cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIsAnchor}
                      onChange={(e) => setNewIsAnchor(e.target.checked)}
                      className="h-4 w-4 rounded tk-bc-hair tk-accent-forest"
                    />
                    <span>{copy.anchorCheckbox}</span>
                  </label>

                  <label className="inline-flex items-center gap-2 text-xs font-medium tk-text-ink cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIsOutdoor}
                      onChange={(e) => setNewIsOutdoor(e.target.checked)}
                      className="h-4 w-4 rounded tk-bc-hair tk-accent-forest"
                    />
                    <span>{copy.outdoorCheckbox}</span>
                  </label>
                </div>

                {newIsOutdoor && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newRainTitle}
                      onChange={(e) => setNewRainTitle(e.target.value)}
                      placeholder={copy.rainVenuePlaceholder}
                      className="w-full rounded-xl border tk-bc-hair tk-bg-card px-3 py-2 text-xs tk-text-ink focus:tk-bc-forest focus:outline-none"
                    />
                    <input
                      type="text"
                      value={newRainAddress}
                      onChange={(e) => setNewRainAddress(e.target.value)}
                      placeholder={copy.rainAddressPlaceholder}
                      className="w-full rounded-xl border tk-bc-hair tk-bg-card px-3 py-2 text-xs tk-text-ink focus:tk-bc-forest focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Compact Sticky Action Bar */}
            <div className="flex items-center justify-between gap-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold tk-text-ink truncate">
                  {newTitle.trim() || searchInput.trim() || copy.confirmHint}
                </p>
                <p className="text-[11px] tk-text-ink2 tabular-nums truncate">
                  D{addTargetDay} {targetPrimaryCity} · {newTime}
                  {Number(newEst) > 0 ? ` · ${pricePrefix}${newEst}` : ''}
                  {newIsAnchor ? copy.meetupAnchorTag : ''}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setFineTuneExpanded((v) => !v)}
                  className="min-h-[42px] px-3 rounded-xl border tk-bc-hair tk-bg-card text-xs font-semibold tk-text-ink hover:tk-bg-forest-plate inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 tk-text-forest" />
                  <span>{copy.detailsBtn}</span>
                  {fineTuneExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>

                <button
                  type="submit"
                  disabled={!(newTitle.trim() || searchInput.trim())}
                  className="min-h-[42px] px-4 rounded-xl tk-bg-forest text-xs font-bold tk-text-card hover:tk-bg-press disabled:opacity-45 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>{copy.addToDaySubmit(addTargetDay)}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
