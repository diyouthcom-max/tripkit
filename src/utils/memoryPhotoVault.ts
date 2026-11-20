import coverAlpinePeaks from '../assets/images/cover_alpine_peaks_1794973483787.jpg';
import coverCanalAutumn from '../assets/images/cover_canal_autumn_1794973439350.jpg';
import coverEuropeClassic from '../assets/images/cover_europe_classic_1794973437090.jpg';
import coverJapanFuji from '../assets/images/cover_japan_fuji_1794973441072.jpg';
import coverModernMetropolis from '../assets/images/cover_modern_metropolis_1794973484056.jpg';
import coverTropicalCoast from '../assets/images/cover_tropical_coast_1794973443012.jpg';
import type {
  MemoryPhotoMeta,
  PhotobookDraft,
  PhotobookFormatId,
  PhotoPrintDpiGrade,
  SavedTripEntry,
  TimelineNode,
} from '../types';
import { getCityForDay, getPrimaryCityName } from './itineraryHelpers';

const DB_NAME = 'trip_kit_memories_vault_v1';
const STORE_NAME = 'memory_photo_blobs';
const DB_VERSION = 1;

export const MEMORY_PHOTO_META_KEY = 'tripkit_memory_photo_meta_v1';
export const PHOTOBOOK_DRAFT_STORAGE_KEY = 'tripkit_photobook_draft_v1';

export interface StoredMemoryPhotoBlob {
  id: string;
  fullDataUrl: string;
  thumbDataUrl: string;
  updatedAt: number;
}

function openMemoryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open memory photo vault'));
  });
}

export async function saveMemoryPhotoBlob(record: StoredMemoryPhotoBlob): Promise<void> {
  try {
    const db = await openMemoryDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error ?? new Error('Failed to save memory photo blob'));
      };
    });
  } catch {
    // Graceful no-op if IndexedDB is blocked in private mode
  }
}

export async function loadMemoryPhotoBlob(id: string): Promise<StoredMemoryPhotoBlob | null> {
  if (!id) return null;
  try {
    const db = await openMemoryDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => {
        const res = req.result as StoredMemoryPhotoBlob | undefined;
        db.close();
        resolve(res ?? null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

export async function loadAllMemoryPhotoBlobsMap(
  ids: string[]
): Promise<Record<string, StoredMemoryPhotoBlob>> {
  const result: Record<string, StoredMemoryPhotoBlob> = {};
  if (ids.length === 0) return result;
  try {
    const db = await openMemoryDb();
    await Promise.all(
      ids.map(
        (id) =>
          new Promise<void>((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).get(id);
            req.onsuccess = () => {
              const rec = req.result as StoredMemoryPhotoBlob | undefined;
              if (rec) result[id] = rec;
              resolve();
            };
            req.onerror = () => resolve();
          })
      )
    );
    db.close();
  } catch {
    // Fallback empty map
  }
  return result;
}

export async function deleteMemoryPhotoBlob(id: string): Promise<void> {
  if (!id) return;
  try {
    const db = await openMemoryDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    });
  } catch {
    // Ignore cleanup errors
  }
}

export function loadMemoryPhotoMetaList(): MemoryPhotoMeta[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(MEMORY_PHOTO_META_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MemoryPhotoMeta[]) : [];
  } catch {
    return [];
  }
}

export function saveMemoryPhotoMetaList(list: MemoryPhotoMeta[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MEMORY_PHOTO_META_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage quota warning for metadata
  }
}

export function loadSavedPhotobookDraft(): PhotobookDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PHOTOBOOK_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PhotobookDraft;
  } catch {
    return null;
  }
}

export function savePhotobookDraft(draft: PhotobookDraft): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PHOTOBOOK_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Ignore storage quota warning
  }
}

export interface ParsedExifInfo {
  takenTimestamp?: number;
  takenAtIso?: string;
  lat?: number;
  lng?: number;
  cameraLabel?: string;
}

function readAscii(view: DataView, start: number, length: number): string {
  let out = '';
  const max = Math.min(view.byteLength, start + length);
  for (let i = start; i < max; i += 1) {
    const code = view.getUint8(i);
    if (code === 0) break;
    out += String.fromCharCode(code);
  }
  return out.trim();
}

function readExifRationalTriplet(
  view: DataView,
  tiffStart: number,
  valueOffset: number,
  littleEndian: boolean
): number | undefined {
  if (tiffStart + valueOffset + 24 > view.byteLength) return undefined;
  const readRat = (pos: number) => {
    const num = view.getUint32(pos, littleEndian);
    const den = view.getUint32(pos + 4, littleEndian);
    return den === 0 ? 0 : num / den;
  };
  const deg = readRat(tiffStart + valueOffset);
  const min = readRat(tiffStart + valueOffset + 8);
  const sec = readRat(tiffStart + valueOffset + 16);
  const dec = deg + min / 60 + sec / 3600;
  return Number.isFinite(dec) ? dec : undefined;
}

function parseExifDateString(raw: string): { ts: number; iso: string } | null {
  // Standard EXIF format: "YYYY:MM:DD HH:MM:SS"
  const m = /^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/.exec(raw.trim());
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  return { ts: dt.getTime(), iso: dt.toISOString() };
}

/**
 * Lightweight zero-dependency JPEG EXIF reader (runs 100% locally in browser).
 * Extracts DateTimeOriginal, GPSLatitude/Longitude, and Camera Model.
 */
export function parseExifFromArrayBuffer(buffer: ArrayBuffer): ParsedExifInfo {
  const result: ParsedExifInfo = {};
  try {
    const view = new DataView(buffer);
    if (view.byteLength < 12 || view.getUint16(0, false) !== 0xffd8) {
      return result;
    }

    let offset = 2;
    while (offset + 4 < view.byteLength) {
      const marker = view.getUint16(offset, false);
      offset += 2;
      if (marker === 0xffda || marker === 0xffd9) break;
      const segLen = view.getUint16(offset, false);
      if (segLen < 2 || offset + segLen > view.byteLength) break;

      if (marker === 0xffe1 && segLen > 10) {
        const header = readAscii(view, offset + 2, 4);
        if (header === 'Exif') {
          const tiffStart = offset + 8;
          const byteOrder = view.getUint16(tiffStart, false);
          const little = byteOrder === 0x4949;
          const ifd0Offset = view.getUint32(tiffStart + 4, little);
          if (tiffStart + ifd0Offset + 2 <= view.byteLength) {
            let exifIfdPtr = 0;
            let gpsIfdPtr = 0;
            let dateFallback = '';

            const ifd0Count = view.getUint16(tiffStart + ifd0Offset, little);
            for (let i = 0; i < ifd0Count; i += 1) {
              const entryPos = tiffStart + ifd0Offset + 2 + i * 12;
              if (entryPos + 12 > view.byteLength) break;
              const tag = view.getUint16(entryPos, little);
              const count = view.getUint32(entryPos + 4, little);
              const valOff = view.getUint32(entryPos + 8, little);

              if (tag === 0x0110 && count > 0 && count < 64) {
                const strPos = count <= 4 ? entryPos + 8 : tiffStart + valOff;
                result.cameraLabel = readAscii(view, strPos, count);
              } else if (tag === 0x0132 && count >= 19 && count < 32) {
                dateFallback = readAscii(view, tiffStart + valOff, count);
              } else if (tag === 0x8769) {
                exifIfdPtr = valOff;
              } else if (tag === 0x8825) {
                gpsIfdPtr = valOff;
              }
            }

            if (exifIfdPtr > 0 && tiffStart + exifIfdPtr + 2 <= view.byteLength) {
              const exifCount = view.getUint16(tiffStart + exifIfdPtr, little);
              for (let i = 0; i < exifCount; i += 1) {
                const entryPos = tiffStart + exifIfdPtr + 2 + i * 12;
                if (entryPos + 12 > view.byteLength) break;
                const tag = view.getUint16(entryPos, little);
                const count = view.getUint32(entryPos + 4, little);
                const valOff = view.getUint32(entryPos + 8, little);
                if ((tag === 0x9003 || tag === 0x9004) && count >= 19 && count < 32) {
                  const rawDate = readAscii(view, tiffStart + valOff, count);
                  const parsed = parseExifDateString(rawDate);
                  if (parsed) {
                    result.takenTimestamp = parsed.ts;
                    result.takenAtIso = parsed.iso;
                    break;
                  }
                }
              }
            }

            if (!result.takenTimestamp && dateFallback) {
              const parsed = parseExifDateString(dateFallback);
              if (parsed) {
                result.takenTimestamp = parsed.ts;
                result.takenAtIso = parsed.iso;
              }
            }

            if (gpsIfdPtr > 0 && tiffStart + gpsIfdPtr + 2 <= view.byteLength) {
              const gpsCount = view.getUint16(tiffStart + gpsIfdPtr, little);
              let latRef = 'N';
              let lngRef = 'E';
              let latVal: number | undefined;
              let lngVal: number | undefined;

              for (let i = 0; i < gpsCount; i += 1) {
                const entryPos = tiffStart + gpsIfdPtr + 2 + i * 12;
                if (entryPos + 12 > view.byteLength) break;
                const tag = view.getUint16(entryPos, little);
                const valOff = view.getUint32(entryPos + 8, little);
                if (tag === 0x0001) {
                  latRef = readAscii(view, entryPos + 8, 2) || 'N';
                } else if (tag === 0x0002) {
                  latVal = readExifRationalTriplet(view, tiffStart, valOff, little);
                } else if (tag === 0x0003) {
                  lngRef = readAscii(view, entryPos + 8, 2) || 'E';
                } else if (tag === 0x0004) {
                  lngVal = readExifRationalTriplet(view, tiffStart, valOff, little);
                }
              }

              if (latVal !== undefined && lngVal !== undefined && (latVal !== 0 || lngVal !== 0)) {
                result.lat = latRef.toUpperCase() === 'S' ? -latVal : latVal;
                result.lng = lngRef.toUpperCase() === 'W' ? -lngVal : lngVal;
              }
            }
          }
        }
        break;
      }
      offset += segLen;
    }
  } catch {
    // Ignore malformed EXIF headers
  }
  return result;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function matchPhotoToTrips(
  params: {
    takenTimestamp: number;
    lat?: number;
    lng?: number;
  },
  trips: SavedTripEntry[],
  fallbackTripId: string
): {
  matchedTripId: string;
  matchedDay: number;
  matchedCity: string;
  matchedStopId?: string;
  matchedStopTitle?: string;
  lat?: number;
  lng?: number;
} {
  const safeTrips = trips.length > 0 ? trips : [];
  let chosenEntry =
    safeTrips.find((t) => t.id === fallbackTripId) || safeTrips[0];
  let chosenDay = 1;

  // 1. Match by trip date window first
  const photoDateMs = params.takenTimestamp;
  let bestDayGap = Number.POSITIVE_INFINITY;

  for (const entry of safeTrips) {
    const depStr = entry.state.setup.departureDate;
    const totalDays = Math.max(1, entry.state.setup.days || 1);
    if (/^\d{4}-\d{2}-\d{2}$/.test(depStr)) {
      const startMs = new Date(`${depStr}T00:00:00`).getTime();
      const endMs = startMs + totalDays * 86400000;
      if (photoDateMs >= startMs - 12 * 3600000 && photoDateMs <= endMs + 12 * 3600000) {
        const dayIndex = Math.min(
          totalDays,
          Math.max(1, Math.floor((photoDateMs - startMs) / 86400000) + 1)
        );
        chosenEntry = entry;
        chosenDay = dayIndex;
        bestDayGap = 0;
        break;
      }
      const gap = Math.min(Math.abs(photoDateMs - startMs), Math.abs(photoDateMs - endMs));
      if (gap < bestDayGap) {
        bestDayGap = gap;
        chosenEntry = entry;
        chosenDay = photoDateMs < startMs ? 1 : totalDays;
      }
    }
  }

  // 2. If GPS coordinates exist, refine stop & day match by proximity
  let bestStop: TimelineNode | undefined;
  if (params.lat !== undefined && params.lng !== undefined) {
    let minKm = Number.POSITIVE_INFINITY;
    for (const entry of safeTrips) {
      for (const node of entry.state.timeline || []) {
        if (typeof node.lat === 'number' && typeof node.lng === 'number') {
          const dist = haversineKm(params.lat, params.lng, node.lat, node.lng);
          if (dist < minKm && dist <= 65) {
            minKm = dist;
            chosenEntry = entry;
            chosenDay = node.day ?? 1;
            bestStop = node;
          }
        }
      }
    }
  }

  if (!chosenEntry) {
    return {
      matchedTripId: fallbackTripId,
      matchedDay: 1,
      matchedCity: '巴黎',
      lat: params.lat,
      lng: params.lng,
    };
  }

  const dayNodes = (chosenEntry.state.timeline || []).filter(
    (n) => (n.day ?? 1) === chosenDay
  );
  if (!bestStop && dayNodes.length > 0) {
    // Match by hour of day if timestamp available
    const dt = new Date(params.takenTimestamp);
    const mins = dt.getHours() * 60 + dt.getMinutes();
    let bestTimeDiff = Number.POSITIVE_INFINITY;
    for (const node of dayNodes) {
      const [hh, mm] = (node.time || '12:00').split(':').map(Number);
      const nodeMins = (hh || 12) * 60 + (mm || 0);
      const diff = Math.abs(mins - nodeMins);
      if (diff < bestTimeDiff) {
        bestTimeDiff = diff;
        bestStop = node;
      }
    }
  }

  const totalDays = Math.max(1, chosenEntry.state.setup.days || 1);
  const cityRaw = getCityForDay(
    chosenEntry.state.setup.cities,
    chosenDay,
    totalDays,
    chosenEntry.state.timeline,
    undefined,
    chosenEntry.state.setup.cityDays
  );
  const matchedCity = getPrimaryCityName(cityRaw) || chosenEntry.state.setup.cities[0] || '旅行地';

  return {
    matchedTripId: chosenEntry.id,
    matchedDay: chosenDay,
    matchedCity,
    matchedStopId: bestStop?.id,
    matchedStopTitle: bestStop?.title,
    lat: params.lat ?? bestStop?.lat,
    lng: params.lng ?? bestStop?.lng,
  };
}

/**
 * Evaluates print crispness at 300 DPI for physical photobook production.
 * - 210x210mm full bleed @ 300 DPI = 2480x2480px (>= 1800px short edge = optimal, >= 1100px = good)
 * - 148x210mm A5 @ 300 DPI = 1748x2480px (>= 1450px short edge = optimal, >= 950px = good)
 */
export function evaluatePhotoPrintDpi(
  width: number,
  height: number,
  formatId: PhotobookFormatId
): {
  grade: PhotoPrintDpiGrade;
  estimatedDpi: number;
  labelZh: string;
  labelEn: string;
} {
  const shortEdge = Math.max(1, Math.min(width || 1600, height || 1200));
  const targetMm = formatId === 'square_210' ? 210 : 148;
  const targetInches = targetMm / 25.4;
  const estimatedDpi = Math.round(shortEdge / targetInches);

  if (estimatedDpi >= 240) {
    return {
      grade: 'optimal_300dpi',
      estimatedDpi: Math.min(350, estimatedDpi),
      labelZh: `${Math.min(350, estimatedDpi)} DPI · 适合跨页满版印刷`,
      labelEn: `${Math.min(350, estimatedDpi)} DPI · Full-bleed ready`,
    };
  }
  if (estimatedDpi >= 150) {
    return {
      grade: 'good_200dpi',
      estimatedDpi,
      labelZh: `${estimatedDpi} DPI · 适合单页留白排版`,
      labelEn: `${estimatedDpi} DPI · Framed page ready`,
    };
  }
  return {
    grade: 'low_res_grid_only',
    estimatedDpi,
    labelZh: `${estimatedDpi} DPI · 建议双图拼版防模糊`,
    labelEn: `${estimatedDpi} DPI · Best for 2-up collage`,
  };
}

/**
 * Compresses a local File into a print-grade DataURL (up to 2200px) and an AI/UI thumbnail (720px),
 * while reading original pixel dimensions for 300DPI validation.
 */
export function renderFileToMemoryBlobs(file: File): Promise<{
  width: number;
  height: number;
  fullDataUrl: string;
  thumbDataUrl: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read local image'));
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : '';
      if (!src) {
        reject(new Error('Empty image content'));
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error('Unsupported image format'));
      img.onload = () => {
        const naturalW = img.naturalWidth || img.width || 1600;
        const naturalH = img.naturalHeight || img.height || 1200;

        const makeScaled = (maxDim: number, quality: number) => {
          let w = naturalW;
          let h = naturalH;
          if (w > maxDim || h > maxDim) {
            const ratio = Math.min(maxDim / w, maxDim / h);
            w = Math.max(1, Math.round(w * ratio));
            h = Math.max(1, Math.round(h * ratio));
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return src;
          ctx.drawImage(img, 0, 0, w, h);
          return canvas.toDataURL('image/jpeg', quality);
        };

        resolve({
          width: naturalW,
          height: naturalH,
          fullDataUrl: makeScaled(2200, 0.88),
          thumbDataUrl: makeScaled(680, 0.78),
        });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Generates curated local sample travel photos mapped directly onto the user's selected trips
 * using bundled high-res local assets so users can immediately test multi-trip AI layout & 300DPI PDF export.
 */
export function buildDemoSampleMemoryPhotos(
  selectedTrips: SavedTripEntry[]
): MemoryPhotoMeta[] {
  const samplePool = [
    { url: coverEuropeClassic, camera: 'Leica Q3 · 28mm f/1.7', w: 2880, h: 2160 },
    { url: coverCanalAutumn, camera: 'iPhone 16 Pro · 24mm f/1.78', w: 3024, h: 2268 },
    { url: coverJapanFuji, camera: 'Fujifilm X100VI · 23mm f/2', w: 2960, h: 2220 },
    { url: coverAlpinePeaks, camera: 'Sony A7C II · 35mm f/1.8', w: 3200, h: 2400 },
    { url: coverModernMetropolis, camera: 'iPhone 16 Pro · 48mm f/1.78', w: 2688, h: 2016 },
    { url: coverTropicalCoast, camera: 'Ricoh GR IIIx · 40mm f/2.8', w: 2760, h: 2070 },
  ];

  const out: MemoryPhotoMeta[] = [];
  let idx = 0;

  for (const trip of selectedTrips) {
    const dep = trip.state.setup.departureDate || '2026-11-14';
    const totalDays = Math.max(1, trip.state.setup.days || 3);
    const nodes = trip.state.timeline || [];

    const pickedNodes =
      nodes.length > 0
        ? nodes.filter((_, i) => i % Math.max(1, Math.floor(nodes.length / 4)) === 0).slice(0, 4)
        : [undefined, undefined, undefined];

    pickedNodes.forEach((node, localIdx) => {
      const sample = samplePool[idx % samplePool.length];
      const day = node?.day ?? Math.min(totalDays, localIdx + 1);
      const city =
        getPrimaryCityName(
          node?.city ||
            getCityForDay(
              trip.state.setup.cities,
              day,
              totalDays,
              trip.state.timeline,
              undefined,
              trip.state.setup.cityDays
            )
        ) ||
        trip.state.setup.cities[0] ||
        '巴黎';
      const baseMs = /^\d{4}-\d{2}-\d{2}$/.test(dep)
        ? new Date(`${dep}T10:30:00`).getTime() + (day - 1) * 86400000 + localIdx * 7200000
        : Date.now() - (6 - idx) * 86400000;

      out.push({
        id: `sample_mem_${trip.id}_${localIdx}_${Date.now() + idx}`,
        fileName: `IMG_${2084 + idx}.JPG`,
        takenAtIso: new Date(baseMs).toISOString(),
        takenTimestamp: baseMs,
        width: sample.w,
        height: sample.h,
        lat: node?.lat ?? (48.8566 + idx * 0.012),
        lng: node?.lng ?? (2.3522 + idx * 0.015),
        cameraLabel: sample.camera,
        matchedTripId: trip.id,
        matchedDay: day,
        matchedCity: city,
        matchedStopId: node?.id,
        matchedStopTitle: node?.title,
        isFavorite: true,
        userNote: node?.mustVisitReason || node?.stopNote || '',
        sourceType: 'demo_sample',
        sampleImageUrl: sample.url,
        createdAt: Date.now() + idx,
      });
      idx += 1;
    });
  }

  return out;
}
