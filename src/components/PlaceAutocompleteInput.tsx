import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { AlertCircle, ExternalLink, Loader2, MapPin, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { StopType } from '../types';
import {
  buildGoogleMapsSearchUrl,
  getConfiguredGoogleMapsApiKey,
} from '../utils/googleMapsHelpers';
import { normalizeAppLanguage } from '../utils/preferencesHelpers';
import { getItineraryUtilsCopy } from '../i18n/packs/itineraryUtilsPack';

export interface SelectedGooglePlace {
  placeId?: string;
  name: string;
  formattedAddress: string;
  district: string;
  location?: google.maps.LatLngLiteral;
  inferredStopType?: StopType;
  closeTimeHint?: string;
  ratingHint?: number;
  isOutdoorHint?: boolean;
}

interface PlaceAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectPlace?: (place: SelectedGooglePlace) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  cityHint?: string;
  includedPrimaryTypes?: string[];
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
  leftIcon?: React.ReactNode;
  showExternalLookupLink?: boolean;
}

function extractDistrictFromComponents(
  components: google.maps.places.AddressComponent[] | null | undefined
): string {
  if (!components || components.length === 0) return '';
  const preferredTypes = [
    'sublocality_level_1',
    'sublocality',
    'neighborhood',
    'administrative_area_level_3',
    'locality',
  ];
  for (const targetType of preferredTypes) {
    const match = components.find((c) => c.types?.includes(targetType));
    if (match?.longText) return match.longText;
  }
  return '';
}

function inferStopTypeFromPlaceTypes(
  primaryType?: string | null,
  types?: string[]
): { stopType: StopType; isOutdoor: boolean } {
  const allTypes = new Set<string>(
    [primaryType || '', ...(types || [])].filter(Boolean).map((t) => t.toLowerCase())
  );

  const hasAny = (candidates: string[]) => candidates.some((c) => allTypes.has(c));

  const isOutdoor = hasAny([
    'park',
    'national_park',
    'botanical_garden',
    'garden',
    'plaza',
    'zoo',
    'amusement_park',
    'scenic_spot',
    'beach',
    'hiking_area',
    'campground',
    'marina',
    'stadium',
  ]);

  if (
    hasAny([
      'lodging',
      'hotel',
      'hostel',
      'resort_hotel',
      'bed_and_breakfast',
      'motel',
      'extended_stay_hotel',
      'guest_house',
    ])
  ) {
    return { stopType: 'hotel', isOutdoor: false };
  }

  if (
    hasAny([
      'restaurant',
      'cafe',
      'bakery',
      'bar',
      'coffee_shop',
      'tea_house',
      'bistro',
      'brunch_restaurant',
      'french_restaurant',
      'italian_restaurant',
      'japanese_restaurant',
      'chinese_restaurant',
      'seafood_restaurant',
      'steak_house',
      'ice_cream_shop',
      'meal_takeaway',
      'food_court',
    ])
  ) {
    return { stopType: 'dining', isOutdoor: false };
  }

  if (
    hasAny([
      'shopping_mall',
      'department_store',
      'clothing_store',
      'store',
      'shoe_store',
      'jewelry_store',
      'gift_shop',
      'book_store',
      'market',
      'supermarket',
      'convenience_store',
      'cosmetics_store',
    ])
  ) {
    return { stopType: 'shopping', isOutdoor: false };
  }

  if (
    hasAny([
      'train_station',
      'subway_station',
      'transit_station',
      'light_rail_station',
      'airport',
      'international_airport',
      'bus_station',
      'ferry_terminal',
      'taxi_stand',
    ])
  ) {
    return { stopType: 'transit', isOutdoor: false };
  }

  return { stopType: 'attraction', isOutdoor };
}

function extractClosingTimeHint(
  openingHours: google.maps.places.OpeningHours | null | undefined
): string | undefined {
  const periods = openingHours?.periods;
  if (!periods || periods.length === 0) return undefined;
  const todayDay = new Date().getDay();
  const matched =
    periods.find((p) => p.open?.day === todayDay && p.close) ||
    periods.find((p) => p.close);
  if (!matched?.close) return undefined;
  const hour = matched.close.hour;
  const minute = matched.close.minute;
  if (typeof hour !== 'number' || typeof minute !== 'number') return undefined;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function extractPlaceDetails(
  place: google.maps.places.Place,
  fallbackName = '',
  fallbackAddress = ''
): SelectedGooglePlace {
  const name = place.displayName || fallbackName;
  const formattedAddress = place.formattedAddress || fallbackAddress;
  const district = extractDistrictFromComponents(place.addressComponents);
  const loc = place.location;
  const location = loc ? { lat: loc.lat(), lng: loc.lng() } : undefined;
  const { stopType, isOutdoor } = inferStopTypeFromPlaceTypes(
    place.primaryType,
    place.types
  );
  const closeTimeHint = extractClosingTimeHint(place.regularOpeningHours);
  const ratingHint =
    typeof place.rating === 'number' && place.rating > 0
      ? Math.round(place.rating * 10) / 10
      : undefined;

  return {
    placeId: place.id || undefined,
    name,
    formattedAddress,
    district,
    location,
    inferredStopType: stopType,
    closeTimeHint,
    ratingHint,
    isOutdoorHint: isOutdoor,
  };
}

function hasEnoughQueryChars(trimmed: string): boolean {
  if (!trimmed) return false;
  // Support 1+ character for CJK languages (e.g., 巴 / 东 / 铁), 2+ for Latin alphabets
  const hasCjk = /[\u3400-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF]/.test(trimmed);
  return hasCjk ? trimmed.length >= 1 : trimmed.length >= 2;
}

function normalizePrimaryTypesForPlacesNew(rawTypes?: string[]): {
  primaryTypes: string[];
  isCitySearch: boolean;
} {
  if (!rawTypes || rawTypes.length === 0) {
    return { primaryTypes: [], isCitySearch: false };
  }
  const isCitySearch = rawTypes.includes('(cities)');
  const expanded: string[] = [];
  for (const t of rawTypes) {
    if (t === '(cities)') {
      // Places API (New) Table A primary types for cities/prefectures/metropolises (e.g. 东京 / 北海道 / 冲绳)
      expanded.push('locality', 'administrative_area_level_1', 'administrative_area_level_2');
    } else if (t && !t.startsWith('(')) {
      expanded.push(t);
    }
  }
  return {
    primaryTypes: Array.from(new Set(expanded)).slice(0, 5),
    isCitySearch,
  };
}

const PlacesSdkInputInner: React.FC<PlaceAutocompleteInputProps> = ({
  value,
  onChange,
  onSelectPlace,
  onKeyDown,
  cityHint,
  includedPrimaryTypes,
  placeholder,
  className,
  leftIcon,
}) => {
  const { i18n } = useTranslation();
  const normLang = normalizeAppLanguage(i18n.language, 'en-US');
  const acCopy = getItineraryUtilsCopy(normLang).autocomplete;
  const placesLangMap: Record<typeof normLang, string> = {
    'zh-CN': 'zh-CN',
    'en-US': 'en-US',
    'en-GB': 'en-GB',
    'es-MX': 'es-419',
    'fr-FR': 'fr',
    'de-DE': 'de',
    'pt-BR': 'pt-BR',
    'ja-JP': 'ja',
  };
  const placesLang = placesLangMap[normLang] || 'en-US';
  const placesLib = useMapsLibrary('places');
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompleteSuggestion[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState<number>(-1);
  const suppressNextFetchRef = useRef(false);
  const isComposingRef = useRef(false);
  const lastCompositionEndRef = useRef(0);

  const typesKey = includedPrimaryTypes?.join(',') ?? '';

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!placesLib) return;
    if (suppressNextFetchRef.current) {
      suppressNextFetchRef.current = false;
      return;
    }

    const trimmed = value.trim();
    // Skip autocomplete if user is typing a multi-city arrow shortcut (e.g. 东京 → 京都)
    if (trimmed.includes('→') || !hasEnoughQueryChars(trimmed)) {
      setSuggestions([]);
      setLookupError(null);
      setDropdownOpen(false);
      return;
    }

    const timer = window.setTimeout(() => {
      const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new AutocompleteSessionToken();
      }

      const { primaryTypes, isCitySearch } = normalizePrimaryTypesForPlacesNew(
        includedPrimaryTypes
      );
      // Never splice cityHint into `input` (e.g. "Tokyo Station 巴黎" → Paris bias).
      // AutocompleteRequest supports locationBias / includedRegionCodes / locationRestriction
      // (@types/google.maps AutocompleteRequest), but cityHint is a display city string — not
      // LatLng / CircleLiteral / CLDR region codes. Do not invent coords or cast `any`.
      // Degrade: typed query only; cityHint remains for the external Maps search link.
      // isCitySearch: preserve prior "no bias" branch. Non-city also has no typed bias source.
      const locationBias: google.maps.places.LocationBias | undefined = isCitySearch
        ? undefined
        : undefined;
      const baseRequest: google.maps.places.AutocompleteRequest = {
        input: trimmed,
        sessionToken: sessionTokenRef.current,
        language: placesLang,
        internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
        ...(locationBias ? { locationBias } : {}),
      };
      const typedRequest: google.maps.places.AutocompleteRequest =
        primaryTypes.length > 0
          ? { ...baseRequest, includedPrimaryTypes: primaryTypes }
          : baseRequest;

      setLoading(true);
      setLookupError(null);
      AutocompleteSuggestion.fetchAutocompleteSuggestions(typedRequest)
        .then(async (res) => {
          let list = Array.isArray(res?.suggestions) ? res.suggestions.slice(0, 6) : [];
          // Retry without primaryType restriction if e.g. "东京" / "海滨" / "富士山" is classified under another Table A type
          if (list.length === 0 && primaryTypes.length > 0) {
            const broadRes = await AutocompleteSuggestion.fetchAutocompleteSuggestions(baseRequest);
            list = Array.isArray(broadRes?.suggestions) ? broadRes.suggestions.slice(0, 6) : [];
          }
          setSuggestions(list);
          setHighlightedIdx(-1);
          setDropdownOpen(list.length > 0);
        })
        .catch(async (err) => {
          if (primaryTypes.length > 0) {
            try {
              const broadRes = await AutocompleteSuggestion.fetchAutocompleteSuggestions(baseRequest);
              const list = Array.isArray(broadRes?.suggestions)
                ? broadRes.suggestions.slice(0, 6)
                : [];
              setSuggestions(list);
              setDropdownOpen(list.length > 0);
              return;
            } catch (retryErr) {
              console.warn('Places broad autocomplete fallback failed:', retryErr);
            }
          }
          console.warn('Places autocomplete suggestion fallback:', err);
          setSuggestions([]);
          setLookupError(acCopy.lookupError);
          setDropdownOpen(true);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 240);

    return () => window.clearTimeout(timer);
  }, [placesLib, value, cityHint, typesKey, includedPrimaryTypes, placesLang, acCopy.lookupError]);

  const handleSelectSuggestion = useCallback(
    async (suggestion: google.maps.places.AutocompleteSuggestion) => {
      const prediction = suggestion.placePrediction;
      if (!prediction) return;

      const fallbackName =
        prediction.mainText?.text || prediction.text?.text || value.trim();
      const fallbackAddress = prediction.secondaryText?.text || '';

      try {
        const place = prediction.toPlace();
        await place.fetchFields({
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'addressComponents',
            'location',
            'primaryType',
            'types',
            'regularOpeningHours',
            'rating',
          ],
        });

        const details = extractPlaceDetails(place, fallbackName, fallbackAddress);
        suppressNextFetchRef.current = true;
        onChange(details.name);
        onSelectPlace?.(details);
      } catch (err) {
        console.warn('Failed to fetch place fields, using prediction text:', err);
        suppressNextFetchRef.current = true;
        onChange(fallbackName);
        onSelectPlace?.({
          name: fallbackName,
          formattedAddress: fallbackAddress,
          district: '',
        });
      } finally {
        // Reset session token after place.fetchFields concludes billing session
        sessionTokenRef.current = null;
        setSuggestions([]);
        setHighlightedIdx(-1);
        setLookupError(null);
        setDropdownOpen(false);
      }
    },
    [onChange, onSelectPlace, value]
  );

  const handleUseTypedName = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || !hasEnoughQueryChars(trimmed)) return;
    // Minimal safe place — never invent placeId / location / rating / types.
    suppressNextFetchRef.current = true;
    onChange(trimmed);
    onSelectPlace?.({
      name: trimmed,
      formattedAddress: '',
      district: '',
    });
    sessionTokenRef.current = null;
    setSuggestions([]);
    setHighlightedIdx(-1);
    setLookupError(null);
    setDropdownOpen(false);
  }, [onChange, onSelectPlace, value]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const isImeEvent =
      isComposingRef.current ||
      e.nativeEvent.isComposing ||
      e.keyCode === 229 ||
      Date.now() - lastCompositionEndRef.current < 80;
    if (isImeEvent) {
      return;
    }

    if (dropdownOpen && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIdx((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIdx((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setDropdownOpen(false);
        setHighlightedIdx(-1);
        return;
      }
      if (e.key === 'Enter' && highlightedIdx >= 0 && highlightedIdx < suggestions.length) {
        e.preventDefault();
        void handleSelectSuggestion(suggestions[highlightedIdx]);
        return;
      }
    }

    onKeyDown?.(e);
  };

  // Viewport-capped width so a narrow flex column (AddStopModal) cannot squeeze the menu,
  // while 390px screens never overflow horizontally.
  const dropdownWidthClass =
    'absolute left-0 z-30 mt-1 min-w-full w-[min(22rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)]';

  return (
    <div ref={containerRef} className="relative overflow-visible">
      <div className="relative">
        {leftIcon}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
            lastCompositionEndRef.current = Date.now();
          }}
          onKeyDown={handleInputKeyDown}
          onFocus={() => {
            setIsFocused(true);
            if (suggestions.length > 0 || lookupError) {
              setDropdownOpen(true);
            }
          }}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={`${className || ''} ${value ? 'pr-8' : ''}`}
        />
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin tk-text-forest absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        ) : value ? (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange('');
              setSuggestions([]);
              setLookupError(null);
              setDropdownOpen(false);
            }}
            title={acCopy.clearInput}
            aria-label={acCopy.clearInput}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full tk-text-ink2 hover:tk-bg-forest-tint hover:tk-text-ink transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {dropdownOpen && suggestions.length > 0 && (
        <ul
          className={`${dropdownWidthClass} rounded-xl border tk-bc-hair tk-bg-card py-1 shadow-lg divide-y tk-divide-hair`}
        >
          {suggestions.map((suggestion, idx) => {
            const pred = suggestion.placePrediction;
            if (!pred) return null;
            const mainLabel = pred.mainText?.text || pred.text?.text || '';
            const subLabel = pred.secondaryText?.text || '';
            return (
              <li key={pred.placeId || idx}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHighlightedIdx(idx)}
                  onClick={() => void handleSelectSuggestion(suggestion)}
                  className={`w-full px-3 py-2 text-left transition-colors flex items-start gap-2 cursor-pointer ${
                    highlightedIdx === idx ? 'tk-bg-forest-tint' : 'hover:tk-bg-forest-tint'
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5 tk-text-forest shrink-0 mt-0.5" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold tk-text-ink truncate">
                      {mainLabel}
                    </span>
                    {subLabel && (
                      <span className="block text-[11px] tk-text-ink2 leading-snug line-clamp-2">
                        {subLabel}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {dropdownOpen && lookupError && isFocused && suggestions.length === 0 && (
        <div
          className={`${dropdownWidthClass} rounded-xl border tk-bc-warning-hair tk-bg-warning-tint px-3 py-2 text-[11px] tk-text-warning shadow-md flex flex-col gap-2`}
        >
          <div className="flex items-start gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 tk-text-warning" />
            <span className="leading-snug">{lookupError}</span>
          </div>
          {hasEnoughQueryChars(value.trim()) ? (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleUseTypedName}
              className="self-start inline-flex flex-col items-start gap-0.5 rounded-lg border tk-bc-hair tk-bg-card px-2.5 py-1.5 text-left cursor-pointer hover:tk-bg-forest-tint"
            >
              <span className="text-[11px] font-semibold tk-text-forest leading-snug">
                {acCopy.useTypedNameBtn}
              </span>
              <span className="text-[10px] tk-text-ink2 leading-snug">
                {acCopy.unverifiedPlaceNote}
              </span>
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
};

export const PlaceAutocompleteInput: React.FC<PlaceAutocompleteInputProps> = (props) => {
  const { i18n } = useTranslation();
  const normLang = normalizeAppLanguage(i18n.language, 'en-US');
  const acCopy = getItineraryUtilsCopy(normLang).autocomplete;
  const apiKey = getConfiguredGoogleMapsApiKey();
  const [fallbackFocused, setFallbackFocused] = useState(false);
  const fallbackComposingRef = useRef(false);
  const fallbackCompEndRef = useRef(0);

  const trimmed = props.value.trim();
  const lookupHref =
    hasEnoughQueryChars(trimmed) && !trimmed.includes('→')
      ? buildGoogleMapsSearchUrl({
          title: trimmed,
          cityHint: props.includedPrimaryTypes?.includes('(cities)') ? undefined : props.cityHint,
        })
      : null;

  return (
    <div className={props.wrapperClassName ? `${props.wrapperClassName} space-y-1` : 'space-y-1'}>
      {apiKey ? (
        <PlacesSdkInputInner {...props} />
      ) : (
        <div className="relative">
          {props.leftIcon}
          <input
            type="text"
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            onCompositionStart={() => {
              fallbackComposingRef.current = true;
            }}
            onCompositionEnd={() => {
              fallbackComposingRef.current = false;
              fallbackCompEndRef.current = Date.now();
            }}
            onKeyDown={(e) => {
              if (
                fallbackComposingRef.current ||
                e.nativeEvent.isComposing ||
                e.keyCode === 229 ||
                Date.now() - fallbackCompEndRef.current < 80
              ) {
                return;
              }
              props.onKeyDown?.(e);
            }}
            onFocus={() => setFallbackFocused(true)}
            onBlur={() => setFallbackFocused(false)}
            placeholder={props.placeholder}
            className={`${props.className || ''} ${props.value ? 'pr-8' : ''}`}
          />
          {props.value ? (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => props.onChange('')}
              title={acCopy.clearInput}
              aria-label={acCopy.clearInput}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full tk-text-ink2 hover:tk-bg-forest-tint hover:tk-text-ink transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      )}

      {!apiKey && fallbackFocused && (
        <div className="px-1 text-[11px] tk-text-ink2 leading-snug">
          {acCopy.missingApiKeyBefore ? `${acCopy.missingApiKeyBefore} ` : ''}
          <code className="font-mono text-[10px] tk-bg-forest-plate px-1 py-0.5 rounded">
            VITE_GOOGLE_MAPS_API_KEY
          </code>{' '}
          {acCopy.missingApiKeyAfter}
        </div>
      )}

      {props.showExternalLookupLink && lookupHref && (
        <div className="flex items-center justify-end px-0.5">
          <a
            href={lookupHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold tk-text-forest hover:underline whitespace-nowrap"
          >
            <ExternalLink className="h-3 w-3" />
            {acCopy.searchOnMaps(trimmed)}
          </a>
        </div>
      )}
    </div>
  );
};
