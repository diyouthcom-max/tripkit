import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { ExternalLink, Loader2, MapPin, Play } from 'lucide-react';
import {
  buildGoogleMapsSearchUrl,
  getConfiguredGoogleMapsApiKey,
  sanitizeMapsErrorMessage,
} from '../utils/googleMapsHelpers';
import {
  isNativeMapOpenerAvailable,
  openMapExternally,
} from '../services/nativeMapOpener';
import { tkColor } from '../utils/tkColor';
import type { AppLanguage } from '../types';
import { normalizeAppLanguage } from '../utils/preferencesHelpers';
import { getMapPreviewCopy } from '../i18n/packs/utilsAndModalsPack';

interface SettingsMapPreviewCardProps {
  cityHint: string;
}

const DEFAULT_PREVIEW_COORDS: google.maps.LatLngLiteral = {
  lat: 48.8566,
  lng: 2.3522,
};

const ThumbnailMapProbe: React.FC<{
  cityHint: string;
  probeRunId: number;
  activeLang: AppLanguage;
  onResult: (result: { ok: boolean; message: string }) => void;
}> = ({ cityHint, probeRunId, activeLang, onResult }) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const copy = getMapPreviewCopy(activeLang);
  const [pinPos, setPinPos] = useState<google.maps.LatLngLiteral>(DEFAULT_PREVIEW_COORDS);
  const [pinTitle, setPinTitle] = useState<string>(cityHint || copy.defaultCity);

  useEffect(() => {
    let cancelled = false;
    if (!placesLib || !map) return;

    const runProbe = async () => {
      try {
        const query = (cityHint || 'Paris').trim();
        const { places } = await placesLib.Place.searchByText({
          textQuery: query,
          fields: ['location', 'displayName'],
          maxResultCount: 1,
          internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
        });
        if (cancelled) return;

        const firstPlace = places?.[0];
        const loc = firstPlace?.location;
        if (!loc) {
          onResultRef.current({
            ok: false,
            message: copy.placesNoMatch(query),
          });
          return;
        }

        const nextPos = { lat: loc.lat(), lng: loc.lng() };
        setPinPos(nextPos);
        setPinTitle(firstPlace.displayName || query);
        map.setCenter(nextPos);
        map.setZoom(13);

        // Also test a lightweight Routes API call nearby if routesLib is loaded
        if (routesLib) {
          try {
            await routesLib.Route.computeRoutes({
              origin: nextPos,
              destination: { lat: nextPos.lat + 0.008, lng: nextPos.lng + 0.008 },
              travelMode:
                (routesLib.TravelMode && routesLib.TravelMode.WALKING) ||
                ('WALKING' as google.maps.TravelMode),
              fields: ['distanceMeters'],
              internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
            });
            if (!cancelled) {
              onResultRef.current({
                ok: true,
                message: copy.mapPlacesRoutesOk(firstPlace.displayName || query),
              });
            }
          } catch (routeErr) {
            if (!cancelled) {
              console.warn(
                'Routes API probe warning in Settings preview:',
                sanitizeMapsErrorMessage(routeErr)
              );
              onResultRef.current({
                ok: true,
                message: copy.mapPlacesRoutesFallback(firstPlace.displayName || query),
              });
            }
          }
        } else {
          onResultRef.current({
            ok: true,
            message: copy.mapPlacesOnlyOk(firstPlace.displayName || query),
          });
        }
      } catch (err) {
        if (!cancelled) {
          console.warn(
            'Places probe failed in Settings preview:',
            sanitizeMapsErrorMessage(err)
          );
          onResultRef.current({
            ok: false,
            message: copy.placesFailedMsg,
          });
        }
      }
    };

    void runProbe();
    return () => {
      cancelled = true;
    };
  }, [placesLib, routesLib, map, cityHint, probeRunId, copy]);

  return (
    <AdvancedMarker position={pinPos} title={pinTitle}>
      <Pin background={tkColor('--tk-route-1')} borderColor={tkColor('--tk-card')} glyphColor={tkColor('--tk-card')} />
    </AdvancedMarker>
  );
};

export const SettingsMapPreviewCard: React.FC<SettingsMapPreviewCardProps> = ({
  cityHint,
}) => {
  const { i18n } = useTranslation();
  const activeLang: AppLanguage = normalizeAppLanguage(i18n.language, 'en-US');
  const copy = getMapPreviewCopy(activeLang);

  const apiKey = getConfiguredGoogleMapsApiKey();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [probeRunId, setProbeRunId] = useState(0);
  const [testing, setTesting] = useState(false);
  const [probeResult, setProbeResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const handleRunTest = () => {
    setPreviewOpen(true);
    setProbeRunId((n) => n + 1);
    if (apiKey) {
      setTesting(true);
      setProbeResult(null);
    } else {
      setTesting(false);
      setProbeResult({
        ok: false,
        message: copy.standardModeNotice,
      });
    }
  };

  return (
    <div className="[font-family:'Inter_Variable',Inter,system-ui,'PingFang_SC',sans-serif] [--font-serif:'Playfair_Display',Georgia,'Songti_SC',serif] pl-2.5 pr-4 py-3.5 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] border tk-bc-hair tk-bg-forest-tint tk-text-swatch-3">
            <MapPin className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-serif font-bold tk-text-ink">
              {copy.cardTitle}
            </div>
            <div className="mt-0.5 text-sm tk-text-ink2">
              {apiKey ? copy.connectedSub : copy.standardSub}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {previewOpen && (
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="rounded-[16px] border tk-bc-hair bg-white px-2.5 py-1.5 text-sm font-semibold tk-text-ink2 hover:tk-text-ink whitespace-nowrap cursor-pointer"
            >
              {copy.hidePreviewBtn}
            </button>
          )}
          <button
            type="button"
            onClick={handleRunTest}
            disabled={testing}
            className="inline-flex items-center gap-1.5 rounded-[16px] tk-bg-forest px-3.5 py-1.5 text-sm font-bold text-white hover:tk-bg-press disabled:opacity-60 whitespace-nowrap cursor-pointer"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {previewOpen ? copy.refreshPreviewBtn : copy.previewMapBtn}
          </button>
        </div>
      </div>

      {previewOpen && (
        <div className="rounded-[16px] border tk-bc-hair bg-white overflow-hidden">
          {apiKey ? (
            /* h-44(176) → h-52(208): +32px attribution safety for .gm-style-cc + logo */
            <div
              className="h-52 w-full tk-bg-forest-plate"
              data-tk-map-attribution="google"
            >
              <GoogleMap
                mapId="DEMO_MAP_ID"
                defaultCenter={DEFAULT_PREVIEW_COORDS}
                defaultZoom={12}
                disableDefaultUI
                gestureHandling="cooperative"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                className="h-full w-full"
              >
                <ThumbnailMapProbe
                  cityHint={cityHint}
                  probeRunId={probeRunId}
                  activeLang={activeLang}
                  onResult={(res) => {
                    setTesting(false);
                    setProbeResult(res);
                  }}
                />
              </GoogleMap>
            </div>
          ) : (
            <div className="px-4 py-3.5 tk-bg-card flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm tk-text-ink2 leading-relaxed">
                {copy.externalMapsHint}
              </div>
              <a
                href={buildGoogleMapsSearchUrl({ title: cityHint || 'Paris' })}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  // Web: keep default <a> navigation (popup blockers still allow user-gesture links).
                  // Native: preventDefault and hand off to system Maps.
                  if (!isNativeMapOpenerAvailable()) return;
                  e.preventDefault();
                  void openMapExternally({
                    url: buildGoogleMapsSearchUrl({ title: cityHint || 'Paris' }),
                    query: cityHint || 'Paris',
                  });
                }}
                className="inline-flex items-center gap-1 rounded-lg border tk-bc-hair bg-white px-2.5 py-1.5 text-sm font-semibold tk-text-swatch-3 hover:tk-bg-forest-tint whitespace-nowrap shrink-0"
              >
                <ExternalLink className="h-3 w-3" />
                {copy.openMapsBtn}
              </a>
            </div>
          )}

          {probeResult && (
            <div
              className={`border-t tk-bc-hair px-3.5 py-2 text-[13px] leading-relaxed flex flex-wrap items-center justify-between gap-2 ${
                probeResult.ok
                  ? 'tk-bg-forest-tint tk-text-forest'
                  : 'tk-bg-warning-tint tk-text-warning'
              }`}
            >
              <span className="leading-snug flex-1 min-w-[10rem]">{probeResult.message}</span>
              {!probeResult.ok && (
                <a
                  href={buildGoogleMapsSearchUrl({ title: cityHint || 'Paris' })}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (!isNativeMapOpenerAvailable()) return;
                    e.preventDefault();
                    void openMapExternally({
                      url: buildGoogleMapsSearchUrl({ title: cityHint || 'Paris' }),
                      query: cityHint || 'Paris',
                    });
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border tk-bc-hair bg-white px-2.5 py-1 text-[13px] font-semibold tk-text-forest cursor-pointer whitespace-nowrap"
                >
                  <ExternalLink className="h-3 w-3" />
                  {copy.openMapsBtn}
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

