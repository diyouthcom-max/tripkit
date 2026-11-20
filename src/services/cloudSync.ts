import type { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type { CrewMember, SeatId, TripState } from '../types';
import { loadAppPreferences } from '../utils/preferencesHelpers';
import { pickLang } from '../i18n/langHelper';

class CloudRoomLimitError extends Error {}

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_REGEX = /^[A-Z2-9]{6}$/;
const VALID_SEAT_IDS: SeatId[] = ['m1', 'm2', 'm3', 'm4'];

export interface TripRoomDoc {
  roomId: string;
  ownerId: string;
  ownerName: string;
  routeTitle: string;
  status: 'active' | 'archived';
  revision: number;
  lastUpdatedBy: string;
  lastUpdatedByName: string;
  tripPayload: TripState;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface JoinedRoomBookmark {
  uid: string;
  roomId: string;
  routeTitle: string;
  seatId: SeatId;
  updatedAtMs: number;
}

const SEAT_DEFAULTS: Record<SeatId, Omit<CrewMember, 'id'>> = {
  m1: {
    initials: '我',
    name: '本人',
    role: '行程发起人',
    location: '蓬皮杜艺术中心附近',
    distanceKm: 1.4,
    etaMinutes: 9,
    accent: 'peach',
  },
  m2: {
    initials: 'EM',
    name: 'Emma',
    role: '摄影 & 探店伙伴',
    location: '玛黑区孚日广场',
    distanceKm: 2.1,
    etaMinutes: 13,
    accent: 'lavender',
  },
  m3: {
    initials: 'AL',
    name: 'Alex',
    role: '交通与攻略向导',
    location: '卢浮宫北侧街区',
    distanceKm: 1.8,
    etaMinutes: 11,
    accent: 'teal',
  },
  m4: {
    initials: 'LE',
    name: 'Leo',
    role: '美食与预订担当',
    location: '圣日耳曼街区',
    distanceKm: 2.4,
    etaMinutes: 15,
    accent: 'peach',
  },
};

function computeInitials(name: string, fallback = '伴'): string {
  const trimmed = name.trim();
  if (!trimmed) return fallback;
  if (trimmed === '本人') return '我';
  if (/^[A-Za-z0-9\s._-]+$/.test(trimmed)) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  }
  return trimmed.slice(0, 1);
}

function clampString(val: string | undefined | null, fallback: string, maxLen: number): string {
  const cleaned = (val ?? '').trim();
  const base = cleaned.length > 0 ? cleaned : fallback;
  return base.slice(0, maxLen);
}

export function normalizeRoomCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z2-9]/g, '')
    .slice(0, 6);
}

export function isValidRoomCode(code: string): boolean {
  return ROOM_CODE_REGEX.test(code);
}

export function isValidSeatId(seatId: string): seatId is SeatId {
  return VALID_SEAT_IDS.includes(seatId as SeatId);
}

export function generateInviteRoomCode(): string {
  const bytes = new Uint8Array(6);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 6; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += ROOM_CODE_ALPHABET[bytes[i] % ROOM_CODE_ALPHABET.length];
  }
  return code;
}

/**
 * Recursively strips `undefined` properties from plain objects and arrays
 * because Firestore rejects `undefined` values inside Map/List payloads.
 */
export function sanitizeForFirestore<T>(input: T): T {
  if (Array.isArray(input)) {
    return input
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (input !== null && typeof input === 'object') {
    const proto = Object.getPrototypeOf(input);
    if (proto === Object.prototype || proto === null) {
      const out: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
        if (val !== undefined) {
          out[key] = sanitizeForFirestore(val);
        }
      }
      return out as T;
    }
  }
  return input;
}

/**
 * Enforces volumetric boundaries synchronized with `firebase-blueprint.json` and `firestore.rules`.
 */
export function sanitizeTripForCloud(trip: TripState): TripState {
  const safeCrew = (trip.crew?.length ? trip.crew : [{ id: 'm1', ...SEAT_DEFAULTS.m1 }]).slice(
    0,
    4
  );
  let safeDayStays = trip.dayStays;
  if (trip.dayStays && typeof trip.dayStays === 'object') {
    const entries = Object.entries(trip.dayStays).slice(0, 30);
    safeDayStays = Object.fromEntries(entries) as TripState['dayStays'];
  }
  const safeCoverConfig = trip.coverConfig
    ? {
        mode:
          trip.coverConfig.mode === 'custom' || trip.coverConfig.mode === 'preset'
            ? trip.coverConfig.mode
            : ('auto' as const),
        presetId: trip.coverConfig.presetId,
        focusY:
          typeof trip.coverConfig.focusY === 'number' && Number.isFinite(trip.coverConfig.focusY)
            ? Math.max(0, Math.min(100, Math.round(trip.coverConfig.focusY)))
            : undefined,
        tone: trip.coverConfig.tone,
        updatedAt:
          typeof trip.coverConfig.updatedAt === 'number' ? trip.coverConfig.updatedAt : undefined,
      }
    : undefined;
  const bounded: TripState = {
    ...trip,
    crew: safeCrew,
    packing: (trip.packing || []).slice(0, 25),
    expenses: (trip.expenses || []).slice(0, 300),
    timeline: (trip.timeline || []).slice(0, 200),
    wishlist: (trip.wishlist || []).slice(0, 100),
    travelPasses: trip.travelPasses ? trip.travelPasses.slice(0, 40) : undefined,
    dayStays: safeDayStays,
    coverConfig: safeCoverConfig,
  };
  return sanitizeForFirestore(bounded);
}

export function buildRoomInviteUrl(roomId: string): string {
  if (typeof window === 'undefined') return `?room=${roomId}`;
  const url = new URL(window.location.href);
  if (url.hostname.startsWith('ais-dev-')) {
    url.hostname = url.hostname.replace(/^ais-dev-/, 'ais-pre-');
  }
  url.searchParams.set('room', roomId);
  return url.toString();
}

export async function createCloudTripRoom(params: {
  trip: TripState;
  user: User;
  preferredOwnerName?: string;
}): Promise<{ roomId: string; revision: number; seatId: SeatId; updatedTrip: TripState }> {
  const { trip, user, preferredOwnerName } = params;
  const lang = loadAppPreferences().language;
  if (!user.emailVerified) {
    throw new CloudRoomLimitError(
      pickLang(lang, {
        'zh-CN': '当前登录账号尚未完成邮箱验证，无法创建云端同步房间',
        'en-US': 'Your signed-in account email is not verified yet — unable to create a cloud sync room.',
        'es-MX': 'Tu correo aún no está verificado; no se puede crear una sala en la nube.',
        'fr-FR': 'Votre adresse e-mail n’est pas encore vérifiée — impossible de créer un salon cloud.',
        'de-DE': 'Deine E-Mail-Adresse ist noch nicht bestätigt — Cloud-Raum kann nicht erstellt werden.',
        'pt-BR': 'Seu e-mail ainda não foi verificado — não é possível criar a sala na nuvem.',
        'ja-JP': 'ログイン中のメールアドレスが未認証のため、クラウド同期ルームを作成できません。',
      })
    );
  }

  // 1. Check per-user rate limit ledger (/rateLimits/{uid})
  const rateLimitPath = `rateLimits/${user.uid}`;
  let prevRoomCount = 0;
  try {
    const rlSnap = await getDoc(doc(db, 'rateLimits', user.uid));
    if (rlSnap.exists()) {
      const rlData = rlSnap.data();
      prevRoomCount = typeof rlData.roomCount === 'number' ? rlData.roomCount : 0;
      const lastTs = rlData.lastRoomCreatedAt as Timestamp | undefined;
      if (prevRoomCount >= 20) {
        throw new CloudRoomLimitError(
          pickLang(lang, {
            'zh-CN': '单账号最多创建 20 个云端协作房间（防刷配额保护），请复用已有房间',
            'en-US': 'Up to 20 cloud collaboration rooms can be created per account — please reuse an existing room.',
            'es-MX': 'Puedes crear hasta 20 salas por cuenta; reutiliza una sala existente.',
            'fr-FR': 'Vous pouvez créer jusqu’à 20 salons cloud par compte — réutilisez un salon existant.',
            'de-DE': 'Maximal 20 Cloud-Räume pro Konto möglich — bitte nutze einen bestehenden Raum.',
            'pt-BR': 'Limite de 20 salas na nuvem por conta — reutilize uma sala existente.',
            'ja-JP': '1アカウントあたり作成できる同期ルームは最大20件です。既存のルームをご利用ください。',
          })
        );
      }
      if (lastTs && Date.now() - lastTs.toMillis() < 10_000) {
        const waitSec = Math.max(1, Math.ceil((10_000 - (Date.now() - lastTs.toMillis())) / 1000));
        throw new CloudRoomLimitError(
          pickLang(lang, {
            'zh-CN': `建房频率保护：请等待 ${waitSec} 秒后再创建新房间`,
            'en-US': `Rate-limit protection: please wait ${waitSec}s before creating another room.`,
            'es-MX': `Protección de frecuencia: espera ${waitSec} s antes de crear otra sala.`,
            'fr-FR': `Limitation temporaire : patientez ${waitSec} s avant de créer un autre salon.`,
            'de-DE': `Bitte warte ${waitSec} Sek., bevor du einen weiteren Raum erstellst.`,
            'pt-BR': `Proteção de limite: aguarde ${waitSec}s antes de criar outra sala.`,
            'ja-JP': `連続作成防止のため、あと ${waitSec} 秒待ってから新しいルームを作成してください。`,
          })
        );
      }
    }
  } catch (err) {
    if (err instanceof CloudRoomLimitError) {
      throw err;
    }
    handleFirestoreError(err, OperationType.GET, rateLimitPath);
  }

  // 2. Allocate an unused 6-char roomId (exact single-doc check)
  let roomId = generateInviteRoomCode();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidate = attempt === 0 ? roomId : generateInviteRoomCode();
    try {
      const existingSnap = await getDoc(doc(db, 'rooms', candidate));
      if (!existingSnap.exists()) {
        roomId = candidate;
        break;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `rooms/${candidate}`);
    }
  }

  const defaultUserLabel = clampString(
    preferredOwnerName ||
      (trip.crew[0]?.name && trip.crew[0].name !== '本人' ? trip.crew[0].name : user.displayName) ||
      '本人',
    '本人',
    40
  );
  const routeTitle = clampString(
    trip.intel?.routeTitle || trip.setup?.cities?.join(' → '),
    '同行旅程',
    120
  );
  const ownerRole = clampString(trip.crew[0]?.role, '行程发起人', 60);

  const updatedCrew: CrewMember[] = (
    trip.crew.length > 0 ? trip.crew : [{ id: 'm1', ...SEAT_DEFAULTS.m1 }]
  )
    .slice(0, 4)
    .map((member, idx) =>
      idx === 0
        ? {
            ...member,
            name: defaultUserLabel,
            initials: computeInitials(defaultUserLabel, '我'),
            claimedByUid: user.uid,
          }
        : member
    );

  const sanitizedTrip = sanitizeTripForCloud({
    ...trip,
    crew: updatedCrew,
  });

  // 3. Atomic batch across rateLimits + rooms + members + joinedRooms
  const batch = writeBatch(db);
  batch.set(doc(db, 'rateLimits', user.uid), {
    uid: user.uid,
    roomCount: prevRoomCount + 1,
    lastRoomCreatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'rooms', roomId), {
    roomId,
    ownerId: user.uid,
    ownerName: defaultUserLabel,
    routeTitle,
    status: 'active',
    revision: 1,
    lastUpdatedBy: user.uid,
    lastUpdatedByName: defaultUserLabel,
    tripPayload: sanitizedTrip,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'rooms', roomId, 'members', user.uid), {
    uid: user.uid,
    roomId,
    seatId: 'm1',
    displayName: defaultUserLabel,
    role: ownerRole,
    joinedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'users', user.uid, 'joinedRooms', roomId), {
    uid: user.uid,
    roomId,
    routeTitle,
    seatId: 'm1',
    joinedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `rooms/${roomId}`);
  }

  return {
    roomId,
    revision: 1,
    seatId: 'm1',
    updatedTrip: sanitizedTrip,
  };
}

export async function fetchRoomPreview(rawCode: string): Promise<TripRoomDoc | null> {
  const roomId = normalizeRoomCode(rawCode);
  if (!isValidRoomCode(roomId)) {
    throw new Error(
      pickLang(loadAppPreferences().language, {
        'zh-CN': '请输入有效的 6 位房间口令（大写字母与数字 2-9）',
        'en-US': 'Please enter a valid 6-character room code (uppercase letters & digits 2–9).',
        'es-MX': 'Ingresa un código de sala válido de 6 caracteres (letras mayúsculas y números 2–9).',
        'fr-FR': 'Veuillez saisir un code de salon valide à 6 caractères (majuscules et chiffres 2–9).',
        'de-DE': 'Bitte gib einen gültigen 6-stelligen Raumcode ein (Großbuchstaben & Ziffern 2–9).',
        'pt-BR': 'Digite um código de sala válido de 6 caracteres (letras maiúsculas e dígitos 2–9).',
        'ja-JP': '有効な6桁のルームコード（英大文字と数字 2〜9）を入力してください。',
      })
    );
  }

  try {
    const snap = await getDoc(doc(db, 'rooms', roomId));
    if (!snap.exists()) {
      return null;
    }
    return snap.data() as TripRoomDoc;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `rooms/${roomId}`);
  }
}

export async function fetchMyMemberSeat(
  roomId: string,
  uid: string
): Promise<{ seatId: SeatId; displayName: string; role: string } | null> {
  if (!isValidRoomCode(roomId)) return null;
  const path = `rooms/${roomId}/members/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'rooms', roomId, 'members', uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    if (!isValidSeatId(String(d.seatId || ''))) return null;
    return {
      seatId: d.seatId as SeatId,
      displayName: String(d.displayName || ''),
      role: String(d.role || ''),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function joinRoomAndClaimSeat(params: {
  room: TripRoomDoc;
  user: User;
  seatId: SeatId;
  nickname: string;
  role: string;
}): Promise<{ nextTrip: TripState; nextRevision: number }> {
  const { room, user, seatId, nickname, role } = params;
  const roomId = room.roomId;
  const safeName = clampString(nickname || user.displayName, '同行伙伴', 40);
  const safeRole = clampString(role, SEAT_DEFAULTS[seatId].role, 60);
  const routeTitle = clampString(room.routeTitle, '同行旅程', 120);

  const memberRef = doc(db, 'rooms', roomId, 'members', user.uid);
  const bookmarkRef = doc(db, 'users', user.uid, 'joinedRooms', roomId);

  let memberExists = false;
  let bookmarkExists = false;
  try {
    const [mSnap, bSnap] = await Promise.all([getDoc(memberRef), getDoc(bookmarkRef)]);
    memberExists = mSnap.exists();
    bookmarkExists = bSnap.exists();
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `rooms/${roomId}/members/${user.uid}`);
  }

  const batch = writeBatch(db);
  if (!memberExists) {
    batch.set(memberRef, {
      uid: user.uid,
      roomId,
      seatId,
      displayName: safeName,
      role: safeRole,
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    batch.update(memberRef, {
      seatId,
      displayName: safeName,
      role: safeRole,
      updatedAt: serverTimestamp(),
    });
  }

  if (!bookmarkExists) {
    batch.set(bookmarkRef, {
      uid: user.uid,
      roomId,
      routeTitle,
      seatId,
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    batch.update(bookmarkRef, {
      routeTitle,
      seatId,
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `rooms/${roomId}/members/${user.uid}`);
  }

  // Update claimed seat inside TripState.crew (expanding up to seat index if needed)
  const targetIdx = VALID_SEAT_IDS.indexOf(seatId);
  const baseCrew = Array.isArray(room.tripPayload?.crew) ? [...room.tripPayload.crew] : [];
  const neededLen = Math.min(4, Math.max(baseCrew.length, targetIdx + 1));

  const nextCrew: CrewMember[] = [];
  for (let i = 0; i < neededLen; i += 1) {
    const sid = VALID_SEAT_IDS[i];
    const existingSeat = baseCrew.find((c) => c.id === sid) || baseCrew[i];
    const baseSeat: CrewMember = existingSeat
      ? {
          ...existingSeat,
          id: sid,
          claimedByUid:
            existingSeat.claimedByUid === user.uid && sid !== seatId
              ? undefined
              : existingSeat.claimedByUid,
        }
      : {
          id: sid,
          ...SEAT_DEFAULTS[sid],
        };

    if (sid === seatId) {
      nextCrew.push({
        ...baseSeat,
        name: safeName,
        role: safeRole,
        initials: computeInitials(safeName, i === 0 ? '我' : `P${i}`),
        claimedByUid: user.uid,
      });
    } else {
      nextCrew.push(baseSeat);
    }
  }

  const nextTrip = sanitizeTripForCloud({
    ...room.tripPayload,
    crew: nextCrew,
    setup: {
      ...room.tripPayload.setup,
      travelers: Math.max(room.tripPayload.setup?.travelers || 1, nextCrew.length),
    },
  });

  let nextRevision = room.revision;
  // Persist claimed seat metadata back to the room document (respecting 1s server cooldown)
  try {
    await updateDoc(doc(db, 'rooms', roomId), {
      routeTitle,
      revision: room.revision + 1,
      lastUpdatedBy: user.uid,
      lastUpdatedByName: safeName,
      tripPayload: nextTrip,
      updatedAt: serverTimestamp(),
    });
    nextRevision = room.revision + 1;
  } catch {
    // If room was updated <1s ago by another user, local state still switches cleanly
    // and the normal debounced sync will persist the crew update on the next tick.
  }

  return { nextTrip, nextRevision };
}

export async function fetchMyRecentRooms(uid: string): Promise<JoinedRoomBookmark[]> {
  const path = `users/${uid}/joinedRooms`;
  try {
    const q = query(collection(db, 'users', uid, 'joinedRooms'), where('uid', '==', uid), limit(5));
    const snap = await getDocs(q);
    const list: JoinedRoomBookmark[] = snap.docs
      .map((d) => {
        const data = d.data();
        const ts = data.updatedAt as Timestamp | undefined;
        const rawSeat = String(data.seatId || 'm1');
        return {
          uid: String(data.uid || uid),
          roomId: String(data.roomId || d.id),
          routeTitle: String(data.routeTitle || '同行旅程'),
          seatId: isValidSeatId(rawSeat) ? rawSeat : 'm1',
          updatedAtMs: ts ? ts.toMillis() : 0,
        };
      })
      .filter((item) => isValidRoomCode(item.roomId));

    return list.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function pushTripRoomUpdate(params: {
  roomId: string;
  expectedRevision: number;
  trip: TripState;
  user: User;
  actorName: string;
}): Promise<number> {
  const { roomId, expectedRevision, trip, user, actorName } = params;
  const routeTitle = clampString(
    trip.intel?.routeTitle || trip.setup?.cities?.join(' → '),
    '同行旅程',
    120
  );
  const safeActor = clampString(actorName || user.displayName, '同行成员', 40);
  const sanitizedPayload = sanitizeTripForCloud(trip);
  const nextRevision = expectedRevision + 1;

  try {
    await updateDoc(doc(db, 'rooms', roomId), {
      routeTitle,
      revision: nextRevision,
      lastUpdatedBy: user.uid,
      lastUpdatedByName: safeActor,
      tripPayload: sanitizedPayload,
      updatedAt: serverTimestamp(),
    });
    return nextRevision;
  } catch (err) {
    // Handle optimistic revision mismatch by reading latest revision once
    try {
      const latestSnap = await getDoc(doc(db, 'rooms', roomId));
      if (latestSnap.exists()) {
        const latestData = latestSnap.data() as TripRoomDoc;
        if (latestData.revision >= nextRevision) {
          const retryRevision = latestData.revision + 1;
          await updateDoc(doc(db, 'rooms', roomId), {
            routeTitle,
            revision: retryRevision,
            lastUpdatedBy: user.uid,
            lastUpdatedByName: safeActor,
            tripPayload: sanitizedPayload,
            updatedAt: serverTimestamp(),
          });
          return retryRevision;
        }
      }
    } catch {
      // Fall through to structured error handler below
    }
    handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`);
  }
}

export function subscribeToTripRoom(
  roomId: string,
  onRoomUpdate: (room: TripRoomDoc) => void,
  onSyncError: (wrappedError: unknown) => void
): Unsubscribe {
  const path = `rooms/${roomId}`;
  return onSnapshot(
    doc(db, 'rooms', roomId),
    (snap) => {
      if (!snap.exists()) return;
      onRoomUpdate(snap.data() as TripRoomDoc);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        onSyncError(wrapped);
      }
    }
  );
}
