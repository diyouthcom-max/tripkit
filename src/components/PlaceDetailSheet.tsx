import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  BellRing,
  BookmarkPlus,
  Camera,
  CarTaxiFront,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  Home,
  Loader2,
  MapPin,
  Navigation,
  Pencil,
  Phone,
  Plus,
  QrCode,
  Sparkles,
  Star,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  AffiliatePartnerConfig,
  AppLanguage,
  DayStayAnchor,
  ExpenseBucket,
  PaymentAccount,
  SplitMode,
  TimeFormatPref,
  TimelineNode,
  TravelPass,
} from '../types';
import { translateDemoStopTitle, translateDemoTransitNote } from '../i18n';
import { formatTimeByPref, normalizeAppLanguage } from '../utils/preferencesHelpers';
import { getStopTypeLabel } from '../utils/itineraryHelpers';
import {
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsSearchUrl,
  buildPlaceQueryString,
} from '../utils/googleMapsHelpers';
import { resolveStopTypeIconMeta } from '../utils/accentTheme';
import {
  formatStayDurationLabel,
  resolveDayOpeningHoursLine,
  resolveStopDurationMinutes,
  type LiveGooglePlaceInfo,
} from '../services/googlePlaceLiveStore';
import {
  deleteOfflinePassImage,
  getOfflinePassImage,
  readPassDocumentFile,
  saveOfflinePassImage,
} from '../utils/offlinePassVault';
import { resolveApiUrl } from '../services/apiUrl';
import { AiVoiceInputButton } from './AiVoiceInputButton';
import type { QuickExpenseLogPayload } from './TimelineNodeCard';
import { getPlaceDetailCopy } from '../i18n/packs/placeDetailPack';

interface PlaceDetailSheetProps {
  open: boolean;
  node: TimelineNode | null;
  dayNumber: number;
  departureDate?: string;
  cityHint: string;
  rainSwapped: boolean;
  timeFormat?: TimeFormatPref;
  currencySymbol: string;
  currencyCode?: string;
  vatThresholdLocal?: number;
  travelersCount?: number;
  companionName?: string;
  isDriverCardLoading?: boolean;
  livePlace?: LiveGooglePlaceInfo | null;
  isPlaceLoading?: boolean;
  dayStay?: DayStayAnchor | null;
  prevStopTitle?: string;
  prevStopQuery?: string;
  linkedPasses: TravelPass[];
  affiliatePartners?: AffiliatePartnerConfig;
  scheduledLeadMinutes?: number;
  onClose: () => void;
  onUpdateNode: (nodeId: string, updates: Partial<TimelineNode>) => void;
  onToggleVisited?: () => void;
  onStartFullEdit: () => void;
  onShowDriverCard: (title: string, address: string) => void;
  onQuickLogExpense?: (payload: QuickExpenseLogPayload) => void;
  onMoveToWishlist?: () => void;
  onToggleStopAlert?: () => void;
  onRequestSetDayStay: () => void;
  onUpsertPass: (pass: TravelPass) => void;
  onDeletePass: (passId: string) => void;
  onOpenPassInGoMode: (passId: string) => void;
}

const DURATION_PRESETS = [30, 60, 90, 120, 180];

function buildContextualPartnerLink(
  title: string,
  city: string,
  stopType: TimelineNode['stopType'],
  partners: AffiliatePartnerConfig | undefined,
  lang: AppLanguage
): { label: string; provider: string; url: string } | null {
  const copy = getPlaceDetailCopy(lang);
  const isIntl = lang !== 'zh-CN';
  const query = encodeURIComponent(`${title} ${city}`.trim());
  if (stopType === 'hotel') {
    const alliance = partners?.tripComAllianceId?.trim();
    const extra = alliance ? `&Allianceid=${encodeURIComponent(alliance)}` : '';
    return {
      label: copy.partnerHotelLabel,
      provider: 'Trip.com',
      url: `https://www.trip.com/hotels/list?keyword=${query}${extra}`,
    };
  }
  if (stopType === 'attraction' || stopType === 'transit') {
    const klookAid = partners?.klookAid?.trim();
    const gygId = partners?.getYourGuidePartnerId?.trim();
    if (isIntl && gygId) {
      return {
        label: copy.partnerGygLabel,
        provider: 'GetYourGuide',
        url: `https://www.getyourguide.com/s/?q=${query}&partner_id=${encodeURIComponent(gygId)}`,
      };
    }
    const extra = klookAid ? `&aid=${encodeURIComponent(klookAid)}` : '';
    return {
      label: copy.partnerKlookLabel,
      provider: 'Klook',
      url: `https://www.klook.com/search/result/?query=${query}${extra}`,
    };
  }
  return null;
}

export const PlaceDetailSheet: React.FC<PlaceDetailSheetProps> = ({
  open,
  node,
  dayNumber,
  departureDate,
  cityHint,
  rainSwapped,
  timeFormat = '24h',
  currencySymbol: sym,
  currencyCode = 'EUR',
  vatThresholdLocal = 0,
  travelersCount = 2,
  companionName = '',
  isDriverCardLoading = false,
  livePlace,
  isPlaceLoading = false,
  dayStay,
  prevStopTitle,
  prevStopQuery,
  linkedPasses,
  affiliatePartners,
  scheduledLeadMinutes,
  onClose,
  onUpdateNode,
  onToggleVisited,
  onStartFullEdit,
  onShowDriverCard,
  onQuickLogExpense,
  onMoveToWishlist,
  onToggleStopAlert,
  onRequestSetDayStay,
  onUpsertPass,
  onDeletePass,
  onOpenPassInGoMode,
}) => {
  const { i18n } = useTranslation();
  const activeLang: AppLanguage = normalizeAppLanguage(i18n.language, 'en-US');
  const copy = getPlaceDetailCopy(activeLang);
  const resolvedCompanionName = companionName.trim() || copy.defaultCompanion;

  const [photoIdx, setPhotoIdx] = useState(0);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [showAllHours, setShowAllHours] = useState(false);
  const [expandWhy, setExpandWhy] = useState(false);
  const [editingWhy, setEditingWhy] = useState(false);
  const [whyDraft, setWhyDraft] = useState('');
  const [copiedAddr, setCopiedAddr] = useState(false);

  // First-Screen Quick Action Bar: Inline Quick Spend Logger & Voice Dictation states
  const [quickSpendOpen, setQuickSpendOpen] = useState(false);
  const [spendAmount, setSpendAmount] = useState('');
  const [spendBucket, setSpendBucket] = useState<ExpenseBucket>('daily');
  const [spendAccount, setSpendAccount] = useState<PaymentAccount>('card');
  const [spendSplit, setSpendSplit] = useState<SplitMode>(travelersCount > 1 ? 'split' : 'me');
  const [spendRatioPct, setSpendRatioPct] = useState(60);
  const [spendSavedNotice, setSpendSavedNotice] = useState<string | null>(null);
  const [voiceLivePreview, setVoiceLivePreview] = useState('');
  const [voiceFeedback, setVoiceFeedback] = useState<{
    tone: 'ok' | 'err';
    text: string;
  } | null>(null);

  // Bottom "Tickets uploads & notes" state
  const [bottomTab, setBottomTab] = useState<'tickets' | 'notes'>('tickets');
  const [noteDraft, setNoteDraft] = useState('');
  const [noteSavedToast, setNoteSavedToast] = useState(false);
  const [passThumbnails, setPassThumbnails] = useState<Record<string, string>>({});
  const [uploadingTicket, setUploadingTicket] = useState(false);
  const [ticketUploadNotice, setTicketUploadNotice] = useState<string | null>(null);
  const [showQuickCodeInput, setShowQuickCodeInput] = useState(false);
  const [quickPassTitle, setQuickPassTitle] = useState('');
  const [quickPassCode, setQuickPassCode] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const notesSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || !node) return;
    setPhotoIdx(0);
    setHeroImgFailed(false);
    setShowAllHours(false);
    setExpandWhy(false);
    setEditingWhy(false);
    setWhyDraft(node.mustVisitReason || '');
    setNoteDraft(node.stopNote || '');
    setTicketUploadNotice(null);
    setShowQuickCodeInput(false);
    setQuickSpendOpen(false);
    setSpendAmount(node.estLocal > 0 ? String(node.estLocal) : '');
    setSpendBucket(
      node.stopType === 'shopping'
        ? 'shopping'
        : node.stopType === 'hotel' || node.stopType === 'transit'
        ? 'prepaid'
        : 'daily'
    );
    setSpendAccount('card');
    setSpendSplit(travelersCount > 1 ? 'split' : 'me');
    setSpendSavedNotice(null);
    setVoiceLivePreview('');
    setVoiceFeedback(null);
  }, [open, node?.id]);

  // Hydrate offline ticket thumbnails from IndexedDB for passes bound to this stop
  useEffect(() => {
    let cancelled = false;
    if (!open || linkedPasses.length === 0) {
      setPassThumbnails({});
      return;
    }
    (async () => {
      const next: Record<string, string> = {};
      for (const p of linkedPasses) {
        if (p.hasOfflineImage) {
          const img = await getOfflinePassImage(p.id);
          if (img) next[p.id] = img;
        }
      }
      if (!cancelled) {
        setPassThumbnails(next);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, linkedPasses]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open || !node) return null;

  const isSwappedActive = Boolean(rainSwapped && node.isOutdoor && node.rainSwapTitle);
  const displayTitle = isSwappedActive ? node.rainSwapTitle! : node.title;
  const localizedTitle = translateDemoStopTitle(displayTitle, activeLang);
  const displayDistrict =
    isSwappedActive && node.rainSwapDistrict ? node.rainSwapDistrict : node.district;
  const fallbackAddress =
    isSwappedActive && node.rainSwapAddress ? node.rainSwapAddress : node.address;
  const fullAddress = livePlace?.formattedAddress || fallbackAddress || displayDistrict;

  const heroPhotos = livePlace?.heroPhotoUris || [];
  const activeHeroPhoto =
    !heroImgFailed && heroPhotos.length > 0
      ? heroPhotos[Math.min(photoIdx, heroPhotos.length - 1)]
      : null;

  const stayDurationMin = resolveStopDurationMinutes(node);
  const stayDurationLabel = formatStayDurationLabel(stayDurationMin, activeLang);

  const todayHoursLine = resolveDayOpeningHoursLine(
    livePlace?.weekdayDescriptions,
    departureDate,
    dayNumber,
    activeLang
  );

  const fallbackHoursLine = node.closeTime
    ? copy.fallbackHoursWithClose(
        formatTimeByPref(node.time, timeFormat),
        formatTimeByPref(node.closeTime, timeFormat)
      )
    : `${formatTimeByPref(node.time, timeFormat)}`;

  // Why it's a must-visit text: combine user override -> Google editorialSummary -> transit/context note
  const whyText =
    (node.mustVisitReason && node.mustVisitReason.trim()) ||
    livePlace?.editorialSummary ||
    translateDemoTransitNote(node.transitNote, activeLang) ||
    copy.fallbackWhyHighlight(
      getStopTypeLabel(node.stopType, activeLang),
      displayDistrict || cityHint,
      dayNumber
    );

  const stopQuery = buildPlaceQueryString(displayTitle, fullAddress, cityHint || node.city);
  const googleMapsUrl =
    livePlace?.googleMapsUri ||
    buildGoogleMapsSearchUrl({
      title: displayTitle,
      address: fullAddress,
      cityHint: cityHint || node.city,
    });

  const hotelOriginQuery = dayStay
    ? buildPlaceQueryString(dayStay.placeName, dayStay.address, cityHint)
    : undefined;

  const fromHotelDirectionsUrl = hotelOriginQuery
    ? buildGoogleMapsDirectionsUrl({
        origin: hotelOriginQuery,
        destination: stopQuery,
        travelMode: 'transit',
      })
    : null;

  const fromPrevStopDirectionsUrl = prevStopQuery
    ? buildGoogleMapsDirectionsUrl({
        origin: prevStopQuery,
        destination: stopQuery,
        travelMode: 'transit',
      })
    : null;

  const primaryDirectionsUrl =
    fromPrevStopDirectionsUrl ||
    fromHotelDirectionsUrl ||
    buildGoogleMapsDirectionsUrl({
      destination: stopQuery,
      travelMode: 'transit',
    });

  const isVisited = node.visited !== undefined ? node.visited : Boolean(node.logged);
  const parsedSpendNum = Math.max(0, parseFloat(spendAmount) || 0);
  const qualifiesForVatRefund =
    spendBucket === 'shopping' && vatThresholdLocal > 0 && parsedSpendNum >= vatThresholdLocal;

  const handleConfirmQuickSpend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onQuickLogExpense || parsedSpendNum <= 0) return;
    onQuickLogExpense({
      amountLocal: parsedSpendNum,
      bucket: spendBucket,
      account: spendAccount,
      split: travelersCount > 1 ? spendSplit : 'me',
      mySharePct: spendSplit === 'ratio' ? spendRatioPct : undefined,
    });
    setQuickSpendOpen(false);
    setSpendSavedNotice(copy.spendSavedNotice(sym, parsedSpendNum.toFixed(2)));
  };

  const appendDictatedStopNote = (rawText: string) => {
    const cleaned = rawText.trim();
    if (!cleaned) return;
    const base = (noteDraft || node.stopNote || '').trim();
    const nextNote = base ? `${base}\n${cleaned}` : cleaned;
    setNoteDraft(nextNote);
    onUpdateNode(node.id, { stopNote: nextNote });
    setVoiceLivePreview('');
    setBottomTab('notes');
    setVoiceFeedback({
      tone: 'ok',
      text: copy.voiceSavedNotice(cleaned),
    });
  };

  const stopIconMeta = resolveStopTypeIconMeta(node.stopType, isSwappedActive);
  const StopCategoryIcon = stopIconMeta.Icon;

  const partnerOffer = buildContextualPartnerLink(
    displayTitle,
    cityHint || node.city || '',
    node.stopType,
    affiliatePartners,
    activeLang
  );

  const handleCopyAddress = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${localizedTitle} · ${fullAddress}`);
      }
      setCopiedAddr(true);
      setTimeout(() => setCopiedAddr(false), 1800);
    } catch {
      setCopiedAddr(true);
      setTimeout(() => setCopiedAddr(false), 1800);
    }
  };

  const handleTicketFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingTicket(true);
    setTicketUploadNotice(null);
    try {
      const docFile = await readPassDocumentFile(file);
      const passId = `pass_stop_${node.id}_${Date.now()}`;
      await saveOfflinePassImage(passId, docFile.previewDataUrl);

      let parsedTitle = `${localizedTitle} ${copy.defaultVoucherSuffix}`;
      let parsedCode: string | undefined;
      let parsedQr: string | undefined;
      let parsedSeat: string | undefined;
      let parsedNote: string | undefined;

      // Best-effort AI confirmation extraction (gracefully degrades offline)
      try {
        const res = await fetch(resolveApiUrl('/api/ai/parse-travel-pass'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: docFile.aiBase64,
            mimeType: docFile.mimeType,
            rawText: `${localizedTitle} (${fullAddress})`,
            cities: [cityHint],
            language: activeLang,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.title && String(data.title).trim()) {
            parsedTitle = String(data.title).trim();
          }
          if (data?.confirmationCode) parsedCode = String(data.confirmationCode).trim();
          if (data?.qrPayload) parsedQr = String(data.qrPayload).trim();
          if (data?.seatOrRoom) parsedSeat = String(data.seatOrRoom).trim();
          if (data?.note) parsedNote = String(data.note).trim();
        }
      } catch {
        // Offline or AI unavailable — document is already safely stored in IndexedDB!
      }

      const newPass: TravelPass = {
        id: passId,
        category:
          node.stopType === 'hotel'
            ? 'hotel'
            : node.stopType === 'transit'
            ? 'train'
            : node.stopType === 'dining'
            ? 'dining'
            : 'attraction',
        title: parsedTitle,
        subtitle: displayDistrict || cityHint,
        day: dayNumber,
        dateTimeLabel: `Day ${dayNumber} · ${formatTimeByPref(node.time, timeFormat)}`,
        confirmationCode: parsedCode,
        qrPayload: parsedQr || parsedCode,
        seatOrRoom: parsedSeat,
        localLanguageTitle: livePlace?.displayName || displayTitle,
        localLanguageAddress: fullAddress,
        note: parsedNote,
        linkedTimelineNodeId: node.id,
        hasOfflineImage: true,
        offlineMimeType: docFile.mimeType,
        offlineFileName: docFile.fileName,
        status: 'ready',
        updatedAt: Date.now(),
      };

      onUpsertPass(newPass);
      setPassThumbnails((prev) => ({ ...prev, [passId]: docFile.previewDataUrl }));
      setTicketUploadNotice(copy.offlineSavedNotice);
    } catch (err) {
      const isTooLarge = err instanceof Error && err.message === 'PDF_TOO_LARGE';
      setTicketUploadNotice(
        isTooLarge ? copy.pdfTooLargeNotice : copy.fileReadFailedNotice
      );
    } finally {
      setUploadingTicket(false);
    }
  };

  const handleSaveQuickCodePass = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = quickPassCode.trim();
    const cleanTitle =
      quickPassTitle.trim() || `${localizedTitle} ${copy.defaultBookingSuffix}`;
    if (!cleanCode && !quickPassTitle.trim()) return;

    const passId = `pass_stop_${node.id}_${Date.now()}`;
    const newPass: TravelPass = {
      id: passId,
      category:
        node.stopType === 'hotel'
          ? 'hotel'
          : node.stopType === 'transit'
          ? 'train'
          : 'attraction',
      title: cleanTitle,
      subtitle: displayDistrict || cityHint,
      day: dayNumber,
      dateTimeLabel: `Day ${dayNumber} · ${formatTimeByPref(node.time, timeFormat)}`,
      confirmationCode: cleanCode || undefined,
      qrPayload: cleanCode || undefined,
      localLanguageTitle: livePlace?.displayName || displayTitle,
      localLanguageAddress: fullAddress,
      linkedTimelineNodeId: node.id,
      status: 'ready',
      updatedAt: Date.now(),
    };
    onUpsertPass(newPass);
    setQuickPassTitle('');
    setQuickPassCode('');
    setShowQuickCodeInput(false);
  };

  const handleRemoveLinkedPass = async (passId: string) => {
    await deleteOfflinePassImage(passId);
    onDeletePass(passId);
    setPassThumbnails((prev) => {
      const copy = { ...prev };
      delete copy[passId];
      return copy;
    });
  };

  // Render 5-star visual row strictly for authentic Google Places rating
  const renderGoogleStars = (rating: number) => {
    return (
      <div className="inline-flex items-center gap-0.5" aria-label={copy.ratedAria(rating)}>
        {[1, 2, 3, 4, 5].map((starNum) => {
          const filled = rating >= starNum - 0.25;
          const half = !filled && rating >= starNum - 0.75;
          return (
            <Star
              key={starNum}
              className={`h-4 w-4 ${
 filled
 ? 'tk-fill-warning tk-text-warning'
 : half
 ? 'tk-fill-warning tk-text-warning'
 : 'tk-text-ink2'
 }`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={localizedTitle}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-xl max-h-[92vh] rounded-t-3xl sm:rounded-3xl tk-bg-paper overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Scrollable Sheet Body */}
        <div className="overflow-y-auto flex-1 pb-8">
          {/* Full-Bleed Storefront Photo Hero */}
          <div className="relative h-64 sm:h-72 w-full tk-bg-paper overflow-hidden select-none">
            {activeHeroPhoto ? (
              <img
                src={activeHeroPhoto}
                alt={localizedTitle}
                referrerPolicy="no-referrer"
                onError={() => setHeroImgFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full tk-bg-forest flex flex-col items-center justify-center px-6 text-center">
                <div className="h-14 w-14 rounded-2xl bg-white/12 border border-white/15 flex items-center justify-center tk-text-card mb-3">
                  {isPlaceLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin tk-text-card" />
                  ) : (
                    <StopCategoryIcon className="h-7 w-7 tk-text-card" />
                  )}
                </div>
                <div className="text-base font-bold tk-text-card max-w-sm text-balance">
                  {localizedTitle}
                </div>
                <div className="mt-1 text-xs text-white/75">
                  {displayDistrict || cityHint}
                  {node.stopType ? ` · ${getStopTypeLabel(node.stopType, activeLang)}` : ''}
                </div>
              </div>
            )}

            {/* Measured top & bottom contrast scrims */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/55 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />

            {/* Top Floating Controls */}
            <div className="absolute top-3.5 inset-x-4 flex items-center justify-between gap-2 z-10">
              <button
                type="button"
                onClick={onClose}
                aria-label={copy.backToItineraryAria}
                className="min-h-[42px] min-w-[42px] rounded-full tk-bg-overlay hover:bg-black/65 tk-text-card flex items-center justify-center transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartFullEdit();
                  }}
                  className="min-h-[40px] inline-flex items-center gap-1.5 rounded-full tk-bg-overlay hover:bg-black/65 px-3.5 text-xs font-semibold tk-text-card transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>{copy.editStopBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={copy.closeAria}
                  className="hidden sm:flex min-h-[40px] min-w-[40px] rounded-full tk-bg-overlay hover:bg-black/65 tk-text-card items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Carousel Controls if Multiple Real Google Photos Exist */}
            {activeHeroPhoto && heroPhotos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setPhotoIdx((prev) => (prev - 1 + heroPhotos.length) % heroPhotos.length)
                  }
                  aria-label={copy.prevPhotoAria}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full tk-bg-overlay hover:bg-black/65 tk-text-card flex items-center justify-center cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoIdx((prev) => (prev + 1) % heroPhotos.length)}
                  aria-label={copy.nextPhotoAria}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full tk-bg-overlay hover:bg-black/65 tk-text-card flex items-center justify-center cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div className="absolute bottom-3 left-4 flex items-center gap-1.5">
                  {heroPhotos.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPhotoIdx(i)}
                      aria-label={copy.photoNumAria(i + 1)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
 i === photoIdx ? 'w-5 tk-bg-card' : 'w-1.5 bg-white/55'
 }`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Required Google Place Photo Photographer Attribution */}
            {activeHeroPhoto &&
              livePlace?.photoAttributions &&
              livePlace.photoAttributions.length > 0 && (
                <div className="absolute bottom-2.5 right-3.5 max-w-[60%] truncate text-[10px] text-white/80">
                  {copy.photoAttrPrefix}
                  {livePlace.photoAttributions[0].uri ? (
                    <a
                      href={livePlace.photoAttributions[0].uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:tk-text-card"
                    >
                      {livePlace.photoAttributions[0].displayName}
                    </a>
                  ) : (
                    <span>{livePlace.photoAttributions[0].displayName}</span>
                  )}
                </div>
              )}
          </div>

          {/* Primary Title & Day Opening Hours Subline */}
          <div className="tk-bg-card px-5 pt-5 pb-4 border-b tk-bc-hair">
            <h2 className="text-2xl font-extrabold tracking-tight tk-text-ink text-balance">
              {localizedTitle}
            </h2>
            {livePlace?.displayName &&
              livePlace.displayName.toLowerCase() !== localizedTitle.toLowerCase() && (
                <div className="mt-0.5 text-xs font-medium tk-text-ink2">
                  {livePlace.displayName}
                </div>
              )}

            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm tk-text-ink2">
              <Clock className="h-4 w-4 tk-text-ink2 shrink-0" />
              <span className="font-num tabular-nums">
                {todayHoursLine || fallbackHoursLine}
              </span>
              <span aria-hidden="true" className="tk-text-ink2">
                ·
              </span>
              <span className="font-semibold tk-text-ink tabular-nums">
                {stayDurationLabel}
              </span>
              {node.estLocal === 0 ? (
                <>
                  <span aria-hidden="true" className="tk-text-ink2">
                    ·
                  </span>
                  <span className="tk-text-forest font-semibold">
                    {copy.freeEntry}
                  </span>
                </>
              ) : (
                <>
                  <span aria-hidden="true" className="tk-text-ink2">
                    ·
                  </span>
                  <span className="font-num tabular-nums tk-text-ink2">
                    {copy.estAmount(sym, node.estLocal.toFixed(0))}
                  </span>
                </>
              )}
            </div>

            {/* Quick Stay Duration Selector */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] tk-text-ink2 mr-1">
                {copy.stayDurationPrefix}
              </span>
              {DURATION_PRESETS.map((mins) => {
                const active = stayDurationMin === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => onUpdateNode(node.id, { durationMinutes: mins })}
                    className={`rounded-lg px-2.5 py-1 font-num text-xs font-semibold tabular-nums transition-colors cursor-pointer ${
 active
 ? 'tk-bg-forest tk-text-card'
 : 'tk-bg-paper tk-text-ink2 hover:tk-bg-paper'
 }`}
                  >
                    {formatStayDurationLabel(mins, activeLang)}
                  </button>
                );
              })}
            </div>

            {/* First-Screen 4-Grid Quick Action Bar (Scheme A: Navigate / Driver Card / Log Spend / Voice Note) */}
            <div className="mt-4 pt-3.5 border-t tk-bc-hair">
              <div className="grid grid-cols-4 gap-2">
                {/* 1. Navigate */}
                <a
                  href={primaryDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[60px] rounded-2xl border tk-bc-hair tk-bg-paper hover:tk-bc-forest hover:tk-bg-forest-tint px-2 py-2.5 flex flex-col items-center justify-center gap-1.5 tk-text-ink transition-colors"
                >
                  <Navigation className="h-4 w-4 tk-text-forest shrink-0" />
                  <span className="text-[11px] sm:text-xs font-semibold whitespace-nowrap truncate max-w-full">
                    {copy.actionNavigate}
                  </span>
                </a>

                {/* 2. Driver Card */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onShowDriverCard(livePlace?.displayName || localizedTitle, fullAddress);
                  }}
                  className="min-h-[60px] rounded-2xl border tk-bc-hair tk-bg-paper hover:tk-bc-forest hover:tk-bg-forest-tint px-2 py-2.5 flex flex-col items-center justify-center gap-1.5 tk-text-ink transition-colors cursor-pointer"
                >
                  {isDriverCardLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin tk-text-forest shrink-0" />
                  ) : (
                    <CarTaxiFront className="h-4 w-4 tk-text-forest shrink-0" />
                  )}
                  <span className="text-[11px] sm:text-xs font-semibold whitespace-nowrap truncate max-w-full">
                    {copy.actionDriverCard}
                  </span>
                </button>

                {/* 3. Log Spend */}
                {node.logged ? (
                  <div
                    className="min-h-[60px] rounded-2xl border tk-bc-hair tk-bg-forest-tint px-2 py-2.5 flex flex-col items-center justify-center gap-1.5 tk-text-forest"
                    title={copy.expenseLoggedTitle}
                  >
                    <CheckCircle2 className="h-4 w-4 tk-text-forest shrink-0" />
                    <span className="font-num text-[11px] sm:text-xs font-bold tabular-nums whitespace-nowrap truncate max-w-full">
                      {copy.loggedAmount(sym, node.estLocal.toFixed(0))}
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!onQuickLogExpense}
                    onClick={() => setQuickSpendOpen((prev) => !prev)}
                    className={`min-h-[60px] rounded-2xl border px-2 py-2.5 flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 ${
 quickSpendOpen
 ? 'tk-bc-forest tk-bg-forest-tint tk-text-forest'
 : 'tk-bc-hair tk-bg-paper hover:tk-bc-forest hover:tk-bg-forest-tint tk-text-ink'
 }`}
                  >
                    <Wallet className="h-4 w-4 tk-text-forest shrink-0" />
                    <span className="text-[11px] sm:text-xs font-semibold whitespace-nowrap truncate max-w-full">
                      {copy.actionLogSpend}
                    </span>
                  </button>
                )}

                {/* 4. Voice Note (1-Tap Speech Recognition -> Appends to stopNote) */}
                <AiVoiceInputButton
                  variant="gridTile"
                  contextHint="itinerary"
                  label={copy.actionVoiceNote}
                  onInterimTranscript={(live) => {
                    setVoiceFeedback(null);
                    setVoiceLivePreview(live);
                  }}
                  onTranscript={(finalText) => {
                    appendDictatedStopNote(finalText);
                  }}
                  onError={(msg) => {
                    setVoiceLivePreview('');
                    setVoiceFeedback(msg ? { tone: 'err', text: msg } : null);
                  }}
                />
              </div>

              {/* Live Voice Dictation Preview / Saved Confirmation Banner */}
              {(voiceLivePreview || voiceFeedback) && (
                <div
                  className={`mt-2.5 rounded-xl border px-3 py-2 flex items-center justify-between gap-2 text-xs ${
 voiceFeedback?.tone === 'err'
 ? 'tk-bc-danger-hair tk-bg-danger-tint tk-text-danger'
 : 'tk-bc-hair tk-bg-forest-tint tk-text-forest'
 }`}
                >
                  <span className="font-medium leading-snug break-words">
                    {voiceLivePreview
                      ? copy.listeningPrefix(voiceLivePreview)
                      : voiceFeedback?.text}
                  </span>
                  {voiceFeedback?.tone === 'ok' && (
                    <button
                      type="button"
                      onClick={() => {
                        setBottomTab('notes');
                        notesSectionRef.current?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'center',
                        });
                      }}
                      className="font-semibold underline whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {copy.viewNotesBtn}
                    </button>
                  )}
                </div>
              )}

              {spendSavedNotice && (
                <div className="mt-2.5 rounded-xl border tk-bc-hair tk-bg-forest-tint px-3 py-2 text-xs font-semibold tk-text-forest">
                  {spendSavedNotice}
                </div>
              )}

              {/* Expandable Inline Quick Spend Logger */}
              {quickSpendOpen && !node.logged && onQuickLogExpense && (
                <form
                  onSubmit={handleConfirmQuickSpend}
                  className="mt-3 rounded-2xl border tk-bc-hair tk-bg-paper p-3.5 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold tk-text-forest">
                      {copy.quickSpendTitle}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuickSpendOpen(false)}
                      className="text-xs font-semibold tk-text-ink2 hover:tk-text-ink cursor-pointer"
                    >
                      {copy.quickSpendCancel}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold tk-text-ink2 mb-1">
                        {copy.actualAmountLabel(currencyCode)}
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 font-num text-sm font-bold tk-text-forest">
                          {sym}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          value={spendAmount}
                          onChange={(e) => setSpendAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-xl border tk-bc-hair tk-bg-card pl-8 pr-3 py-2 font-num text-sm font-bold tk-text-ink tabular-nums focus:tk-bc-forest focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold tk-text-ink2 mb-1">
                        {copy.paymentAccountLabel}
                      </label>
                      <div className="grid grid-cols-3 gap-1 rounded-xl tk-bg-paper p-1">
                        {(
                          [
                            { id: 'card', label: copy.accountCard },
                            { id: 'cash', label: copy.accountCash },
                            { id: 'transit', label: copy.accountTransit },
                          ] as const
                        ).map((acc) => (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => setSpendAccount(acc.id)}
                            className={`rounded-lg py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
 spendAccount === acc.id
 ? 'tk-bg-card tk-text-ink shadow-2xs'
 : 'tk-text-ink2 hover:tk-text-ink'
 }`}
                          >
                            {acc.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Expense Category Bucket */}
                  <div>
                    <label className="block text-[11px] font-semibold tk-text-ink2 mb-1">
                      {copy.budgetCategoryLabel}
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: 'daily', label: copy.bucketDaily },
                          { id: 'shopping', label: copy.bucketShopping },
                          { id: 'prepaid', label: copy.bucketPrepaid },
                        ] as const
                      ).map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setSpendBucket(b.id)}
                          className={`rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
 spendBucket === b.id
 ? 'tk-bc-forest tk-bg-forest-tint tk-text-forest'
 : 'tk-bc-hair tk-bg-card tk-text-ink2 hover:tk-bc-hair'
 }`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Crew Split Mode */}
                  {travelersCount > 1 && (
                    <div>
                      <label className="block text-[11px] font-semibold tk-text-ink2 mb-1">
                        {copy.crewSplitLabel}
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {(
                          [
                            { id: 'split', label: copy.splitHalf },
                            { id: 'me', label: copy.splitAllMine },
                            { id: 'ratio', label: copy.splitRatioPct(spendRatioPct) },
                            {
                              id: 'partner',
                              label: copy.splitPartnerPaid(resolvedCompanionName),
                            },
                          ] as const
                        ).map((sp) => (
                          <button
                            key={sp.id}
                            type="button"
                            onClick={() => setSpendSplit(sp.id)}
                            className={`rounded-xl border px-2 py-1.5 text-[11px] font-semibold transition-colors truncate cursor-pointer ${
 spendSplit === sp.id
 ? 'tk-bc-forest tk-bg-forest-tint tk-text-forest'
 : 'tk-bc-hair tk-bg-card tk-text-ink2 hover:tk-bc-hair'
 }`}
                          >
                            {sp.label}
                          </button>
                        ))}
                      </div>
                      {spendSplit === 'ratio' && (
                        <div className="mt-2 flex items-center gap-2 text-xs tk-text-ink2">
                          <span className="whitespace-nowrap">
                            {copy.mySharePrefix}
                          </span>
                          <input
                            type="range"
                            min={10}
                            max={90}
                            step={5}
                            value={spendRatioPct}
                            onChange={(e) => setSpendRatioPct(Number(e.target.value))}
                            className="flex-1 tk-accent-forest"
                          />
                          <span className="font-num font-bold tk-text-ink tabular-nums w-9 text-right">
                            {spendRatioPct}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {qualifiesForVatRefund && (
                    <div className="text-[11px] font-medium tk-text-forest">
                      {copy.vatRefundNotice(sym, vatThresholdLocal)}
                    </div>
                  )}

                  <div className="flex justify-end pt-0.5">
                    <button
                      type="submit"
                      disabled={parsedSpendNum <= 0}
                      className="min-h-[40px] rounded-xl tk-bg-forest px-4 py-2 text-xs font-bold tk-text-card hover:tk-bg-press disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {copy.saveSpendAndCheckIn(sym, parsedSpendNum.toFixed(2))}
                    </button>
                  </div>
                </form>
              )}

              {/* Subtle Secondary Stop Actions (Visited / Departure Alert / Move to Wishlist) */}
              {(onToggleVisited || (!isVisited && (onToggleStopAlert || onMoveToWishlist))) && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  {onToggleVisited ? (
                    <button
                      type="button"
                      onClick={onToggleVisited}
                      className={`inline-flex items-center gap-1.5 font-semibold transition-colors cursor-pointer ${
 isVisited
 ? 'tk-text-forest'
 : 'tk-text-ink2 hover:tk-text-forest'
 }`}
                    >
                      {isVisited ? (
                        <CheckCircle2 className="h-3.5 w-3.5 tk-text-forest" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 tk-text-ink2" />
                      )}
                      <span>
                        {isVisited ? copy.visitedTapUndo : copy.markAsVisited}
                      </span>
                    </button>
                  ) : (
                    <span />
                  )}

                  <div className="flex items-center gap-3">
                    {!isVisited && onToggleStopAlert && (
                      <button
                        type="button"
                        onClick={onToggleStopAlert}
                        className={`inline-flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
 scheduledLeadMinutes
 ? 'tk-text-forest'
 : 'tk-text-ink2 hover:tk-text-forest'
 }`}
                      >
                        <BellRing className="h-3.5 w-3.5 tk-text-forest" />
                        <span>
                          {scheduledLeadMinutes
                            ? copy.alertOn(scheduledLeadMinutes)
                            : copy.setAlert}
                        </span>
                      </button>
                    )}

                    {!isVisited && onMoveToWishlist && (
                      <button
                        type="button"
                        onClick={onMoveToWishlist}
                        className="inline-flex items-center gap-1 font-semibold tk-text-ink2 hover:tk-text-forest transition-colors cursor-pointer"
                      >
                        <BookmarkPlus className="h-3.5 w-3.5 tk-text-ink2" />
                        <span>{copy.moveToWishlist}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stacked Cards Container */}
          <div className="p-4 sm:p-5 space-y-3.5">
            {/* Official Google Rating Attribution Bar — Strictly Rendered from Real Google Places Data */}
            {typeof livePlace?.rating === 'number' && livePlace.rating > 0 && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-2xl border tk-bc-hair tk-bg-card px-4 py-3.5 hover:tk-bc-forest transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {/* Standard 4-color Google G emblem */}
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="var(--tk-ink-2)"
                      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                    />
                    <path
                      fill="var(--tk-ink-2)"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                    />
                    <path
                      fill="var(--tk-ink-2)"
                      d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                    />
                    <path
                      fill="var(--tk-ink-2)"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                    />
                  </svg>
                  <span className="text-sm font-semibold tk-text-ink">Google</span>
                </div>

                <div className="flex items-center gap-2">
                  {renderGoogleStars(livePlace.rating)}
                  <span className="font-num text-sm font-bold tk-text-ink tabular-nums">
                    {livePlace.rating.toFixed(1)}
                  </span>
                  {livePlace.userRatingCount ? (
                    <span className="font-num text-xs tk-text-ink2 tabular-nums">
                      ({livePlace.userRatingCount.toLocaleString()})
                    </span>
                  ) : null}
                </div>
              </a>
            )}

            {/* Why it's a must-visit Card */}
            <div className="rounded-2xl border tk-bc-hair tk-bg-paper p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-sm font-bold tk-text-ink2">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>{copy.whyMustVisitTitle}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setWhyDraft(whyText);
                    setEditingWhy((v) => !v);
                  }}
                  className="text-xs font-semibold tk-text-ink2 hover:underline cursor-pointer"
                >
                  {editingWhy ? copy.cancelEditWhy : copy.customizeWhy}
                </button>
              </div>

              {editingWhy ? (
                <div className="space-y-2 pt-1">
                  <textarea
                    rows={3}
                    value={whyDraft}
                    onChange={(e) => setWhyDraft(e.target.value)}
                    placeholder={copy.whyPlaceholder}
                    className="w-full rounded-xl border tk-bc-hair tk-bg-card px-3 py-2 text-xs tk-text-ink focus:tk-bc-forest focus:outline-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateNode(node.id, { mustVisitReason: whyDraft.trim() || undefined });
                        setEditingWhy(false);
                      }}
                      className="rounded-xl tk-bg-forest px-3.5 py-1.5 text-xs font-semibold tk-text-card hover:tk-bg-press cursor-pointer"
                    >
                      {copy.saveHighlightBtn}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-relaxed tk-text-ink">
                  {!expandWhy && whyText.length > 135 ? (
                    <>
                      {whyText.slice(0, 135)}…{' '}
                      <button
                        type="button"
                        onClick={() => setExpandWhy(true)}
                        className="font-semibold tk-text-forest hover:underline cursor-pointer"
                      >
                        {copy.seeMoreBtn}
                      </button>
                    </>
                  ) : (
                    whyText
                  )}
                </p>
              )}
            </div>

            {/* LOCATION Card */}
            <div className="rounded-2xl border tk-bc-hair tk-bg-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full tk-bg-forest-plate flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="h-4 w-4 tk-text-ink" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold tk-text-ink2">
                    {copy.locationLabel}
                  </div>
                  <div className="mt-0.5 text-sm font-medium tk-text-ink leading-relaxed break-words">
                    {fullAddress}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pl-12">
                <button
                  type="button"
                  onClick={() => void handleCopyAddress()}
                  className="inline-flex items-center gap-1.5 rounded-xl border tk-bc-hair tk-bg-paper px-3 py-1.5 text-xs font-semibold tk-text-ink2 hover:tk-bc-forest whitespace-nowrap cursor-pointer"
                >
                  {copiedAddr ? (
                    <>
                      <Check className="h-3.5 w-3.5 tk-text-forest" />
                      <span>{copy.copiedBtn}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 tk-text-forest" />
                      <span>{copy.copyAddressBtn}</span>
                    </>
                  )}
                </button>

                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border tk-bc-hair tk-bg-card px-3 py-1.5 text-xs font-semibold tk-text-ink hover:tk-bc-forest whitespace-nowrap"
                >
                  <ExternalLink className="h-3.5 w-3.5 tk-text-forest" />
                  <span>{copy.openInGoogleMaps}</span>
                </a>
              </div>
            </div>

            {/* OPENING HOURS Card */}
            <div className="rounded-2xl border tk-bc-hair tk-bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full tk-bg-forest-plate flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="h-4 w-4 tk-text-ink" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold tk-text-ink2">
                      {copy.openingHoursLabel}
                    </div>
                    <div className="mt-0.5 font-num text-sm font-medium tk-text-ink tabular-nums">
                      {todayHoursLine || fallbackHoursLine}
                    </div>
                  </div>
                </div>

                {livePlace?.weekdayDescriptions && livePlace.weekdayDescriptions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setShowAllHours((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs font-semibold tk-text-forest hover:underline whitespace-nowrap shrink-0 mt-1 cursor-pointer"
                  >
                    <span>{showAllHours ? copy.hideHoursBtn : copy.all7DaysBtn}</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${showAllHours ? 'rotate-180' : ''}`}
                    />
                  </button>
                )}
              </div>

              {showAllHours &&
                livePlace?.weekdayDescriptions &&
                livePlace.weekdayDescriptions.length > 0 && (
                  <div className="mt-3 pt-3 pl-12 border-t tk-bc-hair space-y-1 font-num text-xs tk-text-ink2 tabular-nums">
                    {livePlace.weekdayDescriptions.map((line, i) => (
                      <div
                        key={i}
                        className={
                          line === todayHoursLine ? 'font-bold tk-text-forest' : undefined
                        }
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {/* CONTACT & OFFICIAL WEBSITE / PARTNER TICKETS Card */}
            {(livePlace?.websiteUri || livePlace?.nationalPhoneNumber || partnerOffer) && (
              <div className="rounded-2xl border tk-bc-hair tk-bg-card p-4 space-y-3">
                {livePlace?.websiteUri && (
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full tk-bg-forest-plate flex items-center justify-center shrink-0 mt-0.5">
                      <Globe className="h-4 w-4 tk-text-ink" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold tk-text-ink2">
                        {copy.officialWebsiteLabel}
                      </div>
                      <a
                        href={livePlace.websiteUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 block text-sm font-medium tk-text-ink underline tk-decoration-ink2 hover:tk-text-forest break-all"
                      >
                        {livePlace.websiteUri}
                      </a>
                    </div>
                  </div>
                )}

                {livePlace?.nationalPhoneNumber && (
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full tk-bg-forest-plate flex items-center justify-center shrink-0">
                      <Phone className="h-4 w-4 tk-text-ink" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold tk-text-ink2">
                        {copy.phoneLabel}
                      </div>
                      <a
                        href={`tel:${livePlace.nationalPhoneNumber}`}
                        className="font-num text-sm font-medium tk-text-ink hover:tk-text-forest tabular-nums"
                      >
                        {livePlace.nationalPhoneNumber}
                      </a>
                    </div>
                  </div>
                )}

                {partnerOffer && (
                  <div className="pt-2 border-t tk-bc-hair flex items-center justify-between gap-2">
                    <div className="text-xs tk-text-ink2">
                      {partnerOffer.label} · <span className="font-semibold tk-text-ink">{partnerOffer.provider}</span>
                    </div>
                    <a
                      href={partnerOffer.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-xl tk-bg-forest-tint border tk-bc-hair px-3 py-1.5 text-xs font-bold tk-text-forest hover:tk-bg-forest-tint whitespace-nowrap shrink-0"
                    >
                      <span>{copy.checkAvailabilityBtn}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* GETTING THERE Card (Matches Packy Screenshot #3) */}
            <div className="rounded-2xl border tk-bc-hair tk-bg-card p-4 space-y-2.5">
              <div className="text-xs font-semibold tk-text-ink2">
                {copy.gettingThereLabel}
              </div>

              {dayStay && fromHotelDirectionsUrl ? (
                <div className="flex items-center justify-between gap-3 py-1">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Home className="h-4 w-4 tk-text-forest shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold tk-text-ink truncate">
                        {copy.fromHotelStay(dayStay.placeName)}
                      </div>
                      {dayStay.address && (
                        <div className="text-xs tk-text-ink2 truncate">{dayStay.address}</div>
                      )}
                    </div>
                  </div>
                  <a
                    href={fromHotelDirectionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-xl tk-bg-forest px-3 py-2 text-xs font-semibold tk-text-card hover:tk-bg-press whitespace-nowrap shrink-0"
                  >
                    <span>{copy.directionsBtn}</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRequestSetDayStay();
                  }}
                  className="w-full flex items-center justify-between gap-3 py-1.5 text-left text-sm font-semibold tk-text-ink hover:tk-text-forest transition-colors cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2">
                    <Plus className="h-4 w-4 tk-text-forest" />
                    <span>{copy.addWhereStayingBtn}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 tk-text-ink2" />
                </button>
              )}

              {fromPrevStopDirectionsUrl && prevStopTitle && (
                <div className="pt-2 border-t tk-bc-hair flex items-center justify-between gap-2 text-xs">
                  <span className="tk-text-ink2 truncate">
                    {copy.fromPrevStop(prevStopTitle)}
                  </span>
                  <a
                    href={fromPrevStopDirectionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold tk-text-forest hover:underline whitespace-nowrap shrink-0"
                  >
                    <span>{copy.transitRouteLink}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Tickets Uploads & Notes — Directly Linked to Go-Mode Offline Pass Wallet */}
            <div ref={notesSectionRef} className="pt-2 space-y-3">
              <div className="flex items-center justify-between gap-2 px-1">
                <h3 className="text-base font-bold tk-text-ink">
                  {copy.ticketsAndNotesHeading}
                </h3>
                <span className="text-[11px] tk-text-ink2">
                  {copy.syncedOfflineWallet}
                </span>
              </div>

              {/* Segmented Control: [ Tickets | Notes ] */}
              <div className="grid grid-cols-2 gap-1 rounded-2xl tk-bg-paper p-1">
                <button
                  type="button"
                  onClick={() => setBottomTab('tickets')}
                  className={`min-h-[42px] inline-flex items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
 bottomTab === 'tickets'
 ? 'tk-bg-card tk-text-ink shadow-xs'
 : 'tk-text-ink2 hover:tk-text-ink'
 }`}
                >
                  <Camera className="h-4 w-4" />
                  <span>
                    {copy.tabTickets}
                    {linkedPasses.length > 0 ? ` (${linkedPasses.length})` : ''}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setBottomTab('notes')}
                  className={`min-h-[42px] inline-flex items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
 bottomTab === 'notes'
 ? 'tk-bg-card tk-text-ink shadow-xs'
 : 'tk-text-ink2 hover:tk-text-ink'
 }`}
                >
                  <FileText className="h-4 w-4" />
                  <span>
                    {copy.tabNotes}
                    {node.stopNote?.trim() ? ' •' : ''}
                  </span>
                </button>
              </div>

              {bottomTab === 'tickets' ? (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf,.pdf"
                    onChange={(e) => void handleTicketFileSelected(e)}
                    className="hidden"
                  />

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {/* Existing Passes Bound to This Stop */}
                    {linkedPasses.map((pass) => {
                      const thumb = passThumbnails[pass.id];
                      const isPdfPass =
                        pass.offlineMimeType === 'application/pdf' ||
                        Boolean(thumb?.startsWith('data:application/pdf'));
                      return (
                        <div
                          key={pass.id}
                          className="group relative rounded-2xl border tk-bc-hair tk-bg-card overflow-hidden flex flex-col justify-between min-h-[144px]"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenPassInGoMode(pass.id);
                            }}
                            className="flex-1 w-full text-left flex flex-col cursor-pointer"
                          >
                            {isPdfPass ? (
                              <div className="h-24 w-full tk-bg-forest-plate flex flex-col items-center justify-center gap-1 px-2 text-center">
                                <FileText className="h-6 w-6 tk-text-forest" />
                                <span className="text-[11px] font-bold tk-text-forest truncate max-w-full">
                                  {pass.offlineFileName || copy.pdfDocFallback}
                                </span>
                              </div>
                            ) : thumb ? (
                              <div className="h-24 w-full tk-bg-forest-plate overflow-hidden">
                                <img
                                  src={thumb}
                                  alt={pass.title}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="h-24 w-full tk-bg-forest-tint flex flex-col items-center justify-center gap-1 px-2 text-center">
                                <QrCode className="h-6 w-6 tk-text-forest" />
                                {pass.confirmationCode && (
                                  <span className="font-mono text-[11px] font-bold tk-text-forest truncate max-w-full">
                                    {pass.confirmationCode}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="p-2.5">
                              <div className="text-xs font-bold tk-text-ink truncate">
                                {pass.title}
                              </div>
                              <div className="mt-0.5 text-[11px] font-semibold tk-text-forest">
                                {isPdfPass ? copy.tapViewPdf : copy.tapFullscreenQr}
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleRemoveLinkedPass(pass.id)}
                            aria-label={copy.deleteTicketAria}
                            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/55 tk-text-card flex items-center justify-center hover:tk-bg-danger transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}

                    {/* Packy-Style Dashed "+ Add ticket" Upload Tile */}
                    <button
                      type="button"
                      disabled={uploadingTicket}
                      onClick={() => fileInputRef.current?.click()}
                      className="min-h-[144px] rounded-2xl border border-dashed tk-bc-hair tk-bg-card hover:tk-bc-forest hover:tk-bg-paper flex flex-col items-center justify-center gap-2 p-4 text-center transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {uploadingTicket ? (
                        <>
                          <Loader2 className="h-6 w-6 animate-spin tk-text-forest" />
                          <span className="text-xs font-semibold tk-text-forest">
                            {copy.savingOfflineParsing}
                          </span>
                        </>
                      ) : (
                        <>
                          <Camera className="h-6 w-6 tk-text-ink" />
                          <span className="text-xs sm:text-sm font-semibold tk-text-ink">
                            {copy.addPhotoOrPdf}
                          </span>
                          <span className="text-[11px] tk-text-ink2">
                            {copy.qrVoucherPdfSub}
                          </span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Quick Confirmation Code Entry Toggle */}
                  {!showQuickCodeInput ? (
                    <button
                      type="button"
                      onClick={() => setShowQuickCodeInput(true)}
                      className="inline-flex items-center gap-1 text-xs font-semibold tk-text-forest hover:underline cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{copy.typePnrBtn}</span>
                    </button>
                  ) : (
                    <form
                      onSubmit={handleSaveQuickCodePass}
                      className="rounded-2xl border tk-bc-hair tk-bg-card p-3.5 space-y-2.5"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={quickPassTitle}
                          onChange={(e) => setQuickPassTitle(e.target.value)}
                          placeholder={copy.passTitlePlaceholder(localizedTitle)}
                          className="rounded-xl border tk-bc-hair tk-bg-paper px-3 py-2 text-xs tk-text-ink focus:tk-bg-card focus:tk-bc-forest focus:outline-none"
                        />
                        <input
                          type="text"
                          value={quickPassCode}
                          onChange={(e) => setQuickPassCode(e.target.value)}
                          placeholder={copy.passCodePlaceholder}
                          className="rounded-xl border tk-bc-hair tk-bg-paper px-3 py-2 font-mono text-xs font-bold tk-text-ink focus:tk-bg-card focus:tk-bc-forest focus:outline-none"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowQuickCodeInput(false)}
                          className="px-3 py-1.5 text-xs font-semibold tk-text-ink2 cursor-pointer"
                        >
                          {copy.cancelBtn}
                        </button>
                        <button
                          type="submit"
                          className="rounded-xl tk-bg-forest px-3.5 py-1.5 text-xs font-semibold tk-text-card hover:tk-bg-press cursor-pointer"
                        >
                          {copy.savePassBtn}
                        </button>
                      </div>
                    </form>
                  )}

                  {ticketUploadNotice && (
                    <div className="rounded-xl border tk-bc-hair tk-bg-forest-tint px-3.5 py-2 text-xs font-medium tk-text-forest">
                      {ticketUploadNotice}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border tk-bc-hair tk-bg-card p-4 space-y-2.5">
                  <textarea
                    rows={4}
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder={copy.noteTextareaPlaceholder}
                    className="w-full rounded-xl border tk-bc-hair tk-bg-paper p-3 text-xs sm:text-sm tk-text-ink leading-relaxed focus:tk-bg-card focus:tk-bc-forest focus:outline-none"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AiVoiceInputButton
                        compact
                        contextHint="itinerary"
                        label={copy.dictateNoteBtn}
                        onInterimTranscript={(live) => setVoiceLivePreview(live)}
                        onTranscript={(finalText) => appendDictatedStopNote(finalText)}
                        onError={(msg) =>
                          setVoiceFeedback(msg ? { tone: 'err', text: msg } : null)
                        }
                      />
                      <span className="text-xs tk-text-forest font-semibold">
                        {noteSavedToast ? copy.noteSavedToast : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateNode(node.id, { stopNote: noteDraft.trim() || undefined });
                        setNoteSavedToast(true);
                        setTimeout(() => setNoteSavedToast(false), 1800);
                      }}
                      className="rounded-xl tk-bg-forest px-4 py-2 text-xs font-semibold tk-text-card hover:tk-bg-press cursor-pointer"
                    >
                      {copy.saveNotesBtn}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
