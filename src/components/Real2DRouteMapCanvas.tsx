import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  CalendarRange,
  CarFront,
  Compass,
  Crosshair,
  Footprints,
  Hand,
  Home,
  Layers,
  Plane,
  Satellite,
  Ship,
  TrainFront,
  TramFront,
  X,
} from 'lucide-react';
import { translateDemoStopTitle } from '../i18n';
import type { AppLanguage, StopType } from '../types';
import {
  buildSmoothGeoRouteSamples,
  computeGeoDistanceKm,
  type TransportMode,
} from '../utils/geoRouteHelpers';
import { getItineraryMapCopy } from '../i18n/packs/itineraryMapPack';
import { tkColor } from '../utils/tkColor';

export type Map2DBaseStyle = 'roadmap' | 'satellite' | 'night';

export interface Real2DStopWaypoint {
  id: string;
  orderNumber: number;
  dayNumber: number;
  time: string;
  title: string;
  district: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  transportMode: TransportMode;
  stopType?: StopType;
  thumbPhotoUri?: string;
  legDurationMinFromPrev?: number;
  transitNote?: string;
  isVisited?: boolean;
  isAnchor?: boolean;
  dayColor?: string;
  query?: string;
}

export interface Real2DHotelStayAnchor {
  placeName: string;
  address: string;
  lat: number;
  lng: number;
}

interface Real2DRouteMapCanvasProps {
  waypoints: Real2DStopWaypoint[];
  previousWaypoints?: Real2DStopWaypoint[];
  showComparison?: boolean;
  scopeLabel: string;
  cityLabel: string;
  multiDayMode?: boolean;
  canMultiDayPreview?: boolean;
  onToggleMultiDayPreview?: () => void;
  lang: AppLanguage;
  layout?: 'inline' | 'fullscreen';
  baseStyle?: Map2DBaseStyle;
  onBaseStyleChange?: (style: Map2DBaseStyle) => void;
  dayStayAnchor?: Real2DHotelStayAnchor | null;
  fullDayRouteUrl?: string | null;
  onOpenStopDetail?: (stopId: string) => void;
  onHoldMapAddPlace?: (coords: { lat: number; lng: number }) => void;
  onRequestSetStay?: () => void;
  externalActiveIndex?: number;
  externalFocusTrigger?: number;
  onSelectStop?: (index: number) => void;
  hideEmbeddedChrome?: boolean;
  hideInlineStopStrip?: boolean;
}

const TRANSPORT_ICON_COMPONENTS: Record<
  TransportMode,
  React.ComponentType<{ className?: string }>
> = {
  walk: Footprints,
  metro: TramFront,
  train: TrainFront,
  boat: Ship,
  car: CarFront,
  plane: Plane,
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getStopCategoryVisual(stopType?: StopType): {
  bg: string;
  fg: string;
  svg: string;
} {
  switch (stopType) {
    case 'dining':
      return {
        bg: tkColor('--tk-warning-tint'),
        fg: tkColor('--tk-route-6'),
        svg: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`,
      };
    case 'hotel':
      return {
        bg: tkColor('--tk-forest-tint'),
        fg: tkColor('--tk-route-4'),
        svg: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>`,
      };
    case 'shopping':
      return {
        bg: tkColor('--tk-danger-tint'),
        fg: tkColor('--tk-danger'),
        svg: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
      };
    case 'transit':
      return {
        bg: tkColor('--tk-forest-plate'),
        fg: tkColor('--tk-route-3'),
        svg: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><path d="m8 19-2 3"/><path d="m18 22-2-3"/><path d="M8 15h.01"/><path d="M16 15h.01"/></svg>`,
      };
    case 'attraction':
    default:
      return {
        bg: tkColor('--tk-forest-tint'),
        fg: tkColor('--tk-route-1'),
        svg: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22h18"/><path d="M6 18v-7"/><path d="M10 18v-7"/><path d="M14 18v-7"/><path d="M18 18v-7"/><polygon points="12 2 20 7 4 7"/></svg>`,
      };
  }
}

/**
 * Packy-style floating white place card marker (Rich Photo/Icon + Store Name + Street Address + Top-Left Order Badge)
 * with automatic Compact Store-Name Pill mode when zoomed out or densely packed.
 */
function buildStopPlaceCardIcon(
  wp: Real2DStopWaypoint,
  isSelected: boolean,
  multiDayMode: boolean,
  compact: boolean,
  lang: AppLanguage,
  hasDetailHandler: boolean
): L.DivIcon {
  const viewDetailsLabel = getItineraryMapCopy(lang).canvas2d.viewStopDetails;
  const displayTitle = translateDemoStopTitle(wp.title, lang);
  const subtitle = (wp.address || wp.district || wp.city || '').trim();
  const cCard = tkColor('--tk-card');
  const cInk = tkColor('--tk-ink');
  const cInk2 = tkColor('--tk-ink-2');
  const cRoute1 = tkColor('--tk-route-1');
  const cHair = tkColor('--tk-hair-c');
  const cRoute6 = tkColor('--tk-route-6');
  const badgeBg =
    multiDayMode && wp.dayColor
      ? wp.dayColor
      : wp.isVisited
      ? cInk2
      : cRoute6;
  const borderColor = isSelected ? cRoute1 : cHair;
  const shadow = isSelected
    ? `0 0 0 3px color-mix(in srgb, ${cRoute1} 22%, transparent), 0 10px 24px color-mix(in srgb, ${cInk} 20%, transparent)`
    : `0 6px 18px color-mix(in srgb, ${cInk} 13%, transparent), 0 1px 3px color-mix(in srgb, ${cInk} 7%, transparent)`;

  if (compact) {
    const pillWidth = 168;
    const pillHeight = 36;
    const dayPrefix = multiDayMode ? `D${wp.dayNumber} · ` : '';
    return L.divIcon({
      className: 'leaflet-div-icon',
      iconSize: [pillWidth, pillHeight],
      iconAnchor: [pillWidth / 2, pillHeight - 2],
      html: `
        <div style="position:relative;width:${pillWidth}px;height:${pillHeight}px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;font-family:'Plus Jakarta Sans',sans-serif;">
          <div style="max-width:${pillWidth}px;display:inline-flex;align-items:center;gap:6px;background:${cCard};border:1.5px solid ${borderColor};border-radius:9999px;padding:3px 10px 3px 4px;box-shadow:${shadow};">
            <span style="width:20px;height:20px;border-radius:9999px;background:${badgeBg};color:${cCard};font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">
              ${wp.orderNumber}
            </span>
            <span style="font-size:11.5px;font-weight:800;color:${cInk};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:124px;line-height:1.2;">
              ${escapeHtml(dayPrefix + displayTitle)}
            </span>
          </div>
          <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${isSelected ? cRoute1 : cCard};margin-top:-1px;filter:drop-shadow(0 2px 2px color-mix(in srgb, ${cInk} 10%, transparent));"></div>
        </div>
      `,
    });
  }

  const cat = getStopCategoryVisual(wp.stopType);
  const cardWidth = 216;
  const cardHeight = 62;
  const dayPrefix = multiDayMode ? `D${wp.dayNumber} · ` : '';

  const thumbMarkup = wp.thumbPhotoUri
    ? `<div style="position:relative;width:38px;height:38px;border-radius:10px;overflow:hidden;flex-shrink:0;background:${cat.bg};">
        <img src="${escapeHtml(wp.thumbPhotoUri)}" alt="" style="width:38px;height:38px;object-fit:cover;display:block;" onerror="this.style.display='none';if(this.nextElementSibling){this.nextElementSibling.style.display='flex';}" />
        <div style="display:none;width:38px;height:38px;align-items:center;justify-content:center;color:${cat.fg};background:${cat.bg};">${cat.svg}</div>
      </div>`
    : `<div style="width:38px;height:38px;border-radius:10px;background:${cat.bg};color:${cat.fg};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        ${cat.svg}
      </div>`;

  const detailArrowMarkup = hasDetailHandler
    ? `<div data-open-detail="1" title="${escapeHtml(viewDetailsLabel)}" style="width:18px;height:28px;display:flex;align-items:center;justify-content:center;color:${isSelected ? cRoute1 : cInk2};flex-shrink:0;margin-right:-2px;">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </div>`
    : '';

  return L.divIcon({
    className: 'leaflet-div-icon',
    iconSize: [cardWidth, cardHeight],
    iconAnchor: [cardWidth / 2, cardHeight - 2],
    html: `
      <div style="position:relative;width:${cardWidth}px;height:${cardHeight}px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;font-family:'Plus Jakarta Sans',sans-serif;padding-top:4px;">
        <div style="position:relative;width:${cardWidth - 8}px;background:${cCard};border:1.5px solid ${borderColor};border-radius:15px;padding:6px 8px 6px 6px;box-shadow:${shadow};display:flex;align-items:center;gap:8px;">
          <div style="position:absolute;top:-8px;left:-6px;min-width:22px;height:22px;padding:0 5px;border-radius:9999px;background:${badgeBg};border:2px solid ${cCard};box-shadow:0 2px 6px color-mix(in srgb, ${cInk} 22%, transparent);color:${cCard};font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;line-height:1;z-index:2;">
            ${wp.orderNumber}
          </div>
          ${thumbMarkup}
          <div style="min-width:0;flex:1;display:flex;flex-direction:column;justify-content:center;">
            <div style="font-size:12.5px;font-weight:800;color:${cInk};line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${escapeHtml(dayPrefix + displayTitle)}
            </div>
            <div style="font-size:10.5px;font-weight:500;color:${cInk2};line-height:1.25;margin-top:1.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${escapeHtml(subtitle)}
            </div>
          </div>
          ${detailArrowMarkup}
        </div>
        <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid ${isSelected ? cRoute1 : cCard};margin-top:-1px;filter:drop-shadow(0 2px 2px color-mix(in srgb, ${cInk} 12%, transparent));"></div>
      </div>
    `,
  });
}

function buildHotelStayCardIcon(
  stay: Real2DHotelStayAnchor,
  compact: boolean,
  lang: AppLanguage
): L.DivIcon {
  const label = getItineraryMapCopy(lang).canvas2d.hotelStay;
  const cCard = tkColor('--tk-card');
  const cInk = tkColor('--tk-ink');
  const cInk2 = tkColor('--tk-ink-2');
  const cRoute4 = tkColor('--tk-route-4');
  if (compact) {
    return L.divIcon({
      className: 'leaflet-div-icon',
      iconSize: [148, 34],
      iconAnchor: [74, 32],
      html: `
        <div style="width:148px;height:34px;display:flex;flex-direction:column;align-items:center;font-family:'Plus Jakarta Sans',sans-serif;">
          <div style="display:inline-flex;align-items:center;gap:5px;background:${cInk};color:${cCard};border:1.5px solid ${cCard};border-radius:9999px;padding:3px 9px 3px 5px;box-shadow:0 5px 14px color-mix(in srgb, ${cInk} 22%, transparent);max-width:146px;">
            <span style="width:18px;height:18px;border-radius:9999px;background:${cRoute4};display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="${cCard}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </span>
            <span style="font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(stay.placeName)}</span>
          </div>
          <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${cInk};margin-top:-1px;"></div>
        </div>
      `,
    });
  }

  return L.divIcon({
    className: 'leaflet-div-icon',
    iconSize: [192, 54],
    iconAnchor: [96, 52],
    html: `
      <div style="width:192px;height:54px;display:flex;flex-direction:column;align-items:center;font-family:'Plus Jakarta Sans',sans-serif;">
        <div style="width:186px;background:${cInk};color:${cCard};border:1.5px solid ${cCard};border-radius:14px;padding:5px 9px 5px 6px;box-shadow:0 8px 20px color-mix(in srgb, ${cInk} 24%, transparent);display:flex;align-items:center;gap:7px;">
          <div style="width:32px;height:32px;border-radius:9px;background:${cRoute4};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="${cCard}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div style="min-width:0;flex:1;">
            <div style="font-size:11.5px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2;">${escapeHtml(stay.placeName)}</div>
            <div style="font-size:10px;color:${cInk2};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;">${escapeHtml(label)}</div>
          </div>
        </div>
        <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${cInk};margin-top:-1px;"></div>
      </div>
    `,
  });
}

function buildMidLegDurationIcon(mode: TransportMode, minutes: number): L.DivIcon {
  const cCard = tkColor('--tk-card');
  const cHair = tkColor('--tk-hair-c');
  const cInk2 = tkColor('--tk-ink-2');
  const cInk = tkColor('--tk-ink');
  const modeGlyph =
    mode === 'walk'
      ? '🚶'
      : mode === 'metro'
      ? '🚇'
      : mode === 'train'
      ? '🚄'
      : mode === 'boat'
      ? '⛴'
      : mode === 'plane'
      ? '✈'
      : '🚕';
  const text = `${modeGlyph} ${Math.max(1, Math.round(minutes))}m`;
  return L.divIcon({
    className: 'leaflet-div-icon',
    iconSize: [64, 22],
    iconAnchor: [32, 11],
    html: `<div style="pointer-events:none;display:flex;align-items:center;justify-content:center;">
      <span style="background:color-mix(in srgb, ${cCard} 94%, transparent);border:1px solid ${cHair};border-radius:9999px;padding:1px 7px;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;color:${cInk2};box-shadow:0 2px 6px color-mix(in srgb, ${cInk} 10%, transparent);white-space:nowrap;">${text}</span>
    </div>`,
  });
}

export const Real2DRouteMapCanvas: React.FC<Real2DRouteMapCanvasProps> = ({
  waypoints,
  previousWaypoints = [],
  showComparison = false,
  scopeLabel,
  cityLabel,
  multiDayMode = false,
  canMultiDayPreview = false,
  onToggleMultiDayPreview,
  lang,
  layout = 'inline',
  baseStyle: controlledStyle,
  onBaseStyleChange,
  dayStayAnchor = null,
  onOpenStopDetail,
  onHoldMapAddPlace,
  onRequestSetStay,
  externalActiveIndex,
  externalFocusTrigger,
  onSelectStop,
  hideEmbeddedChrome = false,
  hideInlineStopStrip = false,
}) => {
  const copy = getItineraryMapCopy(lang).canvas2d;
  const mountRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayersRef = useRef<L.TileLayer[]>([]);
  const routeLayersRef = useRef<L.LayerGroup | null>(null);
  const midLegLayersRef = useRef<L.LayerGroup | null>(null);
  const userLocationLayerRef = useRef<L.LayerGroup | null>(null);
  const stopMarkersRef = useRef<L.Marker[]>([]);
  const stayMarkerRef = useRef<L.Marker | null>(null);

  const [internalStyle, setInternalStyle] = useState<Map2DBaseStyle>('roadmap');
  const activeStyle = controlledStyle ?? internalStyle;

  const [selectedStopIdx, setSelectedStopIdx] = useState<number | null>(null);
  const [currentZoom, setCurrentZoom] = useState(13);
  const [holdHintDismissed, setHoldHintDismissed] = useState(false);
  const [transientToast, setTransientToast] = useState<string | null>(null);

  // Auto-fade top-left add-stop hint after 3.2s so canvas stays 100% clean
  useEffect(() => {
    if (!onHoldMapAddPlace || holdHintDismissed) return;
    const timer = window.setTimeout(() => {
      setHoldHintDismissed(true);
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [onHoldMapAddPlace, holdHintDismissed]);

  const selectedStopIdxRef = useRef<number | null>(null);
  selectedStopIdxRef.current = selectedStopIdx;

  const onHoldMapAddPlaceRef = useRef(onHoldMapAddPlace);
  onHoldMapAddPlaceRef.current = onHoldMapAddPlace;
  const onOpenStopDetailRef = useRef(onOpenStopDetail);
  onOpenStopDetailRef.current = onOpenStopDetail;

  const curveData = useMemo(
    () => buildSmoothGeoRouteSamples(waypoints, 26),
    [waypoints]
  );

  const showToast = (msg: string) => {
    setTransientToast(msg);
    window.setTimeout(() => {
      setTransientToast((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  const handleStyleToggle = (next: Map2DBaseStyle) => {
    if (onBaseStyleChange) {
      onBaseStyleChange(next);
    } else {
      setInternalStyle(next);
    }
  };

  // Initialize Leaflet Map once on mount + attach Long-Press / Right-Click to Add Stop
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const first = waypoints[0];
    const map = L.map(el, {
      center: [
        first?.lat ?? dayStayAnchor?.lat ?? 48.8566,
        first?.lng ?? dayStayAnchor?.lng ?? 2.3522,
      ],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
    });

    L.control
      .attribution({ position: 'bottomleft', prefix: false })
      .addTo(map);

    const group = L.layerGroup().addTo(map);
    const midLegGroup = L.layerGroup().addTo(map);
    const userGroup = L.layerGroup().addTo(map);
    routeLayersRef.current = group;
    midLegLayersRef.current = midLegGroup;
    userLocationLayerRef.current = userGroup;
    mapRef.current = map;

    const handleZoomEnd = () => {
      setCurrentZoom(map.getZoom());
    };
    map.on('zoomend', handleZoomEnd);

    // Clicking blank map clears selected stop card
    map.on('click', () => {
      setSelectedStopIdx(null);
    });

    // Right-click anywhere on map to add a place
    map.on('contextmenu', (e: L.LeafletMouseEvent) => {
      if (!onHoldMapAddPlaceRef.current) return;
      e.originalEvent?.preventDefault?.();
      onHoldMapAddPlaceRef.current({
        lat: Number(e.latlng.lat.toFixed(6)),
        lng: Number(e.latlng.lng.toFixed(6)),
      });
    });

    // Touch / Mouse Long-Press (~520ms stationary hold) to add a place (Packy "Hold the map to add a place")
    let holdTimer: number | null = null;
    let startPt: { x: number; y: number } | null = null;

    const clearHold = () => {
      if (holdTimer !== null) {
        window.clearTimeout(holdTimer);
        holdTimer = null;
      }
      startPt = null;
    };

    const onPointerDown = (ev: PointerEvent) => {
      if (!onHoldMapAddPlaceRef.current) return;
      if (ev.button !== 0 && ev.pointerType === 'mouse') return;
      const targetEl = ev.target as HTMLElement | null;
      // Ignore presses on existing markers, popups, or floating buttons
      if (
        targetEl?.closest('.leaflet-marker-icon') ||
        targetEl?.closest('.leaflet-popup') ||
        targetEl?.closest('.leaflet-control')
      ) {
        return;
      }

      startPt = { x: ev.clientX, y: ev.clientY };
      clearHold();
      startPt = { x: ev.clientX, y: ev.clientY };

      holdTimer = window.setTimeout(() => {
        holdTimer = null;
        if (!mapRef.current || !onHoldMapAddPlaceRef.current) return;
        const rect = el.getBoundingClientRect();
        const containerPoint = L.point(ev.clientX - rect.left, ev.clientY - rect.top);
        const latlng = mapRef.current.containerPointToLatLng(containerPoint);
        onHoldMapAddPlaceRef.current({
          lat: Number(latlng.lat.toFixed(6)),
          lng: Number(latlng.lng.toFixed(6)),
        });
      }, 520);
    };

    const onPointerMove = (ev: PointerEvent) => {
      if (!startPt || holdTimer === null) return;
      const dist = Math.hypot(ev.clientX - startPt.x, ev.clientY - startPt.y);
      if (dist > 8) {
        clearHold();
      }
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', clearHold);
    el.addEventListener('pointercancel', clearHold);
    map.on('movestart', clearHold);

    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(el);

    return () => {
      clearHold();
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', clearHold);
      el.removeEventListener('pointercancel', clearHold);
      ro.disconnect();
      map?.remove();
      mapRef.current = null;
      routeLayersRef.current = null;
      midLegLayersRef.current = null;
      userLocationLayerRef.current = null;
      tileLayersRef.current = [];
      stopMarkersRef.current = [];
      stayMarkerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Swap 2D map tile layer cleanly (Packy-style Light Positron Roadmap / Satellite Aerial / Night)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    tileLayersRef.current.forEach((layer) => map.removeLayer(layer));
    tileLayersRef.current = [];

    if (activeStyle === 'satellite') {
      const sat = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles © Esri',
          maxZoom: 19,
          crossOrigin: 'anonymous',
        }
      ).addTo(map);

      const labels = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
        {
          attribution: '© OpenStreetMap · CARTO',
          subdomains: 'abcd',
          maxZoom: 20,
          crossOrigin: 'anonymous',
        }
      ).addTo(map);

      tileLayersRef.current = [sat, labels];
    } else if (activeStyle === 'night') {
      const dark = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '© OpenStreetMap · CARTO',
          subdomains: 'abcd',
          maxZoom: 20,
          crossOrigin: 'anonymous',
        }
      ).addTo(map);
      tileLayersRef.current = [dark];
    } else {
      // Airy, high-contrast Packy-style silver-light street map so white store cards & golden routes pop
      const lightMap = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '© OpenStreetMap · CARTO',
          subdomains: 'abcd',
          maxZoom: 20,
          crossOrigin: 'anonymous',
        }
      ).addTo(map);
      tileLayersRef.current = [lightMap];
    }
  }, [activeStyle]);

  // Signature for rebuilding route polylines & markers
  const waypointsSignature = useMemo(
    () =>
      `${multiDayMode ? 'm' : 's'}:${showComparison ? 'c' : 'n'}:${
        dayStayAnchor ? `${dayStayAnchor.placeName}@${dayStayAnchor.lat.toFixed(4)},${dayStayAnchor.lng.toFixed(4)}` : 'nostay'
      }:${waypoints
        .map(
          (w) =>
            `${w.id}@${w.lat.toFixed(4)},${w.lng.toFixed(4)}:${w.transportMode}:${w.stopType || ''}:${w.thumbPhotoUri || ''}:${w.isVisited ? '1' : '0'}`
        )
        .join('|')}`,
    [waypoints, multiDayMode, showComparison, dayStayAnchor]
  );

  // Rebuild route polylines, hotel stay anchor & Packy-style place cards when stops change
  useEffect(() => {
    const map = mapRef.current;
    const group = routeLayersRef.current;
    if (!map || !group) return;

    group.clearLayers();
    stopMarkersRef.current = [];
    stayMarkerRef.current = null;

    if (waypoints.length === 0 && !dayStayAnchor) return;

    // 1. Pre-optimization dashed comparison line
    if (showComparison && previousWaypoints.length >= 2) {
      const prevCurve = buildSmoothGeoRouteSamples(previousWaypoints, 14);
      L.polyline(
        prevCurve.samples.map((p) => [p.lat, p.lng] as L.LatLngExpression),
        {
          color: tkColor('--tk-route-2'),
          weight: 3,
          opacity: 0.72,
          dashArray: '6 6',
        }
      ).addTo(group);
    }

    // 2. Subtle dashed connector from Day Stay Hotel -> Stop #1
    if (!multiDayMode && dayStayAnchor && waypoints.length >= 1) {
      L.polyline(
        [
          [dayStayAnchor.lat, dayStayAnchor.lng],
          [waypoints[0].lat, waypoints[0].lng],
        ],
        {
          color: tkColor('--tk-route-3'),
          weight: 2.5,
          opacity: 0.55,
          dashArray: '5 6',
        }
      ).addTo(group);
    }

    // 3. Crisp Packy-style Golden-Amber route polyline (with white road halo for legibility)
    const { samples, legStartSampleIndices } = curveData;
    for (let leg = 0; leg < waypoints.length - 1; leg += 1) {
      const startIdx = legStartSampleIndices[leg] ?? 0;
      const endIdx = legStartSampleIndices[leg + 1] ?? samples.length - 1;
      const slice = samples.slice(startIdx, endIdx + 1);
      if (slice.length < 2) continue;

      const targetWp = waypoints[leg + 1];
      const legColor =
        multiDayMode && targetWp.dayColor ? targetWp.dayColor : tkColor('--tk-route-6');
      const isFlightOrBoat =
        targetWp.transportMode === 'plane' || targetWp.transportMode === 'boat';

      const latlngs = slice.map((p) => [p.lat, p.lng] as L.LatLngExpression);
      // White casing underneath
      L.polyline(latlngs, {
        color: tkColor('--tk-card'),
        weight: 7,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(group);

      // Primary golden/day route line
      L.polyline(latlngs, {
        color: legColor,
        weight: 4,
        opacity: 0.96,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: isFlightOrBoat ? '7 6' : undefined,
      }).addTo(group);
    }

    // 4. Day Stay Hotel Anchor Pin (compact sleek pill so it never overlaps stop capsules)
    if (!multiDayMode && dayStayAnchor) {
      const stayMk = L.marker([dayStayAnchor.lat, dayStayAnchor.lng], {
        icon: buildHotelStayCardIcon(dayStayAnchor, true, lang),
        zIndexOffset: 320,
      }).addTo(group);
      if (onRequestSetStay) {
        stayMk.on('click', () => {
          onRequestSetStay();
        });
      }
      stayMarkerRef.current = stayMk;
    }

    // 5. Breathing Store-Name Capsules: compact pill by default, expands into rich card on tap
    waypoints.forEach((wp, idx) => {
      const marker = L.marker([wp.lat, wp.lng], {
        icon: buildStopPlaceCardIcon(
          wp,
          false,
          multiDayMode,
          true,
          lang,
          Boolean(onOpenStopDetailRef.current)
        ),
        zIndexOffset: 500 + (waypoints.length - idx) * 10,
      }).addTo(group);

      marker.on('click', (ev: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(ev);
        const origTarget = ev.originalEvent?.target as HTMLElement | null;
        const clickedDetailChevron = Boolean(
          origTarget?.closest('[data-open-detail="1"]')
        );
        const alreadySelected = selectedStopIdxRef.current === idx;

        setSelectedStopIdx(idx);

        map.panTo([wp.lat, wp.lng], { animate: true, duration: 0.45 });
        onSelectStop?.(idx);

        if (
          (clickedDetailChevron || alreadySelected) &&
          onOpenStopDetailRef.current
        ) {
          onOpenStopDetailRef.current(wp.id);
        }
      });

      stopMarkersRef.current.push(marker);
    });

    // 6. Fit real 2D bounds to all stops + hotel stay cleanly with generous card padding
    const boundPoints: L.LatLngTuple[] = waypoints.map((w) => [w.lat, w.lng]);
    if (!multiDayMode && dayStayAnchor) {
      boundPoints.push([dayStayAnchor.lat, dayStayAnchor.lng]);
    }

    if (boundPoints.length === 1) {
      map.setView(boundPoints[0], 15, { animate: false });
      setCurrentZoom(15);
    } else if (boundPoints.length >= 2) {
      const bounds = L.latLngBounds(boundPoints);
      if (showComparison && previousWaypoints.length >= 2) {
        previousWaypoints.forEach((pw) => bounds.extend([pw.lat, pw.lng]));
      }
      map.fitBounds(bounds, {
        paddingTopLeft: [60, 64],
        paddingBottomRight: [64, 52],
        maxZoom: 15,
        animate: false,
      });
      setCurrentZoom(map.getZoom());
    }

    setSelectedStopIdx(null);
  }, [waypointsSignature]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh card icons whenever selection or language changes: selected stop expands into full card
  useEffect(() => {
    stopMarkersRef.current.forEach((mk, idx) => {
      const wp = waypoints[idx];
      if (!wp) return;
      const isSelected = selectedStopIdx === idx;
      mk.setIcon(
        buildStopPlaceCardIcon(
          wp,
          isSelected,
          multiDayMode,
          !isSelected,
          lang,
          Boolean(onOpenStopDetail)
        )
      );
      mk.setZIndexOffset(
        isSelected ? 900 : 500 + (waypoints.length - idx) * 10
      );
    });

    if (stayMarkerRef.current && dayStayAnchor) {
      stayMarkerRef.current.setIcon(
        buildHotelStayCardIcon(dayStayAnchor, true, lang)
      );
    }
  }, [selectedStopIdx, lang, multiDayMode, waypoints, dayStayAnchor, onOpenStopDetail]);

  // Mid-segment travel time pills (visible when zoomed in >= 13 in single-day mode)
  useEffect(() => {
    const midGroup = midLegLayersRef.current;
    if (!midGroup) return;
    midGroup.clearLayers();

    if (multiDayMode || currentZoom < 13 || waypoints.length < 2) return;

    const { samples, legStartSampleIndices, legDistancesKm } = curveData;
    for (let leg = 0; leg < waypoints.length - 1; leg += 1) {
      const startIdx = legStartSampleIndices[leg] ?? 0;
      const endIdx = legStartSampleIndices[leg + 1] ?? samples.length - 1;
      const midSample = samples[Math.floor((startIdx + endIdx) / 2)];
      const nextWp = waypoints[leg + 1];
      if (!midSample || !nextWp) continue;

      const distKm = legDistancesKm[leg] ?? 0.8;
      const estMins =
        nextWp.legDurationMinFromPrev ??
        Math.max(
          3,
          Math.round(
            (distKm * 1.28 * 60) /
              (nextWp.transportMode === 'walk'
                ? 4.5
                : nextWp.transportMode === 'car'
                ? 25
                : 18)
          )
        );

      L.marker([midSample.lat, midSample.lng], {
        icon: buildMidLegDurationIcon(nextWp.transportMode, estMins),
        interactive: false,
        zIndexOffset: 200,
      }).addTo(midGroup);
    }
  }, [curveData, waypoints, multiDayMode, currentZoom]);

  // Respond to external stop jump
  useEffect(() => {
    const map = mapRef.current;
    if (!map || externalFocusTrigger === undefined || externalFocusTrigger <= 0) {
      return;
    }
    const idx = Math.max(
      0,
      Math.min(waypoints.length - 1, externalActiveIndex ?? 0)
    );
    const wp = waypoints[idx];
    if (!wp) return;
    setSelectedStopIdx(idx);
    map.flyTo([wp.lat, wp.lng], 15, { duration: 0.6 });
  }, [externalFocusTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFitOverview = () => {
    const map = mapRef.current;
    if (!map) return;
    const boundPoints: L.LatLngTuple[] = waypoints.map((w) => [w.lat, w.lng]);
    if (!multiDayMode && dayStayAnchor) {
      boundPoints.push([dayStayAnchor.lat, dayStayAnchor.lng]);
    }
    if (boundPoints.length === 1) {
      map.flyTo(boundPoints[0], 15, { duration: 0.55 });
    } else if (boundPoints.length >= 2) {
      const bounds = L.latLngBounds(boundPoints);
      map.flyToBounds(bounds, {
        paddingTopLeft: [70, 78],
        paddingBottomRight: [80, 56],
        maxZoom: 15,
        duration: 0.6,
      });
    }
  };

  const handleLocateOrFit = () => {
    const map = mapRef.current;
    if (!map) return;
    if (!navigator.geolocation) {
      handleFitOverview();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        if (userLocationLayerRef.current) {
          userLocationLayerRef.current.clearLayers();
          L.circleMarker([userLat, userLng], {
            radius: 7,
            color: tkColor('--tk-card'),
            weight: 2.5,
            fillColor: tkColor('--tk-route-3'),
            fillOpacity: 1,
          }).addTo(userLocationLayerRef.current);
        }

        const refWp = waypoints[0];
        const distFromTripKm = refWp
          ? computeGeoDistanceKm({ lat: userLat, lng: userLng }, { lat: refWp.lat, lng: refWp.lng })
          : 0;

        if (!refWp || distFromTripKm <= 65) {
          map.flyTo([userLat, userLng], 15, { duration: 0.65 });
          showToast(copy.centeredGps);
        } else {
          // User is currently home / outside destination city: fit destination stops cleanly
          handleFitOverview();
          showToast(copy.outsideCityFitted(cityLabel));
        }
      },
      () => {
        handleFitOverview();
        showToast(copy.fittedAllStops);
      },
      { enableHighAccuracy: false, timeout: 3500, maximumAge: 60000 }
    );
  };

  const handleFocusWaypoint = (idx: number) => {
    const map = mapRef.current;
    const wp = waypoints[idx];
    if (!map || !wp) return;
    setSelectedStopIdx(idx);
    map.flyTo([wp.lat, wp.lng], Math.max(map.getZoom(), 15), { duration: 0.5 });
    onSelectStop?.(idx);
  };

  if (waypoints.length === 0 && !dayStayAnchor) {
    return (
      <div className="[font-family:'Inter_Variable',Inter,system-ui,'PingFang_SC',sans-serif] [--font-serif:'Playfair_Display',Georgia,'Songti_SC',serif] h-72 tk-bg-paper px-4 flex flex-col items-center justify-center text-center gap-2.5">
        <div className="flex h-11 w-11 items-center justify-center rounded-[20px] bg-white border tk-bc-hair tk-text-forest shadow-2xs">
          <Compass className="h-5 w-5" />
        </div>
        <div className="font-serif text-sm font-bold tk-text-ink">
          {copy.emptyPrompt(scopeLabel)}
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        layout === 'fullscreen'
          ? `[font-family:'Inter_Variable',Inter,system-ui,'PingFang_SC',sans-serif] [--font-serif:'Playfair_Display',Georgia,'Songti_SC',serif] relative w-full h-full tk-bg-forest-plate`
          : `[font-family:'Inter_Variable',Inter,system-ui,'PingFang_SC',sans-serif] [--font-serif:'Playfair_Display',Georgia,'Songti_SC',serif] tk-bg-paper divide-y tk-divide-hair`
      }
    >
      {/* Minimalist Packy-Style Airy 2D Map Viewport */}
      <div
        className={
          layout === 'fullscreen'
            ? 'relative w-full h-full overflow-hidden select-none'
            : 'relative h-[360px] sm:h-[400px] w-full overflow-hidden select-none'
        }
      >
        <div ref={mountRef} className="h-full w-full z-0" />

        {!hideEmbeddedChrome && (
          <>
            {/* Top-Left Auto-Fading (3s) Add-Place Hint + Transient Toast */}
            <div className="pointer-events-none absolute top-3.5 left-3.5 z-[450] flex flex-col items-start gap-2 max-w-[calc(100%-72px)]">
              {onHoldMapAddPlace && !holdHintDismissed && (
                <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border tk-bc-hair bg-white/95 px-3 py-1.5 text-[13px] font-semibold tk-text-ink tk-elev-soft ">
                  <Hand className="h-4 w-4 tk-text-forest shrink-0" />
                  <span className="truncate">
                    {copy.holdOrRightClickHint}
                  </span>
                  <button
                    type="button"
                    onClick={() => setHoldHintDismissed(true)}
                    aria-label={copy.dismissTip}
                    className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full tk-text-ink2 hover:tk-bg-forest-tint hover:tk-text-ink cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {transientToast && (
                <div className="pointer-events-none rounded-full tk-bg-ink-strong px-3.5 py-1.5 text-[13px] font-semibold text-white tk-elev-soft">
                  {transientToast}
                </div>
              )}
            </div>

            {/* Top-Right Minimalist 3-Icon Stack (Fit/Locate · Satellite · Multi-Day) */}
            <div className="absolute top-3.5 right-3.5 z-[450] flex flex-col items-end gap-2">
              {/* 1. Fit All Stops / Locate Me */}
              <button
                type="button"
                onClick={handleLocateOrFit}
                title={copy.fitOrLocateTitle}
                aria-label={copy.fitOrLocateAria}
                className="flex h-10 w-10 items-center justify-center rounded-full border tk-bc-hair bg-white/96 tk-text-ink tk-elev-soft hover:tk-bc-forest hover:tk-text-forest transition-colors cursor-pointer"
              >
                <Crosshair className="h-4.5 w-4.5" />
              </button>

              {/* 2. Street / Satellite Single-Icon Toggle */}
              <button
                type="button"
                onClick={() =>
                  handleStyleToggle(
                    activeStyle === 'satellite' ? 'roadmap' : 'satellite'
                  )
                }
                title={
                  activeStyle === 'satellite'
                    ? copy.switchToStreet
                    : copy.switchToSatellite
                }
                aria-label={copy.toggleSatelliteAria}
                className={`flex h-10 w-10 items-center justify-center rounded-full border tk-elev-soft transition-colors cursor-pointer ${
 activeStyle === 'satellite'
 ? 'tk-bc-forest tk-bg-forest text-white'
 : 'tk-bc-hair bg-white/96 tk-text-ink hover:tk-bc-forest hover:tk-text-forest'
 }`}
              >
                {activeStyle === 'satellite' ? (
                  <Layers className="h-4 w-4" />
                ) : (
                  <Satellite className="h-4 w-4" />
                )}
              </button>

              {/* 3. Multi-Day Route Toggle */}
              {canMultiDayPreview && onToggleMultiDayPreview && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={multiDayMode}
                  onClick={onToggleMultiDayPreview}
                  title={
                    multiDayMode ? copy.exitMultiDay : copy.showMultiDay
                  }
                  aria-label={copy.toggleMultiDayAria}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border tk-elev-soft transition-colors cursor-pointer ${
 multiDayMode
 ? 'tk-bc-forest tk-bg-forest text-white'
 : 'tk-bc-hair bg-white/96 tk-text-ink hover:tk-bc-forest hover:tk-text-forest'
 }`}
                >
                  <CalendarRange className="h-4 w-4" />
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Inline Quick-Jump Store Strip + Hotel Anchor Shortcut */}
      {layout === 'inline' && !hideEmbeddedChrome && !hideInlineStopStrip && (
        <div className="bg-white px-4 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {!multiDayMode && dayStayAnchor && (
              <button
                type="button"
                onClick={() => {
                  const map = mapRef.current;
                  if (map) {
                    map.flyTo([dayStayAnchor.lat, dayStayAnchor.lng], 15, {
                      duration: 0.5,
                    });
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border tk-bc-hair tk-bg-forest-tint px-2.5 py-1 text-[13px] font-bold tk-text-swatch-3 hover:tk-bc-forest transition-colors cursor-pointer"
              >
                <Home className="h-3 w-3 shrink-0" />
                <span className="max-w-[110px] truncate">
                  {dayStayAnchor.placeName}
                </span>
              </button>
            )}

            {waypoints.map((wp, idx) => {
              const isSelected = idx === selectedStopIdx;
              const ModeIcon = TRANSPORT_ICON_COMPONENTS[wp.transportMode];
              return (
                <button
                  key={wp.id}
                  type="button"
                  onClick={() => handleFocusWaypoint(idx)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[13px] font-semibold transition-colors cursor-pointer ${
 isSelected
 ? 'tk-bc-forest tk-bg-forest-tint tk-text-forest'
 : 'tk-bc-hair tk-bg-paper tk-text-ink2 hover:tk-bc-forest hover:tk-text-ink'
 }`}
                >
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full tk-bg-warning font-serif text-[13px] font-extrabold text-white shrink-0">
                    {wp.orderNumber}
                  </span>
                  {idx > 0 && (
                    <ModeIcon className="h-3 w-3 opacity-75 shrink-0" />
                  )}
                  <span className="max-w-[120px] truncate">
                    {translateDemoStopTitle(wp.title, lang)}
                  </span>
                </button>
              );
            })}
          </div>

          <span className="text-[13px] font-serif tk-text-ink2 tabular-nums">
            {copy.spanAndTapHint(curveData.totalDistanceKm.toFixed(1))}
          </span>
        </div>
      )}
    </div>
  );
};
