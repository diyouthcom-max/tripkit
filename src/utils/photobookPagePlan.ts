import type {
  MemoryPhotoMeta,
  PhotobookChapterStory,
  PhotobookDraft,
  PhotobookGridCount,
  SavedTripEntry,
} from '../types';

/**
 * Single source of truth for the photobook page order.
 *
 * Both the on-screen spread preview and the print-ready PDF renderer consume
 * this same list, so the collage contact-sheet pages, chapter photos, blank
 * signature padding and the colophon always land on exactly the same physical
 * page numbers.
 */
export type PhotobookPageKind =
  | 'cover'
  | 'epigraph'
  | 'chapter'
  | 'photo'
  | 'photo_grid'
  | 'blank'
  | 'colophon';

export interface PhotobookPage {
  kind: PhotobookPageKind;
  label: string;
  chapter?: PhotobookChapterStory;
  photo?: MemoryPhotoMeta;
  photos?: MemoryPhotoMeta[];
  gridCount?: PhotobookGridCount;
  blankIndex?: number;
}

export interface PhotobookSpread {
  left: PhotobookPage;
  right?: PhotobookPage;
}

export interface PhotobookPageLabels {
  cover: string;
  epigraph: string;
  colophon: string;
  blank: string;
  chapterFallbackTitle: string;
  chapterDaysSuffix: string;
  chapterNarrativeFallback: string;
  chapterPrefix: (n: number) => string;
  chapterStopsSuffix: (stopCount: number) => string;
  daysSuffix?: string;
}

const PRINT_FALLBACK_LABELS: PhotobookPageLabels = {
  cover: 'FRONT COVER',
  epigraph: 'EPIGRAPH',
  colophon: 'COLOPHON',
  blank: 'FIELD NOTES',
  chapterFallbackTitle: 'Chapter',
  chapterDaysSuffix: ' Days',
  chapterNarrativeFallback:
    'Along city streets and morning light, every stop becomes a memory held on paper.',
  chapterPrefix: (n) => `CHAPTER ${n}`,
  chapterStopsSuffix: () => '',
};

export interface PhotobookPagePlanParams {
  draft: PhotobookDraft;
  photos: MemoryPhotoMeta[];
  trips: SavedTripEntry[];
  labels?: PhotobookPageLabels;
}

export function getPhotobookGridCount(draft: PhotobookDraft): PhotobookGridCount {
  const n = draft.gridCount;
  return n === 4 || n === 6 || n === 9 ? n : 4;
}

/** Build the content pages (no signature padding yet). */
export function buildPhotobookPages({
  draft,
  photos,
  trips,
  labels = PRINT_FALLBACK_LABELS,
}: PhotobookPagePlanParams): PhotobookPage[] {
  const gridCount = getPhotobookGridCount(draft);
  const curatedPhotos = draft.includedPhotoIds
    .map((id) => photos.find((p) => p.id === id))
    .filter((p): p is MemoryPhotoMeta => Boolean(p));
  const selectedTrips = trips.filter((t) => draft.selectedTripIds.includes(t.id));

  const chapters: PhotobookChapterStory[] =
    draft.chapters.length > 0
      ? draft.chapters
      : selectedTrips.map((tr, idx) => ({
          tripId: tr.id,
          chapterNumber: idx + 1,
          chapterTitle:
            tr.state.intel.routeTitle ||
            tr.state.setup.cities.join(' · ') ||
            `${labels.chapterFallbackTitle} ${idx + 1}`,
          dateSpanLabel: `${tr.state.setup.departureDate} · ${tr.state.setup.days}${
            labels.daysSuffix ?? labels.chapterDaysSuffix
          }`,
          routeLine: tr.state.setup.cities.join(' → '),
          narrativeIntro: labels.chapterNarrativeFallback,
          highlightsLine: labels.chapterStopsSuffix((tr.state.timeline || []).length),
        }));

  const pages: PhotobookPage[] = [
    { kind: 'cover', label: labels.cover },
    { kind: 'epigraph', label: labels.epigraph },
  ];

  for (const ch of chapters) {
    pages.push({
      kind: 'chapter',
      label: labels.chapterPrefix(ch.chapterNumber),
      chapter: ch,
    });

    const chPhotos = curatedPhotos.filter((p) => p.matchedTripId === ch.tripId);
    const targetPhotos = chPhotos.length > 0 ? chPhotos : curatedPhotos;

    if (draft.templateId === 'collage') {
      for (let i = 0; i < targetPhotos.length; i += gridCount) {
        const group = targetPhotos.slice(i, i + gridCount);
        pages.push({
          kind: 'photo_grid',
          label: `PLATE ${Math.floor(i / gridCount) + 1} · ${group[0]?.matchedCity || ''}`,
          photos: group,
          gridCount,
        });
      }
    } else {
      targetPhotos.forEach((ph, idx) => {
        pages.push({
          kind: 'photo',
          label: `P.${idx + 1} ${ph.matchedCity}`,
          photo: ph,
        });
      });
    }
  }

  pages.push({ kind: 'colophon', label: labels.colophon });
  return pages;
}

/**
 * Pad before the colophon so the printed signature is a multiple of 4 pages
 * (minimum 20P). Blank pages are part of the plan, not an export-only detail,
 * so the preview shows the very same pages the printer will produce.
 */
export function padPhotobookPages(
  pages: PhotobookPage[],
  minPages = 20,
  blankLabel = PRINT_FALLBACK_LABELS.blank
): PhotobookPage[] {
  const target = Math.max(minPages, Math.ceil(pages.length / 4) * 4);
  const needed = target - pages.length;
  if (needed <= 0) return pages;

  const lastIdx = pages.length - 1;
  const blanks: PhotobookPage[] = Array.from({ length: needed }, (_, i) => ({
    kind: 'blank',
    label: blankLabel,
    blankIndex: i,
  }));
  return [...pages.slice(0, lastIdx), ...blanks, pages[lastIdx]];
}

/** Final, print-accurate page list used by preview, PDF and pageCount. */
export function buildPrintPhotobookPages(
  params: PhotobookPagePlanParams,
  minPages = 20
): PhotobookPage[] {
  const labels = params.labels ?? PRINT_FALLBACK_LABELS;
  return padPhotobookPages(buildPhotobookPages({ ...params, labels }), minPages, labels.blank);
}

export function countPhotobookPages(params: PhotobookPagePlanParams): number {
  return buildPrintPhotobookPages(params).length;
}

export function pairPhotobookPages(pages: PhotobookPage[]): PhotobookSpread[] {
  const spreads: PhotobookSpread[] = [];
  for (let i = 0; i < pages.length; i += 2) {
    spreads.push({ left: pages[i], right: pages[i + 1] });
  }
  return spreads;
}
