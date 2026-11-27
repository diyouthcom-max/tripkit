import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  LayoutGrid,
  Loader2,
  Printer,
  RotateCw,
  Sparkles,
  X,
} from 'lucide-react';
import { resolveApiUrl } from '../services/nativePhotoBridge';
import type {
  AppLanguage,
  MemoryPhotoMeta,
  PhotobookBindingId,
  PhotobookChapterStory,
  PhotobookDraft,
  PhotobookFormatId,
  PhotobookPhotoCaption,
  PhotobookTemplateId,
  SavedTripEntry,
} from '../types';
import { exportPrintReadyPhotobookPdf } from '../utils/exportPhotobookPdf';
import {
  buildPrintPhotobookPages,
  countPhotobookPages,
  getPhotobookGridCount,
  pairPhotobookPages,
  type PhotobookPage,
  type PhotobookPageLabels,
  type PhotobookSpread,
} from '../utils/photobookPagePlan';
import {
  evaluatePhotoPrintDpi,
  type StoredMemoryPhotoBlob,
} from '../utils/memoryPhotoVault';
import { getPhotobookStudioCopy } from '../i18n/packs/memoriesStudioPack';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';

export interface PhotobookStudioModalProps {
  open: boolean;
  onClose: () => void;
  draft: PhotobookDraft;
  onUpdateDraft: (next: PhotobookDraft) => void;
  photos: MemoryPhotoMeta[];
  photoBlobs: Record<string, StoredMemoryPhotoBlob>;
  trips: SavedTripEntry[];
  language: AppLanguage;
  onOpenPrintCheckout: () => void;
  onToast: (msg: string) => void;
}

// The preview and the print PDF share one page-plan module, so collage pages,
// blank signature padding and the colophon always sit on the same page numbers.
type PreviewSpreadItem = PhotobookPage;
type SpreadPair = PhotobookSpread;

export const PhotobookStudioModal: React.FC<PhotobookStudioModalProps> = ({
  open,
  onClose,
  draft,
  onUpdateDraft,
  photos,
  photoBlobs,
  trips,
  language,
  onOpenPrintCheckout,
  onToast,
}) => {
  const copy = getPhotobookStudioCopy(language);
  const [allowPhotoVision, setAllowPhotoVision] = useState(true);
  const [showBleedGuides, setShowBleedGuides] = useState(true);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [activeSide, setActiveSide] = useState<'left' | 'right'>('left');
  const [orientationHint, setOrientationHint] = useState(false);
  const gridCount = getPhotobookGridCount(draft);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const isNative = Capacitor.isNativePlatform();
    if (isNative) {
      // Native app: actually lock the device to landscape while the studio is open.
      ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => {
        if (!cancelled) setOrientationHint(true);
      });
    } else {
      // Browsers cannot force orientation (iOS Safari has no screen.orientation.lock),
      // so we only show a gentle rotate hint on narrow portrait screens.
      setOrientationHint(window.innerWidth < 820 && window.innerWidth < window.innerHeight);
    }
    const onResize = () => {
      if (!isNative && !cancelled) {
        setOrientationHint(window.innerWidth < 820 && window.innerWidth < window.innerHeight);
      }
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      if (isNative) {
        ScreenOrientation.unlock().catch(() => undefined);
      }
      setOrientationHint(false);
    };
  }, [open]);

  const curatedPhotos = useMemo(
    () =>
      draft.includedPhotoIds
        .map((id) => photos.find((p) => p.id === id))
        .filter((p): p is MemoryPhotoMeta => Boolean(p)),
    [draft.includedPhotoIds, photos]
  );

  const selectedTrips = useMemo(
    () => trips.filter((t) => draft.selectedTripIds.includes(t.id)),
    [trips, draft.selectedTripIds]
  );

  const lowResCount = useMemo(
    () =>
      curatedPhotos.filter(
        (p) =>
          evaluatePhotoPrintDpi(p.width, p.height, draft.formatId).grade ===
          'low_res_grid_only'
      ).length,
    [curatedPhotos, draft.formatId]
  );

  const pageLabels = useMemo<PhotobookPageLabels>(
    () => ({
      cover: copy.frontCoverLabel,
      epigraph: copy.epigraphLabel,
      colophon: copy.colophonLabel,
      blank: copy.spreadBlankLabel,
      chapterFallbackTitle: copy.chapterFallbackTitle,
      chapterDaysSuffix: copy.chapterDaysSuffix,
      chapterNarrativeFallback: copy.chapterNarrativeFallback,
      chapterPrefix: copy.chapterPrefix,
      chapterStopsSuffix: copy.chapterStopsSuffix,
    }),
    [copy]
  );

  // One authoritative page list: preview spreads and the print PDF both use it.
  const pages = useMemo(
    () => buildPrintPhotobookPages({ draft, photos, trips, labels: pageLabels }),
    [draft, photos, trips, pageLabels]
  );
  const spreadPairs = useMemo<SpreadPair[]>(() => pairPhotobookPages(pages), [pages]);

  /** Any edit that can change the page plan recomputes pageCount from the same plan. */
  const commitDraft = (patch: Partial<PhotobookDraft>) => {
    const next: PhotobookDraft = { ...draft, ...patch };
    onUpdateDraft({
      ...next,
      pageCount: countPhotobookPages({ draft: next, photos, trips }),
      updatedAt: Date.now(),
    });
  };

  const safeIdx = Math.min(spreadPairs.length - 1, Math.max(0, spreadIndex));
  const activePair = spreadPairs[safeIdx];
  const activeSpread =
    activeSide === 'right' && activePair?.right ? activePair.right : activePair?.left;

  if (!open) return null;

  const resolvePhotoUrl = (p?: MemoryPhotoMeta) => {
    if (!p) return '';
    return (
      photoBlobs[p.id]?.fullDataUrl ||
      photoBlobs[p.id]?.thumbDataUrl ||
      p.sampleImageUrl ||
      ''
    );
  };


  const handleGenerateAiBook = async () => {
    if (curatedPhotos.length === 0) {
      onToast(copy.selectPhotoFirstToast);
      return;
    }
    setAiError(null);
    setIsGeneratingAi(true);
    try {
      const tripsContext = selectedTrips.map((tr) => ({
        tripId: tr.id,
        routeTitle: tr.state.intel.routeTitle || tr.state.setup.cities.join(' -> '),
        cities: tr.state.setup.cities,
        departureDate: tr.state.setup.departureDate,
        days: tr.state.setup.days,
        tripStyle: tr.state.setup.tripStyle,
        keyStops: (tr.state.timeline || []).slice(0, 12).map((s) => ({
          day: s.day,
          city: s.city,
          title: s.title,
          district: s.district,
        })),
        expenseCount: (tr.state.expenses || []).length,
      }));

      const photosContext = curatedPhotos.slice(0, 24).map((p) => ({
        id: p.id,
        matchedTripId: p.matchedTripId,
        matchedDay: p.matchedDay,
        matchedCity: p.matchedCity,
        matchedStopTitle: p.matchedStopTitle,
        takenAtIso: p.takenAtIso,
        cameraLabel: p.cameraLabel,
        userNote: p.userNote,
        thumbDataUrl: allowPhotoVision ? photoBlobs[p.id]?.thumbDataUrl || '' : '',
      }));

      const resp = await fetch(resolveApiUrl('/api/ai/generate-photobook'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          templateId: draft.templateId,
          allowPhotoVision,
          tripsContext,
          photosContext,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.error || 'AI generation failed');
      }

      const nextCaptions: Record<string, PhotobookPhotoCaption> = {
        ...draft.photoCaptions,
      };
      if (Array.isArray(data.photoCaptions)) {
        for (const item of data.photoCaptions) {
          if (item?.photoId) {
            nextCaptions[String(item.photoId)] = {
              photoId: String(item.photoId),
              headline: String(item.headline || ''),
              storyCaption: String(item.storyCaption || ''),
              layoutHint:
                item.layoutHint === 'editorial_split' || item.layoutHint === 'polaroid_pair'
                  ? item.layoutHint
                  : 'hero_full',
            };
          }
        }
      }

      const nextChapters: PhotobookChapterStory[] = Array.isArray(data.chapters)
        ? data.chapters.map((c: Record<string, unknown>, i: number) => ({
            tripId: String(c.tripId || selectedTrips[i]?.id || ''),
            chapterNumber: Number(c.chapterNumber) || i + 1,
            chapterTitle: String(c.chapterTitle || ''),
            dateSpanLabel: String(c.dateSpanLabel || ''),
            routeLine: String(c.routeLine || ''),
            narrativeIntro: String(c.narrativeIntro || ''),
            highlightsLine: String(c.highlightsLine || ''),
          }))
        : draft.chapters;

      commitDraft({
        bookTitle: String(data.bookTitle || draft.bookTitle).slice(0, 80),
        bookSubtitle: String(data.bookSubtitle || draft.bookSubtitle).slice(0, 100),
        epigraph: String(data.epigraph || draft.epigraph),
        colophonSummary: String(data.colophonSummary || draft.colophonSummary),
        chapters: nextChapters,
        photoCaptions: nextCaptions,
        generatedByAi: true,
      });

      setSpreadIndex(0);
      onToast(copy.aiReadyToast);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const res = await exportPrintReadyPhotobookPdf({
        draft,
        photos,
        trips,
        includeCropMarks: true,
      });
      onToast(copy.downloadedPdfToast(res.totalPages));
    } catch {
      onToast(copy.exportPdfFailedToast);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const isSquare = draft.formatId === 'square_210';
  const isScrapbook = draft.templateId === 'scrapbook';
  const isEditorial = draft.templateId === 'editorial';
  const isCollage = draft.templateId === 'collage';

  const pageTrimGuides = (
    <>
      <div
        className="pointer-events-none absolute inset-[5px] border border-dashed tk-bc-danger-soft z-20"
        title={copy.trimLineTitle}
      />
      <div
        className="pointer-events-none absolute inset-[18px] border border-dotted tk-bc-forest-soft z-20"
        title={copy.safeAreaTitle}
      />
    </>
  );

  const renderPage = (item: PreviewSpreadItem | undefined, side: 'left' | 'right') => {
    if (!item) {
      return (
        <div className="relative w-full h-full tk-bg-paper flex items-center justify-center">
          <span className="font-serif text-[13px] tk-text-ink2 tracking-widest">—</span>
          {showBleedGuides && pageTrimGuides}
        </div>
      );
    }

    const photo = item.photo;
    const cap = photo ? draft.photoCaptions[photo.id] : undefined;
    const headline = cap?.headline || photo?.matchedStopTitle || photo?.matchedCity || '';
    const story = cap?.storyCaption || photo?.userNote || copy.photoCaptionFallback;
    const coverPhoto = curatedPhotos[0];
    let inner: React.ReactNode = null;

    if (item.kind === 'cover') {
      if (isScrapbook) {
        inner = (
          <div className="w-full h-full tk-bg-paper flex flex-col items-center justify-center gap-5 p-6">
            <div
              className="w-[76%] aspect-[4/5] bg-white p-2.5 tk-elev-soft"
              style={{ transform: `rotate(${side === 'left' ? -1.5 : 1.5}deg)` }}
            >
              {coverPhoto && (
                <img
                  src={resolvePhotoUrl(coverPhoto)}
                  alt={draft.bookTitle}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="text-center">
              <div className="font-serif text-xl font-bold tk-text-ink text-balance">
                {draft.bookTitle}
              </div>
              <div className="mt-1 text-[13px] tk-text-ink2">{draft.bookSubtitle}</div>
            </div>
          </div>
        );
      } else if (isEditorial) {
        inner = (
          <div className="w-full h-full flex flex-col">
            <div className="h-[70%] overflow-hidden bg-white">
              {coverPhoto && (
                <img
                  src={resolvePhotoUrl(coverPhoto)}
                  alt={draft.bookTitle}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex-1 px-6 flex flex-col justify-center border-t-[3px] tk-bc-forest">
              <div className="text-[13px] tracking-[0.3em] tk-text-forest font-bold">
                {copy.signatureKeyword}
              </div>
              <div className="text-2xl font-bold tk-text-ink tracking-tight text-balance">
                {draft.bookTitle}
              </div>
              <div className="mt-1 text-[13px] tk-text-ink2">{draft.bookSubtitle}</div>
            </div>
          </div>
        );
      } else {
        inner = (
          <div className="w-full h-full flex flex-col">
            <div className="flex-1 overflow-hidden p-7 flex items-center justify-center">
              {coverPhoto && (
                <img
                  src={resolvePhotoUrl(coverPhoto)}
                  alt={draft.bookTitle}
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>
            <div className="px-8 pb-8 text-center space-y-2">
              <div className="font-serif text-2xl font-bold tk-text-ink text-balance">
                {draft.bookTitle}
              </div>
              <div className="text-[13px] tk-text-ink2 tracking-wide">{draft.bookSubtitle}</div>
            </div>
          </div>
        );
      }
    } else if (item.kind === 'epigraph') {
      inner = (
        <div className="w-full h-full p-8 flex flex-col items-center justify-center text-center space-y-5">
          <div className="font-serif text-[13px] tracking-[0.3em] tk-text-forest">
            TRAVEL MONOGRAPH · EDITION I
          </div>
          {isEditorial && <div className="w-10 h-[2px] tk-bg-forest" />}
          <p className="font-serif italic text-base tk-text-ink leading-loose">
            “{draft.epigraph}”
          </p>
          <div className="pt-2 text-[13px] tk-text-ink2">
            {selectedTrips
              .map((t) => t.state.intel.routeTitle || t.state.setup.cities.join(' · '))
              .join('  /  ')}
          </div>
        </div>
      );
    } else if (item.kind === 'chapter' && item.chapter) {
      const ch = item.chapter;
      if (isEditorial) {
        inner = (
          <div className="relative w-full h-full p-7 flex flex-col justify-between overflow-hidden">
            <span className="pointer-events-none absolute -top-6 right-1 font-serif font-bold text-[110px] leading-none tk-text-ink opacity-[0.07]">
              0{ch.chapterNumber}
            </span>
            <div className="space-y-2 pt-2 relative">
              <div className="text-[13px] font-bold tracking-widest tk-text-forest">
                CHAPTER 0{ch.chapterNumber} · {ch.dateSpanLabel}
              </div>
              <h3 className="font-serif text-2xl font-bold tk-text-ink text-balance relative z-10">
                {ch.chapterTitle}
              </h3>
              <div className="text-[13px] tk-text-ink2">{ch.routeLine}</div>
            </div>
            <div className="border-t-[3px] tk-bc-forest pt-4 space-y-3 relative z-10">
              <p className="text-sm tk-text-ink2 leading-relaxed">{ch.narrativeIntro}</p>
              {ch.highlightsLine && (
                <div className="font-serif text-[13px] tk-text-forest">
                  {ch.highlightsLine}
                </div>
              )}
            </div>
          </div>
        );
      } else if (isScrapbook) {
        inner = (
          <div className="w-full h-full tk-bg-paper p-7 flex flex-col justify-between">
            <div className="bg-white tk-elev-soft px-3 py-1.5 self-start -rotate-1 text-[13px] font-bold tk-text-forest">
              CHAPTER 0{ch.chapterNumber} · {ch.dateSpanLabel}
            </div>
            <div className="space-y-2">
              <h3 className="font-serif text-2xl font-bold tk-text-ink text-balance">
                {ch.chapterTitle}
              </h3>
              <div className="text-[13px] tk-text-ink2">{ch.routeLine}</div>
            </div>
            <div className="border-t tk-bc-hair pt-4">
              <p className="text-sm tk-text-ink2 leading-relaxed">{ch.narrativeIntro}</p>
            </div>
          </div>
        );
      } else {
        inner = (
          <div className="w-full h-full p-8 flex flex-col justify-center items-center text-center space-y-4">
            <div className="font-serif text-[13px] tracking-[0.3em] tk-text-forest">
              CHAPTER 0{ch.chapterNumber}
            </div>
            <h3 className="font-serif text-2xl font-bold tk-text-ink text-balance">
              {ch.chapterTitle}
            </h3>
            <div className="w-10 h-px tk-bc-forest" />
            <p className="text-sm tk-text-ink2 leading-loose max-w-[85%]">{ch.narrativeIntro}</p>
            <div className="text-[13px] tk-text-ink2">{ch.dateSpanLabel}</div>
          </div>
        );
      }
    } else if (item.kind === 'photo' && photo) {
      if (isEditorial) {
        inner = (
          <div className="relative w-full h-full overflow-hidden bg-white">
            <img
              src={resolvePhotoUrl(photo)}
              alt={headline}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent pt-16 pb-5 px-5 text-white">
              <div className="font-serif text-lg font-bold">{headline}</div>
              <p className="text-[13px] text-white/85 mt-1.5 line-clamp-3 leading-relaxed">
                {story}
              </p>
            </div>
          </div>
        );
      } else if (isScrapbook) {
        inner = (
          <div className="w-full h-full tk-bg-paper p-5 flex flex-col">
            <div
              className="bg-white p-2.5 tk-elev-soft"
              style={{ transform: `rotate(${side === 'left' ? -1 : 1}deg)` }}
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={resolvePhotoUrl(photo)}
                  alt={headline}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="pt-3 space-y-1 text-center">
              <div className="font-serif text-base font-bold tk-text-ink">{headline}</div>
              <p className="text-[13px] tk-text-ink2 line-clamp-2 leading-relaxed">{story}</p>
            </div>
          </div>
        );
      } else {
        inner = (
          <div className="w-full h-full p-6 flex flex-col justify-center">
            <div className="flex-1 min-h-0 overflow-hidden flex items-center justify-center">
              <img
                src={resolvePhotoUrl(photo)}
                alt={headline}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <div className="pt-4 space-y-1 text-center">
              <div className="font-serif text-base font-bold tk-text-ink">{headline}</div>
              <p className="text-[13px] tk-text-ink2 line-clamp-2 leading-relaxed">{story}</p>
            </div>
          </div>
        );
      }
    } else if (item.kind === 'photo_grid' && item.photos) {
      // Collage layout: several photos in ONE physical page, magazine contact-sheet style.
      const group = item.photos;
      const cols = gridCount === 4 ? 2 : 3;
      const rows = gridCount === 4 ? 2 : gridCount === 6 ? 2 : 3;
      inner = (
        <div className="w-full h-full bg-white p-[7%] flex flex-col">
          <div className="flex items-baseline justify-between gap-2 pb-[4%] border-b tk-bc-hair">
            <span className="font-serif text-[11px] tracking-[0.28em] tk-text-forest font-bold truncate">
              {item.label.split(' · ')[0]}
            </span>
            <span className="text-[9px] tracking-widest tk-text-ink2 tabular-nums shrink-0">
              {group.length} / {gridCount} FRAMES
            </span>
          </div>
          <div
            className="flex-1 min-h-0 pt-[5%] grid"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
              gap: '3%',
            }}
          >
            {Array.from({ length: gridCount }).map((_, i) => {
              const ph = group[i];
              if (!ph) {
                return (
                  <div
                    key={`empty-${i}`}
                    className="border border-dashed tk-bc-hair tk-bg-paper"
                  />
                );
              }
              const gridCap = draft.photoCaptions[ph.id];
              return (
                <div key={ph.id} className="relative overflow-hidden tk-bg-paper">
                  <img
                    src={resolvePhotoUrl(ph)}
                    alt={gridCap?.headline || ph.matchedCity}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent pt-3 pb-1 px-1.5">
                    <span className="block text-[9px] leading-tight text-white/95 truncate">
                      {gridCap?.headline || ph.matchedStopTitle || ph.matchedCity}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="pt-[4%] flex items-center justify-between gap-2 text-[9px] tracking-widest tk-text-ink2">
            <span className="truncate">{group[0]?.matchedCity || ''}</span>
            <span className="shrink-0">CONTACT SHEET · ARCHIVAL</span>
          </div>
        </div>
      );
    } else if (item.kind === 'blank') {
      // Signature padding is a real printed page — show it in the proof too.
      inner = (
        <div className="w-full h-full tk-bg-paper flex flex-col items-center justify-center gap-3 p-6">
          <span className="font-serif text-[11px] tracking-[0.3em] tk-text-ink2 text-center">
            {item.label}
          </span>
          <div className="w-10 h-px tk-bc-hair" />
          <div className="w-[72%] space-y-3 opacity-60">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-px border-t tk-bc-hair" />
            ))}
          </div>
          <span className="font-serif text-[11px] tk-text-ink2 tabular-nums">
            {(item.blankIndex ?? 0) + 1}
          </span>
        </div>
      );
    } else if (item.kind === 'colophon') {
      if (isEditorial) {
        inner = (
          <div className="w-full h-full tk-bg-forest text-white p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="font-serif text-lg font-bold">{draft.bookTitle}</div>
            <div className="w-10 h-px bg-white/40" />
            <p className="text-[13px] text-white/75 leading-relaxed max-w-xs">
              {draft.colophonSummary}
            </p>
            <div className="pt-2 font-serif text-[13px] tk-text-card tracking-widest">
              {isSquare ? '210×210MM' : '148×210MM'} · ARCHIVAL PRINT
            </div>
          </div>
        );
      } else {
        inner = (
          <div className={`w-full h-full p-8 flex flex-col items-center justify-center text-center space-y-4 ${isScrapbook ? 'tk-bg-paper' : 'bg-white'}`}>
            <div className="font-serif text-lg font-bold tk-text-ink">{draft.bookTitle}</div>
            <div className="w-10 h-px tk-bc-forest" />
            <p className="text-[13px] tk-text-ink2 leading-relaxed max-w-xs">
              {draft.colophonSummary}
            </p>
            <div className="font-serif text-[13px] tk-text-ink2 tracking-widest">
              {isSquare ? '210×210MM' : '148×210MM'} · ARCHIVAL PRINT
            </div>
          </div>
        );
      }
    }

    return (
      <div
        className={`relative w-full h-full overflow-hidden ${isScrapbook ? 'tk-bg-paper' : 'bg-white'}`}
      >
        {inner}
        {showBleedGuides && pageTrimGuides}
      </div>
    );
  };

  return (
    <div
      className="[font-family:'Inter_Variable',Inter,system-ui,'PingFang_SC',sans-serif] [--font-serif:'Playfair_Display',Georgia,'Songti_SC',serif] fixed inset-0 z-50 tk-bg-overlay p-0 sm:p-4 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-5xl max-h-[94vh] flex flex-col rounded-t-3xl sm:rounded-3xl border tk-bc-hair bg-white tk-elev-soft overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Studio Bar */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b tk-bc-hair bg-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <BookOpen className="w-5 h-5 tk-text-forest shrink-0" />
            <div className="min-w-0">
              <h2 className="font-serif text-sm sm:text-base font-bold tk-text-ink truncate">
                {copy.studioTitle}
              </h2>
              <div className="text-[13px] tk-text-ink2 truncate tabular-nums">
                {copy.signatureSub(draft.pageCount, curatedPhotos.length, selectedTrips.length)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isExportingPdf}
              onClick={handleExportPdf}
              className="font-serif h-9 px-3 rounded-[16px] border tk-bc-hair bg-white hover:tk-bg-paper text-sm font-bold tk-text-ink inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {isExportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin tk-text-forest" />
              ) : (
                <Download className="w-3.5 h-3.5 tk-text-forest" />
              )}
              <span className="hidden sm:inline">
                {copy.bleedPdfBtn}
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenPrintCheckout}
              className="h-9 px-3.5 rounded-[16px] tk-bg-forest hover:tk-bg-press text-sm font-bold text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{copy.orderPrintBtn}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label={copy.closeAria}
              className="h-9 w-9 inline-flex items-center justify-center rounded-[16px] tk-text-ink2 hover:tk-bg-forest-tint cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Rotate hint — only shown in browsers / when native lock fails */}
        {orientationHint && (
          <div className="flex items-center gap-2 px-4 sm:px-6 py-2 tk-bg-forest-tint border-b tk-bc-hair shrink-0">
            <RotateCw className="w-4 h-4 tk-text-forest shrink-0" />
            <span className="text-[13px] tk-text-ink2 leading-snug flex-1">
              {copy.rotateHint}
            </span>
            <button
              type="button"
              onClick={() => setOrientationHint(false)}
              aria-label={copy.closeAria}
              className="w-6 h-6 inline-flex items-center justify-center rounded-full tk-text-ink2 hover:tk-bg-paper cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main 2-Column Studio Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x tk-divide-hair">
          {/* Left Controls Rail (5 cols) */}
          <div className="lg:col-span-5 p-4 sm:p-5 space-y-4 tk-bg-card">
            {/* AI Story Director + Explicit Privacy Consent */}
            <div className="rounded-[20px] border tk-bc-hair bg-white p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-serif text-sm font-bold tk-text-ink">
                  {copy.aiEditorialHeading}
                </span>
                {draft.generatedByAi && (
                  <span className="inline-flex items-center gap-1 text-[13px] font-semibold tk-text-forest">
                    <Check className="w-3 h-3" />
                    {copy.aiCuratedBadge}
                  </span>
                )}
              </div>

              <label className="flex items-start gap-2.5 text-sm tk-text-ink2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allowPhotoVision}
                  onChange={(e) => setAllowPhotoVision(e.target.checked)}
                  className="mt-0.5 rounded tk-bc-hair tk-text-forest tk-accent-forest"
                />
                <span className="leading-relaxed">
                  {copy.visionConsentText(curatedPhotos.length)}
                </span>
              </label>

              {aiError && (
                <div className="rounded-[16px] tk-bg-danger-tint border tk-bc-danger-hair px-3 py-2 text-sm tk-text-danger">
                  {aiError}
                </div>
              )}

              <button
                type="button"
                disabled={isGeneratingAi}
                onClick={() => void handleGenerateAiBook()}
                className="w-full h-10 rounded-[16px] tk-bg-forest hover:tk-bg-press text-white text-sm font-bold inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {isGeneratingAi ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>
                  {isGeneratingAi ? copy.composingBtn : copy.generateAiBtn}
                </span>
              </button>
            </div>

            {/* Magazine Template Selector */}
            <div className="space-y-1.5">
              <div className="font-serif text-sm font-bold tk-text-ink">
                {copy.step1Heading}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(['kinfolk', 'editorial', 'scrapbook', 'collage'] as PhotobookTemplateId[]).map((tplId) => (
                  <button
                    key={tplId}
                    type="button"
                    onClick={() => {
                      setSpreadIndex(0);
                      setActiveSide('left');
                      commitDraft({ templateId: tplId });
                    }}
                    className={`h-9 px-2 rounded-[16px] border text-[13px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      draft.templateId === tplId
                        ? 'tk-bc-forest tk-bg-forest-tint tk-text-forest'
                        : 'tk-bc-hair bg-white tk-text-ink2 hover:tk-bc-forest'
                    }`}
                  >
                    {copy.templates[tplId]}
                  </button>
                ))}
              </div>

              {isCollage && (
                <div className="rounded-[16px] border tk-bc-hair bg-white p-2.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-[13px] font-semibold tk-text-ink2">
                    <LayoutGrid className="w-3.5 h-3.5 tk-text-forest" />
                    <span>{copy.gridLayoutLabel}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {([4, 6, 9] as const).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          commitDraft({ gridCount: n });
                          setSpreadIndex(0);
                          setActiveSide('left');
                        }}
                        className={`flex-1 h-8 rounded-[12px] border text-[13px] font-bold tabular-nums transition-colors cursor-pointer ${
                          gridCount === n
                            ? 'tk-bc-forest tk-bg-forest-tint tk-text-forest'
                            : 'tk-bc-hair bg-white tk-text-ink2 hover:tk-bc-forest'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Trim Size & Binding */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <div className="font-serif text-sm font-bold tk-text-ink">
                  {copy.step2Heading}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['square_210', 'portrait_a5'] as PhotobookFormatId[]).map((fmtId) => (
                    <button
                      key={fmtId}
                      type="button"
                      onClick={() => commitDraft({ formatId: fmtId })}
                      className={`h-9 px-2.5 rounded-[16px] border text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        draft.formatId === fmtId
                          ? 'tk-bc-forest tk-bg-forest-tint tk-text-forest'
                          : 'tk-bc-hair bg-white tk-text-ink2'
                      }`}
                    >
                      {copy.formats[fmtId]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="font-serif text-sm font-bold tk-text-ink">
                  {copy.step3Heading}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['hardcover_matte', 'softcover_textured'] as PhotobookBindingId[]).map((bdId) => (
                    <button
                      key={bdId}
                      type="button"
                      onClick={() => commitDraft({ bindingId: bdId })}
                      className={`h-9 px-2.5 rounded-[16px] border text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        draft.bindingId === bdId
                          ? 'tk-bc-forest tk-bg-forest-tint tk-text-forest'
                          : 'tk-bc-hair bg-white tk-text-ink2'
                      }`}
                    >
                      {copy.bindings[bdId]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Pre-Press Bleed & DPI Check */}
            <div className="rounded-[20px] border tk-bc-hair bg-white p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-serif text-sm font-bold tk-text-ink">
                  {copy.proofingHeading}
                </span>
                <button
                  type="button"
                  onClick={() => setShowBleedGuides((v) => !v)}
                  className={`h-7 px-2.5 rounded-lg text-[13px] font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                    showBleedGuides
                      ? 'tk-bg-forest-tint tk-text-forest border tk-bc-forest'
 : 'border tk-bc-hair tk-text-ink2'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>{copy.bleedGuidesBtn}</span>
                </button>
              </div>
              {lowResCount > 0 ? (
                <div className="flex items-start gap-2 text-sm tk-text-warning">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 tk-text-warning" />
                  <span>
                    {copy.lowResWarning(lowResCount)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm tk-text-success">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>
                    {copy.allSharpOk}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Interactive Book Spread & Inline Copy Editor (7 cols) */}
          <div className="lg:col-span-7 p-4 sm:p-6 flex flex-col justify-between tk-bg-forest-plate space-y-4">
            {/* Spread Navigation Header */}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={safeIdx === 0}
                onClick={() => setSpreadIndex((i) => Math.max(0, i - 1))}
                className="font-serif h-9 px-3 rounded-[16px] border tk-bc-hair bg-white text-sm font-semibold tk-text-ink disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{copy.prevBtn}</span>
              </button>

              <div className="text-center min-w-0">
                <div className="font-serif text-sm font-bold tk-text-ink tabular-nums truncate">
                  {activePair?.left.label}
                  {activePair?.right ? ` · ${activePair.right.label}` : ''}
                </div>
                <div className="text-[13px] tk-text-ink2 tabular-nums">
                  {safeIdx + 1} / {spreadPairs.length} {copy.spreadUnit}
                </div>
              </div>

              <button
                type="button"
                disabled={safeIdx >= spreadPairs.length - 1}
                onClick={() => setSpreadIndex((i) => Math.min(spreadPairs.length - 1, i + 1))}
                className="font-serif h-9 px-3 rounded-[16px] border tk-bc-hair bg-white text-sm font-semibold tk-text-ink disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <span>{copy.nextBtn}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Magazine Spread Canvas — physical open book, left + right pages */}
            <div className="flex items-center justify-center py-1">
              <div
                className={`relative flex w-full ${
                  isSquare ? 'max-w-[720px] aspect-[2/1]' : 'max-w-[560px] aspect-[284/210]'
                } rounded-md tk-elev-soft overflow-hidden transition-all gap-[2px] tk-bg-forest-plate p-[3px]`}
              >
                {/* Left page */}
                <button
                  type="button"
                  onClick={() => setActiveSide('left')}
                  className={`relative h-full overflow-hidden transition-shadow ${
                    activeSide === 'left' ? 'ring-2 ring-inset ring-[#0D513A]' : ''
                  }`}
                  style={{ width: '50%' }}
                  aria-label={activePair?.left.label}
                >
                  {renderPage(activePair?.left, 'left')}
                </button>
                {/* Right page */}
                <button
                  type="button"
                  onClick={() => setActiveSide('right')}
                  className={`relative h-full overflow-hidden transition-shadow ${
                    activeSide === 'right' ? 'ring-2 ring-inset ring-[#0D513A]' : ''
                  }`}
                  style={{ width: '50%' }}
                  aria-label={activePair?.right?.label || copy.spreadBlankLabel}
                >
                  {renderPage(activePair?.right, 'right')}
                </button>
              </div>
            </div>

            {/* Spread Filmstrip */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 tk-scroll-thin">
              <span className="font-serif text-[13px] tk-text-ink2 shrink-0 tabular-nums">
                {safeIdx + 1}/{spreadPairs.length}
              </span>
              <div className="flex items-center gap-1.5">
                {spreadPairs.map((pair, idx) => {
                  const thumbPhoto =
                    pair.left.photo ||
                    pair.left.photos?.[0] ||
                    pair.right?.photo ||
                    pair.right?.photos?.[0] ||
                    (pair.left.kind === 'cover' ? curatedPhotos[0] : undefined);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSpreadIndex(idx);
                        setActiveSide('left');
                      }}
                      title={`${idx + 1}. ${pair.left.label}${
                        pair.right ? ` · ${pair.right.label}` : ''
                      }`}
                      className={`relative shrink-0 w-11 h-14 rounded-[6px] overflow-hidden border transition-all ${
                        idx === safeIdx
                          ? 'border-2 tk-bc-forest tk-elev-soft'
                          : 'border tk-bc-hair opacity-70 hover:opacity-100'
                      }`}
                    >
                      {thumbPhoto ? (
                        <img
                          src={resolvePhotoUrl(thumbPhoto)}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span
                          className={`w-full h-full flex items-center justify-center ${
                            pair.left.kind === 'colophon' || pair.right?.kind === 'colophon'
                              ? 'tk-bg-forest'
                              : 'tk-bg-paper'
                          }`}
                        >
                          <span
                            className={`font-serif text-[13px] ${
                              pair.left.kind === 'colophon' || pair.right?.kind === 'colophon'
                                ? 'text-white'
                                : 'tk-text-forest'
                            }`}
                          >
                            {pair.left.kind === 'cover'
                              ? 'I'
                              : pair.left.kind === 'epigraph'
                                ? 'II'
                                : pair.left.kind === 'chapter' || pair.right?.kind === 'chapter'
                                  ? 'C'
                                  : pair.left.kind === 'colophon' || pair.right?.kind === 'colophon'
                                    ? '●'
                                    : '·'}
                          </span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inline Copy Editor for Current Page */}
            <div className="rounded-[20px] border tk-bc-hair bg-white p-3.5 space-y-2">
              {activeSpread?.kind === 'cover' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[13px] font-semibold tk-text-ink2 mb-1">
                      {copy.coverTitleLabel}
                    </label>
                    <input
                      type="text"
                      maxLength={80}
                      value={draft.bookTitle}
                      onChange={(e) =>
                        onUpdateDraft({
                          ...draft,
                          bookTitle: e.target.value,
                          updatedAt: Date.now(),
                        })
                      }
                      className="font-serif w-full h-9 rounded-lg border tk-bc-hair px-2.5 text-base sm:text-sm font-semibold tk-text-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold tk-text-ink2 mb-1">
                      {copy.coverSubtitleLabel}
                    </label>
                    <input
                      type="text"
                      maxLength={100}
                      value={draft.bookSubtitle}
                      onChange={(e) =>
                        onUpdateDraft({
                          ...draft,
                          bookSubtitle: e.target.value,
                          updatedAt: Date.now(),
                        })
                      }
                      className="w-full h-9 rounded-lg border tk-bc-hair px-2.5 text-base sm:text-sm tk-text-ink"
                    />
                  </div>
                </div>
              )}

              {activeSpread?.kind === 'epigraph' && (
                <div>
                  <label className="block text-[13px] font-semibold tk-text-ink2 mb-1">
                    {copy.openingEpigraphLabel}
                  </label>
                  <input
                    type="text"
                    value={draft.epigraph}
                    onChange={(e) =>
                      onUpdateDraft({
                        ...draft,
                        epigraph: e.target.value,
                        updatedAt: Date.now(),
                      })
                    }
                    className="w-full h-9 rounded-lg border tk-bc-hair px-2.5 text-base sm:text-sm tk-text-ink"
                  />
                </div>
              )}

              {activeSpread?.kind === 'chapter' && activeSpread.chapter && (
                <div>
                  <label className="block text-[13px] font-semibold tk-text-ink2 mb-1">
                    {copy.chapterNarrativeLabel}
                  </label>
                  <textarea
                    rows={2}
                    value={activeSpread.chapter.narrativeIntro}
                    onChange={(e) => {
                      const val = e.target.value;
                      const nextCh = draft.chapters.map((c) =>
                        c.tripId === activeSpread.chapter?.tripId
                          ? { ...c, narrativeIntro: val }
                          : c
                      );
                      onUpdateDraft({ ...draft, chapters: nextCh, updatedAt: Date.now() });
                    }}
                    className="w-full rounded-lg border tk-bc-hair p-2 text-base sm:text-sm tk-text-ink"
                  />
                </div>
              )}

              {activeSpread?.kind === 'photo' && activeSpread.photo && (() => {
                const pid = activeSpread.photo.id;
                const existingCap = draft.photoCaptions[pid] || {
                  photoId: pid,
                  headline: activeSpread.photo.matchedStopTitle || activeSpread.photo.matchedCity,
                  storyCaption: activeSpread.photo.userNote || '',
                  layoutHint: 'hero_full' as const,
                };
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[13px] font-semibold tk-text-ink2 mb-1">
                        {copy.photoHeadlineLabel}
                      </label>
                      <input
                        type="text"
                        value={existingCap.headline}
                        onChange={(e) =>
                          onUpdateDraft({
                            ...draft,
                            photoCaptions: {
                              ...draft.photoCaptions,
                              [pid]: { ...existingCap, headline: e.target.value },
                            },
                            updatedAt: Date.now(),
                          })
                        }
                        className="font-serif w-full h-9 rounded-lg border tk-bc-hair px-2.5 text-base sm:text-sm font-semibold tk-text-ink"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[13px] font-semibold tk-text-ink2 mb-1">
                        {copy.storyCaptionLabel}
                      </label>
                      <input
                        type="text"
                        value={existingCap.storyCaption}
                        onChange={(e) =>
                          onUpdateDraft({
                            ...draft,
                            photoCaptions: {
                              ...draft.photoCaptions,
                              [pid]: { ...existingCap, storyCaption: e.target.value },
                            },
                            updatedAt: Date.now(),
                          })
                        }
                        placeholder={copy.storyCaptionPlaceholder}
                        className="w-full h-9 rounded-lg border tk-bc-hair px-2.5 text-base sm:text-sm tk-text-ink"
                      />
                    </div>
                  </div>
                );
              })()}

              {activeSpread?.kind === 'photo_grid' && activeSpread.photos && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold tk-text-ink2">
                      {copy.gridLayoutLabel}
                    </span>
                    <span className="text-[13px] tk-text-forest font-bold tabular-nums">
                      {activeSpread.photos.length} / {gridCount}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {activeSpread.photos.map((ph, i) => {
                      const existingCap = draft.photoCaptions[ph.id] || {
                        photoId: ph.id,
                        headline: ph.matchedStopTitle || ph.matchedCity,
                        storyCaption: ph.userNote || '',
                        layoutHint: 'hero_full' as const,
                      };
                      return (
                        <div key={ph.id}>
                          <label className="block text-[13px] font-semibold tk-text-ink2 mb-1 truncate">
                            {i + 1}. {copy.photoHeadlineLabel}
                          </label>
                          <input
                            type="text"
                            value={existingCap.headline}
                            onChange={(e) =>
                              onUpdateDraft({
                                ...draft,
                                photoCaptions: {
                                  ...draft.photoCaptions,
                                  [ph.id]: { ...existingCap, headline: e.target.value },
                                },
                                updatedAt: Date.now(),
                              })
                            }
                            className="w-full h-9 rounded-lg border tk-bc-hair px-2.5 text-base sm:text-sm tk-text-ink"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeSpread?.kind === 'colophon' && (
                <div>
                  <label className="block text-[13px] font-semibold tk-text-ink2 mb-1">
                    {copy.backColophonLabel}
                  </label>
                  <input
                    type="text"
                    value={draft.colophonSummary}
                    onChange={(e) =>
                      onUpdateDraft({
                        ...draft,
                        colophonSummary: e.target.value,
                        updatedAt: Date.now(),
                      })
                    }
                    className="w-full h-9 rounded-lg border tk-bc-hair px-2.5 text-base sm:text-sm tk-text-ink"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
