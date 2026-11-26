import type { PackingGroup } from '../types';

export const PACKING_TEMPLATES_STORAGE_KEY = 'tripkit_packing_templates_v1';

export const PACKING_TEMPLATE_NAME_MAX = 40;
export const PACKING_TEMPLATE_MAX_COUNT = 20;

export interface PackingTemplate {
  id: string;
  name: string;
  createdAt: number;
  scenarioIds?: string[];
  groups: PackingGroup[];
}

function deepCloneGroups(groups: PackingGroup[]): PackingGroup[] {
  try {
    return JSON.parse(JSON.stringify(groups)) as PackingGroup[];
  } catch {
    return [];
  }
}

function isPackingTemplate(value: unknown): value is PackingTemplate {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.createdAt === 'number' &&
    Array.isArray(obj.groups)
  );
}

function persist(templates: PackingTemplate[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      PACKING_TEMPLATES_STORAGE_KEY,
      JSON.stringify(templates)
    );
  } catch {
    // Quota / private mode — fail soft.
  }
}

function trimName(name: string): string {
  return String(name || '')
    .trim()
    .slice(0, PACKING_TEMPLATE_NAME_MAX);
}

export function loadPackingTemplates(): PackingTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PACKING_TEMPLATES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isPackingTemplate)
      .map((t) => ({
        id: t.id,
        name: trimName(t.name) || t.name,
        createdAt: t.createdAt,
        scenarioIds: Array.isArray(t.scenarioIds)
          ? t.scenarioIds.map(String).filter(Boolean)
          : undefined,
        groups: deepCloneGroups(t.groups),
      }))
      .filter((t) => t.name.length > 0)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, PACKING_TEMPLATE_MAX_COUNT);
  } catch {
    return [];
  }
}

export function savePackingTemplate(
  name: string,
  groups: PackingGroup[],
  scenarioIds?: string[]
): PackingTemplate[] {
  const trimmed = trimName(name);
  if (!trimmed) return loadPackingTemplates();

  const entry: PackingTemplate = {
    id: `ptpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: trimmed,
    createdAt: Date.now(),
    scenarioIds:
      Array.isArray(scenarioIds) && scenarioIds.length > 0
        ? scenarioIds.map(String).filter(Boolean)
        : undefined,
    groups: deepCloneGroups(groups),
  };

  const next = [entry, ...loadPackingTemplates()]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, PACKING_TEMPLATE_MAX_COUNT);
  persist(next);
  return next;
}

export function deletePackingTemplate(id: string): PackingTemplate[] {
  const next = loadPackingTemplates().filter((t) => t.id !== id);
  persist(next);
  return next;
}

export function renamePackingTemplate(
  id: string,
  name: string
): PackingTemplate[] {
  const trimmed = trimName(name);
  if (!trimmed) return loadPackingTemplates();
  const next = loadPackingTemplates().map((t) =>
    t.id === id ? { ...t, name: trimmed } : t
  );
  persist(next);
  return next;
}
