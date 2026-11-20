import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  BookOpen,
  Camera,
  Check,
  ChevronDown,
  Grid,
  ImagePlus,
  Loader2,
  MapPin,
  Printer,
  Shield,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  hasNativeTripPhotoScanner,
  indexLocalWebPhotoFiles,
  scanNativePhotosForTrips,
} from '../services/nativePhotoBridge';
import type {
  AppLanguage,
  HomeCurrencyCode,
  MemoryPhotoMeta,
  PhotobookDraft,
  SavedTripEntry,
} from '../types';
import {
  buildDemoSampleMemoryPhotos,
  deleteMemoryPhotoBlob,
  evaluatePhotoPrintDpi,
  loadAllMemoryPhotoBlobsMap,
  loadMemoryPhotoMetaList,
  loadSavedPhotobookDraft,
  saveMemoryPhotoMetaList,
  savePhotobookDraft,
  type StoredMemoryPhotoBlob,
} from '../utils/memoryPhotoVault';
import { PhotobookStudioModal } from './PhotobookStudioModal';
import { PrintOrderCheckoutModal } from './PrintOrderCheckoutModal';
import { getMemoriesViewCopy, type MemoriesViewCopy } from '../i18n/packs/memoriesStudioPack';

export interface MemoriesViewProps {
  trips: SavedTripEntry[];
  activeTripId: string;
  authUser: User | null;
  homeCurrency: HomeCurrencyCode;
  language: AppLanguage;
  autoOpenStudio?: boolean;
  onAutoOpenStudioHandled?: () => void;
  onToast: (msg: string) => void;
}

type GalleryFilter = 'all' | 'favorites';
type DisplayMode = 'grid' | 'map';

function createInitialBookDraft(
  selectedTrips: SavedTripEntry[],
  favoritePhotoIds: string[],
  copy: MemoriesViewCopy
): PhotobookDraft {
  const titles = selectedTrips.map(
    (t) => t.state.intel.routeTitle || t.state.setup.cities.join(' · ')
  );
  const mainTitle =
    titles.length > 1
      ? copy.multiTripTitleFallback(selectedTrips[0]?.state.setup.cities[0] || '')
      : titles[0] || copy.singleTripTitleFallback;

  const chapters = selectedTrips.map((tr, idx) => ({
    tripId: tr.id,
    chapterNumber: idx + 1,
    chapterTitle:
      tr.state.intel.routeTitle || tr.state.setup.cities.join(' · ') || copy.chapterFallbackTitle(idx + 1),
    dateSpanLabel: `${tr.state.setup.departureDate} · ${tr.state.setup.days}${copy.daysSuffix}`,
    routeLine: tr.state.setup.cities.join(' → '),
    narrativeIntro: copy.defaultNarrativeIntro,
    highlightsLine: copy.stopsRecordedSuffix((tr.state.timeline || []).length),
  }));

  const rawPages = 3 + Math.max(1, chapters.length) + favoritePhotoIds.length;
  const pageCount = Math.max(20, Math.ceil(rawPages / 4) * 4);

  return {
    id: `book_${Date.now()}`,
    selectedTripIds: selectedTrips.map((t) => t.id),
    templateId: 'kinfolk',
    formatId: 'square_210',
    bindingId: 'hardcover_matte',
    bookTitle: mainTitle.slice(0, 80),
    bookSubtitle: copy.defaultSubtitle(selectedTrips.length),
    epigraph: copy.defaultEpigraph,
    colophonSummary: copy.defaultColophon,
    chapters,
    photoCaptions: {},
    includedPhotoIds: favoritePhotoIds,
    pageCount,
    generatedByAi: false,
    updatedAt: Date.now(),
  };
}

export const MemoriesView: React.FC<MemoriesViewProps> = ({
  trips,
  activeTripId,
  authUser,
  homeCurrency,
  language,
  autoOpenStudio = false,
  onAutoOpenStudioHandled,
  onToast,
}) => {
  const copy = getMemoriesViewCopy(language);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedTripIds, setSelectedTripIds] = useState<string[]>(() => [activeTripId]);
  const [tripDropdownOpen, setTripDropdownOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<GalleryFilter>('all');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('grid');

  const [photos, setPhotos] = useState<MemoryPhotoMeta[]>(() => loadMemoryPhotoMetaList());
  const [photoBlobs, setPhotoBlobs] = useState<Record<string, StoredMemoryPhotoBlob>>({});
  const [indexingState, setIndexingState] = useState<{
    running: boolean;
    done: number;
    total: number;
  }>({ running: false, done: 0, total: 0 });

  const [activePhotoModal, setActivePhotoModal] = useState<MemoryPhotoMeta | null>(null);
  const [studioOpen, setStudioOpen] = useState(false);
  const [checkoutModalState, setCheckoutModalState] = useState<{
    open: boolean;
    tab: 'checkout' | 'orders';
  }>({ open: false, tab: 'checkout' });

  // Auto-open AI Photobook Studio when launched directly from My Kit's studio CTA
  useEffect(() => {
    if (!autoOpenStudio) return;
    setStudioOpen(true);
    onAutoOpenStudioHandled?.();
  }, [autoOpenStudio, onAutoOpenStudioHandled]);

  // Ensure activeTripId is included if selectedTripIds has stale IDs
  useEffect(() => {
    const validIds = new Set(trips.map((t) => t.id));
    setSelectedTripIds((prev) => {
      const filtered = prev.filter((id) => validIds.has(id));
      return filtered.length > 0 ? filtered : [activeTripId];
    });
  }, [trips, activeTripId]);

  // Load IndexedDB blobs for local photos
  useEffect(() => {
    const localIds = photos
      .filter((p) => p.sourceType !== 'demo_sample')
      .map((p) => p.id);
    if (localIds.length === 0) return;
    let cancelled = false;
    void loadAllMemoryPhotoBlobsMap(localIds).then((map) => {
      if (!cancelled) {
        setPhotoBlobs((prev) => ({ ...prev, ...map }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [photos]);

  const selectedTrips = useMemo(
    () => trips.filter((t) => selectedTripIds.includes(t.id)),
    [trips, selectedTripIds]
  );

  const scopedPhotos = useMemo(
    () =>
      photos
        .filter((p) => selectedTripIds.includes(p.matchedTripId))
        .sort((a, b) => a.takenTimestamp - b.takenTimestamp),
    [photos, selectedTripIds]
  );

  const favoriteScopedPhotos = useMemo(
    () => scopedPhotos.filter((p) => p.isFavorite),
    [scopedPhotos]
  );

  const visiblePhotos = filterMode === 'favorites' ? favoriteScopedPhotos : scopedPhotos;

  const [bookDraft, setBookDraft] = useState<PhotobookDraft>(() => {
    const saved = loadSavedPhotobookDraft();
    if (saved) return saved;
    return createInitialBookDraft(
      trips.filter((t) => t.id === activeTripId),
      [],
      copy
    );
  });

  // Keep bookDraft synchronized with selected trips & favorite photo IDs
  useEffect(() => {
    const favIds = favoriteScopedPhotos.map((p) => p.id);
    setBookDraft((prev) => {
      const existingChaptersMap = new Map<string, PhotobookDraft['chapters'][number]>(
        prev.chapters.map((c) => [c.tripId, c])
      );
      const syncedChapters = selectedTrips.map((tr, idx) => {
        const existing = existingChaptersMap.get(tr.id);
        if (existing) {
          return { ...existing, chapterNumber: idx + 1 };
        }
        return {
          tripId: tr.id,
          chapterNumber: idx + 1,
          chapterTitle:
            tr.state.intel.routeTitle || tr.state.setup.cities.join(' · ') || copy.chapterFallbackTitle(idx + 1),
          dateSpanLabel: `${tr.state.setup.departureDate} · ${tr.state.setup.days}${copy.daysSuffix}`,
          routeLine: tr.state.setup.cities.join(' → '),
          narrativeIntro: copy.defaultNarrativeIntro,
          highlightsLine: copy.stopsShortSuffix((tr.state.timeline || []).length),
        };
      });

      const rawPages = 3 + Math.max(1, syncedChapters.length) + favIds.length;
      const nextPages = Math.max(20, Math.ceil(rawPages / 4) * 4);

      const next: PhotobookDraft = {
        ...prev,
        selectedTripIds,
        chapters: syncedChapters,
        includedPhotoIds: favIds,
        pageCount: nextPages,
      };
      savePhotobookDraft(next);
      return next;
    });
  }, [selectedTripIds, favoriteScopedPhotos, selectedTrips, copy]);

  const handleUpdateDraft = (next: PhotobookDraft) => {
    setBookDraft(next);
    savePhotobookDraft(next);
  };

  const persistPhotos = (next: MemoryPhotoMeta[]) => {
    setPhotos(next);
    saveMemoryPhotoMetaList(next);
  };

  const handleTriggerPhotoIndex = async () => {
    if (hasNativeTripPhotoScanner()) {
      setIndexingState({ running: true, done: 0, total: 1 });
      try {
        const scanned = await scanNativePhotosForTrips(selectedTrips, activeTripId);
        const merged = [...photos, ...scanned];
        persistPhotos(merged);
        onToast(copy.indexedNativeToast(scanned.length));
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        onToast(
          msg === 'PHOTO_PERMISSION_DENIED'
            ? copy.permissionDeniedToast
            : copy.openingLocalToast
        );
        fileInputRef.current?.click();
      } finally {
        setIndexingState({ running: false, done: 0, total: 0 });
      }
      return;
    }
    fileInputRef.current?.click();
  };

  const handleWebFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setIndexingState({ running: true, done: 0, total: fileList.length });
    try {
      const indexed = await indexLocalWebPhotoFiles(
        fileList,
        selectedTrips,
        activeTripId,
        (done, total) => setIndexingState({ running: true, done, total })
      );
      const next = [...photos, ...indexed];
      persistPhotos(next);
      onToast(copy.indexedLocalToast(indexed.length));
    } finally {
      setIndexingState({ running: false, done: 0, total: 0 });
      e.target.value = '';
    }
  };

  const handleLoadSamplePhotos = () => {
    const samples = buildDemoSampleMemoryPhotos(selectedTrips);
    const existingNonSample = photos.filter((p) => p.sourceType !== 'demo_sample');
    persistPhotos([...existingNonSample, ...samples]);
    onToast(copy.loadedSamplesToast(samples.length));
  };

  const handleToggleFavorite = (photoId: string) => {
    const next = photos.map((p) =>
      p.id === photoId ? { ...p, isFavorite: !p.isFavorite } : p
    );
    persistPhotos(next);
  };

  const handleDeletePhoto = async (photoId: string) => {
    await deleteMemoryPhotoBlob(photoId);
    persistPhotos(photos.filter((p) => p.id !== photoId));
    if (activePhotoModal?.id === photoId) {
      setActivePhotoModal(null);
    }
    onToast(copy.removedToast);
  };

  const handleUpdatePhotoMeta = (updated: MemoryPhotoMeta) => {
    persistPhotos(photos.map((p) => (p.id === updated.id ? updated : p)));
    setActivePhotoModal(updated);
  };

  const toggleSelectTripId = (tid: string) => {
    setSelectedTripIds((prev) => {
      if (prev.includes(tid)) {
        if (prev.length <= 1) return prev;
        return prev.filter((id) => id !== tid);
      }
      return [...prev, tid];
    });
  };

  const resolveThumbSrc = (p: MemoryPhotoMeta) =>
    photoBlobs[p.id]?.thumbDataUrl ||
    photoBlobs[p.id]?.fullDataUrl ||
    p.sampleImageUrl ||
    '';

  // Group visiblePhotos by Trip -> Day
  const groupedByTripAndDay = useMemo(() => {
    return selectedTrips
      .map((tripEntry) => {
        const tripPhotos = visiblePhotos.filter((p) => p.matchedTripId === tripEntry.id);
        const dayMap = new Map<number, MemoryPhotoMeta[]>();
        for (const ph of tripPhotos) {
          const list = dayMap.get(ph.matchedDay) || [];
          list.push(ph);
          dayMap.set(ph.matchedDay, list);
        }
        const days = Array.from(dayMap.entries()).sort((a, b) => a[0] - b[0]);
        return { tripEntry, days, totalCount: tripPhotos.length };
      })
      .filter((g) => g.totalCount > 0);
  }, [selectedTrips, visiblePhotos]);

  // Geo-tagged points for Footprint Map mode
  const geoPoints = useMemo(() => {
    const pts = visiblePhotos.filter(
      (p) => typeof p.lat === 'number' && typeof p.lng === 'number'
    );
    if (pts.length === 0) return [];
    const lats = pts.map((p) => p.lat!);
    const lngs = pts.map((p) => p.lng!);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latSpan = Math.max(0.02, maxLat - minLat);
    const lngSpan = Math.max(0.02, maxLng - minLng);

    return pts.map((p) => ({
      photo: p,
      xPct: 14 + (((p.lng! - minLng) / lngSpan) * 72),
      yPct: 82 - (((p.lat! - minLat) / latSpan) * 64),
    }));
  }, [visiblePhotos]);

  return (
    <div className="space-y-5">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleWebFilesSelected}
        className="hidden"
      />

      {/* Top Clean 2-Row Control Card (Matches PackingView & ItineraryView) */}
      <section className="rounded-2xl border border-[#DCE8E5] bg-white p-4 space-y-3.5">
        {/* Row 1: Multi-Trip Merger Dropdown + Traceory-style Segmented Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative">
            <button
              type="button"
              onClick={() => setTripDropdownOpen((v) => !v)}
              className="h-9 px-3 rounded-xl border border-[#DCE8E5] bg-[#FAFDFC] hover:border-[#078C88] text-xs font-bold text-[#152B29] inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#078C88]" />
              <span className="tabular-nums">
                {selectedTrips.length > 1
                  ? copy.tripsMergedLabel(selectedTrips.length)
                  : selectedTrips[0]?.state.intel.routeTitle ||
                    selectedTrips[0]?.state.setup.cities.join(' · ') ||
                    copy.currentTripFallback}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#5B7370]" />
            </button>

            {tripDropdownOpen && (
              <div className="absolute left-0 mt-2 w-72 rounded-2xl border border-[#DCE8E5] bg-white shadow-xl p-3 z-30 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#5B7370] px-1">
                  <span>
                    {copy.selectTripsHint}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTripDropdownOpen(false)}
                    className="text-[#078C88] font-bold cursor-pointer"
                  >
                    {copy.doneBtn}
                  </button>
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1">
                  {trips.map((tr) => {
                    const checked = selectedTripIds.includes(tr.id);
                    const title =
                      tr.state.intel.routeTitle || tr.state.setup.cities.join(' → ');
                    return (
                      <button
                        key={tr.id}
                        type="button"
                        onClick={() => toggleSelectTripId(tr.id)}
                        className={`w-full flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition-colors cursor-pointer ${
                          checked
                            ? 'bg-[#EFF9F8] text-[#093B35] font-bold'
                            : 'hover:bg-[#F7FAF9] text-[#3B5552]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="truncate">{title}</div>
                          <div className="text-[11px] font-normal text-[#5B7370] tabular-nums">
                            {tr.state.setup.departureDate} · {tr.state.setup.days}
                            {copy.daysSuffix}
                          </div>
                        </div>
                        <span
                          className={`h-4 w-4 rounded flex items-center justify-center border shrink-0 ${
                            checked
                              ? 'border-[#078C88] bg-[#078C88] text-white'
                              : 'border-[#C5D6D2] bg-white'
                          }`}
                        >
                          {checked && <Check className="w-3 h-3" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Segmented View Controls: All | Favorites | Grid | Map */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#EEF5F3] overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`h-7 px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                filterMode === 'all'
                  ? 'bg-white text-[#152B29] shadow-2xs'
                  : 'text-[#5B7370] hover:text-[#152B29]'
              }`}
            >
              {copy.allFilter(scopedPhotos.length)}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('favorites')}
              className={`h-7 px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                filterMode === 'favorites'
                  ? 'bg-white text-[#152B29] shadow-2xs'
                  : 'text-[#5B7370] hover:text-[#152B29]'
              }`}
            >
              {copy.inBookFilter(favoriteScopedPhotos.length)}
            </button>
            <span className="h-3.5 w-px bg-[#D5E3DF] mx-0.5 shrink-0" />
            <button
              type="button"
              onClick={() => setDisplayMode('grid')}
              className={`h-7 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                displayMode === 'grid'
                  ? 'bg-white text-[#152B29] shadow-2xs'
                  : 'text-[#5B7370] hover:text-[#152B29]'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>{copy.gridMode}</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('map')}
              className={`h-7 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                displayMode === 'map'
                  ? 'bg-white text-[#152B29] shadow-2xs'
                  : 'text-[#5B7370] hover:text-[#152B29]'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{copy.mapMode}</span>
            </button>
          </div>
        </div>

        {/* Row 2: 3 Clean Action Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            disabled={indexingState.running}
            onClick={() => void handleTriggerPhotoIndex()}
            className="h-10 px-4 rounded-xl bg-[#093B35] hover:bg-[#0C4D45] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {indexingState.running ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ImagePlus className="w-4 h-4" />
            )}
            <span>
              {indexingState.running
                ? `${indexingState.done}/${indexingState.total}`
                : copy.indexTripPhotosBtn}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStudioOpen(true)}
            className="h-10 px-3.5 rounded-xl border border-[#DCE8E5] bg-[#FAFDFC] hover:border-[#078C88] text-xs font-bold text-[#152B29] inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#078C88]" />
            <span>{copy.aiPhotobookBtn}</span>
          </button>

          <button
            type="button"
            onClick={() => setCheckoutModalState({ open: true, tab: 'orders' })}
            className="h-10 px-3.5 rounded-xl border border-[#DCE8E5] bg-[#FAFDFC] hover:border-[#078C88] text-xs font-bold text-[#152B29] inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5 text-[#078C88]" />
            <span>{copy.printOrdersBtn}</span>
          </button>
        </div>
      </section>

      {/* Empty State: Traceory-Inspired Local Indexing & Privacy Promise Card */}
      {scopedPhotos.length === 0 ? (
        <section className="rounded-3xl border border-[#DCE8E5] bg-white px-6 py-12 text-center max-w-2xl mx-auto space-y-5">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-[#EFF9F8] text-[#078C88] flex items-center justify-center">
            <Camera className="w-7 h-7" />
          </div>

          <div className="space-y-2.5 max-w-md mx-auto">
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#152B29] text-balance">
              {copy.emptyHeadline}
            </h2>
            <p className="text-xs sm:text-sm text-[#5B7370] leading-relaxed">
              {copy.emptyDesc}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => void handleTriggerPhotoIndex()}
              className="w-full sm:w-auto h-11 px-6 rounded-full bg-[#093B35] hover:bg-[#0C4D45] text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <ImagePlus className="w-4 h-4" />
              <span>{copy.indexAllBtn}</span>
            </button>

            <button
              type="button"
              onClick={handleLoadSamplePhotos}
              className="w-full sm:w-auto h-11 px-5 rounded-full border border-[#DCE8E5] bg-white hover:bg-[#F5FAF9] text-xs font-bold text-[#152B29] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#078C88]" />
              <span>{copy.trySamplesBtn}</span>
            </button>
          </div>

          <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-[#6E8582]">
            <Shield className="w-3.5 h-3.5 text-[#078C88]" />
            <span>
              {copy.privacyFootnotes}
            </span>
          </div>
        </section>
      ) : displayMode === 'map' ? (
        /* Footprint Map Mode */
        <section className="rounded-3xl border border-[#DCE8E5] bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-[#152B29]">
                {copy.mapHeading}
              </h3>
              <p className="text-xs text-[#5B7370] tabular-nums">
                {copy.mapSub(geoPoints.length, selectedTrips.length)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStudioOpen(true)}
              className="h-9 px-3.5 rounded-xl bg-[#093B35] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{copy.previewBookBtn}</span>
            </button>
          </div>

          <div className="relative w-full h-[360px] rounded-2xl bg-[#EEF5F3] border border-[#DCE8E5] overflow-hidden">
            {/* Subtle Coordinate Grid Lines */}
            <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
              <defs>
                <pattern id="memGrid" width="48" height="48" patternUnits="userSpaceOnUse">
                  <path
                    d="M 48 0 L 0 0 0 48"
                    fill="none"
                    stroke="rgba(7,140,136,0.08)"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#memGrid)" />
              {geoPoints.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#078C88"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                  points={geoPoints
                    .map((pt) => `${pt.xPct}%,${pt.yPct}%`)
                    .join(' ')}
                />
              )}
            </svg>

            {geoPoints.map((pt, idx) => (
              <button
                key={pt.photo.id}
                type="button"
                onClick={() => setActivePhotoModal(pt.photo)}
                style={{ left: `${pt.xPct}%`, top: `${pt.yPct}%` }}
                className="group absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer"
              >
                <div className="h-12 w-12 rounded-xl border-2 border-white shadow-md overflow-hidden bg-white group-hover:scale-110 transition-transform">
                  <img
                    src={resolveThumbSrc(pt.photo)}
                    alt={pt.photo.matchedCity}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="mt-1 px-1.5 py-0.5 rounded bg-[#093B35]/90 text-[10px] font-semibold text-white whitespace-nowrap">
                  D{pt.photo.matchedDay} · {pt.photo.matchedStopTitle || pt.photo.matchedCity || `#${idx + 1}`}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : (
        /* Editorial Chapter & Day Masonry Grid */
        <div className="space-y-6">
          {groupedByTripAndDay.map(({ tripEntry, days, totalCount }) => {
            const tripTitle =
              tripEntry.state.intel.routeTitle || tripEntry.state.setup.cities.join(' → ');
            return (
              <section key={tripEntry.id} className="space-y-4">
                <div className="flex items-baseline justify-between gap-2 border-b border-[#DCE8E5] pb-2">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-[#152B29] truncate">
                      {tripTitle}
                    </h3>
                    <div className="text-xs text-[#5B7370] tabular-nums">
                      {tripEntry.state.setup.departureDate} · {copy.photosIndexedLabel(totalCount)}
                    </div>
                  </div>
                </div>

                {days.map(([dayNum, dayPhotos]) => {
                  const first = dayPhotos[0];
                  return (
                    <div key={`${tripEntry.id}_d${dayNum}`} className="space-y-2.5">
                      {/* Clean Unboxed Metadata Header (Zero-Pill Discipline) */}
                      <div className="flex items-center gap-2 text-xs text-[#5B7370] tabular-nums">
                        <span className="font-bold text-[#152B29]">Day {dayNum}</span>
                        <span aria-hidden="true">·</span>
                        <span>{first?.matchedCity}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {copy.photosShortLabel(dayPhotos.length)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {dayPhotos.map((photo) => {
                          const dpi = evaluatePhotoPrintDpi(
                            photo.width,
                            photo.height,
                            bookDraft.formatId
                          );
                          const src = resolveThumbSrc(photo);
                          return (
                            <div
                              key={photo.id}
                              className="group relative rounded-2xl border border-[#DCE8E5] bg-white overflow-hidden"
                            >
                              <button
                                type="button"
                                onClick={() => setActivePhotoModal(photo)}
                                className="block w-full aspect-[4/3] bg-[#EEF4F2] overflow-hidden cursor-pointer"
                              >
                                {src ? (
                                  <img
                                    src={src}
                                    alt={photo.matchedStopTitle || photo.matchedCity}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs text-[#5B7370]">
                                    {photo.fileName}
                                  </div>
                                )}
                              </button>

                              {/* Favorite Star Button (44px hitbox) */}
                              <button
                                type="button"
                                onClick={() => handleToggleFavorite(photo.id)}
                                title={
                                  photo.isFavorite
                                    ? copy.includedInBookTitle
                                    : copy.addToBookTitle
                                }
                                className="absolute top-1.5 right-1.5 h-9 w-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-xs inline-flex items-center justify-center text-white transition-colors cursor-pointer"
                              >
                                <Star
                                  className={`w-4 h-4 ${
                                    photo.isFavorite
                                      ? 'fill-[#F5B942] text-[#F5B942]'
                                      : 'text-white'
                                  }`}
                                />
                              </button>

                              {/* Unboxed Metadata Footer */}
                              <div className="px-3 py-2 space-y-0.5">
                                <div className="text-xs font-semibold text-[#152B29] truncate">
                                  {photo.matchedStopTitle || photo.matchedCity}
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-[#5B7370] tabular-nums truncate">
                                  <span>{dpi.estimatedDpi} DPI</span>
                                  {photo.userNote && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="truncate">{photo.userNote}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </section>
            );
          })}

          {/* Sticky / Bottom Book Summary Callout */}
          <div className="rounded-2xl border border-[#DCE8E5] bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-sm font-bold text-[#152B29]">
                {copy.readyToPrintTitle(favoriteScopedPhotos.length, bookDraft.pageCount)}
              </div>
              <div className="text-xs text-[#5B7370]">
                {copy.readyToPrintDesc}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setStudioOpen(true)}
                className="h-10 px-4 rounded-xl bg-[#093B35] hover:bg-[#0C4D45] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{copy.openStudioBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Lightbox & Stop Reassignment Modal */}
      {activePhotoModal && (
        <div
          className="fixed inset-0 z-50 bg-[#082220]/70 backdrop-blur-xs p-4 flex items-center justify-center"
          onClick={() => setActivePhotoModal(null)}
        >
          <div
            className="w-full max-w-xl rounded-3xl border border-[#DCE8E5] bg-white overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[4/3] bg-[#0B1E1C]">
              <img
                src={
                  photoBlobs[activePhotoModal.id]?.fullDataUrl ||
                  resolveThumbSrc(activePhotoModal)
                }
                alt={activePhotoModal.matchedStopTitle || activePhotoModal.matchedCity}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
              />
              <button
                type="button"
                onClick={() => setActivePhotoModal(null)}
                className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/50 text-white inline-flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-[#5B7370] tabular-nums">
                  {activePhotoModal.fileName} · {activePhotoModal.width}×{activePhotoModal.height}px
                  {activePhotoModal.cameraLabel ? ` · ${activePhotoModal.cameraLabel}` : ''}
                </div>
                <button
                  type="button"
                  onClick={() => void handleDeletePhoto(activePhotoModal.id)}
                  className="h-8 px-2.5 rounded-lg text-xs font-semibold text-[#A63A3A] hover:bg-[#FFF5F5] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{copy.removePhotoBtn}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#5B7370] mb-1">
                    {copy.tripChapterLabel}
                  </label>
                  <select
                    value={activePhotoModal.matchedTripId}
                    onChange={(e) => {
                      const nextTrip = trips.find((t) => t.id === e.target.value);
                      handleUpdatePhotoMeta({
                        ...activePhotoModal,
                        matchedTripId: e.target.value,
                        matchedDay: 1,
                        matchedCity: nextTrip?.state.setup.cities[0] || activePhotoModal.matchedCity,
                      });
                    }}
                    className="w-full h-9 rounded-xl border border-[#DCE8E5] px-2.5 text-xs text-[#152B29]"
                  >
                    {trips.map((tr) => (
                      <option key={tr.id} value={tr.id}>
                        {tr.state.intel.routeTitle || tr.state.setup.cities.join(' → ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5B7370] mb-1">
                    {copy.dayStopTitleLabel}
                  </label>
                  <input
                    type="text"
                    value={activePhotoModal.matchedStopTitle || ''}
                    onChange={(e) =>
                      handleUpdatePhotoMeta({
                        ...activePhotoModal,
                        matchedStopTitle: e.target.value,
                      })
                    }
                    placeholder={activePhotoModal.matchedCity}
                    className="w-full h-9 rounded-xl border border-[#DCE8E5] px-2.5 text-xs text-[#152B29]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5B7370] mb-1">
                  {copy.memoryNoteLabel}
                </label>
                <input
                  type="text"
                  value={activePhotoModal.userNote || ''}
                  onChange={(e) =>
                    handleUpdatePhotoMeta({
                      ...activePhotoModal,
                      userNote: e.target.value,
                    })
                  }
                  placeholder={copy.memoryNotePlaceholder}
                  className="w-full h-9 rounded-xl border border-[#DCE8E5] px-3 text-xs text-[#152B29]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Standalone AI Photobook & Print Studio Modal */}
      <PhotobookStudioModal
        open={studioOpen}
        onClose={() => setStudioOpen(false)}
        draft={bookDraft}
        onUpdateDraft={handleUpdateDraft}
        photos={scopedPhotos}
        photoBlobs={photoBlobs}
        trips={trips}
        language={language}
        onOpenPrintCheckout={() => {
          setStudioOpen(false);
          setCheckoutModalState({ open: true, tab: 'checkout' });
        }}
        onToast={onToast}
      />

      {/* Standalone Print-on-Demand Order & Admin Queue Modal */}
      <PrintOrderCheckoutModal
        open={checkoutModalState.open}
        initialTab={checkoutModalState.tab}
        onClose={() => setCheckoutModalState((s) => ({ ...s, open: false }))}
        draft={bookDraft}
        photos={scopedPhotos}
        trips={trips}
        authUser={authUser}
        homeCurrency={homeCurrency}
        language={language}
        onToast={onToast}
      />
    </div>
  );
};
