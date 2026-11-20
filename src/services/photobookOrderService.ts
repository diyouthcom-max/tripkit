import type { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type {
  HomeCurrencyCode,
  PhotobookBindingId,
  PhotobookFormatId,
  PhotobookOrderRecord,
  PhotobookOrderStatus,
  PhotobookShippingInfo,
  PhotobookTemplateId,
} from '../types';
import { CURRENCY_CATALOG, isZeroDecimalCurrency } from '../utils/currencyHelpers';
import { isVerifiedAdminUser } from './proRedeemService';

const LOCAL_PRINT_ORDERS_KEY = 'tripkit_local_print_orders_v1';
const ORDER_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface PhotobookPricingBreakdown {
  currencyCode: HomeCurrencyCode;
  currencySymbol: string;
  unitBasePrice: number;
  extraPagesCount: number;
  extraPagesPricePerUnit: number;
  unitSubtotal: number;
  copies: number;
  discountRateLabel: string;
  discountedSubtotal: number;
  shippingFee: number;
  totalPrice: number;
}

interface PhotobookTierCurrencyMeta {
  symbol: string;
  hardcoverSquare: number;
  hardcoverA5: number;
  softcoverSquare: number;
  softcoverA5: number;
  extra4Pages: number;
  shipping: number;
  freeShippingThresholdCopies: number;
}

const PRESET_CURRENCY_META: Partial<Record<HomeCurrencyCode, PhotobookTierCurrencyMeta>> = {
  CNY: {
    symbol: '¥',
    hardcoverSquare: 198,
    hardcoverA5: 168,
    softcoverSquare: 138,
    softcoverA5: 118,
    extra4Pages: 16,
    shipping: 12,
    freeShippingThresholdCopies: 2,
  },
  USD: {
    symbol: '$',
    hardcoverSquare: 34,
    hardcoverA5: 29,
    softcoverSquare: 24,
    softcoverA5: 19,
    extra4Pages: 3,
    shipping: 6,
    freeShippingThresholdCopies: 2,
  },
  EUR: {
    symbol: '€',
    hardcoverSquare: 32,
    hardcoverA5: 27,
    softcoverSquare: 22,
    softcoverA5: 18,
    extra4Pages: 3,
    shipping: 5,
    freeShippingThresholdCopies: 2,
  },
  HKD: {
    symbol: 'HK$',
    hardcoverSquare: 248,
    hardcoverA5: 208,
    softcoverSquare: 178,
    softcoverA5: 148,
    extra4Pages: 20,
    shipping: 25,
    freeShippingThresholdCopies: 2,
  },
};

function resolveTierMetaForCurrency(code: HomeCurrencyCode): PhotobookTierCurrencyMeta {
  const preset = PRESET_CURRENCY_META[code];
  if (preset) return preset;

  const usdBase = PRESET_CURRENCY_META.USD!;
  const spec = CURRENCY_CATALOG[code] ?? CURRENCY_CATALOG.USD;
  const scale = spec.perUsd > 0 ? spec.perUsd : 1;
  const roundPrice = (usdAmt: number) =>
    isZeroDecimalCurrency(code)
      ? Math.max(1, Math.round((usdAmt * scale) / 10) * 10)
      : Math.max(1, Math.round(usdAmt * scale));

  return {
    symbol: spec.symbol,
    hardcoverSquare: roundPrice(usdBase.hardcoverSquare),
    hardcoverA5: roundPrice(usdBase.hardcoverA5),
    softcoverSquare: roundPrice(usdBase.softcoverSquare),
    softcoverA5: roundPrice(usdBase.softcoverA5),
    extra4Pages: roundPrice(usdBase.extra4Pages),
    shipping: roundPrice(usdBase.shipping),
    freeShippingThresholdCopies: 2,
  };
}

export function computePhotobookOrderPricing(params: {
  currency: HomeCurrencyCode;
  formatId: PhotobookFormatId;
  bindingId: PhotobookBindingId;
  pageCount: number;
  copies: number;
}): PhotobookPricingBreakdown {
  const meta = resolveTierMetaForCurrency(params.currency);
  const safeCopies = Math.max(1, Math.min(20, Math.round(params.copies) || 1));
  const safePages = Math.max(20, Math.min(120, Math.ceil(params.pageCount / 4) * 4));

  const unitBasePrice =
    params.bindingId === 'hardcover_matte'
      ? params.formatId === 'square_210'
        ? meta.hardcoverSquare
        : meta.hardcoverA5
      : params.formatId === 'square_210'
      ? meta.softcoverSquare
      : meta.softcoverA5;

  const extraPagesCount = Math.max(0, safePages - 24);
  const extraBlocks = Math.ceil(extraPagesCount / 4);
  const extraPagesPricePerUnit = extraBlocks * meta.extra4Pages;
  const unitSubtotal = unitBasePrice + extraPagesPricePerUnit;

  const discountFactor = safeCopies >= 3 ? 0.85 : safeCopies === 2 ? 0.9 : 1;
  const discountRateLabel =
    safeCopies >= 3 ? '85折 (3本+)' : safeCopies === 2 ? '9折 (双本礼赠)' : '';

  const discountedSubtotal = Math.round(unitSubtotal * safeCopies * discountFactor);
  const shippingFee =
    safeCopies >= meta.freeShippingThresholdCopies ? 0 : meta.shipping;
  const totalPrice = discountedSubtotal + shippingFee;

  return {
    currencyCode: params.currency,
    currencySymbol: meta.symbol,
    unitBasePrice,
    extraPagesCount,
    extraPagesPricePerUnit,
    unitSubtotal,
    copies: safeCopies,
    discountRateLabel,
    discountedSubtotal,
    shippingFee,
    totalPrice,
  };
}

export function generatePhotobookOrderId(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  let suffix = '';
  const bytes = new Uint32Array(4);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 4; i += 1) bytes[i] = Math.floor(Math.random() * 100000);
  }
  for (let i = 0; i < 4; i += 1) {
    suffix += ORDER_CODE_ALPHABET[bytes[i] % ORDER_CODE_ALPHABET.length];
  }
  return `PB-${yy}${mm}${dd}-${suffix}`;
}

function parseTsMs(val: unknown): number {
  if (val instanceof Timestamp) return val.toMillis();
  if (
    val &&
    typeof val === 'object' &&
    'seconds' in val &&
    typeof (val as { seconds: unknown }).seconds === 'number'
  ) {
    return (val as { seconds: number }).seconds * 1000;
  }
  return Date.now();
}

export function loadLocalPhotobookOrders(): PhotobookOrderRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_PRINT_ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PhotobookOrderRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalPhotobookOrders(orders: PhotobookOrderRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_PRINT_ORDERS_KEY, JSON.stringify(orders.slice(0, 30)));
  } catch {
    // Ignore storage quota warning
  }
}

/**
 * Submits a print-on-demand photobook order.
 * - Always stores a local mirror immediately so unauthenticated users can place orders & contact via WhatsApp.
 * - When signed in with a verified Google account, atomically writes non-PII `/photobookOrders/{orderId}`
 *   and isolated PII `/photobookOrders/{orderId}/shipping/recipient` to Firestore.
 */
export async function createPhotobookPrintOrder(params: {
  user: User | null;
  bookTitle: string;
  tripTitlesSummary: string;
  templateId: PhotobookTemplateId;
  formatSpec: PhotobookFormatId;
  bindingSpec: PhotobookBindingId;
  pageCount: number;
  photoCount: number;
  copies: number;
  currencyCode: string;
  totalPrice: number;
  shipping: PhotobookShippingInfo;
}): Promise<{ order: PhotobookOrderRecord; syncedToCloud: boolean }> {
  const orderId = generatePhotobookOrderId();
  const cleanTitle = (params.bookTitle || '旅行纪念画册').trim().slice(0, 80);
  const cleanTrips = (params.tripTitlesSummary || '精选行程').trim().slice(0, 160);
  const cleanCurrency = (params.currencyCode || 'CNY').toUpperCase().slice(0, 4);
  const safePages = Math.max(20, Math.min(120, Math.ceil(params.pageCount / 4) * 4));
  const safePhotos = Math.max(1, Math.min(120, Math.round(params.photoCount) || 1));
  const safeCopies = Math.max(1, Math.min(20, Math.round(params.copies) || 1));
  const safeTotal = Math.max(1, Math.min(100000, Math.round(params.totalPrice * 100) / 100));

  const cleanShipping: PhotobookShippingInfo = {
    recipientName: params.shipping.recipientName.trim().slice(0, 60),
    phone: params.shipping.phone.trim().slice(0, 32),
    shippingAddress: params.shipping.shippingAddress.trim().slice(0, 240),
    customerNote: (params.shipping.customerNote || '').trim().slice(0, 160),
  };

  const nowMs = Date.now();
  const localRecord: PhotobookOrderRecord = {
    orderId,
    uid: params.user?.uid || 'local_guest',
    bookTitle: cleanTitle,
    tripTitlesSummary: cleanTrips,
    templateId: params.templateId,
    formatSpec: params.formatSpec,
    bindingSpec: params.bindingSpec,
    pageCount: safePages,
    photoCount: safePhotos,
    copies: safeCopies,
    currencyCode: cleanCurrency,
    totalPrice: safeTotal,
    status: 'pending_payment',
    trackingNumber: '',
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
    shipping: cleanShipping,
  };

  const prevLocal = loadLocalPhotobookOrders();
  saveLocalPhotobookOrders([localRecord, ...prevLocal]);

  if (params.user && params.user.emailVerified) {
    const orderPath = `photobookOrders/${orderId}`;
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'photobookOrders', orderId), {
        orderId,
        uid: params.user.uid,
        bookTitle: cleanTitle,
        tripTitlesSummary: cleanTrips,
        templateId: params.templateId,
        formatSpec: params.formatSpec,
        bindingSpec: params.bindingSpec,
        pageCount: safePages,
        photoCount: safePhotos,
        copies: safeCopies,
        currencyCode: cleanCurrency,
        totalPrice: safeTotal,
        status: 'pending_payment',
        trackingNumber: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'photobookOrders', orderId, 'shipping', 'recipient'), {
        orderId,
        uid: params.user.uid,
        recipientName: cleanShipping.recipientName,
        phone: cleanShipping.phone,
        shippingAddress: cleanShipping.shippingAddress,
        customerNote: cleanShipping.customerNote,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      return { order: localRecord, syncedToCloud: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, orderPath);
    }
  }

  return { order: localRecord, syncedToCloud: false };
}

export async function fetchPhotobookOrdersForUser(
  user: User | null
): Promise<PhotobookOrderRecord[]> {
  const localList = loadLocalPhotobookOrders();
  if (!user || !user.emailVerified) {
    return localList;
  }

  const isAdmin = isVerifiedAdminUser(user);
  const path = 'photobookOrders';
  try {
    const q = isAdmin
      ? query(collection(db, 'photobookOrders'), limit(40))
      : query(
          collection(db, 'photobookOrders'),
          where('uid', '==', user.uid),
          limit(20)
        );
    const snap = await getDocs(q);
    const cloudOrders: PhotobookOrderRecord[] = snap.docs.map((d) => {
      const data = d.data();
      const localMatch = localList.find((l) => l.orderId === d.id);
      return {
        orderId: String(data.orderId || d.id),
        uid: String(data.uid || ''),
        bookTitle: String(data.bookTitle || ''),
        tripTitlesSummary: String(data.tripTitlesSummary || ''),
        templateId: (data.templateId as PhotobookTemplateId) || 'kinfolk',
        formatSpec: (data.formatSpec as PhotobookFormatId) || 'square_210',
        bindingSpec: (data.bindingSpec as PhotobookBindingId) || 'hardcover_matte',
        pageCount: Number(data.pageCount) || 24,
        photoCount: Number(data.photoCount) || 1,
        copies: Number(data.copies) || 1,
        currencyCode: String(data.currencyCode || 'CNY'),
        totalPrice: Number(data.totalPrice) || 0,
        status: (data.status as PhotobookOrderStatus) || 'pending_payment',
        trackingNumber: String(data.trackingNumber || ''),
        createdAtMs: parseTsMs(data.createdAt),
        updatedAtMs: parseTsMs(data.updatedAt),
        shipping: localMatch?.shipping,
      };
    });

    const cloudIds = new Set(cloudOrders.map((o) => o.orderId));
    const merged = [
      ...cloudOrders,
      ...localList.filter((l) => !cloudIds.has(l.orderId)),
    ].sort((a, b) => b.createdAtMs - a.createdAtMs);
    return merged;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function fetchPhotobookOrderShipping(
  orderId: string
): Promise<PhotobookShippingInfo | null> {
  const path = `photobookOrders/${orderId}/shipping/recipient`;
  try {
    const snap = await getDoc(doc(db, 'photobookOrders', orderId, 'shipping', 'recipient'));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      recipientName: String(d.recipientName || ''),
      phone: String(d.phone || ''),
      shippingAddress: String(d.shippingAddress || ''),
      customerNote: String(d.customerNote || ''),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function cancelPhotobookOrder(
  orderId: string,
  user: User | null
): Promise<void> {
  const updatedLocal = loadLocalPhotobookOrders().map((o) =>
    o.orderId === orderId ? { ...o, status: 'cancelled' as const, updatedAtMs: Date.now() } : o
  );
  saveLocalPhotobookOrders(updatedLocal);

  if (user && user.emailVerified && /^PB-[0-9]{6}-[A-Z2-9]{4}$/.test(orderId)) {
    const path = `photobookOrders/${orderId}`;
    try {
      await updateDoc(doc(db, 'photobookOrders', orderId), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  }
}

export async function adminUpdatePhotobookOrderFulfillment(params: {
  orderId: string;
  status: PhotobookOrderStatus;
  trackingNumber: string;
}): Promise<void> {
  const cleanTracking = params.trackingNumber.trim().slice(0, 64);
  const path = `photobookOrders/${params.orderId}`;
  try {
    await updateDoc(doc(db, 'photobookOrders', params.orderId), {
      status: params.status,
      trackingNumber: cleanTracking,
      updatedAt: serverTimestamp(),
    });
    const updatedLocal = loadLocalPhotobookOrders().map((o) =>
      o.orderId === params.orderId
        ? {
            ...o,
            status: params.status,
            trackingNumber: cleanTracking,
            updatedAtMs: Date.now(),
          }
        : o
    );
    saveLocalPhotobookOrders(updatedLocal);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}
