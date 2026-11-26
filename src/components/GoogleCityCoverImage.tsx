import React, { useEffect, useState, type CSSProperties } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type { AppLanguage } from '../types';
import { getConfiguredGoogleMapsApiKey } from '../utils/googleMapsHelpers';
import {
  resolveGoogleCityCoverPhoto,
  type GoogleCityCoverResult,
} from '../services/googlePlaceLiveStore';
import { useGooglePhotoBlob } from '../hooks/useGooglePhotoBlob';
import { GooglePhotoCredit } from './GooglePhotoCredit';

export interface GoogleCityCoverImageProps {
  city?: string;
  language: AppLanguage;
  fallbackSrc: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  /** When false, skip photographer overlay (tiny thumbs). Default true. */
  showCredit?: boolean;
  /** Optional wrapper class (defaults to relative overflow-hidden h-full w-full). */
  wrapperClassName?: string;
}

/**
 * Auto-mode trip cover: Google Places city landmark photo via blob URL + credit.
 * Falls back to local preset `fallbackSrc` while loading / on failure / without Maps key.
 * Must render under <APIProvider> when Maps key is configured.
 */
export const GoogleCityCoverImage: React.FC<GoogleCityCoverImageProps> = (props) => {
  const mapsKey = getConfiguredGoogleMapsApiKey();
  if (!mapsKey || !props.city?.trim()) {
    return <FallbackCoverImg {...props} />;
  }
  return <GoogleCityCoverImageInner {...props} />;
};

const FallbackCoverImg: React.FC<GoogleCityCoverImageProps> = ({
  fallbackSrc,
  alt = '',
  className,
  style,
  wrapperClassName,
}) => (
  <div className={wrapperClassName ?? 'relative h-full w-full overflow-hidden'}>
    <img src={fallbackSrc} alt={alt} className={className} style={style} />
  </div>
);

const GoogleCityCoverImageInner: React.FC<GoogleCityCoverImageProps> = ({
  city,
  language,
  fallbackSrc,
  alt = '',
  className,
  style,
  showCredit = true,
  wrapperClassName,
}) => {
  const placesLib = useMapsLibrary('places');
  const [cover, setCover] = useState<GoogleCityCoverResult | null>(null);
  const [lookupFailed, setLookupFailed] = useState(false);

  useEffect(() => {
    const trimmed = String(city || '').trim();
    setCover(null);
    setLookupFailed(false);
    if (!trimmed || !placesLib) {
      return;
    }
    let cancelled = false;
    void resolveGoogleCityCoverPhoto({
      placesLib,
      city: trimmed,
      language,
    }).then((result) => {
      if (cancelled) return;
      if (result?.photoUri) {
        setCover(result);
        setLookupFailed(false);
      } else {
        setCover(null);
        setLookupFailed(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [city, language, placesLib]);

  const {
    url: blobUrl,
    failed: blobFailed,
  } = useGooglePhotoBlob(cover?.photoUri);

  const useGoogle =
    Boolean(blobUrl) && !blobFailed && !lookupFailed && Boolean(cover?.photoUri);
  const src = useGoogle && blobUrl ? blobUrl : fallbackSrc;

  return (
    <div className={wrapperClassName ?? 'relative h-full w-full overflow-hidden'}>
      <img src={src} alt={alt} className={className} style={style} />
      {useGoogle && showCredit && cover?.attribution?.displayName ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 [&>a]:pointer-events-auto [&>span]:pointer-events-auto">
          <GooglePhotoCredit
            displayName={cover.attribution.displayName}
            uri={cover.attribution.uri}
            variant="overlay"
          />
        </div>
      ) : null}
    </div>
  );
};
