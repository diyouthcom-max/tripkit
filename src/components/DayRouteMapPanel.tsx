import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  APILoadingStatus,
  Map as GoogleMap,
  AdvancedMarker,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  ExternalLink,
  Footprints,
  TrainFront,
  CarTaxiFront,
  MapPin,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Route as RouteIcon,
  AlertCircle,
  RotateCcw,
  Eye,
  EyeOff,
  Loader2,
  Compass,
  Navigation,
  Copy,
  Check,
  Layers,
  Satellite,
  Crosshair,
  CalendarRange,
  Utensils,
  Landmark,
  BedDouble,
  ShoppingBag,
  Home,
  Hand,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { translateCityName, translateDemoStopTitle, translateRouteTitle } from '../i18n';
import type { AppLanguage, DayStayAnchor, StopType, TimelineNode } from '../types';
import { normalizeAppLanguage } from '../utils/preferencesHelpers';
import type { LiveGooglePlaceInfo } from '../services/googlePlaceLiveStore';
import {
  buildFullDayGoogleMapsRouteUrl,
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsSearchUrl,
  getConfiguredGoogleMapsApiKey,
  resolveDayStopsForMap,
  resolveMultiDayStopsForMap,
  type MapsTravelMode,
  type ResolvedDayStop,
} from '../utils/googleMapsHelpers';
import { getCityForDay, getPrimaryCityName } from '../utils/itineraryHelpers';
import { AccentIconBadge } from '../utils/accentTheme';
import {
  inferSegmentTransportMode,
  resolveNodeGeoCoords,
} from '../utils/geoRouteHelpers';
import {
  Real2DRouteMapCanvas,
  type Real2DHotelStayAnchor,
  type Real2DStopWaypoint,
} from './Real2DRouteMapCanvas';
import { HorizontalChipScroller } from './HorizontalChipScroller';
import { getItineraryMapCopy } from '../i18n/packs/itineraryMapPack';

function usePanelLang() {
  const { i18n } = useTranslation();
  const lang: AppLanguage = normalizeAppLanguage(i18n.language, 'en-US');
  return { lang, copy: getItineraryMapCopy(lang).panel };
}

export interface DayRouteLegsSummary {
  mode: MapsTravelMode;
  source: 'routes_api' | 'fallback';
  legDurationsMin: number[];
  legDistancesKm: number[];
}

interface DayRouteMapPanelProps {
  dayNumber: number;
  cityLabel: string;
  primaryCity: string;
  nodes: TimelineNode[];
  allTimelineNodes?: TimelineNode[];
  cities?: string[];
  cityDays?: number[];
  totalDays?: number;
  previousNodes?: TimelineNode[];
  rainSwapped: boolean;
  rainSwappedDays?: Record<number, boolean>;
  placesByNodeId?: Record<string, LiveGooglePlaceInfo>;
  dayStay?: DayStayAnchor | null;
  onOpenStopDetail?: (nodeId: string) => void;
  onHoldMapAddPlace?: (coords: { lat: number; lng: number }) => void;
  onRequestSetStay?: () => void;
  onRestorePreviousOrder?: () => void;
  onDayRouteLegsChange?: (legs: DayRouteLegsSummary | null) => void;
}

const DAY_ROUTE_COLORS = [
  '#078C88', // D1
  '#D97E4A', // D2
  '#4F6FD8', // D3
  '#7E63B8', // D4
  '#2E9B78', // D5
  '#C88A1E', // D6
  '#C95B5B', // D7
];

function getDayRouteColor(dayNumber?: number): string {
  const idx = Math.max(0, (dayNumber ?? 1) - 1);
  return DAY_ROUTE_COLORS[idx % DAY_ROUTE_COLORS.length];
}

interface GeocodedStop extends ResolvedDayStop {
  position: google.maps.LatLngLiteral;
  previousOrderNumber?: number;
}

interface RouteSummaryInfo {
  distanceKm: string;
  durationMin: number;
  mode: MapsTravelMode;
  source: 'routes_api' | 'fallback';
  legDurationsMin?: number[];
  legDistancesKm?: number[];
}

function formatDuration(totalMinutes: number, lang: AppLanguage = 'zh-CN'): string {
  const safe = Math.max(1, Math.round(totalMinutes));
  const panelCopy = getItineraryMapCopy(lang).panel;
  if (safe < 60) return panelCopy.formatMinsOnly(safe);
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  return mins > 0 ? panelCopy.formatHoursMins(hours, mins) : panelCopy.formatHoursOnly(hours);
}

const TRAVEL_MODE_OPTIONS: Array<{
  id: MapsTravelMode;
  sdkMode: 'WALKING' | 'TRANSIT' | 'DRIVING';
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'walking', sdkMode: 'WALKING', icon: Footprints },
  { id: 'transit', sdkMode: 'TRANSIT', icon: TrainFront },
  { id: 'driving', sdkMode: 'DRIVING', icon: CarTaxiFront },
];

function computeSchematicPoint(
  index: number,
  total: number,
  width: number,
  height: number
): { x: number; y: number } {
  if (total <= 1) {
    return { x: width / 2, y: height / 2 };
  }
  const padX = 56;
  const usableW = Math.max(120, width - padX * 2);
  const t = index / (total - 1);
  const x = padX + t * usableW;
  // Gentle alternating wave to give multi-stop spatial legibility without overlapping labels
  const waveOffsets = [-22, 20, -14, 24, -18, 16];
  const yCenter = height / 2 + 4;
  const y = yCenter + waveOffsets[index % waveOffsets.length];
  return { x: Math.round(x), y: Math.round(y) };
}

/**
 * Loading-state Skeleton Screen matching exact h-72 map viewport geometry (zero layout shift).
 */
const MapRouteSkeleton: React.FC<{
  cityLabel: string;
  scopeLabel: string;
  stopCount: number;
  stageLabel?: string;
}> = ({ cityLabel, scopeLabel, stopCount, stageLabel }) => {
  const { copy } = usePanelLang();
  const placeholderCount = Math.min(Math.max(stopCount, 3), 5);
  const svgW = 640;
  const svgH = 220;
  const pts = Array.from({ length: placeholderCount }, (_, idx) =>
    computeSchematicPoint(idx, placeholderCount, svgW, svgH)
  );
  const polylinePoints = pts.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={copy.skeletonAria(cityLabel)}
      className="absolute inset-0 z-20 h-full w-full bg-[#F2F7F6] overflow-hidden select-none"
    >
      {/* Subtle architectural map grid */}
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full opacity-75"
        aria-hidden="true"
      >
        <defs>
          <pattern id="map-skeleton-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path
              d="M 48 0 L 0 0 0 48"
              fill="none"
              stroke="#DCE8E5"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width={svgW} height={svgH} fill="url(#map-skeleton-grid)" />
        {/* Stylized river / arterial road skeleton bands */}
        <path
          d={`M 0 ${svgH * 0.72} Q ${svgW * 0.35} ${svgH * 0.48}, ${svgW * 0.68} ${svgH * 0.66} T ${svgW} ${svgH * 0.38}`}
          fill="none"
          stroke="#E2EFEA"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="#9CCBC7"
          strokeWidth="3"
          strokeDasharray="7 6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((pt, idx) => (
          <g key={idx}>
            <circle cx={pt.x} cy={pt.y} r="13" fill="#FFFFFF" stroke="#B7DDD9" strokeWidth="2" />
            <circle cx={pt.x} cy={pt.y} r="5" fill="#89C2BD" />
          </g>
        ))}
      </svg>

      {/* Center loading status card */}
      <div className="relative z-10 flex h-full items-center justify-center px-4">
        <div className="rounded-2xl border border-[#DCE8E5] bg-white/95 px-4 py-3 shadow-xs backdrop-blur-xs flex items-center gap-3 max-w-md">
          <Loader2 className="h-4 w-4 animate-spin text-[#078C88] shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-bold text-[#152B29] truncate">
              {stageLabel || copy.skeletonTitle(cityLabel)}
            </div>
            <div className="mt-0.5 text-[11px] text-[#5B7370] font-num tabular-nums truncate">
              {scopeLabel} · {cityLabel}
              {stopCount > 0 ? copy.skeletonStops(stopCount) : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Interactive Static Fallback Card displayed when Google Maps API key is not configured
 * (or if Maps JS SDK cannot load), featuring current city identity, interactive schematic
 * stop inspector, and one-tap cross-platform Google Maps navigation buttons.
 */
const InteractiveStaticRouteFallbackCard: React.FC<{
  dayNumber: number;
  scopeLabel: string;
  cityLabel: string;
  primaryCity: string;
  multiDayMode: boolean;
  stops: ResolvedDayStop[];
  previousStops: ResolvedDayStop[];
  showComparison: boolean;
  travelMode: MapsTravelMode;
  fullDayRouteUrl: string | null;
  getDayCityHint: (day: number) => string;
  fallbackReason?: 'unconfigured' | 'sdk_failed';
}> = ({
  dayNumber,
  scopeLabel,
  cityLabel,
  primaryCity,
  multiDayMode,
  stops,
  previousStops,
  showComparison,
  travelMode,
  fullDayRouteUrl,
  getDayCityHint,
  fallbackReason = 'unconfigured',
}) => {
  const { copy } = usePanelLang();
  const [selectedStopIndex, setSelectedStopIndex] = useState(0);
  const [copiedKey, setCopiedKey] = useState<'route' | 'stop' | null>(null);

  useEffect(() => {
    setSelectedStopIndex(0);
  }, [scopeLabel, stops.length]);

  const safeIndex =
    stops.length > 0 ? Math.min(stops.length - 1, Math.max(0, selectedStopIndex)) : 0;
  const activeStop = stops[safeIndex] || null;
  const prevStopInSequence = safeIndex > 0 ? stops[safeIndex - 1] : null;

  const activeModeLabel = copy.travelModes[travelMode] || copy.travelModes.transit;

  const cityExploreUrl = useMemo(
    () => buildGoogleMapsSearchUrl({ title: primaryCity || cityLabel }),
    [primaryCity, cityLabel]
  );

  const activeStopCityHint = useMemo(() => {
    if (activeStop && multiDayMode && activeStop.dayNumber) {
      return getDayCityHint(activeStop.dayNumber);
    }
    return primaryCity;
  }, [activeStop, multiDayMode, getDayCityHint, primaryCity]);

  const activeStopDirectionsUrl = useMemo(() => {
    if (!activeStop) return cityExploreUrl;
    return buildGoogleMapsDirectionsUrl({
      origin: prevStopInSequence?.query,
      destination: activeStop.query,
      travelMode,
    });
  }, [activeStop, prevStopInSequence, travelMode, cityExploreUrl]);

  const activeStopSearchUrl = useMemo(() => {
    if (!activeStop) return cityExploreUrl;
    return buildGoogleMapsSearchUrl({
      title: activeStop.title,
      address: activeStop.address,
      cityHint: activeStopCityHint,
    });
  }, [activeStop, activeStopCityHint, cityExploreUrl]);

  const handleCopyRouteText = async () => {
    if (stops.length === 0) return;
    const header = `${scopeLabel} · ${cityLabel}（${activeModeLabel}）`;
    const lines = stops.map((s) => {
      const dayPrefix = multiDayMode && s.dayNumber ? `[D${s.dayNumber}] ` : '';
      return `${s.orderNumber}. ${dayPrefix}${s.time} ${s.title} — ${s.address}`;
    });
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText([header, ...lines].join('\n'));
      }
      setCopiedKey('route');
      setTimeout(() => setCopiedKey((prev) => (prev === 'route' ? null : prev)), 1800);
    } catch {
      setCopiedKey('route');
      setTimeout(() => setCopiedKey((prev) => (prev === 'route' ? null : prev)), 1800);
    }
  };

  const handleCopyActiveStopAddress = async () => {
    if (!activeStop) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${activeStop.title} · ${activeStop.address}`);
      }
      setCopiedKey('stop');
      setTimeout(() => setCopiedKey((prev) => (prev === 'stop' ? null : prev)), 1800);
    } catch {
      setCopiedKey('stop');
      setTimeout(() => setCopiedKey((prev) => (prev === 'stop' ? null : prev)), 1800);
    }
  };

  const svgWidth = Math.max(560, stops.length * 105);
  const svgHeight = 168;

  const stopPoints = useMemo(
    () =>
      stops.map((stop, idx) => ({
        stop,
        idx,
        ...computeSchematicPoint(idx, stops.length, svgWidth, svgHeight),
      })),
    [stops, svgWidth]
  );

  const prevStopPoints = useMemo(() => {
    if (!showComparison || previousStops.length < 2 || stops.length < 2) return [];
    const currentPosById: Record<string, { x: number; y: number }> = {};
    stopPoints.forEach((sp) => {
      currentPosById[sp.stop.id] = { x: sp.x, y: sp.y - 14 };
    });
    return previousStops
      .map((ps) => currentPosById[ps.id])
      .filter((pt): pt is { x: number; y: number } => Boolean(pt));
  }, [showComparison, previousStops, stops.length, stopPoints]);

  return (
    <div className="bg-[#F4FAF9] divide-y divide-[#E3EFED]">
      {/* Top City Identity + Quick Navigation Action Bar */}
      <div className="px-4 sm:px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white border border-[#CFE6E3] text-[#078C88]">
            <Compass className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-xs font-bold text-[#078C88]">
                {copy.scopeCity(scopeLabel)}
              </span>
              <span aria-hidden="true" className="text-[#CBDAD7]">
                ·
              </span>
              <h4 className="text-base font-extrabold tracking-tight text-[#152B29] truncate">
                {cityLabel || primaryCity || copy.destinationCity}
              </h4>
              <span aria-hidden="true" className="text-[#CBDAD7]">
                ·
              </span>
              <span className="font-num text-xs text-[#5B7370] tabular-nums">
                {stops.length > 0
                  ? copy.stopsAndMode(stops.length, activeModeLabel)
                  : copy.noStopsToday}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[#5B7370]">
              {fallbackReason === 'sdk_failed'
                ? copy.sdkFailedDesc
                : copy.unconfiguredDesc}
            </p>
          </div>
        </div>

        {/* Primary Quick Navigation Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {fullDayRouteUrl && stops.length >= 2 ? (
            <a
              href={fullDayRouteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#078C88] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#067572] transition-colors whitespace-nowrap shrink-0"
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>
                {multiDayMode
                  ? copy.multiDayRouteBtn(stops.length)
                  : copy.cityFullRouteBtn(primaryCity, stops.length)}
              </span>
            </a>
          ) : activeStop ? (
            <a
              href={activeStopDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#078C88] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#067572] transition-colors whitespace-nowrap shrink-0"
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>
                {copy.directionsToBtn(activeStop.title)}
              </span>
            </a>
          ) : null}

          <a
            href={cityExploreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#C6E6E3] bg-white px-3 py-2 text-xs font-bold text-[#076E6A] hover:border-[#078C88] hover:bg-[#EFF9F8] transition-colors whitespace-nowrap shrink-0"
          >
            <ExternalLink className="h-3.5 w-3.5 text-[#078C88]" />
            <span>
              {copy.exploreCityOnMaps(primaryCity || cityLabel)}
            </span>
          </a>

          {stops.length > 0 && (
            <button
              type="button"
              onClick={handleCopyRouteText}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE8E5] bg-white px-3 py-2 text-xs font-semibold text-[#3B5552] hover:border-[#078C88] hover:text-[#076E6A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedKey === 'route' ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#078C88]" />
                  <span>{copy.copiedRoute}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-[#078C88]" />
                  <span>{copy.copyRoute}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Interactive Schematic Route Canvas */}
      <div className="relative bg-[#EDF6F4] overflow-x-auto">
        {stops.length === 0 ? (
          <div className="h-44 px-4 flex flex-col items-center justify-center text-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-[#C6E6E3] text-[#078C88]">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="text-xs font-bold text-[#152B29]">
              {copy.emptyOverviewTitle(dayNumber, cityLabel)}
            </div>
            <p className="text-xs text-[#5B7370] max-w-md">
              {copy.emptyOverviewDesc}
            </p>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full min-w-[480px] h-44 block"
            role="img"
            aria-label={copy.schematicAria(cityLabel)}
          >
            <defs>
              <pattern
                id="static-fallback-grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="#DCEAE7"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width={svgWidth} height={svgHeight} fill="url(#static-fallback-grid)" />

            {/* Subtle city backdrop contour */}
            <path
              d={`M 0 ${svgHeight - 28} Q ${svgWidth * 0.3} ${svgHeight - 62}, ${svgWidth * 0.62} ${svgHeight - 30} T ${svgWidth} ${svgHeight - 52}`}
              fill="none"
              stroke="#DFECE9"
              strokeWidth="14"
              strokeLinecap="round"
            />

            {/* Optional pre-optimization dashed comparison curve */}
            {prevStopPoints.length >= 2 && (
              <polyline
                points={prevStopPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#D97E4A"
                strokeWidth="2.2"
                strokeDasharray="5 4"
                opacity="0.82"
              />
            )}

            {/* Active stop-to-stop route segments */}
            {stopPoints.map((pt, i) => {
              if (i === 0) return null;
              const prev = stopPoints[i - 1];
              const segColor = multiDayMode
                ? getDayRouteColor(pt.stop.dayNumber)
                : '#078C88';
              return (
                <line
                  key={`seg_${pt.stop.id}`}
                  x1={prev.x}
                  y1={prev.y}
                  x2={pt.x}
                  y2={pt.y}
                  stroke={segColor}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
              );
            })}

            {/* Clickable Stop Pins */}
            {stopPoints.map(({ stop, idx, x, y }) => {
              const isSelected = idx === safeIndex;
              const pinColor = multiDayMode
                ? getDayRouteColor(stop.dayNumber)
                : stop.isVisited
                ? '#5B7370'
                : stop.isAnchor
                ? '#D97E4A'
                : '#078C88';
              const shortTitle =
                stop.title.length > 9 ? `${stop.title.slice(0, 9)}…` : stop.title;
              const labelAbove = idx % 2 === 0;

              return (
                <g
                  key={stop.id}
                  role="button"
                  tabIndex={0}
                  aria-label={copy.inspectStopAria(stop.orderNumber, stop.title)}
                  onClick={() => setSelectedStopIndex(idx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedStopIndex(idx);
                    }
                  }}
                  className="cursor-pointer focus:outline-none"
                >
                  {isSelected && (
                    <circle
                      cx={x}
                      cy={y}
                      r={20}
                      fill={pinColor}
                      opacity={0.18}
                    />
                  )}
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 14 : 11.5}
                    fill={pinColor}
                    stroke="#FFFFFF"
                    strokeWidth={isSelected ? 3 : 2.2}
                  />
                  <text
                    x={x}
                    y={y + 4}
                    textAnchor="middle"
                    fontSize={isSelected ? '11.5' : '10.5'}
                    fontWeight="800"
                    fill="#FFFFFF"
                  >
                    {stop.orderNumber}
                  </text>

                  {/* Unboxed clean caption */}
                  <text
                    x={x}
                    y={labelAbove ? y - 22 : y + 29}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight={isSelected ? '800' : '600'}
                    fill={isSelected ? '#152B29' : '#3B5552'}
                  >
                    {multiDayMode && stop.dayNumber ? `D${stop.dayNumber} ` : ''}
                    {shortTitle}
                  </text>
                  <text
                    x={x}
                    y={labelAbove ? y - 35 : y + 42}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill="#647B78"
                  >
                    {stop.time}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* Interactive Selected Stop Detail & Per-Stop Quick Navigation Bar */}
      {activeStop && (
        <div className="px-4 sm:px-5 py-3 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="inline-flex items-center gap-1 shrink-0">
              <button
                type="button"
                disabled={safeIndex <= 0}
                onClick={() => setSelectedStopIndex((i) => Math.max(0, i - 1))}
                aria-label={copy.previousStopAria}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#DCE8E5] bg-[#F8FAF9] text-[#3B5552] hover:border-[#078C88] disabled:opacity-35 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={safeIndex >= stops.length - 1}
                onClick={() =>
                  setSelectedStopIndex((i) => Math.min(stops.length - 1, i + 1))
                }
                aria-label={copy.nextStopAria}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#DCE8E5] bg-[#F8FAF9] text-[#3B5552] hover:border-[#078C88] disabled:opacity-35 cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-num font-bold text-[#078C88] tabular-nums">
                  {copy.stopFraction(activeStop.orderNumber, stops.length)}
                  {multiDayMode && activeStop.dayNumber ? ` · D${activeStop.dayNumber}` : ''} ·{' '}
                  {activeStop.time}
                </span>
                <strong className="text-sm font-bold text-[#152B29] truncate">
                  {activeStop.title}
                </strong>
                {activeStop.isSwappedIndoor && (
                  <span className="text-[#8E6F12] font-semibold">
                    · {copy.indoorRainBackup}
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[#5B7370] truncate">
                {activeStop.district ? `${activeStop.district} · ` : ''}
                {activeStop.address}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href={activeStopDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-[#EFF9F8] border border-[#BEE5E2] px-2.5 py-1.5 font-bold text-[#076E6A] hover:bg-[#DFF3F1] whitespace-nowrap shrink-0"
            >
              <Navigation className="h-3 w-3 text-[#078C88]" />
              <span>
                {prevStopInSequence
                  ? copy.fromStopDirections(prevStopInSequence.orderNumber)
                  : copy.directionsShort}
              </span>
            </a>

            <a
              href={activeStopSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-[#DCE8E5] bg-white px-2.5 py-1.5 font-semibold text-[#152B29] hover:border-[#078C88] hover:text-[#076E6A] whitespace-nowrap shrink-0"
            >
              <MapPin className="h-3 w-3 text-[#078C88]" />
              <span>{copy.findPin}</span>
            </a>

            <button
              type="button"
              onClick={handleCopyActiveStopAddress}
              className="inline-flex items-center gap-1 rounded-lg border border-[#DCE8E5] bg-white px-2.5 py-1.5 font-semibold text-[#4F6865] hover:border-[#078C88] hover:text-[#076E6A] whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedKey === 'stop' ? (
                <>
                  <Check className="h-3 w-3 text-[#078C88]" />
                  <span>{copy.copiedShort}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 text-[#078C88]" />
                  <span>{copy.copyAddress}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const StopAdvancedMarker: React.FC<{
  stop: GeocodedStop;
  multiDayMode: boolean;
  isSelected: boolean;
  stopType?: StopType;
  thumbPhotoUri?: string;
  compact?: boolean;
  onSelect: () => void;
  onOpenDetail?: () => void;
}> = ({
  stop,
  multiDayMode,
  isSelected,
  stopType,
  thumbPhotoUri,
  compact = false,
  onSelect,
  onOpenDetail,
}) => {
  const { lang, copy } = usePanelLang();
  const [imgFailed, setImgFailed] = useState(false);

  const badgeColor = multiDayMode
    ? getDayRouteColor(stop.dayNumber)
    : stop.isVisited
    ? '#647B78'
    : '#F59E0B';

  const displayTitle = translateDemoStopTitle(stop.title, lang);
  const CategoryIcon =
    stopType === 'dining'
      ? Utensils
      : stopType === 'hotel'
      ? BedDouble
      : stopType === 'shopping'
      ? ShoppingBag
      : stopType === 'transit'
      ? TrainFront
      : Landmark;

  const categoryBoxClass =
    stopType === 'dining'
      ? 'bg-[#FFF4E6] text-[#D97706]'
      : stopType === 'hotel'
      ? 'bg-[#EEF2FF] text-[#4F46E5]'
      : stopType === 'shopping'
      ? 'bg-[#FFF1F2] text-[#E11D48]'
      : stopType === 'transit'
      ? 'bg-[#F0F9FF] text-[#0284C7]'
      : 'bg-[#EAF8F6] text-[#078C88]';

  const handleCardClick = () => {
    if (isSelected && onOpenDetail) {
      onOpenDetail();
      return;
    }
    onSelect();
  };

  return (
    <AdvancedMarker
      position={stop.position}
      zIndex={isSelected ? 90 : Math.max(10, 60 - stop.orderNumber)}
      title={
        multiDayMode && stop.dayNumber
          ? `D${stop.dayNumber} · ${stop.orderNumber}. ${displayTitle}`
          : `${stop.orderNumber}. ${displayTitle}`
      }
      onClick={handleCardClick}
    >
      {compact ? (
        <div className="flex flex-col items-center cursor-pointer select-none">
          <div
            className={`inline-flex items-center gap-1.5 rounded-full bg-white pl-1 pr-2.5 py-0.5 shadow-[0_6px_16px_rgba(15,34,39,0.14)] border ${
              isSelected ? 'border-[#078C88] ring-2 ring-[#078C88]/20' : 'border-[#DCE8E5]'
            }`}
          >
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full font-num text-[10.5px] font-extrabold text-white shrink-0"
              style={{ backgroundColor: badgeColor }}
            >
              {stop.orderNumber}
            </span>
            <span className="max-w-[128px] truncate text-[11.5px] font-extrabold text-[#152B29]">
              {multiDayMode && stop.dayNumber ? `D${stop.dayNumber} · ` : ''}
              {displayTitle}
            </span>
          </div>
          <div
            className={`h-0 w-0 border-x-[5px] border-x-transparent border-t-[6px] -mt-px ${
              isSelected ? 'border-t-[#078C88]' : 'border-t-white'
            }`}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center pt-1 cursor-pointer select-none">
          <div
            className={`relative flex w-[208px] items-center gap-2 rounded-2xl bg-white p-1.5 pr-2 shadow-[0_8px_22px_rgba(15,34,39,0.15)] border ${
              isSelected ? 'border-[#078C88] ring-2 ring-[#078C88]/25' : 'border-[#DCE8E5]'
            }`}
          >
            <span
              className="absolute -top-2 -left-1.5 flex h-5.5 min-w-5.5 items-center justify-center rounded-full border-2 border-white px-1 font-num text-[11px] font-extrabold text-white shadow-xs"
              style={{ backgroundColor: badgeColor }}
            >
              {stop.orderNumber}
            </span>

            {thumbPhotoUri && !imgFailed ? (
              <img
                src={thumbPhotoUri}
                alt=""
                onError={() => setImgFailed(true)}
                className="h-9.5 w-9.5 rounded-[10px] object-cover shrink-0 bg-[#F2F7F6]"
              />
            ) : (
              <div
                className={`flex h-9.5 w-9.5 items-center justify-center rounded-[10px] shrink-0 ${categoryBoxClass}`}
              >
                <CategoryIcon className="h-4.5 w-4.5" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-extrabold leading-tight text-[#152B29]">
                {multiDayMode && stop.dayNumber ? `D${stop.dayNumber} · ` : ''}
                {displayTitle}
              </div>
              <div className="mt-0.5 truncate text-[10.5px] font-medium leading-tight text-[#647B78]">
                {stop.address || stop.district}
              </div>
            </div>

            {onOpenDetail ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDetail();
                }}
                title={copy.viewStopDetails}
                className="flex h-6 w-5 items-center justify-center text-[#8CA39F] hover:text-[#078C88] shrink-0 cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <div
            className={`h-0 w-0 border-x-[6px] border-x-transparent border-t-[7px] -mt-px ${
              isSelected ? 'border-t-[#078C88]' : 'border-t-white'
            }`}
          />
        </div>
      )}
    </AdvancedMarker>
  );
};

function computeHaversineKm(
  a: google.maps.LatLngLiteral,
  b: google.maps.LatLngLiteral
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

const EmbeddedDayRouteCanvas: React.FC<{
  viewKey: string;
  multiDayMode: boolean;
  stops: ResolvedDayStop[];
  previousStops: ResolvedDayStop[];
  showComparison: boolean;
  fitTrigger: number;
  travelMode: MapsTravelMode;
  onRouteSummaryChange: (summary: RouteSummaryInfo | null) => void;
  onResolvingStopsChange: (resolving: boolean, resolvedCount: number) => void;
  onComparisonMetricsChange: (
    metrics: { beforeKm: number; afterKm: number } | null
  ) => void;
  onRouteNoticeChange: (notice: string | null) => void;
  onLiveCoordsResolved?: (coords: Record<string, { lat: number; lng: number }>) => void;
  stopMetaById: Record<string, { stopType?: StopType; thumbPhotoUri?: string }>;
  dayStayAnchor?: Real2DHotelStayAnchor | null;
  onOpenStopDetail?: (nodeId: string) => void;
  onHoldMapAddPlace?: (coords: { lat: number; lng: number }) => void;
  onRequestSetStay?: () => void;
}> = ({
  viewKey,
  multiDayMode,
  stops,
  previousStops,
  showComparison,
  fitTrigger,
  travelMode,
  onRouteSummaryChange,
  onResolvingStopsChange,
  onComparisonMetricsChange,
  onRouteNoticeChange,
  onLiveCoordsResolved,
  stopMetaById,
  dayStayAnchor = null,
  onOpenStopDetail,
  onHoldMapAddPlace,
  onRequestSetStay,
}) => {
  const { copy } = usePanelLang();
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');

  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const beforePolylineRef = useRef<google.maps.Polyline | null>(null);
  const coordCacheRef = useRef<Record<string, google.maps.LatLngLiteral>>({});
  const routeViewportRef = useRef<google.maps.LatLngBounds | null>(null);

  const [geocodedStops, setGeocodedStops] = useState<GeocodedStop[]>([]);
  const [geocodedPrevStops, setGeocodedPrevStops] = useState<GeocodedStop[]>([]);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  const fitBoundsToDayStops = useCallback(
    (
      resolvedStops: GeocodedStop[],
      prevStops: GeocodedStop[],
      includeComparison: boolean,
      routeViewport?: google.maps.LatLngBounds | null
    ) => {
      if (!map || resolvedStops.length === 0) return;

      const hasExtraPoints = includeComparison && prevStops.length > 0;
      if (resolvedStops.length === 1 && !hasExtraPoints && !routeViewport) {
        map.panTo(resolvedStops[0].position);
        map.setZoom(15);
        return;
      }

      const bounds = new google.maps.LatLngBounds();
      resolvedStops.forEach((s) => bounds.extend(s.position));
      if (hasExtraPoints) {
        prevStops.forEach((s) => bounds.extend(s.position));
      }
      if (routeViewport) {
        bounds.union(routeViewport);
      }

      map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
      google.maps.event.addListenerOnce(map, 'idle', () => {
        const z = map.getZoom();
        if (typeof z === 'number' && z > 16) {
          map.setZoom(16);
        }
      });
    },
    [map]
  );

  // Reset active marker popup and stale route viewport on day/mode change
  useEffect(() => {
    setSelectedStopId(null);
    routeViewportRef.current = null;
  }, [viewKey]);

  // Resolve stop coordinates via Places API (New) Place.searchByText with plain Record cache
  useEffect(() => {
    let cancelled = false;
    if (stops.length === 0) {
      setGeocodedStops([]);
      setGeocodedPrevStops([]);
      onResolvingStopsChange(false, 0);
      return;
    }

    if (!placesLib) {
      onResolvingStopsChange(true, 0);
      return;
    }

    const prevOrderById: Record<string, number> = {};
    previousStops.forEach((ps) => {
      prevOrderById[ps.id] = ps.orderNumber;
    });

    const allCached = stops.every((s) => Boolean(coordCacheRef.current[s.query]));
    if (!allCached) {
      onResolvingStopsChange(true, 0);
    }

    const lookupStopPosition = async (
      stop: ResolvedDayStop
    ): Promise<google.maps.LatLngLiteral | null> => {
      const cached = coordCacheRef.current[stop.query];
      if (cached) return cached;
      const { places } = await placesLib.Place.searchByText({
        textQuery: stop.query,
        fields: ['location', 'displayName'],
        maxResultCount: 1,
        internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
      });
      const loc = places?.[0]?.location;
      if (!loc) return null;
      const coords = { lat: loc.lat(), lng: loc.lng() };
      coordCacheRef.current[stop.query] = coords;
      return coords;
    };

    const resolvePositions = async () => {
      const resolved: GeocodedStop[] = [];
      let hadLookupFailure = false;
      for (const stop of stops) {
        if (cancelled) return;
        try {
          const pos = await lookupStopPosition(stop);
          if (pos) {
            resolved.push({
              ...stop,
              position: pos,
              previousOrderNumber: prevOrderById[stop.id],
            });
          }
        } catch (err) {
          hadLookupFailure = true;
          console.warn('Place.searchByText fallback for stop:', stop.query, err);
        }
      }

      const resolvedPrev: GeocodedStop[] = [];
      for (const ps of previousStops) {
        if (cancelled) return;
        try {
          const pos = await lookupStopPosition(ps);
          if (pos) {
            resolvedPrev.push({
              ...ps,
              position: pos,
            });
          }
        } catch {
          // Ignore secondary lookup miss for historical baseline
        }
      }

      if (!cancelled) {
        routeViewportRef.current = null;
        setGeocodedStops(resolved);
        setGeocodedPrevStops(resolvedPrev);
        if (onLiveCoordsResolved && resolved.length > 0) {
          onLiveCoordsResolved({ ...coordCacheRef.current });
        }
        onResolvingStopsChange(false, resolved.length);
        if (resolved.length === 0 && hadLookupFailure) {
          onRouteNoticeChange(copy.placesErrorNotice);
        } else {
          onRouteNoticeChange(null);
        }
      }
    };

    void resolvePositions();
    return () => {
      cancelled = true;
    };
  }, [placesLib, viewKey, stops, previousStops, onRouteNoticeChange, onResolvingStopsChange, onLiveCoordsResolved, copy.placesErrorNotice]);

  // Auto-fit map viewport whenever switching days, toggling multi-day preview, or updating stops
  useEffect(() => {
    if (geocodedStops.length === 0) return;
    fitBoundsToDayStops(
      geocodedStops,
      geocodedPrevStops,
      showComparison,
      routeViewportRef.current
    );
  }, [
    viewKey,
    geocodedStops,
    geocodedPrevStops,
    showComparison,
    fitBoundsToDayStops,
  ]);

  // Manual one-click "适配当日全览" trigger
  useEffect(() => {
    if (fitTrigger <= 0 || geocodedStops.length === 0) return;
    fitBoundsToDayStops(
      geocodedStops,
      geocodedPrevStops,
      showComparison,
      routeViewportRef.current
    );
  }, [
    fitTrigger,
    geocodedStops,
    geocodedPrevStops,
    showComparison,
    fitBoundsToDayStops,
  ]);

  // Draw optional "Before Optimization" comparison dashed polyline + compute straight-line savings
  useEffect(() => {
    if (beforePolylineRef.current) {
      beforePolylineRef.current.setMap(null);
      beforePolylineRef.current = null;
    }

    if (
      !map ||
      !showComparison ||
      geocodedPrevStops.length < 2 ||
      geocodedStops.length < 2
    ) {
      onComparisonMetricsChange(null);
      return;
    }

    const computePathKm = (pts: GeocodedStop[]) => {
      let total = 0;
      for (let i = 1; i < pts.length; i += 1) {
        total += computeHaversineKm(pts[i - 1].position, pts[i].position);
      }
      return total;
    };

    const beforeKm = computePathKm(geocodedPrevStops);
    const afterKm = computePathKm(geocodedStops);
    onComparisonMetricsChange({ beforeKm, afterKm });

    const beforeLine = new google.maps.Polyline({
      path: geocodedPrevStops.map((s) => s.position),
      geodesic: true,
      strokeColor: '#D97E4A',
      strokeOpacity: 0,
      strokeWeight: 3,
      zIndex: 1,
      icons: [
        {
          icon: {
            path: 'M 0,-1 0,1',
            strokeColor: '#D97E4A',
            strokeOpacity: 0.78,
            scale: 3,
          },
          offset: '0',
          repeat: '12px',
        },
      ],
      map,
    });
    beforePolylineRef.current = beforeLine;

    return () => {
      if (beforePolylineRef.current) {
        beforePolylineRef.current.setMap(null);
        beforePolylineRef.current = null;
      }
    };
  }, [map, showComparison, geocodedPrevStops, geocodedStops, onComparisonMetricsChange]);

  // Compute & render current route polyline via modern Routes API (Route.computeRoutes)
  useEffect(() => {
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    onRouteSummaryChange(null);

    if (!map || geocodedStops.length < 2) {
      return;
    }

    const drawSequentialFallbackLine = (notice: string | null) => {
      const path = geocodedStops.map((s) => s.position);
      const fallbackLine = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#078C88',
        strokeOpacity: 0,
        strokeWeight: 3,
        icons: [
          {
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: 0.75,
              scale: 3,
            },
            offset: '0',
            repeat: '14px',
          },
        ],
        map,
      });
      polylinesRef.current = [fallbackLine];

      let approxKm = 0;
      const legDurationsMin: number[] = [];
      const legDistancesKm: number[] = [];
      for (let i = 1; i < path.length; i += 1) {
        const legKm = Math.max(0.2, computeHaversineKm(path[i - 1], path[i]) * 1.25);
        approxKm += legKm;
        legDistancesKm.push(Number(legKm.toFixed(1)));
        const legSpeedKmH =
          travelMode === 'walking' || (travelMode === 'transit' && legKm <= 1.3)
            ? 4.5
            : travelMode === 'transit'
            ? 20
            : 26;
        legDurationsMin.push(
          Math.max(
            2,
            Math.round(
              (legKm / legSpeedKmH) * 60 +
                (travelMode === 'transit' && legKm > 1.3 ? 4 : 0)
            )
          )
        );
      }
      if (approxKm > 0) {
        const totalDur = legDurationsMin.reduce((acc, n) => acc + n, 0);
        onRouteSummaryChange({
          distanceKm: approxKm.toFixed(1),
          durationMin: Math.max(3, totalDur),
          mode: travelMode,
          source: 'fallback',
          legDurationsMin,
          legDistancesKm,
        });
      }
      onRouteNoticeChange(notice);
    };

    if (!routesLib || geocodedStops.length > 27) {
      drawSequentialFallbackLine(
        geocodedStops.length > 27 ? copy.over27StopsNotice : null
      );
      return () => {
        polylinesRef.current.forEach((p) => p.setMap(null));
        polylinesRef.current = [];
      };
    }

    let cancelled = false;
    const modeSpec =
      TRAVEL_MODE_OPTIONS.find((m) => m.id === travelMode) || TRAVEL_MODE_OPTIONS[0];
    // Routes API supports intermediate waypoints on WALKING & DRIVING; fallback to WALKING polyline when >2 stops in TRANSIT
    const effectiveSdkMode =
      modeSpec.sdkMode === 'TRANSIT' && geocodedStops.length > 2 ? 'WALKING' : modeSpec.sdkMode;

    const computeForMode = (mode: 'WALKING' | 'TRANSIT' | 'DRIVING') => {
      const sdkTravelMode =
        (routesLib.TravelMode && routesLib.TravelMode[mode]) ||
        (mode as google.maps.TravelMode);

      const request: google.maps.routes.ComputeRoutesRequest = {
        origin: geocodedStops[0].position,
        destination: geocodedStops[geocodedStops.length - 1].position,
        travelMode: sdkTravelMode,
        fields: ['path', 'legs', 'distanceMeters', 'durationMillis', 'viewport'],
        internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
      };
      if (geocodedStops.length > 2) {
        request.intermediates = geocodedStops.slice(1, -1).map((s) => ({ location: s.position }));
      }
      return routesLib.Route.computeRoutes(request);
    };

    (async () => {
      try {
        let res = await computeForMode(effectiveSdkMode);
        if (
          !cancelled &&
          (!res?.routes || res.routes.length === 0) &&
          effectiveSdkMode === 'TRANSIT'
        ) {
          res = await computeForMode('WALKING');
        }
        if (cancelled) return;
        const routes = res?.routes;
        if (!routes || routes.length === 0) {
          drawSequentialFallbackLine(copy.noStreetRouteNotice);
          return;
        }
        onRouteNoticeChange(null);
        const primaryRoute = routes[0];
        const created = primaryRoute.createPolylines();
        created.forEach((pl) => {
          pl.setOptions({
            strokeColor: '#EAB308',
            strokeOpacity: 0.95,
            strokeWeight: 4.5,
            zIndex: 2,
          });
          pl.setMap(map);
        });
        polylinesRef.current = created;

        routeViewportRef.current = primaryRoute.viewport ?? null;
        fitBoundsToDayStops(
          geocodedStops,
          geocodedPrevStops,
          showComparison,
          routeViewportRef.current
        );

        const legDistancesKm = Array.isArray(primaryRoute.legs)
          ? primaryRoute.legs.map((leg, legIdx) => {
              const legMeters = (leg as { distanceMeters?: number }).distanceMeters ?? 0;
              if (legMeters > 0) {
                return Number(Math.max(0.1, legMeters / 1000).toFixed(1));
              }
              if (geocodedStops[legIdx] && geocodedStops[legIdx + 1]) {
                return Number(
                  Math.max(
                    0.2,
                    computeHaversineKm(
                      geocodedStops[legIdx].position,
                      geocodedStops[legIdx + 1].position
                    ) * 1.25
                  ).toFixed(1)
                );
              }
              return 0.8;
            })
          : undefined;
        const legDurationsMin = Array.isArray(primaryRoute.legs)
          ? primaryRoute.legs.map((leg, legIdx) => {
              const legMs = (leg as { durationMillis?: number }).durationMillis ?? 0;
              const legKm = legDistancesKm?.[legIdx] ?? 0;
              if (
                travelMode === 'transit' &&
                effectiveSdkMode === 'WALKING' &&
                legKm > 1.4
              ) {
                return Math.max(6, Math.round((legKm / 20) * 60 + 4));
              }
              return Math.max(1, Math.round(legMs / 60000));
            })
          : undefined;
        const distMeters = primaryRoute.distanceMeters ?? 0;
        const durMs = primaryRoute.durationMillis ?? 0;
        if (distMeters > 0 || durMs > 0) {
          const computedDurMin =
            legDurationsMin && legDurationsMin.length > 0
              ? legDurationsMin.reduce((acc, n) => acc + n, 0)
              : Math.max(1, Math.round(durMs / 60000));
          onRouteSummaryChange({
            distanceKm: (distMeters / 1000).toFixed(1),
            durationMin: computedDurMin,
            mode: travelMode,
            source: 'routes_api',
            legDurationsMin,
            legDistancesKm,
          });
        }
      } catch (err) {
        if (cancelled) return;
        console.warn('Routes API unavailable, switching to sequential stop line:', err);
        drawSequentialFallbackLine(copy.routesUnavailableNotice);
      }
    })();

    return () => {
      cancelled = true;
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [
    routesLib,
    map,
    geocodedStops,
    geocodedPrevStops,
    showComparison,
    fitBoundsToDayStops,
    travelMode,
    copy.over27StopsNotice,
    copy.noStreetRouteNotice,
    copy.routesUnavailableNotice,
    onRouteSummaryChange,
    onRouteNoticeChange,
  ]);

  // Tap blank map canvas to collapse any expanded stop card back to a compact capsule
  useEffect(() => {
    if (!map) return;
    const clickListener = map.addListener('click', () => {
      setSelectedStopId(null);
    });
    return () => {
      clickListener.remove();
    };
  }, [map]);

  // Right-click anywhere on Google Map to add a place
  useEffect(() => {
    if (!map || !onHoldMapAddPlace) return;
    const listener = map.addListener(
      'contextmenu',
      (ev: google.maps.MapMouseEvent) => {
        if (!ev.latLng) return;
        onHoldMapAddPlace({
          lat: Number(ev.latLng.lat().toFixed(6)),
          lng: Number(ev.latLng.lng().toFixed(6)),
        });
      }
    );
    return () => {
      listener.remove();
    };
  }, [map, onHoldMapAddPlace]);

  return (
    <>
      {!multiDayMode && dayStayAnchor && (
        <AdvancedMarker
          position={{ lat: dayStayAnchor.lat, lng: dayStayAnchor.lng }}
          zIndex={25}
          title={dayStayAnchor.placeName}
          onClick={() => onRequestSetStay?.()}
        >
          <div className="flex flex-col items-center cursor-pointer select-none">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/90 bg-[#1E293B] pl-1 pr-2.5 py-0.5 text-white shadow-[0_6px_16px_rgba(15,34,39,0.2)]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#4F46E5] shrink-0">
                <Home className="h-3 w-3 text-white" />
              </span>
              <span className="max-w-[116px] truncate text-[11px] font-extrabold">
                {dayStayAnchor.placeName}
              </span>
            </div>
            <div className="h-0 w-0 border-x-[5px] border-x-transparent border-t-[6px] border-t-[#1E293B] -mt-px" />
          </div>
        </AdvancedMarker>
      )}

      {geocodedStops.map((stop) => {
        const meta = stopMetaById[stop.id];
        const isSelected = selectedStopId === stop.id;
        return (
          <StopAdvancedMarker
            key={stop.id}
            stop={stop}
            multiDayMode={multiDayMode}
            isSelected={isSelected}
            stopType={meta?.stopType}
            thumbPhotoUri={meta?.thumbPhotoUri}
            compact={!isSelected}
            onSelect={() => setSelectedStopId(stop.id)}
            onOpenDetail={
              onOpenStopDetail ? () => onOpenStopDetail(stop.id) : undefined
            }
          />
        );
      })}
    </>
  );
};

/**
 * Mounted ONLY when Google Maps API key is configured (inside <APIProvider>).
 * Manages `loading` state via `useApiLoadingStatus()`, map tile readiness, and Places stop geocoding,
 * displaying `MapRouteSkeleton` while loading and automatically degrading to `Real2DRouteMapCanvas`
 * if the SDK fails to authenticate or load.
 */
const ConfiguredInteractiveMapViewport: React.FC<{
  dayNumber: number;
  scopeLabel: string;
  cityLabel: string;
  primaryCity: string;
  viewKey: string;
  multiDayMode: boolean;
  canMultiDayPreview: boolean;
  stops: ResolvedDayStop[];
  previousStops: ResolvedDayStop[];
  showComparison: boolean;
  fitTrigger: number;
  travelMode: MapsTravelMode;
  routeNotice: string | null;
  fullDayRouteUrl: string | null;
  getDayCityHint: (day: number) => string;
  onTriggerFit: () => void;
  onToggleMultiDayPreview: () => void;
  onRouteSummaryChange: (summary: RouteSummaryInfo | null) => void;
  onComparisonMetricsChange: (
    metrics: { beforeKm: number; afterKm: number } | null
  ) => void;
  onRouteNoticeChange: (notice: string | null) => void;
  onLiveCoordsResolved?: (coords: Record<string, { lat: number; lng: number }>) => void;
  fallbackWaypoints: Real2DStopWaypoint[];
  fallbackPrevWaypoints: Real2DStopWaypoint[];
  stopMetaById: Record<string, { stopType?: StopType; thumbPhotoUri?: string }>;
  dayStayAnchor?: Real2DHotelStayAnchor | null;
  onOpenStopDetail?: (nodeId: string) => void;
  onHoldMapAddPlace?: (coords: { lat: number; lng: number }) => void;
  onRequestSetStay?: () => void;
}> = ({
  dayNumber,
  scopeLabel,
  cityLabel,
  primaryCity,
  viewKey,
  multiDayMode,
  canMultiDayPreview,
  stops,
  previousStops,
  showComparison,
  fitTrigger,
  travelMode,
  routeNotice,
  fullDayRouteUrl,
  getDayCityHint,
  onTriggerFit,
  onToggleMultiDayPreview,
  onRouteSummaryChange,
  onComparisonMetricsChange,
  onRouteNoticeChange,
  onLiveCoordsResolved,
  fallbackWaypoints,
  fallbackPrevWaypoints,
  stopMetaById,
  dayStayAnchor = null,
  onOpenStopDetail,
  onHoldMapAddPlace,
  onRequestSetStay,
}) => {
  const { lang, copy } = usePanelLang();
  const apiLoadingStatus = useApiLoadingStatus();
  const [tilesReady, setTilesReady] = useState(false);
  const [isResolvingStops, setIsResolvingStops] = useState(stops.length > 0);
  const [resolvedStopsCount, setResolvedStopsCount] = useState(0);
  const [mapStyle, setMapStyle] = useState<'roadmap' | 'satellite'>('roadmap');
  const [holdHintDismissed, setHoldHintDismissed] = useState(false);

  // Auto-fade hold/right-click hint after 3.2s so the canvas remains completely clean
  useEffect(() => {
    if (holdHintDismissed || !onHoldMapAddPlace) return;
    const timer = window.setTimeout(() => {
      setHoldHintDismissed(true);
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [holdHintDismissed, onHoldMapAddPlace]);

  // Headless / WebGL-throttled safety timer so skeleton never blocks forever once API is LOADED
  useEffect(() => {
    if (apiLoadingStatus !== APILoadingStatus.LOADED || tilesReady) return;
    const timer = window.setTimeout(() => {
      setTilesReady(true);
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [apiLoadingStatus, tilesReady]);

  const handleResolvingStopsChange = useCallback((resolving: boolean, count: number) => {
    setIsResolvingStops(resolving);
    setResolvedStopsCount(count);
  }, []);

  const sdkFailed =
    apiLoadingStatus === APILoadingStatus.FAILED ||
    apiLoadingStatus === APILoadingStatus.AUTH_FAILURE;

  if (sdkFailed) {
    return (
      <Real2DRouteMapCanvas
        waypoints={fallbackWaypoints}
        previousWaypoints={fallbackPrevWaypoints}
        showComparison={showComparison}
        scopeLabel={scopeLabel}
        cityLabel={cityLabel}
        multiDayMode={multiDayMode}
        canMultiDayPreview={canMultiDayPreview}
        onToggleMultiDayPreview={onToggleMultiDayPreview}
        lang={lang}
        dayStayAnchor={dayStayAnchor}
        fullDayRouteUrl={fullDayRouteUrl}
        onOpenStopDetail={onOpenStopDetail}
        onHoldMapAddPlace={onHoldMapAddPlace}
        onRequestSetStay={onRequestSetStay}
        hideInlineStopStrip
      />
    );
  }

  if (stops.length === 0) {
    return (
      <InteractiveStaticRouteFallbackCard
        dayNumber={dayNumber}
        scopeLabel={scopeLabel}
        cityLabel={cityLabel}
        primaryCity={primaryCity}
        multiDayMode={multiDayMode}
        stops={stops}
        previousStops={previousStops}
        showComparison={showComparison}
        travelMode={travelMode}
        fullDayRouteUrl={fullDayRouteUrl}
        getDayCityHint={getDayCityHint}
        fallbackReason="unconfigured"
      />
    );
  }

  const isSdkOrTilesLoading =
    apiLoadingStatus === APILoadingStatus.LOADING ||
    apiLoadingStatus === APILoadingStatus.NOT_LOADED ||
    !tilesReady;
  const loading = isSdkOrTilesLoading || (isResolvingStops && resolvedStopsCount === 0);

  const loadingStageLabel = isSdkOrTilesLoading
    ? copy.loadingTilesStage(cityLabel)
    : copy.loadingStopsStage(stops.length, scopeLabel, cityLabel);

  return (
    <div className="bg-[#F2F7F6]">
      <div className="relative h-80 sm:h-96 w-full">
        {loading && (
          <MapRouteSkeleton
            cityLabel={cityLabel}
            scopeLabel={scopeLabel}
            stopCount={stops.length}
            stageLabel={loadingStageLabel}
          />
        )}

        <GoogleMap
          mapId="DEMO_MAP_ID"
          defaultCenter={{ lat: 48.8566, lng: 2.3522 }}
          defaultZoom={12}
          tilt={0}
          heading={0}
          disableDefaultUI
          clickableIcons={false}
          mapTypeId={mapStyle === 'satellite' ? 'hybrid' : 'roadmap'}
          gestureHandling="cooperative"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          onTilesLoaded={() => setTilesReady(true)}
          onIdle={() => setTilesReady(true)}
          className="h-full w-full"
        >
          <EmbeddedDayRouteCanvas
            viewKey={viewKey}
            multiDayMode={multiDayMode}
            stops={stops}
            previousStops={previousStops}
            showComparison={showComparison}
            fitTrigger={fitTrigger}
            travelMode={travelMode}
            onRouteSummaryChange={onRouteSummaryChange}
            onResolvingStopsChange={handleResolvingStopsChange}
            onComparisonMetricsChange={onComparisonMetricsChange}
            onRouteNoticeChange={onRouteNoticeChange}
            onLiveCoordsResolved={onLiveCoordsResolved}
            stopMetaById={stopMetaById}
            dayStayAnchor={dayStayAnchor}
            onOpenStopDetail={onOpenStopDetail}
            onHoldMapAddPlace={onHoldMapAddPlace}
            onRequestSetStay={onRequestSetStay}
          />
        </GoogleMap>

        {/* Top-Left Auto-Fading Right-Click Hint (vanishes after 3.2s) */}
        {!loading && onHoldMapAddPlace && !holdHintDismissed && (
          <div className="absolute top-3 left-3 z-10 max-w-[calc(100%-76px)]">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#DCE8E5] bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-[#152B29] shadow-sm">
              <Hand className="h-3.5 w-3.5 text-[#078C88] shrink-0" />
              <span className="truncate">
                {copy.rightClickHint}
              </span>
              <button
                type="button"
                onClick={() => setHoldHintDismissed(true)}
                className="text-[#647B78] hover:text-[#152B29] cursor-pointer"
                aria-label={copy.dismissTip}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* Minimalist Packy-Style Right-Side 3 Circular Pure-Icon Stack */}
        {!loading && (
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
            <button
              type="button"
              onClick={onTriggerFit}
              title={copy.fitAllTitle}
              aria-label={copy.fitAllAria}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2ECEA] bg-white/96 text-[#152B29] shadow-[0_4px_14px_rgba(15,34,39,0.1)] hover:border-[#078C88] hover:text-[#078C88] transition-colors cursor-pointer"
            >
              <Crosshair className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() =>
                setMapStyle((s) => (s === 'satellite' ? 'roadmap' : 'satellite'))
              }
              title={
                mapStyle === 'satellite'
                  ? copy.switchTo2dStreet
                  : copy.switchTo2dSatellite
              }
              aria-label={
                mapStyle === 'satellite'
                  ? copy.streetMapAria
                  : copy.satelliteMapAria
              }
              className={`flex h-10 w-10 items-center justify-center rounded-full border shadow-[0_4px_14px_rgba(15,34,39,0.1)] transition-colors cursor-pointer ${
                mapStyle === 'satellite'
                  ? 'border-[#078C88] bg-[#078C88] text-white'
                  : 'border-[#E2ECEA] bg-white/96 text-[#152B29] hover:border-[#078C88] hover:text-[#078C88]'
              }`}
            >
              {mapStyle === 'satellite' ? (
                <Layers className="h-4 w-4" />
              ) : (
                <Satellite className="h-4 w-4" />
              )}
            </button>

            {canMultiDayPreview && (
              <button
                type="button"
                onClick={onToggleMultiDayPreview}
                title={
                  multiDayMode
                    ? copy.exitMultiDayPreview
                    : copy.showMultiDayPreview
                }
                aria-label={copy.toggleMultiDayAria}
                className={`flex h-10 w-10 items-center justify-center rounded-full border shadow-[0_4px_14px_rgba(15,34,39,0.1)] transition-colors cursor-pointer ${
                  multiDayMode
                    ? 'border-[#078C88] bg-[#078C88] text-white'
                    : 'border-[#E2ECEA] bg-white/96 text-[#152B29] hover:border-[#078C88] hover:text-[#078C88]'
                }`}
              >
                <CalendarRange className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {routeNotice && (
        <div className="border-t border-[#DCE8E5] bg-[#FAFDFC] px-4 py-2 text-[11px] text-[#5B7370] flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-[#D97E4A] shrink-0" />
          <span>{routeNotice}</span>
        </div>
      )}
    </div>
  );
};

export const DayRouteMapPanel: React.FC<DayRouteMapPanelProps> = ({
  dayNumber,
  cityLabel,
  primaryCity,
  nodes,
  allTimelineNodes,
  cities = [],
  cityDays,
  totalDays = 1,
  previousNodes,
  rainSwapped,
  rainSwappedDays,
  placesByNodeId,
  dayStay = null,
  onOpenStopDetail,
  onHoldMapAddPlace,
  onRequestSetStay,
  onRestorePreviousOrder,
  onDayRouteLegsChange,
}) => {
  const { lang, copy } = usePanelLang();
  const apiKey = getConfiguredGoogleMapsApiKey();
  const [expanded, setExpanded] = useState(true);
  const [liveCoordsByQuery, setLiveCoordsByQuery] = useState<
    Record<string, { lat: number; lng: number }>
  >({});
  const [multiDayPreview, setMultiDayPreview] = useState(false);
  const [selectedPreviewDays, setSelectedPreviewDays] = useState<number[]>([dayNumber]);
  const [showComparison, setShowComparison] = useState(true);
  const [fitTrigger, setFitTrigger] = useState(0);
  const travelMode: MapsTravelMode = 'transit';
  const [routeSummary, setRouteSummary] = useState<RouteSummaryInfo | null>(null);
  const [comparisonMetrics, setComparisonMetrics] = useState<{
    beforeKm: number;
    afterKm: number;
  } | null>(null);
  const [routeNotice, setRouteNotice] = useState<string | null>(null);

  const handleLiveCoordsResolved = useCallback(
    (resolvedMap: Record<string, { lat: number; lng: number }>) => {
      setLiveCoordsByQuery((prev) => ({ ...prev, ...resolvedMap }));
    },
    []
  );

  const safeAllNodes = useMemo(
    () => (allTimelineNodes && allTimelineNodes.length > 0 ? allTimelineNodes : nodes),
    [allTimelineNodes, nodes]
  );

  const safeTotalDays = useMemo(() => {
    const maxNodeDay = safeAllNodes.reduce(
      (maxD, n) => Math.max(maxD, n.day ?? 1),
      1
    );
    return Math.max(totalDays, dayNumber, maxNodeDay);
  }, [totalDays, dayNumber, safeAllNodes]);

  const populatedDaysInfo = useMemo(() => {
    const list: Array<{
      day: number;
      cityLabel: string;
      primaryCity: string;
      count: number;
    }> = [];
    for (let d = 1; d <= safeTotalDays; d += 1) {
      const dayItems = safeAllNodes.filter((n) => (n.day ?? 1) === d);
      if (dayItems.length === 0) continue;
      const label = getCityForDay(cities, d, safeTotalDays, dayItems, lang, cityDays);
      list.push({
        day: d,
        cityLabel: label,
        primaryCity: getPrimaryCityName(label),
        count: dayItems.length,
      });
    }
    return list;
  }, [safeTotalDays, safeAllNodes, cities, lang, cityDays]);

  const sameCityPopulatedDays = useMemo(
    () =>
      populatedDaysInfo
        .filter((info) => info.primaryCity === primaryCity)
        .map((info) => info.day),
    [populatedDaysInfo, primaryCity]
  );

  const allPopulatedDays = useMemo(
    () => populatedDaysInfo.map((info) => info.day),
    [populatedDaysInfo]
  );

  const canMultiDayPreview = populatedDaysInfo.length >= 2;
  const isMultiDayActive = multiDayPreview && canMultiDayPreview;

  const handleToggleMultiDayPreview = useCallback(() => {
    setMultiDayPreview((prev) => {
      const next = !prev;
      if (next) {
        const defaultDays =
          sameCityPopulatedDays.length >= 2 ? sameCityPopulatedDays : allPopulatedDays;
        setSelectedPreviewDays(defaultDays.length > 0 ? defaultDays : [dayNumber]);
        setExpanded(true);
        setFitTrigger((n) => n + 1);
      } else {
        setFitTrigger((n) => n + 1);
      }
      return next;
    });
  }, [sameCityPopulatedDays, allPopulatedDays, dayNumber]);

  const handleTogglePreviewDay = useCallback((d: number) => {
    setSelectedPreviewDays((prev) => {
      if (prev.includes(d)) {
        if (prev.length <= 1) return prev;
        return prev.filter((item) => item !== d);
      }
      return [...prev, d].sort((a, b) => a - b);
    });
    setFitTrigger((n) => n + 1);
  }, []);

  const activeMultiDays = useMemo(() => {
    if (!isMultiDayActive) return [dayNumber];
    const valid = selectedPreviewDays.filter((d) => allPopulatedDays.includes(d));
    return valid.length > 0 ? valid : allPopulatedDays;
  }, [isMultiDayActive, selectedPreviewDays, allPopulatedDays, dayNumber]);

  const getDayCityHint = useCallback(
    (d: number) => {
      const found = populatedDaysInfo.find((info) => info.day === d);
      return found?.primaryCity || primaryCity;
    },
    [populatedDaysInfo, primaryCity]
  );

  const stops = useMemo(() => {
    if (isMultiDayActive) {
      return resolveMultiDayStopsForMap({
        allNodes: safeAllNodes,
        selectedDays: activeMultiDays,
        rainSwapped,
        rainSwappedDays,
        defaultCityHint: primaryCity,
        getDayCityHint,
      });
    }
    return resolveDayStopsForMap(nodes, rainSwapped, primaryCity, dayNumber);
  }, [
    isMultiDayActive,
    safeAllNodes,
    activeMultiDays,
    rainSwapped,
    rainSwappedDays,
    primaryCity,
    getDayCityHint,
    nodes,
    dayNumber,
  ]);

  const effectiveCityLabel = useMemo(() => {
    if (!isMultiDayActive) return cityLabel;
    const uniqueCities = Array.from(
      new Set(
        activeMultiDays
          .map((d) => populatedDaysInfo.find((info) => info.day === d)?.primaryCity)
          .filter((c): c is string => Boolean(c))
      )
    );
    return uniqueCities.length > 0 ? uniqueCities.join(' → ') : cityLabel;
  }, [isMultiDayActive, activeMultiDays, populatedDaysInfo, cityLabel]);

  const anySwappedStopActive = useMemo(
    () => stops.some((s) => s.isSwappedIndoor),
    [stops]
  );

  const viewKey = useMemo(
    () =>
      isMultiDayActive
        ? `multi:${activeMultiDays.join(',')}`
        : `day:${dayNumber}`,
    [isMultiDayActive, activeMultiDays, dayNumber]
  );

  const previousStops = useMemo(
    () =>
      !isMultiDayActive && previousNodes && previousNodes.length >= 2
        ? resolveDayStopsForMap(previousNodes, rainSwapped, primaryCity, dayNumber)
        : [],
    [isMultiDayActive, previousNodes, rainSwapped, primaryCity, dayNumber]
  );

  const hasOrderChanged = useMemo(() => {
    if (isMultiDayActive) return false;
    if (previousStops.length < 2 || stops.length < 2) return false;
    return (
      previousStops.map((s) => s.id).join('|') !== stops.map((s) => s.id).join('|')
    );
  }, [isMultiDayActive, previousStops, stops]);

  const nodeById = useMemo(() => {
    const lookup: Record<string, TimelineNode> = {};
    safeAllNodes.forEach((n) => {
      lookup[n.id] = n;
    });
    nodes.forEach((n) => {
      lookup[n.id] = n;
    });
    return lookup;
  }, [safeAllNodes, nodes]);

  const stopMetaById = useMemo(() => {
    const out: Record<string, { stopType?: StopType; thumbPhotoUri?: string }> = {};
    stops.forEach((s) => {
      const raw = nodeById[s.id];
      out[s.id] = {
        stopType: raw?.stopType,
        thumbPhotoUri: placesByNodeId?.[s.id]?.thumbPhotoUri,
      };
    });
    return out;
  }, [stops, nodeById, placesByNodeId]);

  const resolvedDayStayAnchor = useMemo<Real2DHotelStayAnchor | null>(() => {
    if (!dayStay || !dayStay.placeName.trim()) return null;
    const geo = resolveNodeGeoCoords(
      {
        title: dayStay.placeName,
        address: dayStay.address,
        district: dayStay.district || '',
        city: primaryCity,
        lat: dayStay.lat,
        lng: dayStay.lng,
      },
      primaryCity
    );
    return {
      placeName: dayStay.placeName,
      address: dayStay.address,
      lat: geo.lat,
      lng: geo.lng,
    };
  }, [dayStay, primaryCity]);

  const toReal2DWaypoints = useCallback(
    (resolvedStops: ResolvedDayStop[]): Real2DStopWaypoint[] =>
      resolvedStops.map((stop, idx) => {
        const prevStop = idx > 0 ? resolvedStops[idx - 1] : null;
        const rawNode = nodeById[stop.id];
        const prevRawNode = prevStop ? nodeById[prevStop.id] : null;
        const stopDay = stop.dayNumber ?? rawNode?.day ?? dayNumber;
        const stopCity =
          rawNode?.city ||
          (isMultiDayActive ? getDayCityHint(stopDay) : primaryCity) ||
          primaryCity;
        const prevCity =
          prevRawNode?.city ||
          (prevStop?.dayNumber ? getDayCityHint(prevStop.dayNumber) : stopCity);
        const livePlaceCoords = placesByNodeId?.[stop.id]?.location;
        const geo = resolveNodeGeoCoords(
          {
            title: stop.title,
            address: stop.address,
            district: stop.district,
            city: stopCity,
            lat: rawNode?.lat,
            lng: rawNode?.lng,
          },
          stopCity,
          liveCoordsByQuery[stop.query] || livePlaceCoords || null
        );
        const transportMode = inferSegmentTransportMode(
          {
            title: stop.title,
            transitNote: rawNode?.transitNote || '',
            city: stopCity,
            stopType: rawNode?.stopType,
          },
          prevStop
            ? {
                title: prevStop.title,
                transitNote: prevRawNode?.transitNote || '',
                city: prevCity,
                stopType: prevRawNode?.stopType,
              }
            : null
        );
        const legDurFromPrev =
          idx > 0 &&
          routeSummary?.legDurationsMin &&
          routeSummary.legDurationsMin.length === resolvedStops.length - 1
            ? routeSummary.legDurationsMin[idx - 1]
            : undefined;

        return {
          id: stop.id,
          orderNumber: stop.orderNumber,
          dayNumber: stopDay,
          time: stop.time,
          title: stop.title,
          district: stop.district,
          address: stop.address,
          city: stopCity,
          lat: geo.lat,
          lng: geo.lng,
          transportMode,
          stopType: rawNode?.stopType,
          thumbPhotoUri: placesByNodeId?.[stop.id]?.thumbPhotoUri,
          legDurationMinFromPrev: legDurFromPrev,
          transitNote: rawNode?.transitNote,
          isVisited: stop.isVisited,
          isAnchor: stop.isAnchor,
          dayColor: getDayRouteColor(stopDay),
          query: stop.query,
        };
      }),
    [
      nodeById,
      dayNumber,
      isMultiDayActive,
      getDayCityHint,
      primaryCity,
      liveCoordsByQuery,
      placesByNodeId,
      routeSummary,
    ]
  );

  const real2DWaypoints = useMemo(
    () => toReal2DWaypoints(stops),
    [toReal2DWaypoints, stops]
  );

  // Notify parent ItineraryView of single-day per-leg durations & distances (live Routes API or geo fallback)
  useEffect(() => {
    if (!onDayRouteLegsChange) return;
    if (isMultiDayActive || stops.length < 2) {
      if (!isMultiDayActive) onDayRouteLegsChange(null);
      return;
    }

    if (
      routeSummary?.legDurationsMin &&
      routeSummary.legDurationsMin.length === stops.length - 1
    ) {
      const fallbackDistances = stops.slice(0, -1).map((_, idx) => {
        const a = real2DWaypoints[idx];
        const b = real2DWaypoints[idx + 1];
        if (!a || !b) return 1.2;
        return Number(
          Math.max(0.2, computeHaversineKm({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng }) * 1.25).toFixed(1)
        );
      });
      onDayRouteLegsChange({
        mode: routeSummary.mode,
        source: routeSummary.source,
        legDurationsMin: routeSummary.legDurationsMin,
        legDistancesKm:
          routeSummary.legDistancesKm && routeSummary.legDistancesKm.length === stops.length - 1
            ? routeSummary.legDistancesKm
            : fallbackDistances,
      });
      return;
    }

    // Immediate offline / unconfigured geometric estimate so inter-stop connectors always show realistic metrics
    const legDistancesKm: number[] = [];
    const legDurationsMin: number[] = [];
    for (let i = 1; i < real2DWaypoints.length; i += 1) {
      const prev = real2DWaypoints[i - 1];
      const curr = real2DWaypoints[i];
      const roadKm = Math.max(
        0.2,
        computeHaversineKm({ lat: prev.lat, lng: prev.lng }, { lat: curr.lat, lng: curr.lng }) * 1.28
      );
      legDistancesKm.push(Number(roadKm.toFixed(1)));
      const legSpeedKmH = roadKm <= 1.3 ? 4.5 : 20;
      legDurationsMin.push(
        Math.max(3, Math.round((roadKm / legSpeedKmH) * 60 + (roadKm > 1.3 ? 4 : 0)))
      );
    }
    onDayRouteLegsChange({
      mode: travelMode,
      source: 'fallback',
      legDurationsMin,
      legDistancesKm,
    });
  }, [onDayRouteLegsChange, isMultiDayActive, stops, routeSummary, real2DWaypoints, travelMode]);

  const previousReal2DWaypoints = useMemo(
    () => toReal2DWaypoints(previousStops),
    [toReal2DWaypoints, previousStops]
  );

  const fullDayRouteUrl = useMemo(
    () => buildFullDayGoogleMapsRouteUrl(stops, travelMode),
    [stops, travelMode]
  );

  const cityQuickSearchUrl = useMemo(
    () => buildGoogleMapsSearchUrl({ title: primaryCity || cityLabel }),
    [primaryCity, cityLabel]
  );

  const savedKm =
    comparisonMetrics && comparisonMetrics.beforeKm > comparisonMetrics.afterKm
      ? comparisonMetrics.beforeKm - comparisonMetrics.afterKm
      : 0;
  const savedPct =
    comparisonMetrics && comparisonMetrics.beforeKm > 0.05 && savedKm > 0
      ? Math.round((savedKm / comparisonMetrics.beforeKm) * 100)
      : 0;

  const fallbackSummary = useMemo<RouteSummaryInfo | null>(() => {
    if (real2DWaypoints.length < 2) return null;
    let totalKm = 0;
    let totalMin = 0;
    for (let i = 1; i < real2DWaypoints.length; i += 1) {
      const prev = real2DWaypoints[i - 1];
      const curr = real2DWaypoints[i];
      const roadKm = Math.max(
        0.2,
        computeHaversineKm(
          { lat: prev.lat, lng: prev.lng },
          { lat: curr.lat, lng: curr.lng }
        ) * 1.28
      );
      totalKm += roadKm;
      const legSpeedKmH = roadKm <= 1.3 ? 4.5 : 20;
      totalMin += Math.max(
        3,
        Math.round((roadKm / legSpeedKmH) * 60 + (roadKm > 1.3 ? 4 : 0))
      );
    }
    return {
      distanceKm: totalKm.toFixed(1),
      durationMin: Math.max(3, totalMin),
      mode: travelMode,
      source: 'fallback',
    };
  }, [real2DWaypoints, travelMode]);

  const effectiveSummary = routeSummary || fallbackSummary;

  const scopeLabel = isMultiDayActive
    ? `${activeMultiDays.map((d) => `D${d}`).join(' + ')}`
    : `Day ${dayNumber}`;
  const displayCityLabel = translateRouteTitle(cityLabel, lang);
  const displayEffectiveCityLabel = translateRouteTitle(effectiveCityLabel, lang);
  const displayPrimaryCity = translateCityName(primaryCity || cityLabel, lang);

  return (
    <section
      aria-label={copy.sectionAria(scopeLabel)}
      className="rounded-2xl border border-[#DCE8E5] bg-white overflow-hidden"
    >
      {/* Minimalist Single-Line Header Bar */}
      <div className="flex items-center justify-between gap-2.5 px-4 sm:px-5 py-3 bg-[#FAFDFC]">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 min-w-0 flex items-center gap-2.5 text-left cursor-pointer"
        >
          <AccentIconBadge accent="ocean" icon={RouteIcon} size="md" />
          <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
            <h3 className="text-sm font-extrabold tracking-tight text-[#152B29] whitespace-nowrap">
              {isMultiDayActive
                ? copy.multiDayHeading(activeMultiDays.map((d) => `D${d}`).join(' / '))
                : `Day ${dayNumber} · ${displayCityLabel}`}
            </h3>
            <span className="tabular-nums text-xs text-[#5B7370] truncate">
              {stops.length > 0
                ? copy.stopsInline(stops.length)
                : copy.cityMapInline}
              {effectiveSummary && stops.length >= 2
                ? copy.summaryDistDur(
                    effectiveSummary.distanceKm,
                    formatDuration(effectiveSummary.durationMin, lang)
                  )
                : ''}
              {anySwappedStopActive && copy.rainPlanInline}
            </span>
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {fullDayRouteUrl ? (
            <a
              href={fullDayRouteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 inline-flex items-center gap-1.5 rounded-xl bg-[#078C88] px-3 text-xs font-bold text-white hover:bg-[#067572] transition-colors whitespace-nowrap shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {copy.openInMaps}
            </a>
          ) : (
            <a
              href={cityQuickSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 inline-flex items-center gap-1.5 rounded-xl bg-[#078C88] px-3 text-xs font-bold text-white hover:bg-[#067572] transition-colors whitespace-nowrap shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {copy.exploreShort(displayPrimaryCity)}
            </a>
          )}

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={
              expanded ? copy.collapsePanelAria : copy.expandPanelAria
            }
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#5B7370] hover:bg-[#EEF4F3] hover:text-[#152B29] cursor-pointer"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#EDF3F1] divide-y divide-[#EDF3F1]">
          {/* On-Demand Multi-Day Selector Bar (shown ONLY when Multi-Day toggle is active) */}
          {isMultiDayActive && (
            <div className="px-4 sm:px-5 py-2 bg-[#F4FBFA] flex items-center justify-between gap-3 text-xs">
              <HorizontalChipScroller
                activeKey={activeMultiDays.join(',')}
                fadeBgClassName="from-[#F4FBFA]"
                className="flex-1"
                ariaLabel={copy.selectMultiDayAria}
              >
                {populatedDaysInfo.map((info) => {
                  const selected = activeMultiDays.includes(info.day);
                  const dayColor = getDayRouteColor(info.day);
                  return (
                    <button
                      key={info.day}
                      type="button"
                      data-chip-active={info.day === dayNumber ? 'true' : undefined}
                      onClick={() => handleTogglePreviewDay(info.day)}
                      className={`min-h-[32px] inline-flex items-center gap-1.5 rounded-full border px-3 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        selected
                          ? 'bg-white text-[#152B29] shadow-2xs'
                          : 'border-[#DCE8E5] bg-[#FAFDFC] text-[#7B928E] hover:text-[#3B5552]'
                      }`}
                      style={selected ? { borderColor: dayColor } : undefined}
                    >
                      <span
                        className="inline-block h-2 w-2 rounded-full shrink-0"
                        style={{
                          backgroundColor: selected ? dayColor : '#CBDAD7',
                        }}
                        aria-hidden="true"
                      />
                      <span className="font-num font-bold">D{info.day}</span>
                      <span>{info.cityLabel}</span>
                    </button>
                  );
                })}
              </HorizontalChipScroller>

              <div className="flex items-center gap-2 shrink-0 text-[11px]">
                {sameCityPopulatedDays.length >= 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPreviewDays(sameCityPopulatedDays);
                      setFitTrigger((n) => n + 1);
                    }}
                    className="font-semibold text-[#076E6A] hover:underline whitespace-nowrap cursor-pointer"
                  >
                    {copy.onlyCity(primaryCity)}
                  </button>
                )}
                {sameCityPopulatedDays.length >= 2 && (
                  <span aria-hidden="true" className="text-[#CBDAD7]">
                    ·
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPreviewDays(allPopulatedDays);
                    setFitTrigger((n) => n + 1);
                  }}
                  className="font-semibold text-[#076E6A] hover:underline whitespace-nowrap cursor-pointer"
                >
                  {copy.allDays}
                </button>
              </div>
            </div>
          )}

          {/* On-Demand Reorder Diff Bar (shown ONLY after drag/AI route reorder) */}
          {hasOrderChanged && (
            <div className="px-4 sm:px-5 py-2 bg-[#FAFDFC] flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-num font-semibold tabular-nums text-[#076E6A]">
                {savedKm > 0.05
                  ? copy.routeReorderedSaved(savedKm.toFixed(1), savedPct)
                  : copy.orderUpdated}
              </span>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowComparison((v) => !v)}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    showComparison
                      ? 'border-[#D97E4A]/50 bg-[#FFF8F4] text-[#B85E2B]'
                      : 'border-[#DCE8E5] bg-white text-[#5B7370] hover:text-[#152B29]'
                  }`}
                >
                  {showComparison ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3" />
                  )}
                  {copy.compareLine}
                </button>
                {onRestorePreviousOrder && (
                  <button
                    type="button"
                    onClick={onRestorePreviousOrder}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#DCE8E5] bg-white px-2 py-1 text-[11px] font-semibold text-[#4F6865] hover:border-[#078C88] hover:text-[#076E6A] whitespace-nowrap cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    {copy.undoReorder}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Pure, Borderless Map Canvas */}
          {apiKey ? (
            <ConfiguredInteractiveMapViewport
              dayNumber={dayNumber}
              scopeLabel={scopeLabel}
              cityLabel={effectiveCityLabel}
              primaryCity={primaryCity}
              viewKey={viewKey}
              multiDayMode={isMultiDayActive}
              canMultiDayPreview={canMultiDayPreview}
              stops={stops}
              previousStops={previousStops}
              showComparison={showComparison && hasOrderChanged}
              fitTrigger={fitTrigger}
              travelMode={travelMode}
              routeNotice={routeNotice}
              fullDayRouteUrl={fullDayRouteUrl}
              getDayCityHint={getDayCityHint}
              onTriggerFit={() => setFitTrigger((n) => n + 1)}
              onToggleMultiDayPreview={handleToggleMultiDayPreview}
              onRouteSummaryChange={setRouteSummary}
              onComparisonMetricsChange={setComparisonMetrics}
              onRouteNoticeChange={setRouteNotice}
              onLiveCoordsResolved={handleLiveCoordsResolved}
              fallbackWaypoints={real2DWaypoints}
              fallbackPrevWaypoints={previousReal2DWaypoints}
              stopMetaById={stopMetaById}
              dayStayAnchor={resolvedDayStayAnchor}
              onOpenStopDetail={onOpenStopDetail}
              onHoldMapAddPlace={onHoldMapAddPlace}
              onRequestSetStay={onRequestSetStay}
            />
          ) : (
            <Real2DRouteMapCanvas
              waypoints={real2DWaypoints}
              previousWaypoints={previousReal2DWaypoints}
              showComparison={showComparison && hasOrderChanged}
              scopeLabel={scopeLabel}
              cityLabel={displayEffectiveCityLabel}
              multiDayMode={isMultiDayActive}
              canMultiDayPreview={canMultiDayPreview}
              onToggleMultiDayPreview={handleToggleMultiDayPreview}
              lang={lang}
              dayStayAnchor={resolvedDayStayAnchor}
              fullDayRouteUrl={fullDayRouteUrl}
              onOpenStopDetail={onOpenStopDetail}
              onHoldMapAddPlace={onHoldMapAddPlace}
              onRequestSetStay={onRequestSetStay}
              hideInlineStopStrip
            />
          )}
        </div>
      )}
    </section>
  );
};
