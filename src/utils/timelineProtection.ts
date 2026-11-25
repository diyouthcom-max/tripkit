import type { TimelineNode, TravelPass } from '../types';

/** Hard-anchor protection: locked, legacy isAnchor, or ticket-linked. */
export function isNodeProtected(
  node: Pick<TimelineNode, 'id' | 'locked' | 'isAnchor'>,
  travelPasses?: TravelPass[] | null
): boolean {
  if (node.locked === true) return true;
  if (node.isAnchor === true) return true;
  if (
    travelPasses &&
    travelPasses.some((p) => p.linkedTimelineNodeId && p.linkedTimelineNodeId === node.id)
  ) {
    return true;
  }
  return false;
}

export function collectProtectedNodes(
  timeline: TimelineNode[],
  travelPasses?: TravelPass[] | null
): TimelineNode[] {
  return timeline.filter((n) => isNodeProtected(n, travelPasses));
}

/**
 * After an AI merge, re-insert any protected nodes that disappeared.
 * Missing nodes are restored on their original day (clamped to maxDay when provided).
 */
export function restoreMissingProtectedNodes(
  previousTimeline: TimelineNode[],
  nextTimeline: TimelineNode[],
  travelPasses?: TravelPass[] | null,
  options?: { maxDay?: number }
): TimelineNode[] {
  const nextIds = new Set(nextTimeline.map((n) => n.id));
  const missing = previousTimeline.filter(
    (n) => isNodeProtected(n, travelPasses) && !nextIds.has(n.id)
  );
  if (missing.length === 0) return nextTimeline;

  const maxDay = options?.maxDay;
  const restored = missing.map((n) => {
    const day = n.day ?? 1;
    if (typeof maxDay === 'number' && maxDay >= 1 && day > maxDay) {
      return { ...n, day: maxDay };
    }
    return n;
  });

  return [...nextTimeline, ...restored].sort((a, b) => {
    const d = (a.day ?? 1) - (b.day ?? 1);
    if (d !== 0) return d;
    return String(a.time || '').localeCompare(String(b.time || ''));
  });
}

export type ProtectedConflictKind = 'day_out_of_range' | 'city_mismatch';

export interface ProtectedConflictReport {
  kind: ProtectedConflictKind;
  nodes: TimelineNode[];
}

/** Only for date-shrink / city-chain conflicts — not ordinary reorders. */
export function detectProtectedConflicts(
  protectedNodes: TimelineNode[],
  options: {
    maxDay: number;
    resolveCityForDay: (day: number) => string;
  }
): ProtectedConflictReport[] {
  const outOfRange: TimelineNode[] = [];
  const cityMismatch: TimelineNode[] = [];

  for (const n of protectedNodes) {
    const day = n.day ?? 1;
    if (day < 1 || day > options.maxDay) {
      outOfRange.push(n);
      continue;
    }
    const expected = String(options.resolveCityForDay(day) || '')
      .toLowerCase()
      .trim();
    const actual = String(n.city || '')
      .toLowerCase()
      .trim();
    if (!actual || !expected) continue;
    // Allow transition labels like "A → B" that contain either city token.
    const expectedPrimary = expected.split('→')[0]?.trim() || expected;
    const actualPrimary = actual.split('→')[0]?.trim() || actual;
    if (
      actual !== expected &&
      !actual.includes(expectedPrimary) &&
      !expected.includes(actualPrimary)
    ) {
      cityMismatch.push(n);
    }
  }

  const reports: ProtectedConflictReport[] = [];
  if (outOfRange.length > 0) {
    reports.push({ kind: 'day_out_of_range', nodes: outOfRange });
  }
  if (cityMismatch.length > 0) {
    reports.push({ kind: 'city_mismatch', nodes: cityMismatch });
  }
  return reports;
}

export function formatProtectedConflictWarning(
  reports: ProtectedConflictReport[],
  copy: {
    dayOutOfRange: (count: number, names: string) => string;
    cityMismatch: (count: number, names: string) => string;
  }
): string | null {
  if (reports.length === 0) return null;
  const parts: string[] = [];
  for (const r of reports) {
    const names = r.nodes
      .map((n) => n.title)
      .filter(Boolean)
      .slice(0, 4)
      .join('、');
    if (r.kind === 'day_out_of_range') {
      parts.push(copy.dayOutOfRange(r.nodes.length, names));
    } else {
      parts.push(copy.cityMismatch(r.nodes.length, names));
    }
  }
  return parts.join(' ');
}
