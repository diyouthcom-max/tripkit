import type {
  AlwaysPackTemplateItem,
  AppLanguage,
  PackingGroup,
  PackingItem,
} from '../types';
import { getItemQuantity, getItemUnitWeight } from './packingHelpers';
import { getPackingUtilsCopy } from '../i18n/packs/packingUtilsPack';

export const ALWAYS_PACK_STORAGE_KEY = 'tripkit_always_pack_v1';

function normalizeItemNameKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[（()）\[\]]/g, '');
}

export function loadAlwaysPackLibrary(): AlwaysPackTemplateItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ALWAYS_PACK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is AlwaysPackTemplateItem =>
        Boolean(item && typeof item === 'object' && typeof item.name === 'string' && item.name.trim())
    );
  } catch {
    return [];
  }
}

export function saveAlwaysPackLibrary(items: AlwaysPackTemplateItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ALWAYS_PACK_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
}

export function upsertAlwaysPackItem(
  item: PackingItem,
  groupId: string,
  groupTitle: string,
  lang: AppLanguage = 'zh-CN'
): AlwaysPackTemplateItem[] {
  const current = loadAlwaysPackLibrary();
  const key = normalizeItemNameKey(item.name);
  const qty = getItemQuantity(item);
  const unitW = getItemUnitWeight(item, groupId);
  const copy = getPackingUtilsCopy(lang);

  const nextEntry: AlwaysPackTemplateItem = {
    id: `ap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: item.name.trim(),
    why: item.why || copy.alwaysPack.defaultWhy,
    tag: item.tag || '必需',
    quantity: qty,
    unitWeightGrams: unitW,
    carryOnOnly: Boolean(item.carryOnOnly),
    morningOfDeparture: Boolean(item.morningOfDeparture),
    smartBagId: item.smartBagId,
    groupId,
    groupTitle,
    updatedAt: Date.now(),
  };

  const existingIdx = current.findIndex((it) => normalizeItemNameKey(it.name) === key);
  const updated =
    existingIdx >= 0
      ? current.map((it, idx) =>
          idx === existingIdx ? { ...nextEntry, id: it.id } : it
        )
      : [nextEntry, ...current];

  saveAlwaysPackLibrary(updated);
  return updated;
}

export function removeAlwaysPackItemByName(name: string): AlwaysPackTemplateItem[] {
  const key = normalizeItemNameKey(name);
  const updated = loadAlwaysPackLibrary().filter(
    (it) => normalizeItemNameKey(it.name) !== key
  );
  saveAlwaysPackLibrary(updated);
  return updated;
}

export function removeAlwaysPackItemById(id: string): AlwaysPackTemplateItem[] {
  const updated = loadAlwaysPackLibrary().filter((it) => it.id !== id);
  saveAlwaysPackLibrary(updated);
  return updated;
}

export function seedCoreAlwaysPackFromGroups(
  groups: PackingGroup[],
  lang: AppLanguage
): AlwaysPackTemplateItem[] {
  const copy = getPackingUtilsCopy(lang);
  const existing = loadAlwaysPackLibrary();
  if (existing.length > 0) return existing;

  const corePattern =
    /护照|身份证|passport|pasaporte|passeport|reisepass|passaporte|パスポート|充电|charger|cargador|chargeur|ladegerät|carregador|充電器|转换插头|adapter|adaptor|adaptador|adaptateur|変換プラグ|耳机|airpods|earbuds|audífonos|écouteurs|kopfhörer|fones|イヤホン|牙刷|toothbrush|cepillo|brosse|zahnbürste|escova|歯ブラシ|手机|phone|teléfono|téléphone|handy|celular|スマホ|数据线|cable|câble|kabel|cabo|ケーブル|药品|medicine|medicina|médicament|medizin|remédio|常備薬|眼镜|glasses|lentes|lunettes|brille|óculos|眼鏡|充电宝|power bank|batería|batterie|モバイルバッテリー/i;

  const seeded: AlwaysPackTemplateItem[] = [];
  const seenKeys = new Set<string>();

  for (const grp of groups) {
    for (const item of grp.items) {
      if (seeded.length >= 6) break;
      if (corePattern.test(item.name) || item.alwaysPack) {
        const key = normalizeItemNameKey(item.name);
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        seeded.push({
          id: `ap_seed_${seeded.length + 1}`,
          name: item.name,
          why: item.why || copy.alwaysPack.seedEssentialWhy,
          tag: item.tag || '必需',
          quantity: getItemQuantity(item),
          unitWeightGrams: getItemUnitWeight(item, grp.id),
          carryOnOnly: Boolean(item.carryOnOnly),
          morningOfDeparture: Boolean(item.morningOfDeparture),
          smartBagId: item.smartBagId,
          groupId: grp.id,
          groupTitle: grp.title,
          updatedAt: Date.now(),
        });
      }
    }
    if (seeded.length >= 6) break;
  }

  if (seeded.length > 0) {
    saveAlwaysPackLibrary(seeded);
  }
  return seeded;
}

export function mergeAlwaysPackIntoGroups(
  groups: PackingGroup[],
  libraryItems: AlwaysPackTemplateItem[] = loadAlwaysPackLibrary(),
  ownerId = 'm1'
): { groups: PackingGroup[]; addedCount: number; syncedCount: number } {
  if (libraryItems.length === 0 || groups.length === 0) {
    return { groups, addedCount: 0, syncedCount: 0 };
  }

  const libByKey = new Map<string, AlwaysPackTemplateItem>();
  libraryItems.forEach((entry) => {
    libByKey.set(normalizeItemNameKey(entry.name), entry);
  });

  let syncedCount = 0;
  const existingKeys = new Set<string>();

  const nextGroups = groups.map((g) => ({
    ...g,
    items: g.items.map((it) => {
      const k = normalizeItemNameKey(it.name);
      existingKeys.add(k);
      if (libByKey.has(k) && !it.alwaysPack) {
        syncedCount += 1;
        return { ...it, alwaysPack: true };
      }
      return it;
    }),
  }));

  let addedCount = 0;
  for (const tpl of libraryItems) {
    const key = normalizeItemNameKey(tpl.name);
    if (existingKeys.has(key)) continue;

    const targetIndex = Math.max(
      0,
      nextGroups.findIndex(
        (g) =>
          g.id === tpl.groupId ||
          g.title.toLowerCase() === tpl.groupTitle.toLowerCase()
      )
    );

    const qty = Math.max(1, tpl.quantity || 1);
    const unitW =
      typeof tpl.unitWeightGrams === 'number' && tpl.unitWeightGrams >= 0
        ? Math.round(tpl.unitWeightGrams)
        : 80;

    const newItem: PackingItem = {
      id: `item_ap_${Date.now()}_${addedCount}_${Math.random().toString(36).slice(2, 5)}`,
      name: tpl.name,
      why: tpl.why,
      tag: tpl.tag || '必需',
      quantity: qty,
      unitWeightGrams: unitW,
      weightGrams: Math.max(0, unitW * qty),
      carryOnOnly: tpl.carryOnOnly,
      morningOfDeparture: tpl.morningOfDeparture,
      smartBagId: tpl.smartBagId,
      ownership: 'personal',
      ownerId,
      createdAt: Date.now(),
      done: false,
      alwaysPack: true,
    };

    nextGroups[targetIndex] = {
      ...nextGroups[targetIndex],
      items: [...nextGroups[targetIndex].items, newItem],
    };
    existingKeys.add(key);
    addedCount += 1;
  }

  return { groups: nextGroups, addedCount, syncedCount };
}

export const NEVER_SUGGEST_STORAGE_KEY = 'tripkit_never_suggest_v1';

export function loadNeverSuggestList(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NEVER_SUGGEST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string' && Boolean(x.trim()));
  } catch {
    return [];
  }
}

export function saveNeverSuggestList(names: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NEVER_SUGGEST_STORAGE_KEY, JSON.stringify(names));
  } catch {
    // Ignore storage quota errors
  }
}

export function addNeverSuggestItem(name: string): string[] {
  const clean = name.trim();
  if (!clean) return loadNeverSuggestList();
  const key = normalizeItemNameKey(clean);
  const current = loadNeverSuggestList();
  if (current.some((entry) => normalizeItemNameKey(entry) === key)) {
    return current;
  }
  const updated = [clean, ...current];
  saveNeverSuggestList(updated);
  return updated;
}

export function removeNeverSuggestItem(name: string): string[] {
  const key = normalizeItemNameKey(name);
  const updated = loadNeverSuggestList().filter(
    (entry) => normalizeItemNameKey(entry) !== key
  );
  saveNeverSuggestList(updated);
  return updated;
}

export function isItemNeverSuggested(
  name: string,
  blocklist: string[] = loadNeverSuggestList()
): boolean {
  if (!name.trim() || blocklist.length === 0) return false;
  const targetKey = normalizeItemNameKey(name);
  return blocklist.some((blocked) => normalizeItemNameKey(blocked) === targetKey);
}

export function filterGroupsAgainstNeverSuggest(
  groups: PackingGroup[],
  blocklist: string[] = loadNeverSuggestList()
): PackingGroup[] {
  if (blocklist.length === 0) return groups;
  const blockedKeys = new Set(blocklist.map(normalizeItemNameKey));
  return groups.map((g) => ({
    ...g,
    items: g.items.filter((it) => !blockedKeys.has(normalizeItemNameKey(it.name))),
  }));
}
