import type {
  BudgetState,
  DayStayAnchor,
  ExpenseRecord,
  MeetupPlan,
  PackingGroup,
  TimelineNode,
  TripState,
} from '../types';

/** Independent local-only key — never touches tripBook / Firestore. */
export const SNAPSHOT_STACK_STORAGE_KEY = 'tripkit_snapshot_stack_v1';

const MAX_ENTRIES_PER_TRIP = 12;
/** Soft byte budget for the whole multi-trip map; drop oldest on overflow. */
const MAX_SERIALIZED_BYTES = 1_800_000;

/** Business fields only — no photos, blobs, passes attachments, or UI caches. */
export interface TripSnapshotSlice {
  timeline: TimelineNode[];
  dayStays?: Record<number, DayStayAnchor>;
  packing: PackingGroup[];
  expenses: ExpenseRecord[];
  budget: BudgetState;
  meetup: MeetupPlan;
}

export interface TripSnapshotEntry {
  id: string;
  tripId: string;
  at: number;
  label: string;
  state: TripSnapshotSlice;
}

type SnapshotStore = Record<string, TripSnapshotEntry[]>;

function safeParseStore(raw: string | null): SnapshotStore {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as SnapshotStore;
  } catch {
    return {};
  }
}

function readStore(): SnapshotStore {
  if (typeof window === 'undefined') return {};
  try {
    return safeParseStore(window.localStorage.getItem(SNAPSHOT_STACK_STORAGE_KEY));
  } catch {
    return {};
  }
}

function writeStore(store: SnapshotStore): void {
  if (typeof window === 'undefined') return;
  try {
    let serialized = JSON.stringify(store);
    // Drop oldest across trips until under budget.
    while (serialized.length > MAX_SERIALIZED_BYTES) {
      let victimTrip: string | null = null;
      let victimAt = Number.POSITIVE_INFINITY;
      for (const [tripId, list] of Object.entries(store)) {
        if (!list.length) continue;
        const oldest = list[0];
        if (oldest.at < victimAt) {
          victimAt = oldest.at;
          victimTrip = tripId;
        }
      }
      if (!victimTrip) break;
      store[victimTrip] = store[victimTrip].slice(1);
      if (store[victimTrip].length === 0) delete store[victimTrip];
      serialized = JSON.stringify(store);
    }
    window.localStorage.setItem(SNAPSHOT_STACK_STORAGE_KEY, serialized);
  } catch {
    // Quota / private mode — fail soft.
  }
}

function deepCloneViaJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Pick + deep-serialize only the whitelisted business fields. */
export function pickTripSnapshotSlice(trip: TripState): TripSnapshotSlice {
  return deepCloneViaJson({
    timeline: trip.timeline ?? [],
    dayStays: trip.dayStays,
    packing: trip.packing ?? [],
    expenses: trip.expenses ?? [],
    budget: trip.budget,
    meetup: trip.meetup,
  });
}

export function listTripSnapshots(tripId: string): TripSnapshotEntry[] {
  if (!tripId) return [];
  const store = readStore();
  const list = store[tripId] || [];
  // Newest first for UI.
  return [...list].sort((a, b) => b.at - a.at);
}

export function pushTripSnapshot(
  tripId: string,
  label: string,
  trip: TripState
): TripSnapshotEntry | null {
  if (!tripId) return null;
  const entry: TripSnapshotEntry = {
    id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    tripId,
    at: Date.now(),
    label: String(label || 'Snapshot').slice(0, 80),
    state: pickTripSnapshotSlice(trip),
  };

  const store = readStore();
  const prev = store[tripId] || [];
  // Keep chronological oldest→newest in storage; trim oldest when over cap.
  const next = [...prev, entry];
  while (next.length > MAX_ENTRIES_PER_TRIP) {
    next.shift();
  }
  store[tripId] = next;
  writeStore(store);
  return entry;
}

export function getTripSnapshot(
  tripId: string,
  snapshotId: string
): TripSnapshotEntry | null {
  return listTripSnapshots(tripId).find((e) => e.id === snapshotId) || null;
}

export function popLatestTripSnapshot(tripId: string): TripSnapshotEntry | null {
  const store = readStore();
  const list = store[tripId] || [];
  if (list.length === 0) return null;
  const entry = list[list.length - 1];
  store[tripId] = list.slice(0, -1);
  if (store[tripId].length === 0) delete store[tripId];
  writeStore(store);
  return entry;
}

/** Apply slice onto a live TripState — only whitelisted fields. */
export function applyTripSnapshotSlice(
  trip: TripState,
  slice: TripSnapshotSlice
): TripState {
  return {
    ...trip,
    timeline: deepCloneViaJson(slice.timeline),
    dayStays: slice.dayStays ? deepCloneViaJson(slice.dayStays) : trip.dayStays,
    packing: deepCloneViaJson(slice.packing),
    expenses: deepCloneViaJson(slice.expenses),
    budget: deepCloneViaJson(slice.budget),
    meetup: deepCloneViaJson(slice.meetup),
  };
}
