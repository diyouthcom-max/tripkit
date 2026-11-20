import type {
  AppLanguage,
  AppTab,
  PackingReminderSettings,
  TimeFormatPref,
  TripState,
} from '../types';
import { DEFAULT_PACKING_REMINDER } from '../data/presets';
import { translateDemoStopTitle } from '../i18n';
import { getNotificationSchedulerCopy } from '../i18n/packs/utilsAndModalsPack';
import { formatTimeByPref } from './preferencesHelpers';

export const LOCAL_PUSH_SCHEDULES_STORAGE_KEY = 'tripkit_local_push_schedules_v1';

export type ItineraryAlertLeadMinutes = 15 | 30 | 60;

export type ScheduledAlertKind =
  | 'itinerary_stop'
  | 'evening_meetup'
  | 'itinerary_custom'
  | 'packing_deadline'
  | 'packing_morning'
  | 'packing_custom';

export interface CustomScheduledAlert {
  id: string;
  kind: 'itinerary_custom' | 'packing_custom';
  title: string;
  note?: string;
  triggerAtMs: number;
  targetTab: AppTab;
  targetDay?: number;
  createdAtMs: number;
}

export interface ArmedStopAlertConfig {
  leadMinutes: ItineraryAlertLeadMinutes;
  armedAtMs: number;
}

export interface TripLocalNotificationState {
  itineraryLeadMinutes: ItineraryAlertLeadMinutes;
  armedStops: Record<string, ArmedStopAlertConfig>;
  /** Day number (1..N) -> armedAtMs */
  armedMeetupDays: Record<number, number>;
  customAlerts: CustomScheduledAlert[];
  /** Deterministic alert signature -> firedAtMs */
  firedSignatures: Record<string, number>;
  /** Base alert id -> snoozedTriggerAtMs */
  snoozedAlerts: Record<string, number>;
}

export interface ResolvedScheduledAlert {
  baseId: string;
  signature: string;
  kind: ScheduledAlertKind;
  title: string;
  body: string;
  itemsPreview?: string[];
  triggerAtMs: number;
  eventAtMs: number;
  targetTab: AppTab;
  targetDay?: number;
  nodeId?: string;
  customId?: string;
  leadMinutes?: number;
  armedAtMs?: number;
  isFired: boolean;
  isAutoRule: boolean;
  projectedToNextClock?: boolean;
}

export const DEFAULT_TRIP_LOCAL_NOTIFICATION_STATE: TripLocalNotificationState = {
  itineraryLeadMinutes: 30,
  armedStops: {},
  armedMeetupDays: {},
  customAlerts: [],
  firedSignatures: {},
  snoozedAlerts: {},
};

function normalizeLeadMinutes(val: unknown): ItineraryAlertLeadMinutes {
  if (val === 15 || val === 30 || val === 60) return val;
  return 30;
}

export function sanitizeTripLocalNotificationState(
  raw: unknown
): TripLocalNotificationState {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_TRIP_LOCAL_NOTIFICATION_STATE };
  }
  const obj = raw as Partial<TripLocalNotificationState>;

  const armedStops: Record<string, ArmedStopAlertConfig> = {};
  if (obj.armedStops && typeof obj.armedStops === 'object') {
    for (const [nodeId, cfg] of Object.entries(obj.armedStops)) {
      if (cfg && typeof cfg === 'object') {
        armedStops[nodeId] = {
          leadMinutes: normalizeLeadMinutes((cfg as ArmedStopAlertConfig).leadMinutes),
          armedAtMs:
            typeof (cfg as ArmedStopAlertConfig).armedAtMs === 'number'
              ? (cfg as ArmedStopAlertConfig).armedAtMs
              : Date.now(),
        };
      }
    }
  }

  const armedMeetupDays: Record<number, number> = {};
  if (obj.armedMeetupDays && typeof obj.armedMeetupDays === 'object') {
    for (const [dayKey, ts] of Object.entries(obj.armedMeetupDays)) {
      const dayNum = Number(dayKey);
      if (Number.isInteger(dayNum) && dayNum >= 1 && typeof ts === 'number') {
        armedMeetupDays[dayNum] = ts;
      }
    }
  }

  const customAlerts: CustomScheduledAlert[] = Array.isArray(obj.customAlerts)
    ? obj.customAlerts
        .filter(
          (item): item is CustomScheduledAlert =>
            Boolean(item) &&
            typeof item.id === 'string' &&
            (item.kind === 'itinerary_custom' || item.kind === 'packing_custom') &&
            typeof item.title === 'string' &&
            item.title.trim().length > 0 &&
            typeof item.triggerAtMs === 'number' &&
            Number.isFinite(item.triggerAtMs)
        )
        .slice(0, 60)
    : [];

  const firedSignatures: Record<string, number> = {};
  if (obj.firedSignatures && typeof obj.firedSignatures === 'object') {
    const entries = Object.entries(obj.firedSignatures).filter(
      ([, ts]) => typeof ts === 'number' && Number.isFinite(ts)
    );
    // Keep most recent 300 signatures so localStorage stays tiny
    entries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 300)
      .forEach(([sig, ts]) => {
        firedSignatures[sig] = ts;
      });
  }

  const snoozedAlerts: Record<string, number> = {};
  if (obj.snoozedAlerts && typeof obj.snoozedAlerts === 'object') {
    for (const [id, ts] of Object.entries(obj.snoozedAlerts)) {
      if (typeof ts === 'number' && Number.isFinite(ts)) {
        snoozedAlerts[id] = ts;
      }
    }
  }

  return {
    itineraryLeadMinutes: normalizeLeadMinutes(obj.itineraryLeadMinutes),
    armedStops,
    armedMeetupDays,
    customAlerts,
    firedSignatures,
    snoozedAlerts,
  };
}

export function loadAllLocalNotificationStates(): Record<string, TripLocalNotificationState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_PUSH_SCHEDULES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};
    const result: Record<string, TripLocalNotificationState> = {};
    for (const [tripId, val] of Object.entries(parsed)) {
      result[tripId] = sanitizeTripLocalNotificationState(val);
    }
    return result;
  } catch {
    return {};
  }
}

export function saveAllLocalNotificationStates(
  map: Record<string, TripLocalNotificationState>
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_PUSH_SCHEDULES_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota restrictions
  }
}

export function getTripNotificationState(
  map: Record<string, TripLocalNotificationState>,
  tripId: string
): TripLocalNotificationState {
  return map[tripId] ?? DEFAULT_TRIP_LOCAL_NOTIFICATION_STATE;
}

export async function registerNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const existing = await navigator.serviceWorker.getRegistration('/sw-notifications.js');
    if (existing) return existing;
    return await navigator.serviceWorker.register('/sw-notifications.js', { scope: '/' });
  } catch {
    return null;
  }
}

export async function dispatchLocalBrowserNotification(opts: {
  title: string;
  body: string;
  tag: string;
  data?: { targetTab?: AppTab; targetDay?: number };
}): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    Notification.permission !== 'granted'
  ) {
    return false;
  }

  // Prefer ServiceWorkerRegistration.showNotification where available (works across desktop + mobile PWAs)
  try {
    if ('serviceWorker' in navigator) {
      const reg =
        (await navigator.serviceWorker.getRegistration('/sw-notifications.js')) ||
        (await navigator.serviceWorker.getRegistration());
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(opts.title, {
          body: opts.body,
          tag: opts.tag,
          data: opts.data,
        });
        return true;
      }
    }
  } catch {
    // Fall back to standard Notification constructor below
  }

  try {
    const notif = new Notification(opts.title, {
      body: opts.body,
      tag: opts.tag,
    });
    notif.onclick = () => {
      try {
        window.focus();
      } catch {
        // Ignore iframe focus restrictions
      }
      if (opts.data) {
        window.postMessage(
          { type: 'TRIPKIT_NOTIFICATION_CLICK', payload: opts.data },
          window.location.origin
        );
      }
      notif.close();
    };
    return true;
  } catch {
    // Embedded preview iframes may block native Notification constructor
    return false;
  }
}

function parseHmTime(hm: string): { hours: number; minutes: number } {
  const match = /^(\d{1,2}):(\d{2})$/.exec((hm || '').trim());
  if (!match) return { hours: 10, minutes: 0 };
  const hours = Math.min(23, Math.max(0, Number(match[1]) || 0));
  const minutes = Math.min(59, Math.max(0, Number(match[2]) || 0));
  return { hours, minutes };
}

/**
 * Resolves the local calendar event timestamp for Day `dayNumber` at `timeStr` ("HH:MM").
 * If the trip's calendar date for that day is already in the past when the user explicitly
 * armed the alert (common when exploring demo/template trips), seamlessly projects to the
 * next upcoming occurrence of `timeStr` (today or tomorrow) so scheduled alerts remain actionable.
 */
export function resolveTripDayClockMs(params: {
  departureDate: string;
  dayNumber: number;
  timeStr: string;
  armedAtMs: number;
}): { eventAtMs: number; projectedToNextClock: boolean } {
  const { departureDate, dayNumber, timeStr, armedAtMs } = params;
  const { hours, minutes } = parseHmTime(timeStr);
  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec((departureDate || '').trim());

  if (dateParts) {
    const year = Number(dateParts[1]);
    const monthIdx = Number(dateParts[2]) - 1;
    const dayOfMonth = Number(dateParts[3]);
    const candidate = new Date(
      year,
      monthIdx,
      dayOfMonth + Math.max(0, dayNumber - 1),
      hours,
      minutes,
      0,
      0
    ).getTime();

    if (Number.isFinite(candidate) && candidate > armedAtMs - 5 * 60_000) {
      return { eventAtMs: candidate, projectedToNextClock: false };
    }
  }

  // Fallback / Demo-Trip Projection: next upcoming local occurrence of HH:MM after armedAtMs
  const ref = new Date(armedAtMs);
  const nextSameDay = new Date(
    ref.getFullYear(),
    ref.getMonth(),
    ref.getDate(),
    hours,
    minutes,
    0,
    0
  ).getTime();
  if (nextSameDay > armedAtMs) {
    return { eventAtMs: nextSameDay, projectedToNextClock: true };
  }
  const nextTomorrow = new Date(
    ref.getFullYear(),
    ref.getMonth(),
    ref.getDate() + 1,
    hours,
    minutes,
    0,
    0
  ).getTime();
  return { eventAtMs: nextTomorrow, projectedToNextClock: true };
}

export function formatLocalDateTimeInputValue(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function formatScheduleBadgeLabel(
  triggerAtMs: number,
  nowMs: number,
  lang: AppLanguage,
  timeFormat: TimeFormatPref = '24h'
): string {
  const copy = getNotificationSchedulerCopy(lang);
  const d = new Date(triggerAtMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  const hm24 = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const formattedClock = formatTimeByPref(hm24, timeFormat);
  const diffMs = triggerAtMs - nowMs;

  if (diffMs <= 0) {
    return copy.dueNow(formattedClock);
  }

  const diffMins = Math.ceil(diffMs / 60_000);
  if (diffMins < 60) {
    return copy.inMins(diffMins, formattedClock);
  }

  const diffHours = Math.floor(diffMins / 60);
  const remMins = diffMins % 60;
  if (diffHours < 24) {
    return remMins > 0
      ? copy.inHoursMins(diffHours, remMins, formattedClock)
      : copy.inHours(diffHours, formattedClock);
  }

  const monthDay = copy.dayFirstDate
    ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`
    : `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
  return `${monthDay} ${formattedClock}`;
}

export function resolveTripScheduledAlerts(params: {
  trip: TripState;
  localState: TripLocalNotificationState;
  lang: AppLanguage;
  timeFormat?: TimeFormatPref;
  formatPackItemName?: (name: string, qty?: number) => string;
}): ResolvedScheduledAlert[] {
  const {
    trip,
    localState,
    lang,
    timeFormat = '24h',
    formatPackItemName = (n) => n,
  } = params;
  const copy = getNotificationSchedulerCopy(lang);
  const alerts: ResolvedScheduledAlert[] = [];

  // 1. Armed Itinerary Stops
  for (const node of trip.timeline) {
    const armedCfg = localState.armedStops[node.id];
    if (!armedCfg) continue;
    const isVisited = node.visited !== undefined ? node.visited : Boolean(node.logged);
    if (isVisited) continue;

    const dayNum = Math.max(1, node.day ?? 1);
    const dayRainSwapped =
      trip.rainSwappedDays?.[dayNum] ?? (dayNum === 2 ? trip.rainSwapped : false);
    const useRainBackup = Boolean(dayRainSwapped && node.isOutdoor && node.rainSwapTitle);
    const rawTitle = useRainBackup ? node.rainSwapTitle! : node.title;
    const rawDistrict =
      useRainBackup && node.rainSwapDistrict ? node.rainSwapDistrict : node.district;
    const localizedStopTitle = translateDemoStopTitle(rawTitle, lang);

    const { eventAtMs, projectedToNextClock } = resolveTripDayClockMs({
      departureDate: trip.setup.departureDate,
      dayNumber: dayNum,
      timeStr: node.time,
      armedAtMs: armedCfg.armedAtMs,
    });

    const baseId = `stop_${node.id}`;
    const snoozedMs = localState.snoozedAlerts[baseId];
    const triggerAtMs =
      snoozedMs !== undefined ? snoozedMs : eventAtMs - armedCfg.leadMinutes * 60_000;
    const signature = `${baseId}@${triggerAtMs}`;
    const stopClock = formatTimeByPref(node.time, timeFormat);

    alerts.push({
      baseId,
      signature,
      kind: 'itinerary_stop',
      title: copy.upcomingStopTitle(armedCfg.leadMinutes, localizedStopTitle),
      body: copy.upcomingStopBody(dayNum, stopClock, rawDistrict, node.transitNote || ''),
      triggerAtMs,
      eventAtMs,
      targetTab: 'itinerary',
      targetDay: dayNum,
      nodeId: node.id,
      leadMinutes: armedCfg.leadMinutes,
      armedAtMs: armedCfg.armedAtMs,
      isFired: Boolean(localState.firedSignatures[signature]),
      isAutoRule: false,
      projectedToNextClock,
    });
  }

  // 2. Armed Evening Meetups (per day)
  for (const [dayKey, armedAtMs] of Object.entries(localState.armedMeetupDays)) {
    const dayNum = Number(dayKey);
    if (!Number.isInteger(dayNum) || dayNum < 1 || dayNum > Math.max(1, trip.setup.days)) {
      continue;
    }
    const leadMinutes = localState.itineraryLeadMinutes;
    const { eventAtMs, projectedToNextClock } = resolveTripDayClockMs({
      departureDate: trip.setup.departureDate,
      dayNumber: dayNum,
      timeStr: trip.meetup.time || '19:30',
      armedAtMs,
    });

    const baseId = `meetup_day_${dayNum}`;
    const snoozedMs = localState.snoozedAlerts[baseId];
    const triggerAtMs =
      snoozedMs !== undefined ? snoozedMs : eventAtMs - leadMinutes * 60_000;
    const signature = `${baseId}@${triggerAtMs}`;
    const meetupClock = formatTimeByPref(trip.meetup.time || '19:30', timeFormat);

    alerts.push({
      baseId,
      signature,
      kind: 'evening_meetup',
      title: copy.eveningMeetupTitle(leadMinutes, trip.meetup.placeName),
      body: copy.eveningMeetupBody(dayNum, meetupClock, trip.meetup.address),
      triggerAtMs,
      eventAtMs,
      targetTab: 'itinerary',
      targetDay: dayNum,
      leadMinutes,
      armedAtMs,
      isFired: Boolean(localState.firedSignatures[signature]),
      isAutoRule: false,
      projectedToNextClock,
    });
  }

  // 3. Automatic Packing Pre-Departure & Departure-Morning Rules (when reminder.enabled)
  const reminder: PackingReminderSettings = trip.reminder ?? DEFAULT_PACKING_REMINDER;
  if (reminder.enabled) {
    const allUnpacked = trip.packing.flatMap((g) => g.items).filter((it) => !it.done);
    const preNightBase = allUnpacked.filter((it) => !it.morningOfDeparture);
    const scopedPending =
      reminder.scope === 'pinned_only'
        ? preNightBase.filter((it) => it.remindBeforeDeparture)
        : reminder.scope === 'carry_on_only'
        ? preNightBase.filter((it) => it.carryOnOnly)
        : preNightBase;

    if (scopedPending.length > 0) {
      let rawTriggerMs = NaN;
      let depMorningMs = NaN;
      const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
        (trip.setup.departureDate || '').trim()
      );
      if (dateMatch) {
        depMorningMs = new Date(
          Number(dateMatch[1]),
          Number(dateMatch[2]) - 1,
          Number(dateMatch[3]),
          9,
          0,
          0,
          0
        ).getTime();
      }
      if (reminder.mode === 'custom' && reminder.customDateTime) {
        rawTriggerMs = new Date(reminder.customDateTime).getTime();
      } else if (Number.isFinite(depMorningMs)) {
        rawTriggerMs = depMorningMs - reminder.leadHours * 3600_000;
      }

      if (Number.isFinite(rawTriggerMs)) {
        const baseId = 'auto_packing_deadline';
        const snoozedMs =
          localState.snoozedAlerts[baseId] ?? reminder.snoozedUntil;
        const triggerAtMs = snoozedMs !== undefined ? snoozedMs : rawTriggerMs;
        const signature = `${baseId}@${triggerAtMs}@${scopedPending.length > 0 ? 'pending' : 'done'}`;
        const itemNames = scopedPending.map((it) =>
          formatPackItemName(it.name, it.quantity)
        );
        const previewStr = itemNames.slice(0, 3).join(copy.listSep);
        const extraStr =
          itemNames.length > 3 ? copy.moreItemsSuffix(itemNames.length - 3) : '';

        alerts.push({
          baseId,
          signature,
          kind: 'packing_deadline',
          title: copy.packingDeadlineTitle(scopedPending.length),
          body: copy.packingDeadlineBody(previewStr, extraStr),
          itemsPreview: itemNames,
          triggerAtMs,
          eventAtMs: Number.isFinite(depMorningMs) ? depMorningMs : triggerAtMs,
          targetTab: 'packing',
          isFired: Boolean(localState.firedSignatures[signature]),
          isAutoRule: true,
        });
      }
    }

    const morningPending = allUnpacked.filter((it) => it.morningOfDeparture);
    const depMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      (trip.setup.departureDate || '').trim()
    );
    if (morningPending.length > 0 && depMatch) {
      const morningTriggerBase = new Date(
        Number(depMatch[1]),
        Number(depMatch[2]) - 1,
        Number(depMatch[3]),
        7,
        30,
        0,
        0
      ).getTime();
      const baseId = 'auto_packing_morning';
      const snoozedMs = localState.snoozedAlerts[baseId];
      const triggerAtMs =
        snoozedMs !== undefined ? snoozedMs : morningTriggerBase;
      const signature = `${baseId}@${triggerAtMs}`;
      const itemNames = morningPending.map((it) =>
        formatPackItemName(it.name, it.quantity)
      );

      alerts.push({
        baseId,
        signature,
        kind: 'packing_morning',
        title: copy.packingMorningTitle(morningPending.length),
        body: copy.packingMorningBody(itemNames.slice(0, 3).join(copy.listSep)),
        itemsPreview: itemNames,
        triggerAtMs,
        eventAtMs: morningTriggerBase,
        targetTab: 'packing',
        isFired: Boolean(localState.firedSignatures[signature]),
        isAutoRule: true,
      });
    }
  }

  // 4. User-Created Custom Itinerary & Packing Deadline Alerts
  for (const custom of localState.customAlerts) {
    const baseId = `custom_${custom.id}`;
    const snoozedMs = localState.snoozedAlerts[baseId];
    const triggerAtMs = snoozedMs !== undefined ? snoozedMs : custom.triggerAtMs;
    const signature = `${baseId}@${triggerAtMs}`;

    alerts.push({
      baseId,
      signature,
      kind: custom.kind,
      title:
        custom.kind === 'itinerary_custom'
          ? copy.customItineraryTitle(custom.title)
          : copy.customPackingTitle(custom.title),
      body:
        custom.note && custom.note.trim()
          ? custom.note.trim()
          : custom.kind === 'itinerary_custom'
          ? copy.customItineraryBody(trip.intel.routeTitle)
          : copy.customPackingBody(custom.title),
      triggerAtMs,
      eventAtMs: custom.triggerAtMs,
      targetTab: custom.targetTab,
      targetDay: custom.targetDay,
      customId: custom.id,
      armedAtMs: custom.createdAtMs,
      isFired: Boolean(localState.firedSignatures[signature]),
      isAutoRule: false,
    });
  }

  return alerts.sort((a, b) => a.triggerAtMs - b.triggerAtMs);
}
