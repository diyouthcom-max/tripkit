import type { AiAssistantProposal } from '../types';

export type AiWriteDomain =
  | 'dates'
  | 'tripCreate'
  | 'itinerary'
  | 'packing'
  | 'expense';

export type AiWriteDomainMap = Record<AiWriteDomain, boolean>;

/** Independent local-only key — never touches tripBook / Firestore / cloudSync. */
export const AI_WRITE_DOMAINS_STORAGE_KEY = 'tripkit_ai_write_domains_v1';

export const AI_WRITE_DOMAIN_LIST: AiWriteDomain[] = [
  'dates',
  'tripCreate',
  'itinerary',
  'packing',
  'expense',
];

export const DEFAULT_AI_WRITE_DOMAINS: AiWriteDomainMap = {
  dates: true,
  tripCreate: true,
  itinerary: true,
  packing: true,
  expense: true,
};

function isDomainMap(value: unknown): value is AiWriteDomainMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  return AI_WRITE_DOMAIN_LIST.every((d) => typeof obj[d] === 'boolean');
}

export function loadAiWriteDomains(): AiWriteDomainMap {
  if (typeof window === 'undefined') return { ...DEFAULT_AI_WRITE_DOMAINS };
  try {
    const raw = window.localStorage.getItem(AI_WRITE_DOMAINS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AI_WRITE_DOMAINS };
    const parsed = JSON.parse(raw) as unknown;
    if (!isDomainMap(parsed)) return { ...DEFAULT_AI_WRITE_DOMAINS };
    return { ...DEFAULT_AI_WRITE_DOMAINS, ...parsed };
  } catch {
    return { ...DEFAULT_AI_WRITE_DOMAINS };
  }
}

export function saveAiWriteDomains(perms: AiWriteDomainMap): void {
  if (typeof window === 'undefined') return;
  try {
    const next: AiWriteDomainMap = {
      dates: Boolean(perms.dates),
      tripCreate: Boolean(perms.tripCreate),
      itinerary: Boolean(perms.itinerary),
      packing: Boolean(perms.packing),
      expense: Boolean(perms.expense),
    };
    window.localStorage.setItem(AI_WRITE_DOMAINS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota / private mode — fail soft.
  }
}

export function countEnabledAiWriteDomains(perms: AiWriteDomainMap): number {
  return AI_WRITE_DOMAIN_LIST.reduce((n, d) => n + (perms[d] ? 1 : 0), 0);
}

/** Domains touched by a concrete proposal payload. */
export function getTouchedDomainsForProposal(
  proposal: AiAssistantProposal
): AiWriteDomain[] {
  const out: AiWriteDomain[] = [];
  if (proposal.dateChange || proposal.destinationChange) out.push('dates');
  if (proposal.itineraryRebuild) out.push('tripCreate');
  if (
    (proposal.stops && proposal.stops.length > 0) ||
    (proposal.removeStops && proposal.removeStops.length > 0) ||
    proposal.rainSwap ||
    (proposal.tasks && proposal.tasks.length > 0)
  ) {
    out.push('itinerary');
  }
  if (
    (proposal.packingItems && proposal.packingItems.length > 0) ||
    proposal.packingTemplate
  ) {
    out.push('packing');
  }
  if (proposal.expenses && proposal.expenses.length > 0) out.push('expense');
  return out;
}

/**
 * Domains that are disabled in perms AND present in the proposal.
 * Mapping:
 *   dates -> dateChange, destinationChange
 *   tripCreate -> itineraryRebuild
 *   itinerary -> stops, removeStops, rainSwap, tasks
 *   packing -> packingItems, packingTemplate
 *   expense -> expenses
 */
export function getBlockedDomainsForProposal(
  proposal: AiAssistantProposal,
  perms: AiWriteDomainMap
): AiWriteDomain[] {
  return getTouchedDomainsForProposal(proposal).filter((d) => !perms[d]);
}

export function listDisabledAiWriteDomains(perms: AiWriteDomainMap): AiWriteDomain[] {
  return AI_WRITE_DOMAIN_LIST.filter((d) => !perms[d]);
}
