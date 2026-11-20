import type {
  AppLanguage,
  PackingItem,
  TimelineNode,
  TravelPass,
  TravelPassCategory,
  TripState,
} from '../types';
import { getItemUnitWeight } from './packingHelpers';
import { getWalletModalPack } from '../i18n/packs/walletModalPack';

const DB_NAME = 'tripkit_offline_pass_vault_v1';
const STORE_NAME = 'pass_images';
const DB_VERSION = 1;

// In-memory fallback map if IndexedDB is restricted in strict private browsing
const memoryFallbackVault = new Map<string, string>();

function openVaultDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveOfflinePassImage(passId: string, dataUrl: string): Promise<void> {
  memoryFallbackVault.set(passId, dataUrl);
  const db = await openVaultDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(dataUrl, passId);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

export async function getOfflinePassImage(passId: string): Promise<string | null> {
  const db = await openVaultDb();
  if (!db) {
    return memoryFallbackVault.get(passId) ?? null;
  }
  return new Promise<string | null>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(passId);
      req.onsuccess = () => {
        const val = typeof req.result === 'string' ? req.result : memoryFallbackVault.get(passId) ?? null;
        db.close();
        resolve(val);
      };
      req.onerror = () => {
        db.close();
        resolve(memoryFallbackVault.get(passId) ?? null);
      };
    } catch {
      db.close();
      resolve(memoryFallbackVault.get(passId) ?? null);
    }
  });
}

export async function deleteOfflinePassImage(passId: string): Promise<void> {
  memoryFallbackVault.delete(passId);
  const db = await openVaultDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(passId);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

export async function listOfflinePassImageIds(): Promise<Set<string>> {
  const result = new Set<string>(memoryFallbackVault.keys());
  const db = await openVaultDb();
  if (!db) return result;
  return new Promise<Set<string>>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAllKeys();
      req.onsuccess = () => {
        if (Array.isArray(req.result)) {
          req.result.forEach((k) => {
            if (typeof k === 'string') result.add(k);
          });
        }
        db.close();
        resolve(result);
      };
      req.onerror = () => {
        db.close();
        resolve(result);
      };
    } catch {
      db.close();
      resolve(result);
    }
  });
}

/**
 * Compresses a screenshot or QR image on the client so barcodes/QR codes stay razor-sharp
 * offline (up to 1360px max dimension) while staying compact (~100-260KB) in IndexedDB.
 */
export async function compressPassImageFile(file: File): Promise<{
  previewDataUrl: string;
  aiBase64: string;
  mimeType: string;
}> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Failed to decode image'));
    el.src = rawDataUrl;
  });

  const maxSide = 1360;
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;
  if (width > maxSide || height > maxSide) {
    if (width >= height) {
      height = Math.round((height * maxSide) / width);
      width = maxSide;
    } else {
      width = Math.round((width * maxSide) / height);
      height = maxSide;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const base64 = rawDataUrl.split(',')[1] || '';
    return {
      previewDataUrl: rawDataUrl,
      aiBase64: base64,
      mimeType: file.type || 'image/jpeg',
    };
  }

  // Fill white behind transparent PNG QR codes so scanners always have crisp contrast
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const outputMime = 'image/jpeg';
  const previewDataUrl = canvas.toDataURL(outputMime, 0.86);
  const aiBase64 = previewDataUrl.split(',')[1] || '';
  return {
    previewDataUrl,
    aiBase64,
    mimeType: outputMime,
  };
}

export const MAX_OFFLINE_PDF_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Reads either an image (camera photo / screenshot) or a PDF confirmation file
 * for instant IndexedDB offline storage + Gemini multimodal parsing.
 */
export async function readPassDocumentFile(file: File): Promise<{
  previewDataUrl: string;
  aiBase64: string;
  mimeType: string;
  isPdf: boolean;
  fileName: string;
}> {
  const isPdf =
    file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');

  if (isPdf) {
    if (file.size > MAX_OFFLINE_PDF_BYTES) {
      throw new Error('PDF_TOO_LARGE');
    }
    const rawDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read PDF file'));
      reader.readAsDataURL(file);
    });
    const base64 = rawDataUrl.includes(',') ? rawDataUrl.split(',')[1] || '' : '';
    const normalizedDataUrl = rawDataUrl.startsWith('data:application/pdf')
      ? rawDataUrl
      : `data:application/pdf;base64,${base64}`;
    return {
      previewDataUrl: normalizedDataUrl,
      aiBase64: base64,
      mimeType: 'application/pdf',
      isPdf: true,
      fileName: file.name || 'document.pdf',
    };
  }

  const compressed = await compressPassImageFile(file);
  return {
    ...compressed,
    isPdf: false,
    fileName: file.name || 'pass-image.jpg',
  };
}

/**
 * Converts a base64 DataURL (such as data:application/pdf;base64,...) into an object Blob URL
 * so embedded PDF viewers and downloads work reliably inside sandboxed iframes without window.open.
 */
export function dataUrlToBlobUrl(dataUrl: string): string | null {
  try {
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) return null;
    const header = dataUrl.slice(0, commaIdx);
    const base64 = dataUrl.slice(commaIdx + 1);
    const mimeMatch = header.match(/^data:([^;]+)/i);
    const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export function isDigitalOrPassCandidateItem(item: PackingItem, groupId?: string): boolean {
  const unitW = getItemUnitWeight(item, groupId);
  if (unitW === 0) return true;
  if (groupId === 'documents') {
    return /护照复印|护照扫描|签证|签注|二维码|确认单|机票|车票|门票|电子|保单|保险|入境|驾照|翻译件|租车|退税|预约|esim|qr|pass|boarding|ticket|voucher|booking|hotel|insurance|visa|arrival|idp|rental/i.test(
      item.name
    );
  }
  return /二维码|电子票|入境码|预约单|确认信|电子保单|esim|visit\s*japan|qr\s*code|boarding\s*pass|e-ticket|voucher/i.test(
    item.name
  );
}

export function inferPassCategoryFromName(name: string): TravelPassCategory {
  const lower = name.toLowerCase();
  if (/护照|身份证|通行证|passport|id\s*card|national\s*id/i.test(lower)) {
    // Distinguish visa pages if explicitly named
    if (/签证|签注|申根|visa|schengen/i.test(lower)) {
      return 'visa';
    }
    return 'passport';
  }
  if (/签证|签注|入台证|申根|schengen|visa|e-visa|k-eta|esta\b|evus/i.test(lower)) {
    return 'visa';
  }
  if (
    /入境|海关|申报|检疫|visit\s*japan|sg\s*arrival|arrival\s*card|customs|immigration|q-code/i.test(
      lower
    )
  ) {
    return 'border_qr';
  }
  if (/保单|保险|医疗险|延误险|救援|insurance|policy|allianz|axa/i.test(lower)) {
    return 'insurance';
  }
  if (/esim|sim卡|电话卡|流量|漫游|roaming|airalo|holafly/i.test(lower)) {
    return 'esim';
  }
  if (/机票|航班|登机|航站楼|值机|flight|boarding|airline|airport/i.test(lower)) {
    return 'flight';
  }
  if (
    /高铁|新干线|火车|列车|铁路|巴士|快线|地铁|渡轮|船票|suica|icoca|eurostar|shinkansen|train|rail|express|transit|ferry/i.test(
      lower
    )
  ) {
    return 'train';
  }
  if (/租车|自驾|驾照|翻译件|提车|car\s*rental|idp|international\s*driving|hertz|avis/i.test(lower)) {
    return 'car_rental';
  }
  if (/酒店|民宿|住宿|入住|旅馆|hotel|resort|ryokan|airbnb|check-in|hostel/i.test(lower)) {
    return 'hotel';
  }
  if (
    /餐厅|美食|晚宴|米其林|订座|用餐|omakase|restaurant|dining|tablecheck|tabelog|opentable|bistro/i.test(
      lower
    )
  ) {
    return 'dining';
  }
  if (/退税|免税|寄存|行李寄送|global\s*blue|planet\s*tax|tax\s*free|vat\s*refund|luggage/i.test(lower)) {
    return 'tax_free_other';
  }
  return 'attraction';
}

function normalizePassKey(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[（()）\[\]·•\-_]/g, '');
}

/**
 * Extracts ready-to-use TravelPass slots from the current trip's:
 * 1) Outbound flight route (`trip.setup`)
 * 2) `0g` digital passes & document vouchers in `trip.packing`
 * 3) Hotel, intercity transit, dining reservations, and anchor ticketed stops in `trip.timeline`
 * Deduplicates against `existingPasses` so user edits are never overwritten.
 */
export function buildSmartSeededPassesFromTrip(
  trip: TripState,
  lang: AppLanguage = 'zh-CN'
): { mergedPasses: TravelPass[]; addedCount: number } {
  const walletCopy = getWalletModalPack(lang);
  const existing = trip.travelPasses || [];
  const existingItemIds = new Set(
    existing.map((p) => p.linkedPackingItemId).filter((v): v is string => Boolean(v))
  );
  const existingNodeIds = new Set(
    existing.map((p) => p.linkedTimelineNodeId).filter((v): v is string => Boolean(v))
  );
  const existingTitleKeys = new Set(existing.map((p) => normalizePassKey(p.title)));

  const additions: TravelPass[] = [];
  const now = Date.now();
  let seq = 0;

  const firstCity = trip.setup.cities[0] || walletCopy.destinationFallback;
  const depDate = trip.setup.departureDate || '';

  // 1. Outbound Flight Pass slot if no flight pass exists yet
  const hasAnyFlight = existing.some((p) => p.category === 'flight');
  if (!hasAnyFlight) {
    const flightTitle = walletCopy.outboundFlightTitle(firstCity);
    const key = normalizePassKey(flightTitle);
    if (!existingTitleKeys.has(key)) {
      existingTitleKeys.add(key);
      additions.push({
        id: `pass_${now}_${seq++}`,
        category: 'flight',
        title: flightTitle,
        subtitle: walletCopy.outboundFlightSubtitle,
        day: 1,
        dateTimeLabel: depDate ? `${depDate}` : 'Day 1',
        terminalOrPlatform: trip.intel.vatExitAirport || undefined,
        status: 'pending',
        updatedAt: now + seq,
      });
    }
  }

  // 2. Scan Packing List for 0g Digital Items & Vouchers (Visa, Border QR, eSIM, Insurance, Tickets)
  trip.packing.forEach((grp) => {
    grp.items.forEach((item) => {
      if (existingItemIds.has(item.id)) return;
      if (!isDigitalOrPassCandidateItem(item, grp.id)) return;
      // Skip physical cash/wallet/card items that aren't documents or digital passes
      if (/现金|零钱包|信用卡|银行卡|cash|wallet|credit\s*card|debit\s*card/i.test(item.name)) {
        return;
      }
      const key = normalizePassKey(item.name);
      if (existingTitleKeys.has(key)) return;
      existingTitleKeys.add(key);
      existingItemIds.add(item.id);

      const category = inferPassCategoryFromName(item.name);
      additions.push({
        id: `pass_${now}_${seq++}`,
        category,
        title: item.name,
        subtitle: item.why || grp.title,
        day: 1,
        dateTimeLabel: depDate || 'Day 1',
        linkedPackingItemId: item.id,
        status: item.done ? 'ready' : 'pending',
        updatedAt: now + seq,
      });
    });
  });

  // 3. Scan Timeline for Hotels, Transit, Reserved Dining & Anchor Attractions
  const sortedTimeline = [...(trip.timeline || [])].sort(
    (a, b) => (a.day || 1) - (b.day || 1) || a.time.localeCompare(b.time)
  );

  sortedTimeline.forEach((node: TimelineNode) => {
    if (existingNodeIds.has(node.id)) return;
    const isHotel =
      node.stopType === 'hotel' ||
      /酒店|住宿|入住|hotel|ryokan|resort|check-in/i.test(node.title);
    const isTransit =
      node.stopType === 'transit' ||
      /机场|新干线|高铁|车站|列车|快线|airport|station|shinkansen|express|eurostar/i.test(
        node.title
      );
    const isReservedDining =
      node.stopType === 'dining' &&
      (Boolean(node.isAnchor) ||
        /预约|订座|米其林|omakase|reservation|booked/i.test(
          `${node.title} ${node.mustVisitReason || ''} ${node.stopNote || ''}`
        ));
    const isTicketedAttraction =
      Boolean(node.isAnchor) && (node.stopType === 'attraction' || !node.stopType);

    if (!isHotel && !isTransit && !isReservedDining && !isTicketedAttraction) return;

    const key = normalizePassKey(node.title);
    if (existingTitleKeys.has(key)) return;
    existingTitleKeys.add(key);
    existingNodeIds.add(node.id);

    const category: TravelPassCategory = isHotel
      ? 'hotel'
      : isTransit
      ? 'train'
      : isReservedDining
      ? 'dining'
      : 'attraction';

    additions.push({
      id: `pass_${now}_${seq++}`,
      category,
      title: node.title,
      subtitle: [node.city, node.district].filter(Boolean).join(' · '),
      day: node.day || 1,
      dateTimeLabel: `Day ${node.day || 1} · ${node.time}`,
      localLanguageTitle: node.title,
      localLanguageAddress: node.address || node.district,
      note: node.transitNote || undefined,
      linkedTimelineNodeId: node.id,
      status: node.visited ? 'ready' : 'pending',
      updatedAt: now + seq,
    });
  });

  const mergedPasses = [...existing, ...additions].sort((a, b) => {
    const dayDiff = (a.day ?? 1) - (b.day ?? 1);
    if (dayDiff !== 0) return dayDiff;
    const catOrder: Record<TravelPassCategory, number> = {
      passport: 1,
      visa: 2,
      border_qr: 3,
      flight: 4,
      insurance: 5,
      esim: 6,
      esim_insurance: 7,
      train: 8,
      car_rental: 9,
      hotel: 10,
      attraction: 11,
      dining: 12,
      tax_free_other: 13,
    };
    return (catOrder[a.category] || 99) - (catOrder[b.category] || 99);
  });

  return { mergedPasses, addedCount: additions.length };
}
