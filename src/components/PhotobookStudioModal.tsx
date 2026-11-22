import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Loader2,
  Printer,
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
  evaluatePhotoPrintDpi,
  type StoredMemoryPhotoBlob,
} from '../utils/memoryPhotoVault';
import { getPhotobookStudioCopy } from '../i18n/packs/memoriesStudioPack';

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

interface PreviewSpreadItem {
  kind: 'cover' | 'epigraph' | 'chapter' | 'photo' | 'colophon';
  label: string;
  chapter?: PhotobookChapterStory;
  photo?: MemoryPhotoMeta;
}

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

  const spreads = useMemo<PreviewSpreadItem[]>(() => {
    const list: PreviewSpreadItem[] = [
      { kind: 'cover', label: copy.frontCoverLabel },
      { kind: 'epigraph', label: copy.epigraphLabel },
    ];
    const chapters =
      draft.chapters.length > 0
        ? draft.chapters
        : selectedTrips.map((tr, idx) => ({
            tripId: tr.id,
            chapterNumber: idx + 1,
            chapterTitle:
              tr.state.intel.routeTitle || tr.state.setup.cities.join(' · ') || copy.chapterFallbackTitle,
            dateSpanLabel: `${tr.state.setup.departureDate} · ${tr.state.setup.days}${copy.chapterDaysSuffix}`,
            routeLine: tr.state.setup.cities.join(' → '),
            narrativeIntro: copy.chapterNarrativeFallback,
            highlightsLine: copy.chapterStopsSuffix((tr.state.timeline || []).length),
          }));

    for (const ch of chapters) {
      list.push({
        kind: 'chapter',
        label: copy.chapterPrefix(ch.chapterNumber),
        chapter: ch,
      });
      const chPhotos = curatedPhotos.filter((p) => p.matchedTripId === ch.tripId);
      const targetPhotos = chPhotos.length > 0 ? chPhotos : curatedPhotos;
      targetPhotos.forEach((ph, idx) => {
        list.push({
          kind: 'photo',
          label: `P.${idx + 1} ${ph.matchedCity}`,
          photo: ph,
        });
      });
    }
    list.push({ kind: 'colophon', label: copy.colophonLabel });
    return list;
  }, [draft.chapters, selectedTrips, curatedPhotos, copy]);

  const safeIdx = Math.min(spreads.length - 1, Math.max(0, spreadIndex));
  const activeSpread = spreads[safeIdx];

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

  const recomputeMultipleOf4Pages = (photoCount: number, chapterCount: number) => {
    const rawPages = 3 + chapterCount + photoCount;
    return Math.max(20, Math.ceil(rawPages / 4) * 4);
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

      const nextPages = recomputeMultipleOf4Pages(
        curatedPhotos.length,
        Math.max(1, nextChapters.length)
      );

      onUpdateDraft({
        ...draft,
        bookTitle: String(data.bookTitle || draft.bookTitle).slice(0, 80),
        bookSubtitle: String(data.bookSubtitle || draft.bookSubtitle).slice(0, 100),
        epigraph: String(data.epigraph || draft.epigraph),
        colophonSummary: String(data.colophonSummary || draft.colophonSummary),
        chapters: nextChapters,
        photoCaptions: nextCaptions,
        pageCount: nextPages,
        generatedByAi: true,
        updatedAt: Date.now(),
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

  return (
    <div
      className="fixed inset-0 z-50 tk-bg-overlay p-0 sm:p-4 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-5xl max-h-[94vh] flex flex-col rounded-t-3xl sm:rounded-3xl border tk-bc-hair bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Studio Bar */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b tk-bc-hair bg-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <BookOpen className="w-5 h-5 tk-text-forest shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold tk-text-ink truncate">
                {copy.studioTitle}
              </h2>
              <div className="text-[11px] tk-text-ink2 truncate tabular-nums">
                {copy.signatureSub(draft.pageCount, curatedPhotos.length, selectedTrips.length)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isExportingPdf}
              onClick={handleExportPdf}
              className="h-9 px-3 rounded-xl border tk-bc-hair bg-white hover:tk-bg-paper text-xs font-bold tk-text-ink inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
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
              className="h-9 px-3.5 rounded-xl tk-bg-forest hover:tk-bg-press text-xs font-bold text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{copy.orderPrintBtn}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label={copy.closeAria}
              className="h-9 w-9 inline-flex items-center justify-center rounded-xl tk-text-ink2 hover:tk-bg-forest-tint cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main 2-Column Studio Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x tk-divide-hair">
          {/* Left Controls Rail (5 cols) */}
          <div className="lg:col-span-5 p-4 sm:p-5 space-y-4 tk-bg-card">
            {/* AI Story Director + Explicit Privacy Consent */}
            <div className="rounded-2xl border tk-bc-hair bg-white p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold tk-text-ink">
                  {copy.aiEditorialHeading}
                </span>
                {draft.generatedByAi && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold tk-text-forest">
                    <Check className="w-3 h-3" />
                    {copy.aiCuratedBadge}
                  </span>
                )}
              </div>

              <label className="flex items-start gap-2.5 text-xs tk-text-ink2 cursor-pointer select-none">
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
                <div className="rounded-xl tk-bg-danger-tint border tk-bc-danger-hair px-3 py-2 text-xs tk-text-danger">
                  {aiError}
                </div>
              )}

              <button
                type="button"
                disabled={isGeneratingAi}
                onClick={() => void handleGenerateAiBook()}
                className="w-full h-10 rounded-xl tk-bg-forest hover:tk-bg-press text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
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
              <div className="text-xs font-bold tk-text-ink">
                {copy.step1Heading}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['kinfolk', 'editorial', 'scrapbook'] as PhotobookTemplateId[]).map((tplId) => (
                  <button
                    key={tplId}
                    type="button"
                    onClick={() =>
                      onUpdateDraft({
                        ...draft,
                        templateId: tplId,
                        updatedAt: Date.now(),
                      })
                    }
                    className={`h-9 px-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      draft.templateId === tplId
                        ? 'tk-bc-forest tk-bg-forest text-white'
                        : 'tk-bc-hair bg-white tk-text-ink2 hover:tk-bc-forest'
                    }`}
                  >
                    {copy.templates[tplId]}
                  </button>
                ))}
              </div>
            </div>

            {/* Trim Size & Binding */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <div className="text-xs font-bold tk-text-ink">
                  {copy.step2Heading}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['square_210', 'portrait_a5'] as PhotobookFormatId[]).map((fmtId) => (
                    <button
                      key={fmtId}
                      type="button"
                      onClick={() =>
                        onUpdateDraft({
                          ...draft,
                          formatId: fmtId,
                          updatedAt: Date.now(),
                        })
                      }
                      className={`h-9 px-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
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
                <div className="text-xs font-bold tk-text-ink">
                  {copy.step3Heading}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['hardcover_matte', 'softcover_textured'] as PhotobookBindingId[]).map((bdId) => (
                    <button
                      key={bdId}
                      type="button"
                      onClick={() =>
                        onUpdateDraft({
                          ...draft,
                          bindingId: bdId,
                          updatedAt: Date.now(),
                        })
                      }
                      className={`h-9 px-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
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
            <div className="rounded-2xl border tk-bc-hair bg-white p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold tk-text-ink">
                  {copy.proofingHeading}
                </span>
                <button
                  type="button"
                  onClick={() => setShowBleedGuides((v) => !v)}
                  className={`h-7 px-2.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                    showBleedGuides
                      ? 'tk-bg-forest text-white'
                      : 'border tk-bc-hair tk-text-ink2'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>{copy.bleedGuidesBtn}</span>
                </button>
              </div>
              {lowResCount > 0 ? (
                <div className="flex items-start gap-2 text-xs tk-text-warning">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 tk-text-warning" />
                  <span>
                    {copy.lowResWarning(lowResCount)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs tk-text-success">
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
                className="h-9 px-3 rounded-xl border tk-bc-hair bg-white text-xs font-semibold tk-text-ink disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{copy.prevBtn}</span>
              </button>

              <div className="text-xs font-bold tk-text-ink tabular-nums">
                {activeSpread?.label} ({safeIdx + 1} / {spreads.length})
              </div>

              <button
                type="button"
                disabled={safeIdx >= spreads.length - 1}
                onClick={() => setSpreadIndex((i) => Math.min(spreads.length - 1, i + 1))}
                className="h-9 px-3 rounded-xl border tk-bc-hair bg-white text-xs font-semibold tk-text-ink disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <span>{copy.nextBtn}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Physical Book Page Preview Canvas */}
            <div className="flex items-center justify-center py-1">
              <div
                className={`relative w-full ${
                  isSquare ? 'max-w-[400px] aspect-square' : 'max-w-[320px] aspect-[148/210]'
                } rounded-md shadow-xl overflow-hidden transition-all ${
                  isScrapbook ? 'tk-bg-paper' : 'bg-white'
                }`}
              >
                {/* 3mm Bleed & Safe Zone Guides Overlay */}
                {showBleedGuides && (
                  <>
                    <div
                      className="pointer-events-none absolute inset-[6px] border border-dashed tk-bc-danger-soft z-20"
                      title={copy.trimLineTitle}
                    />
                    <div
                      className="pointer-events-none absolute inset-[22px] border border-dotted tk-bc-forest-soft z-20"
                      title={copy.safeAreaTitle}
                    />
                    <span className="pointer-events-none absolute top-2 right-2.5 z-20 text-[9px] font-mono font-semibold tk-text-danger bg-white/85 px-1.5 py-0.5 rounded">
                      3mm BLEED
                    </span>
                  </>
                )}

                {/* Render Active Page Type */}
                {activeSpread?.kind === 'cover' && (
                  <div className="w-full h-full flex flex-col">
                    {isScrapbook ? (
                      <div className="w-full h-full tk-bg-paper p-7 flex flex-col justify-between items-center text-center">
                        <div className="w-full h-[64%] bg-white p-2.5 shadow-sm">
                          {curatedPhotos[0] && (
                            <img
                              src={resolvePhotoUrl(curatedPhotos[0])}
                              alt={draft.bookTitle}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="pb-2">
                          <div className="font-serif text-xl font-bold tk-text-ink text-balance">
                            {draft.bookTitle}
                          </div>
                          <div className="mt-1 text-xs tk-text-ink2">{draft.bookSubtitle}</div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-full h-[66%] tk-bg-forest overflow-hidden">
                          {curatedPhotos[0] && (
                            <img
                              src={resolvePhotoUrl(curatedPhotos[0])}
                              alt={draft.bookTitle}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 bg-white p-6 flex flex-col justify-center">
                          <div
                            className={`text-xl font-bold tk-text-ink text-balance ${
                              isEditorial ? 'tracking-tight' : 'font-serif'
                            }`}
                          >
                            {draft.bookTitle}
                          </div>
                          <div className="mt-1 text-xs tk-text-ink2">{draft.bookSubtitle}</div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {activeSpread?.kind === 'epigraph' && (
                  <div className="w-full h-full p-8 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="font-mono text-[10px] tracking-widest tk-text-forest">
                      TRAVEL MONOGRAPH · EDITION I
                    </div>
                    <p className="font-serif italic text-sm sm:text-base tk-text-ink leading-relaxed">
                      “{draft.epigraph}”
                    </p>
                    <div className="pt-4 text-[11px] tk-text-ink2">
                      {selectedTrips
                        .map((t) => t.state.intel.routeTitle || t.state.setup.cities.join(' · '))
                        .join('  /  ')}
                    </div>
                  </div>
                )}

                {activeSpread?.kind === 'chapter' && activeSpread.chapter && (
                  <div className="w-full h-full p-7 flex flex-col justify-between">
                    <div className="space-y-2 pt-3">
                      <div className="font-mono text-[10px] font-semibold tk-text-forest">
                        CHAPTER 0{activeSpread.chapter.chapterNumber} ·{' '}
                        {activeSpread.chapter.dateSpanLabel}
                      </div>
                      <h3 className="font-serif text-xl font-bold tk-text-ink text-balance">
                        {activeSpread.chapter.chapterTitle}
                      </h3>
                      <div className="text-xs tk-text-ink2">
                        {activeSpread.chapter.routeLine}
                      </div>
                    </div>
                    <div className="border-t tk-bc-hair pt-4 space-y-3">
                      <p className="text-xs sm:text-sm tk-text-ink2 leading-relaxed">
                        {activeSpread.chapter.narrativeIntro}
                      </p>
                      {activeSpread.chapter.highlightsLine && (
                        <div className="font-mono text-[10px] tk-text-ink2">
                          {activeSpread.chapter.highlightsLine}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeSpread?.kind === 'photo' && activeSpread.photo && (() => {
                  const p = activeSpread.photo;
                  const cap = draft.photoCaptions[p.id];
                  const dpiInfo = evaluatePhotoPrintDpi(p.width, p.height, draft.formatId);
                  return (
                    <div className="w-full h-full flex flex-col justify-between p-5">
                      <div
                        className={`w-full h-[62%] overflow-hidden ${
                          isScrapbook ? 'bg-white p-2 shadow-xs' : 'rounded-xs'
                        }`}
                      >
                        <img
                          src={resolvePhotoUrl(p)}
                          alt={cap?.headline || p.matchedCity}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="pt-3 space-y-1">
                        <div className="flex items-center justify-between gap-2 font-mono text-[10px] tk-text-ink2 tabular-nums">
                          <span>
                            DAY {p.matchedDay} · {p.matchedCity}
                            {p.matchedStopTitle ? ` · ${p.matchedStopTitle}` : ''}
                          </span>
                          <span>{dpiInfo.estimatedDpi} DPI</span>
                        </div>
                        <div className="font-serif text-sm font-bold tk-text-ink">
                          {cap?.headline || p.matchedStopTitle || p.matchedCity}
                        </div>
                        <p className="text-xs tk-text-ink2 line-clamp-3 leading-relaxed">
                          {cap?.storyCaption ||
                            p.userNote ||
                            copy.photoCaptionFallback}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {activeSpread?.kind === 'colophon' && (
                  <div className="w-full h-full tk-bg-forest text-white p-8 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="font-serif text-lg font-bold">{draft.bookTitle}</div>
                    <p className="text-xs text-white/75 leading-relaxed max-w-xs">
                      {draft.colophonSummary}
                    </p>
                    <div className="pt-4 font-mono text-[10px] tk-text-card tabular-nums">
                      {isSquare ? '210×210MM' : '148×210MM'} · 300 DPI ARCHIVAL PRINT
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Inline Copy Editor for Current Page */}
            <div className="rounded-2xl border tk-bc-hair bg-white p-3.5 space-y-2">
              {activeSpread?.kind === 'cover' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold tk-text-ink2 mb-1">
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
                      className="w-full h-9 rounded-lg border tk-bc-hair px-2.5 text-xs font-semibold tk-text-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold tk-text-ink2 mb-1">
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
                      className="w-full h-9 rounded-lg border tk-bc-hair px-2.5 text-xs tk-text-ink"
                    />
                  </div>
                </div>
              )}

              {activeSpread?.kind === 'epigraph' && (
                <div>
                  <label className="block text-[11px] font-semibold tk-text-ink2 mb-1">
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
                    className="w-full h-9 rounded-lg border tk-bc-hair px-2.5 text-xs tk-text-ink"
                  />
                </div>
              )}

              {activeSpread?.kind === 'chapter' && activeSpread.chapter && (
                <div>
                  <label className="block text-[11px] font-semibold tk-text-ink2 mb-1">
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
                    className="w-full rounded-lg border tk-bc-hair p-2 text-xs tk-text-ink"
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
                      <label className="block text-[11px] font-semibold tk-text-ink2 mb-1">
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
                        className="w-full h-9 rounded-lg border tk-bc-hair px-2.5 text-xs font-semibold tk-text-ink"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold tk-text-ink2 mb-1">
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
                        className="w-full h-9 rounded-lg border tk-bc-hair px-2.5 text-xs tk-text-ink"
                      />
                    </div>
                  </div>
                );
              })()}

              {activeSpread?.kind === 'colophon' && (
                <div>
                  <label className="block text-[11px] font-semibold tk-text-ink2 mb-1">
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
                    className="w-full h-9 rounded-lg border tk-bc-hair px-2.5 text-xs tk-text-ink"
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
