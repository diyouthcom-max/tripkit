import type { MemoryPhotoMeta, SavedTripEntry } from '../types';
import {
  matchPhotoToTrips,
  parseExifFromArrayBuffer,
  renderFileToMemoryBlobs,
  saveMemoryPhotoBlob,
} from '../utils/memoryPhotoVault';

export { resolveApiUrl } from './apiUrl';

export interface TripDateScanWindow {
  tripId: string;
  startDateIso: string;
  endDateIso: string;
}

export interface NativeScannedAsset {
  localIdentifier: string;
  fileName: string;
  takenAtIso: string;
  width: number;
  height: number;
  lat?: number;
  lng?: number;
  cameraLabel?: string;
  thumbDataUrl: string;
  fullDataUrl?: string;
}

export interface TripPhotoScannerPlugin {
  requestPermissions(): Promise<{ photos: 'granted' | 'limited' | 'denied' }>;
  scanPhotosByDateRanges(options: {
    ranges: TripDateScanWindow[];
    limitPerTrip?: number;
  }): Promise<{ assets: NativeScannedAsset[] }>;
  getHighResPhotoBase64(options: {
    localIdentifier: string;
    maxDimension?: number;
  }): Promise<{ dataUrl: string; width: number; height: number }>;
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => 'ios' | 'android' | 'web';
  Plugins?: {
    TripPhotoScanner?: TripPhotoScannerPlugin;
  };
}

function getCapacitorGlobal(): CapacitorGlobal | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as { Capacitor?: CapacitorGlobal };
  return win.Capacitor ?? null;
}

export function isCapacitorNativeApp(): boolean {
  const cap = getCapacitorGlobal();
  return Boolean(cap?.isNativePlatform?.());
}

export function hasNativeTripPhotoScanner(): boolean {
  const cap = getCapacitorGlobal();
  return Boolean(cap?.isNativePlatform?.() && cap?.Plugins?.TripPhotoScanner);
}

export function buildTripDateScanWindows(trips: SavedTripEntry[]): TripDateScanWindow[] {
  return trips.map((entry) => {
    const dep = entry.state.setup.departureDate;
    const days = Math.max(1, entry.state.setup.days || 1);
    const startMs = /^\d{4}-\d{2}-\d{2}$/.test(dep)
      ? new Date(`${dep}T00:00:00`).getTime()
      : entry.createdAt;
    const endMs = startMs + days * 86400000;
    return {
      tripId: entry.id,
      startDateIso: new Date(startMs).toISOString(),
      endDateIso: new Date(endMs).toISOString(),
    };
  });
}

/**
 * Scans device photo library automatically by trip date ranges when running inside Capacitor iOS/Android
 * (PhotoKit / MediaStore). Never uploads anything to the cloud during indexing.
 */
export async function scanNativePhotosForTrips(
  selectedTrips: SavedTripEntry[],
  fallbackTripId: string
): Promise<MemoryPhotoMeta[]> {
  const cap = getCapacitorGlobal();
  const scanner = cap?.Plugins?.TripPhotoScanner;
  if (!scanner) {
    throw new Error('NATIVE_SCANNER_UNAVAILABLE');
  }

  const perm = await scanner.requestPermissions();
  if (perm.photos === 'denied') {
    throw new Error('PHOTO_PERMISSION_DENIED');
  }

  const ranges = buildTripDateScanWindows(selectedTrips);
  const { assets } = await scanner.scanPhotosByDateRanges({
    ranges,
    limitPerTrip: 60,
  });

  const indexed: MemoryPhotoMeta[] = [];
  for (let i = 0; i < assets.length; i += 1) {
    const asset = assets[i];
    const ts = new Date(asset.takenAtIso).getTime() || Date.now();
    const matched = matchPhotoToTrips(
      { takenTimestamp: ts, lat: asset.lat, lng: asset.lng },
      selectedTrips,
      fallbackTripId
    );
    const id = `nat_${asset.localIdentifier.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

    await saveMemoryPhotoBlob({
      id,
      fullDataUrl: asset.fullDataUrl || asset.thumbDataUrl,
      thumbDataUrl: asset.thumbDataUrl,
      updatedAt: Date.now(),
    });

    indexed.push({
      id,
      fileName: asset.fileName || `PHOTO_${i + 1}.JPG`,
      takenAtIso: new Date(ts).toISOString(),
      takenTimestamp: ts,
      width: asset.width || 2400,
      height: asset.height || 1800,
      lat: matched.lat,
      lng: matched.lng,
      cameraLabel: asset.cameraLabel,
      matchedTripId: matched.matchedTripId,
      matchedDay: matched.matchedDay,
      matchedCity: matched.matchedCity,
      matchedStopId: matched.matchedStopId,
      matchedStopTitle: matched.matchedStopTitle,
      isFavorite: i < 12,
      sourceType: 'native_capacitor',
      createdAt: Date.now() + i,
    });
  }

  return indexed;
}

/**
 * Indexes user-selected local image files on Web 100% locally in the browser:
 * extracts EXIF DateTimeOriginal + GPS coordinates, matches to saved trip days & stops,
 * and caches thumbnails + print-grade images in IndexedDB without uploading to any server.
 */
export async function indexLocalWebPhotoFiles(
  files: FileList | File[],
  selectedTrips: SavedTripEntry[],
  fallbackTripId: string,
  onProgress?: (done: number, total: number) => void
): Promise<MemoryPhotoMeta[]> {
  const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
  const results: MemoryPhotoMeta[] = [];

  for (let i = 0; i < arr.length; i += 1) {
    const file = arr[i];
    try {
      const [buffer, rendered] = await Promise.all([
        file.arrayBuffer(),
        renderFileToMemoryBlobs(file),
      ]);
      const exif = parseExifFromArrayBuffer(buffer);
      const takenTs = exif.takenTimestamp || file.lastModified || Date.now();
      const matched = matchPhotoToTrips(
        { takenTimestamp: takenTs, lat: exif.lat, lng: exif.lng },
        selectedTrips,
        fallbackTripId
      );

      const id = `loc_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`;
      await saveMemoryPhotoBlob({
        id,
        fullDataUrl: rendered.fullDataUrl,
        thumbDataUrl: rendered.thumbDataUrl,
        updatedAt: Date.now(),
      });

      results.push({
        id,
        fileName: file.name,
        takenAtIso: exif.takenAtIso || new Date(takenTs).toISOString(),
        takenTimestamp: takenTs,
        width: rendered.width,
        height: rendered.height,
        lat: matched.lat,
        lng: matched.lng,
        cameraLabel: exif.cameraLabel,
        matchedTripId: matched.matchedTripId,
        matchedDay: matched.matchedDay,
        matchedCity: matched.matchedCity,
        matchedStopId: matched.matchedStopId,
        matchedStopTitle: matched.matchedStopTitle,
        isFavorite: i < 12,
        sourceType: 'local_exif',
        createdAt: Date.now() + i,
      });
    } catch {
      // Skip unreadable file without aborting batch
    }
    onProgress?.(i + 1, arr.length);
  }

  return results.sort((a, b) => a.takenTimestamp - b.takenTimestamp);
}
