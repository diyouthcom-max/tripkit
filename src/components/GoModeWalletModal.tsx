import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BedDouble,
  BookOpen,
  Camera,
  Car,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Heart,
  Image as ImageIcon,
  Landmark,
  LayoutGrid,
  Loader2,
  MapPin,
  Maximize2,
  Minimize2,
  Pencil,
  Plane,
  Plus,
  QrCode,
  ReceiptText,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Train,
  Trash2,
  Utensils,
  WifiOff,
  X,
  ZoomIn,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { AccentIconBadge, type AccentKey } from '../utils/accentTheme';
import {
  buildEsimAffiliateUrl,
  buildGetYourGuideSearchUrl,
  buildKlookSearchUrl,
  buildTripComHotelUrl,
} from '../utils/affiliateHelpers';
import { buildGoogleMapsSearchUrl } from '../utils/googleMapsHelpers';
import { normalizeAppLanguage } from '../utils/preferencesHelpers';
import { getWalletCategoryMeta } from '../i18n/packs/walletCategoryPack';
import { getWalletModalPack } from '../i18n/packs/walletModalPack';
import { resolveApiUrl } from '../services/apiUrl';
import {
  dataUrlToBlobUrl,
  deleteOfflinePassImage,
  getOfflinePassImage,
  inferPassCategoryFromName,
  listOfflinePassImageIds,
  readPassDocumentFile,
  saveOfflinePassImage,
} from '../utils/offlinePassVault';
import type {
  AffiliatePartnerConfig,
  AppLanguage,
  TravelPass,
  TravelPassCategory,
  TripIntelligence,
  TripSetup,
} from '../types';

export interface GoModeWalletModalProps {
  open: boolean;
  passes: TravelPass[];
  setup: TripSetup;
  intel: TripIntelligence;
  affiliatePartners?: Partial<AffiliatePartnerConfig>;
  initialFocusPassId?: string | null;
  initialFilterDay?: number | null;
  currentDay?: number;
  onClose: () => void;
  onUpsertPass: (pass: TravelPass, markLinkedPackingDone?: boolean) => void;
  onDeletePass: (passId: string) => void;
  onSmartSeedFromTrip: () => { addedCount: number; firstPassId?: string };
  onToast: (msg: string) => void;
}

type WalletCategoryFilter = 'all' | Exclude<TravelPassCategory, 'esim_insurance'>;

const CATEGORY_STYLE: Record<
  TravelPassCategory,
  {
    accent: AccentKey;
    icon: typeof Plane;
  }
> = {
  passport: { accent: 'teal', icon: BookOpen },
  visa: { accent: 'lavender', icon: Shield },
  insurance: { accent: 'rose', icon: Heart },
  border_qr: { accent: 'teal', icon: QrCode },
  flight: { accent: 'ocean', icon: Plane },
  hotel: { accent: 'peach', icon: BedDouble },
  train: { accent: 'lavender', icon: Train },
  attraction: { accent: 'lemon', icon: Landmark },
  dining: { accent: 'peach', icon: Utensils },
  car_rental: { accent: 'ocean', icon: Car },
  esim: { accent: 'mint', icon: Smartphone },
  tax_free_other: { accent: 'lemon', icon: ReceiptText },
  // Legacy combined category preserved seamlessly for existing saved trips
  esim_insurance: { accent: 'mint', icon: Smartphone },
};

const DISPLAY_CATEGORIES: Array<Exclude<TravelPassCategory, 'esim_insurance'>> = [
  'passport',
  'visa',
  'insurance',
  'border_qr',
  'flight',
  'hotel',
  'train',
  'attraction',
  'dining',
  'car_rental',
  'esim',
  'tax_free_other',
];

const ALL_VALID_CATEGORIES: TravelPassCategory[] = [
  ...DISPLAY_CATEGORIES,
  'esim_insurance',
];

function matchesCategoryFilter(pass: TravelPass, filter: WalletCategoryFilter): boolean {
  if (filter === 'all') return true;
  if (pass.category === filter) return true;
  // Backward compatibility for legacy combined 'esim_insurance' cards
  if (pass.category === 'esim_insurance') {
    const isInsurance = /保单|保险|医疗险|延误险|救援|insurance|policy/i.test(pass.title);
    if (filter === 'insurance' && isInsurance) return true;
    if (filter === 'esim' && !isInsurance) return true;
  }
  return false;
}

function stripFileExtension(fileName: string): string {
  return fileName.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_-]+/g, ' ').trim();
}

export const GoModeWalletModal: React.FC<GoModeWalletModalProps> = ({
  open,
  passes,
  setup,
  intel,
  affiliatePartners,
  initialFocusPassId,
  initialFilterDay,
  currentDay = 1,
  onClose,
  onUpsertPass,
  onDeletePass,
  onSmartSeedFromTrip,
  onToast,
}) => {
  const { i18n } = useTranslation();
  const activeLang: AppLanguage = normalizeAppLanguage(i18n.language, 'en-US');
  const walletCopy = useMemo(() => getWalletModalPack(activeLang), [activeLang]);
  const catMetaMap = useMemo(() => getWalletCategoryMeta(activeLang), [activeLang]);

  const [categoryFilter, setCategoryFilter] = useState<WalletCategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dayFilterOnly, setDayFilterOnly] = useState<number | null>(null);
  const [selectedPassId, setSelectedPassId] = useState<string | null>(null);
  const [mobileGateViewOpen, setMobileGateViewOpen] = useState(false);
  const [fullscreenSpotlight, setFullscreenSpotlight] = useState<'qr' | 'driver' | null>(null);
  const [imageZoomed, setImageZoomed] = useState(false);
  const [isOfflineNow, setIsOfflineNow] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  // Offline IndexedDB cached document state
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());
  const [activePassDataUrl, setActivePassDataUrl] = useState<string | null>(null);
  const [activePdfBlobUrl, setActivePdfBlobUrl] = useState<string | null>(null);
  const [isSavingDocument, setIsSavingDocument] = useState(false);
  const [aiEnrichingPassId, setAiEnrichingPassId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Packy-style "Add a document" sheet state:
  // - closed: null
  // - 'new': create a brand-new pass from camera / photos / PDF
  // - { attachToPassId: string }: attach or replace photo / PDF on an existing pass slot
  const [addDocSheetState, setAddDocSheetState] = useState<
    null | 'new' | { attachToPassId: string }
  >(null);

  // Manual form or paste-text AI parser panel
  const [editorMode, setEditorMode] = useState<'closed' | 'edit' | 'create' | 'ai_text'>('closed');
  const [aiRawText, setAiRawText] = useState('');
  const [isAiParsingText, setIsAiParsingText] = useState(false);
  const [aiParseError, setAiParseError] = useState<string | null>(null);

  // Form fields for manual create / edit
  const [draftCategory, setDraftCategory] = useState<TravelPassCategory>('flight');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftSubtitle, setDraftSubtitle] = useState('');
  const [draftDay, setDraftDay] = useState<number>(1);
  const [draftDateTime, setDraftDateTime] = useState('');
  const [draftCode, setDraftCode] = useState('');
  const [draftQrPayload, setDraftQrPayload] = useState('');
  const [draftTerminal, setDraftTerminal] = useState('');
  const [draftSeat, setDraftSeat] = useState('');
  const [draftLocalTitle, setDraftLocalTitle] = useState('');
  const [draftLocalAddress, setDraftLocalAddress] = useState('');
  const [draftNote, setDraftNote] = useState('');

  // 3 dedicated Packy-style hidden file inputs (Camera, Photo Library, PDF)
  const cameraFileInputRef = useRef<HTMLInputElement | null>(null);
  const galleryFileInputRef = useRef<HTMLInputElement | null>(null);
  const pdfFileInputRef = useRef<HTMLInputElement | null>(null);
  // Ref tracks which target ('new' or existing passId) triggered the native file picker
  const pendingUploadTargetRef = useRef<'new' | string>('new');

  useEffect(() => {
    const onOnline = () => setIsOfflineNow(false);
    const onOffline = () => setIsOfflineNow(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setFullscreenSpotlight(null);
    setImageZoomed(false);
    setAddDocSheetState(null);
    setEditorMode('closed');
    setAiParseError(null);
    setSearchQuery('');
    setDayFilterOnly(initialFilterDay ?? null);
    setCategoryFilter('all');

    void listOfflinePassImageIds().then((ids) => setCachedIds(ids));

    if (initialFocusPassId) {
      setSelectedPassId(initialFocusPassId);
      setMobileGateViewOpen(true);
    } else if (passes.length > 0) {
      setSelectedPassId((prev) =>
        prev && passes.some((p) => p.id === prev) ? prev : passes[0].id
      );
      setMobileGateViewOpen(false);
    } else {
      setSelectedPassId(null);
      setMobileGateViewOpen(false);
    }
  }, [open, initialFocusPassId, initialFilterDay]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: passes.length };
    DISPLAY_CATEGORIES.forEach((cat) => {
      counts[cat] = passes.filter((p) => matchesCategoryFilter(p, cat)).length;
    });
    return counts;
  }, [passes]);

  const filteredPasses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return passes.filter((p) => {
      if (dayFilterOnly !== null && (p.day ?? 1) !== dayFilterOnly) {
        return false;
      }
      if (!matchesCategoryFilter(p, categoryFilter)) {
        return false;
      }
      if (q) {
        const catMeta = catMetaMap[p.category] || catMetaMap.flight;
        const haystack = [
          p.title,
          p.subtitle,
          p.confirmationCode,
          p.terminalOrPlatform,
          p.seatOrRoom,
          p.dateTimeLabel,
          p.localLanguageTitle,
          p.localLanguageAddress,
          p.offlineFileName,
          p.note,
          `day ${p.day ?? 1}`,
          catMeta.label,
          catMeta.short,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [passes, categoryFilter, dayFilterOnly, searchQuery, catMetaMap]);

  const activePass = useMemo(() => {
    if (!selectedPassId) return filteredPasses[0] ?? null;
    return (
      filteredPasses.find((p) => p.id === selectedPassId) ??
      passes.find((p) => p.id === selectedPassId) ??
      filteredPasses[0] ??
      null
    );
  }, [passes, filteredPasses, selectedPassId]);

  useEffect(() => {
    let cancelled = false;
    if (!open || !activePass) {
      setActivePassDataUrl(null);
      return;
    }
    void getOfflinePassImage(activePass.id).then((url) => {
      if (!cancelled) {
        setActivePassDataUrl(url);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, activePass?.id, activePass?.updatedAt]);

  // Manage Blob URL lifecycle for offline PDFs so embedded iframe & download work cleanly
  useEffect(() => {
    if (!activePassDataUrl || !activePassDataUrl.startsWith('data:application/pdf')) {
      setActivePdfBlobUrl(null);
      return;
    }
    const blobUrl = dataUrlToBlobUrl(activePassDataUrl);
    setActivePdfBlobUrl(blobUrl);
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [activePassDataUrl]);

  if (!open) return null;

  const readyCount = passes.filter(
    (p) =>
      p.status === 'ready' ||
      Boolean(p.confirmationCode?.trim()) ||
      Boolean(p.qrPayload?.trim()) ||
      cachedIds.has(p.id)
  ).length;

  const quickTargetDay = dayFilterOnly ?? Math.max(1, currentDay || 1);
  const quickTargetDayCount = passes.filter((p) => (p.day ?? 1) === quickTargetDay).length;

  const isActivePassPdf = Boolean(
    activePassDataUrl?.startsWith('data:application/pdf') ||
      activePass?.offlineMimeType === 'application/pdf'
  );

  const handleCopyText = async (text: string, key: string) => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text.trim());
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1800);
      onToast(walletCopy.copiedToast);
    } catch {
      onToast(text.trim());
    }
  };

  const openAddDocumentSheetForNew = () => {
    setEditorMode('closed');
    setAiParseError(null);
    setAddDocSheetState('new');
  };

  const openAddDocumentSheetForPass = (passId: string) => {
    setEditorMode('closed');
    setAiParseError(null);
    setAddDocSheetState({ attachToPassId: passId });
  };

  const triggerFilePicker = (kind: 'camera' | 'gallery' | 'pdf') => {
    pendingUploadTargetRef.current =
      addDocSheetState && typeof addDocSheetState === 'object'
        ? addDocSheetState.attachToPassId
        : 'new';

    if (kind === 'camera') {
      cameraFileInputRef.current?.click();
    } else if (kind === 'gallery') {
      galleryFileInputRef.current?.click();
    } else {
      pdfFileInputRef.current?.click();
    }
  };

  /**
   * Packy-style instant offline save + automatic background AI extraction for Camera / Photos / PDF
   */
  const handleDocumentFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const target = pendingUploadTargetRef.current;
    setAddDocSheetState(null);
    setIsSavingDocument(true);

    try {
      const docFile = await readPassDocumentFile(file);
      const existingTargetPass =
        target !== 'new' ? passes.find((p) => p.id === target) ?? null : null;

      const passId = existingTargetPass ? existingTargetPass.id : `pass_${Date.now()}`;

      // 1. Save immediately to IndexedDB offline vault (works 100% offline in <150ms)
      await saveOfflinePassImage(passId, docFile.previewDataUrl);
      setCachedIds((prev) => {
        const next = new Set(prev);
        next.add(passId);
        return next;
      });
      if (activePass?.id === passId || !existingTargetPass) {
        setActivePassDataUrl(docFile.previewDataUrl);
      }

      const defaultCat: TravelPassCategory =
        categoryFilter !== 'all'
          ? categoryFilter
          : inferPassCategoryFromName(docFile.fileName);

      const cleanBaseName = stripFileExtension(docFile.fileName);
      const fallbackNewTitle =
        cleanBaseName && !/^(image|img|photo|scan|screenshot|document)[_\-\s0-9]*$/i.test(cleanBaseName)
          ? cleanBaseName
          : walletCopy.docTitleWithSuffix(catMetaMap[defaultCat].short);

      const immediatePass: TravelPass = existingTargetPass
        ? {
            ...existingTargetPass,
            hasOfflineImage: true,
            offlineMimeType: docFile.mimeType,
            offlineFileName: docFile.fileName,
            status: 'ready',
            updatedAt: Date.now(),
          }
        : {
            id: passId,
            category: defaultCat,
            title: fallbackNewTitle,
            subtitle: docFile.isPdf
              ? walletCopy.pdfExtractingSubtitle
              : walletCopy.imgExtractingSubtitle,
            day: dayFilterOnly ?? 1,
            dateTimeLabel: setup.departureDate || 'Day 1',
            hasOfflineImage: true,
            offlineMimeType: docFile.mimeType,
            offlineFileName: docFile.fileName,
            status: 'ready',
            updatedAt: Date.now(),
          };

      onUpsertPass(immediatePass, true);
      setSelectedPassId(passId);
      setMobileGateViewOpen(true);
      setIsSavingDocument(false);

      onToast(
        docFile.isPdf
          ? walletCopy.pdfSavedToast
          : walletCopy.photoSavedToast
      );

      // 2. If online, automatically run Gemini multimodal extraction in the background
      if (typeof navigator === 'undefined' || navigator.onLine !== false) {
        setAiEnrichingPassId(passId);
        try {
          const res = await fetch(resolveApiUrl('/api/ai/parse-travel-pass'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: docFile.aiBase64,
              mimeType: docFile.mimeType,
              rawText: existingTargetPass ? existingTargetPass.title : '',
              cities: setup.cities,
              language: activeLang,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const rawCat = String(data.category || '') as TravelPassCategory;
            const aiCategory: TravelPassCategory = ALL_VALID_CATEGORIES.includes(rawCat)
              ? rawCat
              : immediatePass.category;

            const aiTitle = String(data.title || '').trim();
            const aiSubtitle = String(data.subtitle || '').trim();
            const aiDateTime = String(data.dateTimeLabel || '').trim();
            const aiCode = String(data.confirmationCode || '').trim();
            const aiQr = String(data.qrPayload || '').trim();
            const aiTerminal = String(data.terminalOrPlatform || '').trim();
            const aiSeat = String(data.seatOrRoom || '').trim();
            const aiLocalTitle = String(data.localLanguageTitle || '').trim();
            const aiLocalAddress = String(data.localLanguageAddress || '').trim();
            const aiNote = String(data.note || '').trim();

            const enrichedPass: TravelPass = existingTargetPass
              ? {
                  ...immediatePass,
                  confirmationCode: immediatePass.confirmationCode || aiCode || undefined,
                  qrPayload: immediatePass.qrPayload || aiQr || undefined,
                  terminalOrPlatform: immediatePass.terminalOrPlatform || aiTerminal || undefined,
                  seatOrRoom: immediatePass.seatOrRoom || aiSeat || undefined,
                  dateTimeLabel: immediatePass.dateTimeLabel || aiDateTime || undefined,
                  localLanguageTitle:
                    immediatePass.localLanguageTitle || aiLocalTitle || undefined,
                  localLanguageAddress:
                    immediatePass.localLanguageAddress || aiLocalAddress || undefined,
                  note: immediatePass.note || aiNote || undefined,
                  updatedAt: Date.now(),
                }
              : {
                  ...immediatePass,
                  category: aiCategory,
                  title: aiTitle || immediatePass.title,
                  subtitle:
                    aiSubtitle ||
                    (docFile.isPdf
                      ? walletCopy.pdfReadySubtitle
                      : undefined),
                  dateTimeLabel: aiDateTime || immediatePass.dateTimeLabel,
                  confirmationCode: aiCode || undefined,
                  qrPayload: aiQr || undefined,
                  terminalOrPlatform: aiTerminal || undefined,
                  seatOrRoom: aiSeat || undefined,
                  localLanguageTitle: aiLocalTitle || undefined,
                  localLanguageAddress: aiLocalAddress || undefined,
                  note: aiNote || undefined,
                  updatedAt: Date.now(),
                };

            onUpsertPass(enrichedPass, true);
            if (!existingTargetPass && aiTitle) {
              onToast(
                walletCopy.aiOrganizedToast(catMetaMap[aiCategory].short, aiTitle)
              );
            }
          } else if (!existingTargetPass) {
            // Clear the temporary "Extracting..." subtitle if AI call returned an error
            onUpsertPass(
              {
                ...immediatePass,
                subtitle: docFile.fileName,
                updatedAt: Date.now(),
              },
              true
            );
          }
        } catch {
          if (!existingTargetPass) {
            onUpsertPass(
              {
                ...immediatePass,
                subtitle: docFile.fileName,
                updatedAt: Date.now(),
              },
              true
            );
          }
        } finally {
          setAiEnrichingPassId((prev) => (prev === passId ? null : prev));
        }
      } else if (!existingTargetPass) {
        onUpsertPass(
          {
            ...immediatePass,
            subtitle: docFile.fileName,
            updatedAt: Date.now(),
          },
          true
        );
      }
    } catch (err) {
      setIsSavingDocument(false);
      const isTooLarge = err instanceof Error && err.message === 'PDF_TOO_LARGE';
      onToast(
        isTooLarge
          ? walletCopy.pdfTooLargeToast
          : walletCopy.docReadErrorToast
      );
    }
  };

  const handleRemoveOfflineDocument = async () => {
    if (!activePass) return;
    await deleteOfflinePassImage(activePass.id);
    setActivePassDataUrl(null);
    setActivePdfBlobUrl(null);
    setImageZoomed(false);
    setCachedIds((prev) => {
      const next = new Set(prev);
      next.delete(activePass.id);
      return next;
    });
    const stillReady = Boolean(
      activePass.confirmationCode?.trim() || activePass.qrPayload?.trim()
    );
    onUpsertPass({
      ...activePass,
      hasOfflineImage: false,
      offlineMimeType: undefined,
      offlineFileName: undefined,
      status: stillReady ? 'ready' : 'pending',
      updatedAt: Date.now(),
    });
    onToast(walletCopy.removedOfflineToast);
  };

  const openEditForm = (pass: TravelPass) => {
    setAddDocSheetState(null);
    setDraftCategory(pass.category === 'esim_insurance' ? 'esim' : pass.category);
    setDraftTitle(pass.title);
    setDraftSubtitle(pass.subtitle || '');
    setDraftDay(pass.day || 1);
    setDraftDateTime(pass.dateTimeLabel || '');
    setDraftCode(pass.confirmationCode || '');
    setDraftQrPayload(pass.qrPayload || '');
    setDraftTerminal(pass.terminalOrPlatform || '');
    setDraftSeat(pass.seatOrRoom || '');
    setDraftLocalTitle(pass.localLanguageTitle || '');
    setDraftLocalAddress(pass.localLanguageAddress || '');
    setDraftNote(pass.note || '');
    setEditorMode('edit');
  };

  const openCreateForm = (defaultCat?: TravelPassCategory) => {
    setAddDocSheetState(null);
    const chosenCat: TravelPassCategory =
      defaultCat || (categoryFilter !== 'all' ? categoryFilter : 'flight');
    setDraftCategory(chosenCat);
    setDraftTitle('');
    setDraftSubtitle('');
    setDraftDay(dayFilterOnly ?? 1);
    setDraftDateTime(setup.departureDate || '');
    setDraftCode('');
    setDraftQrPayload('');
    setDraftTerminal('');
    setDraftSeat('');
    setDraftLocalTitle('');
    setDraftLocalAddress('');
    setDraftNote('');
    setEditorMode('create');
  };

  const handleSaveManualDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = draftTitle.trim();
    if (!cleanTitle) return;

    const isEditing = editorMode === 'edit' && activePass;
    const id = isEditing ? activePass.id : `pass_${Date.now()}`;
    const hasDoc = cachedIds.has(id) || Boolean(isEditing && activePass.hasOfflineImage);
    const hasCodeOrQr = Boolean(draftCode.trim() || draftQrPayload.trim() || hasDoc);

    const nextPass: TravelPass = {
      ...(isEditing ? activePass : {}),
      id,
      category: draftCategory,
      title: cleanTitle,
      subtitle: draftSubtitle.trim() || undefined,
      day: Math.max(1, Math.min(30, Number(draftDay) || 1)),
      dateTimeLabel: draftDateTime.trim() || undefined,
      confirmationCode: draftCode.trim() || undefined,
      qrPayload: draftQrPayload.trim() || undefined,
      terminalOrPlatform: draftTerminal.trim() || undefined,
      seatOrRoom: draftSeat.trim() || undefined,
      localLanguageTitle: draftLocalTitle.trim() || undefined,
      localLanguageAddress: draftLocalAddress.trim() || undefined,
      note: draftNote.trim() || undefined,
      hasOfflineImage: hasDoc,
      status: hasCodeOrQr ? 'ready' : isEditing ? activePass.status : 'pending',
      updatedAt: Date.now(),
    };

    onUpsertPass(nextPass, hasCodeOrQr);
    setSelectedPassId(nextPass.id);
    setEditorMode('closed');
    setMobileGateViewOpen(true);
    onToast(
      isEditing
        ? walletCopy.updatedDocToast
        : walletCopy.addedDocToast
    );
  };

  const handleRunAiTextParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiRawText.trim()) return;

    setIsAiParsingText(true);
    setAiParseError(null);
    try {
      const res = await fetch(resolveApiUrl('/api/ai/parse-travel-pass'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: aiRawText.trim(),
          cities: setup.cities,
          language: activeLang,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || walletCopy.aiParseFailedToast
        );
      }

      const rawCat = String(data.category || 'flight') as TravelPassCategory;
      const validCategory: TravelPassCategory = ALL_VALID_CATEGORIES.includes(rawCat)
        ? rawCat
        : 'flight';

      const newPass: TravelPass = {
        id: `pass_${Date.now()}`,
        category: validCategory,
        title: String(data.title || walletCopy.travelPassDefaultTitle).trim(),
        subtitle: String(data.subtitle || '').trim() || undefined,
        day: dayFilterOnly ?? 1,
        dateTimeLabel: String(data.dateTimeLabel || setup.departureDate || '').trim() || undefined,
        confirmationCode: String(data.confirmationCode || '').trim() || undefined,
        qrPayload: String(data.qrPayload || '').trim() || undefined,
        terminalOrPlatform: String(data.terminalOrPlatform || '').trim() || undefined,
        seatOrRoom: String(data.seatOrRoom || '').trim() || undefined,
        localLanguageTitle: String(data.localLanguageTitle || '').trim() || undefined,
        localLanguageAddress: String(data.localLanguageAddress || '').trim() || undefined,
        note: String(data.note || '').trim() || undefined,
        hasOfflineImage: false,
        status:
          Boolean(String(data.confirmationCode || '').trim()) ||
          Boolean(String(data.qrPayload || '').trim())
            ? 'ready'
            : 'pending',
        updatedAt: Date.now(),
      };

      onUpsertPass(newPass, true);
      setSelectedPassId(newPass.id);
      setAiRawText('');
      setEditorMode('closed');
      setMobileGateViewOpen(true);
      onToast(walletCopy.aiExtractedToast(newPass.title));
    } catch (err) {
      setAiParseError(
        err instanceof Error
          ? err.message
          : walletCopy.aiExtractErrorFallback
      );
    } finally {
      setIsAiParsingText(false);
    }
  };

  const resolvePartnerOfferForPass = (pass: TravelPass) => {
    const city = setup.cities[0] || intel.routeTitle || 'Tokyo';
    if (pass.category === 'esim' || pass.category === 'esim_insurance') {
      const esim = buildEsimAffiliateUrl(setup.cities, activeLang, affiliatePartners);
      return {
        merchant: esim.merchant,
        label: walletCopy.offerEsimLabel,
        url: esim.url,
      };
    }
    if (pass.category === 'hotel') {
      return {
        merchant: 'Trip.com',
        label: walletCopy.offerHotelLabel,
        url: buildTripComHotelUrl(`${city} ${pass.title}`, affiliatePartners),
      };
    }
    if (pass.category === 'train') {
      return {
        merchant: 'Klook',
        label: walletCopy.offerTrainLabel,
        url: buildKlookSearchUrl(`${city} ${pass.title}`, affiliatePartners),
      };
    }
    if (pass.category === 'attraction') {
      return {
        merchant: 'GetYourGuide',
        label: walletCopy.offerAttractionLabel,
        url:
          activeLang === 'zh-CN'
            ? buildKlookSearchUrl(`${city} ${pass.title}`, affiliatePartners)
            : buildGetYourGuideSearchUrl(`${city} ${pass.title}`, affiliatePartners),
      };
    }
    return null;
  };

  const qrStringForActive = activePass
    ? (activePass.qrPayload || activePass.confirmationCode || '').trim()
    : '';

  const targetAttachPass =
    addDocSheetState && typeof addDocSheetState === 'object'
      ? passes.find((p) => p.id === addDocSheetState.attachToPassId) ?? null
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center tk-bg-overlay sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={walletCopy.dialogAria}
    >
      {/* Hidden Native File Inputs for Packy-style 3-Card Document Picker */}
      <input
        ref={cameraFileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => void handleDocumentFilePicked(e)}
        className="hidden"
      />
      <input
        ref={galleryFileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => void handleDocumentFilePicked(e)}
        className="hidden"
      />
      <input
        ref={pdfFileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={(e) => void handleDocumentFilePicked(e)}
        className="hidden"
      />

      <div className="relative flex flex-col w-full max-w-5xl h-[92dvh] sm:h-[88vh] max-h-[860px] rounded-t-3xl sm:rounded-3xl tk-bg-paper tk-text-ink border tk-bc-hair shadow-2xl overflow-hidden">
        {/* Top Mobile Drag Handle */}
        <div className="sm:hidden pt-2.5 pb-1 bg-white flex justify-center shrink-0">
          <div className="h-1.5 w-10 rounded-full tk-bg-forest-plate" />
        </div>

        {/* Clean Single-Row Modal Header (No Duplicate / Fragmented Add Buttons) */}
        <div className="bg-white border-b tk-bc-hair px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-extrabold tracking-tight tk-text-ink truncate">
              {walletCopy.walletTitle}
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs tk-text-ink2">
              <span className="inline-flex items-center gap-1 font-medium tk-text-forest">
                {isOfflineNow ? (
                  <>
                    <WifiOff className="h-3.5 w-3.5 shrink-0 tk-text-warning" />
                    <span>{walletCopy.offlineModeActive}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 tk-text-forest" />
                    <span>{walletCopy.onlineCachedHint}</span>
                  </>
                )}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums font-semibold tk-text-ink">
                {walletCopy.readyCountText(readyCount, passes.length)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const { addedCount, firstPassId } = onSmartSeedFromTrip();
                if (addedCount > 0) {
                  if (firstPassId) setSelectedPassId(firstPassId);
                  onToast(walletCopy.syncedSlotsToast(addedCount));
                } else {
                  onToast(walletCopy.allSlotsSyncedToast);
                }
              }}
              title={walletCopy.syncTripTitle}
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border tk-bc-hair tk-bg-paper px-2.5 sm:px-3 text-xs font-semibold tk-text-ink hover:tk-bc-forest hover:tk-text-forest transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 tk-text-forest shrink-0" />
              <span className="hidden sm:inline">{walletCopy.syncTripBtn}</span>
            </button>

            <button
              type="button"
              disabled={isSavingDocument}
              onClick={openAddDocumentSheetForNew}
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl tk-bg-forest px-3 sm:px-4 text-xs font-bold text-white hover:tk-bg-press disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isSavingDocument ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              ) : (
                <Plus className="h-4 w-4 shrink-0" />
              )}
              <span>{walletCopy.addDocBtn}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label={walletCopy.closeWalletAria}
              className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border tk-bc-hair tk-bg-paper tk-text-ink2 hover:tk-text-ink transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Packy-Style Search Bar + 12-Category Horizontal Scrollable Filter Strip */}
        <div className="bg-white border-b tk-bc-hair px-4 sm:px-6 py-3 space-y-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 tk-text-ink2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={walletCopy.searchPlaceholder}
                className="w-full h-10 rounded-xl tk-bg-forest-plate border border-transparent focus:tk-bc-forest focus:bg-white pl-10 pr-9 text-base sm:text-sm tk-text-ink placeholder:tk-text-ink2 focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label={walletCopy.clearSearchAria}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center rounded-full tk-text-ink2 hover:tk-text-ink cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="inline-flex items-center rounded-xl tk-bg-forest-plate p-0.5 border tk-bc-hair shrink-0">
              <button
                type="button"
                onClick={() => setDayFilterOnly(null)}
                className={`h-9 rounded-lg px-2.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
 dayFilterOnly === null
 ? 'bg-white tk-text-forest shadow-2xs'
 : 'tk-text-ink2 hover:tk-text-ink'
 }`}
              >
                {walletCopy.allFilter}
              </button>
              <button
                type="button"
                onClick={() =>
                  setDayFilterOnly((prev) =>
                    prev === quickTargetDay ? null : quickTargetDay
                  )
                }
                className={`h-9 inline-flex items-center gap-1 rounded-lg px-2.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer tabular-nums ${
 dayFilterOnly === quickTargetDay
 ? 'tk-bg-forest text-white shadow-2xs'
 : 'tk-text-ink2 hover:tk-text-ink'
 }`}
              >
                <span>{walletCopy.dayChipLabel(quickTargetDay)}</span>
                {quickTargetDayCount > 0 && (
                  <span
                    className={`font-num text-[11px] ${
 dayFilterOnly === quickTargetDay ? 'text-white/80' : 'tk-text-ink2'
 }`}
                  >
                    {quickTargetDayCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Horizontal Scrollable Category Chips (All + 12 Categories) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`min-h-[36px] inline-flex items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
 categoryFilter === 'all'
 ? 'tk-bc-forest tk-bg-forest text-white'
 : 'tk-bc-hair tk-bg-paper tk-text-ink hover:tk-bc-hair'
 }`}
            >
              <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
              <span>{walletCopy.allFilter}</span>
              {passes.length > 0 && (
                <span
                  className={`tabular-nums text-[11px] ${
 categoryFilter === 'all' ? 'text-white/80' : 'tk-text-ink2'
 }`}
                >
                  {passes.length}
                </span>
              )}
            </button>

            {DISPLAY_CATEGORIES.map((cat) => {
              const style = CATEGORY_STYLE[cat];
              const catText = catMetaMap[cat];
              const Icon = style.icon;
              const active = categoryFilter === cat;
              const count = categoryCounts[cat] || 0;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`min-h-[36px] inline-flex items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
 active
 ? 'tk-bc-forest tk-bg-forest text-white'
 : 'tk-bc-hair tk-bg-paper tk-text-ink hover:tk-bc-hair'
 }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{catText.short}</span>
                  {count > 0 && (
                    <span
                      className={`tabular-nums text-[11px] ${
 active ? 'text-white/80' : 'tk-text-forest'
 }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Inline Panel: Paste Confirmation Text OR Manual Create / Edit Form */}
        {editorMode !== 'closed' && (
          <div className="tk-bg-card border-b tk-bc-hair px-4 sm:px-6 py-4 overflow-y-auto max-h-[68vh] shrink-0">
            {editorMode === 'ai_text' ? (
              <form onSubmit={handleRunAiTextParse} className="space-y-3 max-w-3xl mx-auto">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold tk-text-ink">
                      {walletCopy.aiTextHeading}
                    </h3>
                    <p className="text-xs tk-text-ink2">
                      {walletCopy.aiTextDesc}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditorMode('closed')}
                    className="text-xs font-semibold tk-text-ink2 hover:tk-text-ink whitespace-nowrap cursor-pointer"
                  >
                    {walletCopy.cancelBtn}
                  </button>
                </div>

                <textarea
                  rows={3}
                  value={aiRawText}
                  onChange={(e) => setAiRawText(e.target.value)}
                  placeholder={walletCopy.aiTextPlaceholder}
                  className="w-full rounded-xl border tk-bc-hair bg-white px-3.5 py-2.5 text-base sm:text-sm tk-text-ink placeholder:tk-text-ink2 focus:tk-bc-forest focus:outline-none"
                />

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="submit"
                    disabled={isAiParsingText || !aiRawText.trim()}
                    className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl tk-bg-forest px-4 text-xs font-bold text-white hover:tk-bg-press disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isAiParsingText ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {isAiParsingText
                        ? walletCopy.extractingBtn
                        : walletCopy.extractSaveBtn}
                    </span>
                  </button>
                </div>

                {aiParseError && (
                  <p className="text-xs font-medium tk-text-danger">{aiParseError}</p>
                )}
              </form>
            ) : (
              <form onSubmit={handleSaveManualDraft} className="space-y-3 max-w-3xl mx-auto">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold tk-text-ink">
                    {editorMode === 'edit'
                      ? walletCopy.editDocHeading
                      : walletCopy.createDocHeading}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditorMode('closed')}
                    className="text-xs font-semibold tk-text-ink2 hover:tk-text-ink cursor-pointer"
                  >
                    {walletCopy.cancelBtn}
                  </button>
                </div>

                {/* 12-Category Segmented Picker */}
                <div className="flex flex-wrap gap-1.5">
                  {DISPLAY_CATEGORIES.map((cat) => {
                    const style = CATEGORY_STYLE[cat];
                    const catText = catMetaMap[cat];
                    const Icon = style.icon;
                    const selected = draftCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setDraftCategory(cat)}
                        className={`min-h-[34px] inline-flex items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
 selected
 ? 'tk-bc-forest tk-bg-forest text-white'
 : 'tk-bc-hair bg-white tk-text-ink2 hover:tk-text-ink'
 }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{catText.short}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold tk-text-ink2 mb-1">
                      {walletCopy.titleLabel}
                    </label>
                    <input
                      type="text"
                      required
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      placeholder={walletCopy.titlePlaceholder}
                      className="w-full h-10 rounded-xl border tk-bc-hair bg-white px-3 text-base sm:text-sm tk-text-ink focus:tk-bc-forest focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold tk-text-ink2 mb-1">
                        {walletCopy.tripDayLabel}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={Math.max(30, setup.days)}
                        value={draftDay}
                        onChange={(e) => setDraftDay(Number(e.target.value) || 1)}
                        className="w-full h-10 rounded-xl border tk-bc-hair bg-white px-3 font-num tabular-nums text-base sm:text-sm tk-text-ink focus:tk-bc-forest focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold tk-text-ink2 mb-1">
                        {walletCopy.dateExpiryLabel}
                      </label>
                      <input
                        type="text"
                        value={draftDateTime}
                        onChange={(e) => setDraftDateTime(e.target.value)}
                        placeholder="2026-11-14"
                        className="w-full h-10 rounded-xl border tk-bc-hair bg-white px-2.5 font-num tabular-nums text-base sm:text-sm tk-text-ink focus:tk-bc-forest focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold tk-text-ink2 mb-1">
                      {(catMetaMap[draftCategory] || catMetaMap.flight).codeHint}
                    </label>
                    <input
                      type="text"
                      value={draftCode}
                      onChange={(e) => setDraftCode(e.target.value)}
                      placeholder="e.g. K8M42P"
                      className="w-full h-10 rounded-xl border tk-bc-hair bg-white px-3 font-mono tabular-nums text-base sm:text-sm tk-text-ink focus:tk-bc-forest focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold tk-text-ink2 mb-1">
                      {walletCopy.terminalLabel}
                    </label>
                    <input
                      type="text"
                      value={draftTerminal}
                      onChange={(e) => setDraftTerminal(e.target.value)}
                      placeholder={walletCopy.terminalPlaceholder}
                      className="w-full h-10 rounded-xl border tk-bc-hair bg-white px-3 text-base sm:text-sm tk-text-ink focus:tk-bc-forest focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold tk-text-ink2 mb-1">
                      {walletCopy.seatLabel}
                    </label>
                    <input
                      type="text"
                      value={draftSeat}
                      onChange={(e) => setDraftSeat(e.target.value)}
                      placeholder={walletCopy.seatPlaceholder}
                      className="w-full h-10 rounded-xl border tk-bc-hair bg-white px-3 text-base sm:text-sm tk-text-ink focus:tk-bc-forest focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold tk-text-ink2 mb-1">
                      {walletCopy.localTitleLabel}
                    </label>
                    <input
                      type="text"
                      value={draftLocalTitle}
                      onChange={(e) => setDraftLocalTitle(e.target.value)}
                      placeholder="ホテルセンチュリーサザンタワー"
                      className="w-full h-10 rounded-xl border tk-bc-hair bg-white px-3 text-base sm:text-sm tk-text-ink focus:tk-bc-forest focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold tk-text-ink2 mb-1">
                      {walletCopy.localAddressLabel}
                    </label>
                    <input
                      type="text"
                      value={draftLocalAddress}
                      onChange={(e) => setDraftLocalAddress(e.target.value)}
                      placeholder="東京都渋谷区代々木2-2-1"
                      className="w-full h-10 rounded-xl border tk-bc-hair bg-white px-3 text-base sm:text-sm tk-text-ink focus:tk-bc-forest focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold tk-text-ink2 mb-1">
                      {walletCopy.qrPayloadLabel}
                    </label>
                    <input
                      type="text"
                      value={draftQrPayload}
                      onChange={(e) => setDraftQrPayload(e.target.value)}
                      placeholder="https://... or raw QR string"
                      className="w-full h-10 rounded-xl border tk-bc-hair bg-white px-3 font-mono text-base sm:text-sm tk-text-ink focus:tk-bc-forest focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold tk-text-ink2 mb-1">
                      {walletCopy.noteLabel}
                    </label>
                    <input
                      type="text"
                      value={draftNote}
                      onChange={(e) => setDraftNote(e.target.value)}
                      placeholder={walletCopy.notePlaceholder}
                      className="w-full h-10 rounded-xl border tk-bc-hair bg-white px-3 text-base sm:text-sm tk-text-ink focus:tk-bc-forest focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditorMode('closed')}
                    className="min-h-[40px] px-4 rounded-xl border tk-bc-hair bg-white text-xs font-semibold tk-text-ink2 hover:tk-text-ink cursor-pointer"
                  >
                    {walletCopy.cancelBtn}
                  </button>
                  <button
                    type="submit"
                    className="min-h-[40px] px-5 rounded-xl tk-bg-forest text-xs font-bold text-white hover:tk-bg-press cursor-pointer"
                  >
                    {walletCopy.saveDocBtn}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Main Workspace: Responsive 12-Col Split on Desktop, Ergonomic Deck/Detail Switch on Mobile */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Column (5 cols): Pass Deck List */}
          <div
            className={`lg:col-span-5 border-r tk-bc-hair tk-bg-paper overflow-y-auto p-4 pb-[max(2rem,env(safe-area-inset-bottom))] space-y-2.5 ${
 mobileGateViewOpen && activePass ? 'hidden lg:block' : 'block'
 }`}
          >
            {filteredPasses.length === 0 ? (
              <div className="rounded-2xl border border-dashed tk-bc-hair bg-white p-6 text-center space-y-3 my-4">
                <div className="mx-auto flex justify-center">
                  <AccentIconBadge
                    accent={
                      categoryFilter !== 'all'
                        ? CATEGORY_STYLE[categoryFilter].accent
                        : 'teal'
                    }
                    icon={
                      categoryFilter !== 'all'
                        ? CATEGORY_STYLE[categoryFilter].icon
                        : QrCode
                    }
                    size="lg"
                    shape="circle"
                  />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold tk-text-ink">
                    {searchQuery.trim()
                      ? walletCopy.noSearchMatchTitle
                      : categoryFilter !== 'all'
                      ? walletCopy.noCatDocsTitle(catMetaMap[categoryFilter].short)
                      : walletCopy.emptyWalletTitle}
                  </h3>
                  <p className="text-xs tk-text-ink2 leading-relaxed">
                    {walletCopy.emptyWalletDesc}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={openAddDocumentSheetForNew}
                    className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl tk-bg-forest px-4 text-xs font-bold text-white hover:tk-bg-press cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{walletCopy.addPhotoOrPdfBtn}</span>
                  </button>
                  {passes.length === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const { addedCount, firstPassId } = onSmartSeedFromTrip();
                        if (firstPassId) setSelectedPassId(firstPassId);
                        onToast(
                          addedCount > 0
                            ? walletCopy.syncedSlotsToast(addedCount)
                            : walletCopy.noSlotsDetectedToast
                        );
                      }}
                      className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl border tk-bc-hair bg-white px-3.5 text-xs font-semibold tk-text-ink hover:tk-bc-forest cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5 tk-text-forest" />
                      <span>{walletCopy.syncFromTripBtn}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              filteredPasses.map((pass) => {
                const style = CATEGORY_STYLE[pass.category] || CATEGORY_STYLE.flight;
                const catText = catMetaMap[pass.category] || catMetaMap.flight;
                const isSelected = activePass?.id === pass.id;
                const hasDoc = cachedIds.has(pass.id) || Boolean(pass.hasOfflineImage);
                const isPdf = pass.offlineMimeType === 'application/pdf';
                const isAiWorking = aiEnrichingPassId === pass.id;
                const isReady =
                  pass.status === 'ready' ||
                  hasDoc ||
                  Boolean(pass.confirmationCode?.trim()) ||
                  Boolean(pass.qrPayload?.trim());

                return (
                  <button
                    key={pass.id}
                    type="button"
                    onClick={() => {
                      setSelectedPassId(pass.id);
                      setMobileGateViewOpen(true);
                      setImageZoomed(false);
                    }}
                    className={`w-full text-left rounded-2xl p-4 transition-colors border cursor-pointer ${
 isSelected
 ? 'bg-white tk-bc-forest shadow-xs'
 : 'bg-white tk-bc-hair hover:tk-bc-hair'
 }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <AccentIconBadge accent={style.accent} icon={style.icon} size="md" />
                        <div className="min-w-0">
                          <div className="text-[15px] font-bold tk-text-ink truncate">
                            {pass.title}
                          </div>
                          {/* Clean unboxed metadata with middle dots */}
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs tk-text-ink2 tabular-nums">
                            <span>{catText.short}</span>
                            {pass.dateTimeLabel && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{pass.dateTimeLabel}</span>
                              </>
                            )}
                            {pass.terminalOrPlatform && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold tk-text-ink">
                                  {pass.terminalOrPlatform}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {isAiWorking ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold tk-text-forest">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>{walletCopy.aiReadingBadge}</span>
                          </span>
                        ) : isReady ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold tk-text-forest">
                            <Check className="h-3.5 w-3.5 stroke-[2.6]" />
                            <span>
                              {isPdf
                                ? walletCopy.pdfSavedBadge
                                : hasDoc
                                ? walletCopy.savedOfflineBadge
                                : walletCopy.readyBadge}
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs font-medium tk-text-warning">
                            {walletCopy.pendingBadge}
                          </span>
                        )}
                        {pass.confirmationCode && (
                          <div className="mt-1 font-mono tabular-nums text-xs font-bold tk-text-ink">
                            {pass.confirmationCode}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right Column (7 cols): High-Contrast Gate Scannable Pass, Offline PDF Viewer & Driver Card Inspector */}
          <div
            className={`lg:col-span-7 bg-white overflow-y-auto p-4 sm:p-6 pb-[max(2rem,env(safe-area-inset-bottom))] ${
 mobileGateViewOpen && activePass ? 'block' : 'hidden lg:block'
 }`}
          >
            {activePass ? (
              <div className="max-w-xl mx-auto space-y-5">
                {/* Mobile Back-to-Deck Button */}
                <div className="lg:hidden flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setMobileGateViewOpen(false)}
                    className="min-h-[40px] inline-flex items-center gap-1.5 text-xs font-bold tk-text-forest cursor-pointer"
                  >
                    <span>← {walletCopy.backToAllDocs}</span>
                  </button>
                  <span className="text-xs tk-text-ink2 tabular-nums">
                    Day {activePass.day ?? 1}
                  </span>
                </div>

                {/* Boarding / Document Inspector Card */}
                <div className="rounded-3xl border tk-bc-hair tk-bg-card p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <AccentIconBadge
                        accent={(CATEGORY_STYLE[activePass.category] || CATEGORY_STYLE.flight).accent}
                        icon={(CATEGORY_STYLE[activePass.category] || CATEGORY_STYLE.flight).icon}
                        size="lg"
                      />
                      <div className="min-w-0">
                        <div className="text-xs tk-text-ink2 flex flex-wrap items-center gap-1.5 tabular-nums">
                          <span>
                            {(catMetaMap[activePass.category] || catMetaMap.flight).label}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>Day {activePass.day ?? 1}</span>
                          {activePass.dateTimeLabel && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{activePass.dateTimeLabel}</span>
                            </>
                          )}
                        </div>
                        <h3 className="mt-1 text-lg sm:text-xl font-extrabold tk-text-ink leading-snug">
                          {activePass.title}
                        </h3>
                        {activePass.subtitle && (
                          <p className="mt-0.5 text-xs tk-text-ink2">{activePass.subtitle}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditForm(activePass)}
                        aria-label={walletCopy.editPassAria}
                        className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border tk-bc-hair bg-white tk-text-ink2 hover:tk-text-forest cursor-pointer"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void deleteOfflinePassImage(activePass.id);
                          onDeletePass(activePass.id);
                          setMobileGateViewOpen(false);
                        }}
                        aria-label={walletCopy.deletePassAria}
                        className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border tk-bc-hair bg-white tk-text-ink2 hover:tk-text-danger cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {aiEnrichingPassId === activePass.id && (
                    <div className="rounded-xl border tk-bc-hair tk-bg-forest-tint px-3.5 py-2 flex items-center gap-2 text-xs font-semibold tk-text-forest">
                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                      <span>{walletCopy.aiEnrichingBanner}</span>
                    </div>
                  )}

                  {/* Structured Gate / Platform / Seat / PNR / Document Number Grid */}
                  {(activePass.confirmationCode ||
                    activePass.terminalOrPlatform ||
                    activePass.seatOrRoom) && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-dashed tk-bc-hair">
                      {activePass.confirmationCode && (
                        <div className="col-span-2 sm:col-span-1">
                          <div className="text-xs tk-text-ink2">
                            {(catMetaMap[activePass.category] || catMetaMap.flight).codeHint}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className="font-mono tabular-nums text-base font-extrabold tracking-wide tk-text-forest break-all">
                              {activePass.confirmationCode}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                void handleCopyText(activePass.confirmationCode || '', 'code')
                              }
                              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border tk-bc-hair bg-white tk-text-ink2 hover:tk-text-forest cursor-pointer"
                              title={walletCopy.copyNumberTitle}
                            >
                              {copiedKey === 'code' ? (
                                <Check className="h-3.5 w-3.5 tk-text-forest" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {activePass.terminalOrPlatform && (
                        <div>
                          <div className="text-xs tk-text-ink2">
                            {walletCopy.terminalLabel}
                          </div>
                          <div className="mt-0.5 font-num tabular-nums text-sm font-bold tk-text-ink">
                            {activePass.terminalOrPlatform}
                          </div>
                        </div>
                      )}

                      {activePass.seatOrRoom && (
                        <div>
                          <div className="text-xs tk-text-ink2">
                            {walletCopy.seatLabel}
                          </div>
                          <div className="mt-0.5 font-num tabular-nums text-sm font-bold tk-text-ink">
                            {activePass.seatOrRoom}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Daylight-Scannable Pure White QR / Photo / Offline PDF Zone */}
                  <div className="rounded-2xl bg-white border tk-bc-hair p-4 flex flex-col items-center justify-center text-center space-y-3">
                    {isActivePassPdf && activePdfBlobUrl ? (
                      <div className="w-full space-y-3">
                        <div className="flex items-center justify-between gap-2 px-1 text-left">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 tk-text-forest shrink-0" />
                            <span className="text-xs font-bold tk-text-ink truncate">
                              {activePass.offlineFileName || `${activePass.title}.pdf`}
                            </span>
                          </div>
                          <span className="text-xs font-semibold tk-text-forest shrink-0">
                            {walletCopy.offlinePdfCached}
                          </span>
                        </div>

                        <iframe
                          src={activePdfBlobUrl}
                          title={activePass.title}
                          className="w-full h-[320px] rounded-xl border tk-bc-hair tk-bg-paper"
                        />

                        {qrStringForActive && (
                          <div className="pt-1 flex items-center justify-center gap-3 rounded-xl tk-bg-paper p-3 border tk-bc-hair">
                            <div className="p-2 rounded-xl bg-white border tk-bc-hair shrink-0">
                              <QRCodeSVG value={qrStringForActive} size={84} level="M" />
                            </div>
                            <div className="text-left min-w-0">
                              <div className="text-xs font-semibold tk-text-ink2">
                                {walletCopy.extractedQrLabel}
                              </div>
                              <div className="font-mono text-xs font-bold tk-text-ink break-all">
                                {qrStringForActive}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setFullscreenSpotlight('qr')}
                            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl tk-bg-forest px-4 text-xs font-bold text-white hover:tk-bg-press cursor-pointer"
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                            <span>{walletCopy.fullscreenPdfBtn}</span>
                          </button>
                          <a
                            href={activePdfBlobUrl}
                            download={activePass.offlineFileName || `${activePass.title}.pdf`}
                            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border tk-bc-hair bg-white px-3.5 text-xs font-semibold tk-text-ink hover:tk-bc-forest"
                          >
                            <Download className="h-3.5 w-3.5 tk-text-forest" />
                            <span>{walletCopy.saveCopyBtn}</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => openAddDocumentSheetForPass(activePass.id)}
                            className="min-h-[40px] inline-flex items-center gap-1 rounded-xl border tk-bc-hair bg-white px-3 text-xs font-semibold tk-text-ink2 hover:tk-text-ink cursor-pointer"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>{walletCopy.replaceBtn}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleRemoveOfflineDocument()}
                            className="min-h-[40px] px-2.5 text-xs font-semibold tk-text-danger hover:underline cursor-pointer"
                          >
                            {walletCopy.removeBtn}
                          </button>
                        </div>
                      </div>
                    ) : activePassDataUrl && !isActivePassPdf ? (
                      <div className="w-full space-y-2.5">
                        <div className="relative overflow-auto rounded-xl bg-white border tk-bc-hair p-2 max-h-[340px] flex items-center justify-center">
                          <img
                            src={activePassDataUrl}
                            alt={activePass.title}
                            referrerPolicy="no-referrer"
                            onClick={() => setImageZoomed((z) => !z)}
                            className={`transition-transform duration-150 cursor-zoom-in rounded-lg object-contain ${
 imageZoomed ? 'scale-150 my-12' : 'max-h-[290px] w-auto'
 }`}
                          />
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setFullscreenSpotlight('qr')}
                            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl tk-bg-forest px-4 text-xs font-bold text-white hover:tk-bg-press cursor-pointer"
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                            <span>{walletCopy.fullscreenViewBtn}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setImageZoomed((z) => !z)}
                            className="min-h-[40px] inline-flex items-center gap-1 rounded-xl border tk-bc-hair bg-white px-3 text-xs font-semibold tk-text-ink cursor-pointer"
                          >
                            <ZoomIn className="h-3.5 w-3.5 tk-text-forest" />
                            <span>{imageZoomed ? '1.0x' : '1.5x'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openAddDocumentSheetForPass(activePass.id)}
                            className="min-h-[40px] inline-flex items-center gap-1 rounded-xl border tk-bc-hair bg-white px-3 text-xs font-semibold tk-text-ink2 hover:tk-text-ink cursor-pointer"
                          >
                            <Camera className="h-3.5 w-3.5" />
                            <span>{walletCopy.replaceBtn}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleRemoveOfflineDocument()}
                            className="min-h-[40px] px-2.5 text-xs font-semibold tk-text-danger hover:underline cursor-pointer"
                          >
                            {walletCopy.removeBtn}
                          </button>
                        </div>
                      </div>
                    ) : qrStringForActive ? (
                      <div className="space-y-3 py-2">
                        <div className="inline-flex p-3.5 rounded-2xl bg-white border tk-bc-hair shadow-xs">
                          <QRCodeSVG
                            value={qrStringForActive}
                            size={184}
                            level="M"
                            includeMargin={false}
                          />
                        </div>
                        <div className="text-xs tk-text-ink2 font-mono break-all max-w-sm mx-auto">
                          {qrStringForActive}
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setFullscreenSpotlight('qr')}
                            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl tk-bg-forest px-4 text-xs font-bold text-white hover:tk-bg-press cursor-pointer"
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                            <span>{walletCopy.fullscreenGateBtn}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openAddDocumentSheetForPass(activePass.id)}
                            disabled={isSavingDocument}
                            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border tk-bc-hair tk-bg-paper px-3.5 text-xs font-semibold tk-text-ink hover:tk-bc-forest cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5 tk-text-forest" />
                            <span>{walletCopy.attachPhotoPdfBtn}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-5 px-3 space-y-3">
                        <p className="text-xs tk-text-ink2 max-w-sm mx-auto leading-relaxed">
                          {walletCopy.emptySlotHint}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            disabled={isSavingDocument}
                            onClick={() => openAddDocumentSheetForPass(activePass.id)}
                            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl tk-bg-forest px-4 text-xs font-bold text-white hover:tk-bg-press disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            {isSavingDocument ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Camera className="h-4 w-4" />
                            )}
                            <span>{walletCopy.addOfflineBtn}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditForm(activePass)}
                            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border tk-bc-hair tk-bg-paper px-3.5 text-xs font-semibold tk-text-ink hover:tk-bc-forest cursor-pointer"
                          >
                            <FileText className="h-3.5 w-3.5 tk-text-forest" />
                            <span>{walletCopy.enterCodeInfoBtn}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {activePass.note && (
                    <p className="text-xs tk-text-ink2 leading-relaxed px-1">
                      {activePass.note}
                    </p>
                  )}
                </div>

                {/* Local-Language Taxi Driver / Concierge Card */}
                {(activePass.localLanguageTitle || activePass.localLanguageAddress) && (
                  <div className="rounded-2xl border tk-bc-hair bg-white p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-bold tk-text-forest">
                        {walletCopy.taxiDriverHeader}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setFullscreenSpotlight('driver')}
                          className="min-h-[34px] inline-flex items-center gap-1 rounded-lg tk-bg-forest-tint px-2.5 text-xs font-semibold tk-text-forest hover:tk-bg-forest-tint cursor-pointer"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                          <span>{walletCopy.enlargeBtn}</span>
                        </button>
                        <a
                          href={buildGoogleMapsSearchUrl({
                            title: activePass.localLanguageTitle || activePass.title,
                            address: activePass.localLanguageAddress,
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[34px] inline-flex items-center gap-1 rounded-lg border tk-bc-hair bg-white px-2.5 text-xs font-semibold tk-text-ink hover:tk-bc-forest"
                        >
                          <MapPin className="h-3.5 w-3.5 tk-text-forest" />
                          <span>{walletCopy.mapsBtn}</span>
                        </a>
                      </div>
                    </div>

                    <div className="rounded-xl tk-bg-paper p-3.5 space-y-1">
                      {activePass.localLanguageTitle && (
                        <div className="text-lg sm:text-xl font-extrabold tk-text-ink leading-snug">
                          {activePass.localLanguageTitle}
                        </div>
                      )}
                      {activePass.localLanguageAddress && (
                        <div className="text-sm font-medium tk-text-ink2 leading-relaxed">
                          {activePass.localLanguageAddress}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Contextual Partner Booking Shortcut */}
                {(() => {
                  const offer = resolvePartnerOfferForPass(activePass);
                  if (!offer) return null;
                  return (
                    <div className="rounded-2xl border tk-bc-hair tk-bg-card px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs tk-text-ink2">
                        {walletCopy.partnerOfferPrompt(offer.merchant)}
                      </div>
                      <a
                        href={offer.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow sponsored"
                        className="min-h-[36px] inline-flex items-center gap-1.5 rounded-xl border tk-bc-hair bg-white px-3 text-xs font-semibold tk-text-forest hover:tk-bg-forest-tint whitespace-nowrap shrink-0"
                      >
                        <span>{offer.label}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center p-8 text-xs tk-text-ink2">
                {walletCopy.selectDocPrompt}
              </div>
            )}
          </div>
        </div>

        {/* Packy-Style "Add a document" Bottom Sheet / Modal Overlay */}
        {addDocSheetState !== null && (
          <div
            className="absolute inset-0 z-40 flex items-end sm:items-center justify-center tk-bg-overlay sm:p-6"
            onClick={() => setAddDocSheetState(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white border tk-bc-hair p-5 sm:p-6 shadow-2xl space-y-4"
            >
              {/* Mobile Drag Handle */}
              <div className="sm:hidden flex justify-center -mt-1 pb-1">
                <div className="h-1.5 w-10 rounded-full tk-bg-forest-plate" />
              </div>

              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-extrabold tracking-tight tk-text-ink">
                    {targetAttachPass
                      ? walletCopy.attachOfflineTitle
                      : walletCopy.addDocSheetTitle}
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm tk-text-ink2">
                    {targetAttachPass
                      ? walletCopy.attachOfflineDesc(targetAttachPass.title)
                      : walletCopy.addDocSheetDesc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAddDocSheetState(null)}
                  aria-label={walletCopy.closeWalletAria}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-xl tk-bg-forest-plate tk-text-ink2 hover:tk-text-ink cursor-pointer shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* 3 Tactile Packy-Style Action Cards */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => triggerFilePicker('camera')}
                  className="w-full min-h-[72px] rounded-2xl border tk-bc-hair bg-white hover:tk-bc-forest hover:tk-bg-card p-4 flex items-center gap-4 text-left transition-colors cursor-pointer"
                >
                  <div className="h-12 w-12 rounded-2xl tk-bg-forest-plate flex items-center justify-center shrink-0 tk-text-ink">
                    <Camera className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15px] sm:text-base font-bold tk-text-ink">
                      {walletCopy.takePhotoTitle}
                    </div>
                    <div className="text-xs tk-text-ink2 mt-0.5">
                      {walletCopy.takePhotoDesc}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => triggerFilePicker('gallery')}
                  className="w-full min-h-[72px] rounded-2xl border tk-bc-hair bg-white hover:tk-bc-forest hover:tk-bg-card p-4 flex items-center gap-4 text-left transition-colors cursor-pointer"
                >
                  <div className="h-12 w-12 rounded-2xl tk-bg-forest-plate flex items-center justify-center shrink-0 tk-text-ink">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15px] sm:text-base font-bold tk-text-ink">
                      {walletCopy.choosePhotosTitle}
                    </div>
                    <div className="text-xs tk-text-ink2 mt-0.5">
                      {walletCopy.choosePhotosDesc}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => triggerFilePicker('pdf')}
                  className="w-full min-h-[72px] rounded-2xl border tk-bc-hair bg-white hover:tk-bc-forest hover:tk-bg-card p-4 flex items-center gap-4 text-left transition-colors cursor-pointer"
                >
                  <div className="h-12 w-12 rounded-2xl tk-bg-forest-plate flex items-center justify-center shrink-0 tk-text-ink">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15px] sm:text-base font-bold tk-text-ink">
                      {walletCopy.uploadPdfTitle}
                    </div>
                    <div className="text-xs tk-text-ink2 mt-0.5">
                      {walletCopy.uploadPdfDesc}
                    </div>
                  </div>
                </button>
              </div>

              {/* Quiet Secondary Fallbacks when Creating a New Pass */}
              {!targetAttachPass && (
                <div className="pt-2 border-t tk-bc-hair flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setAddDocSheetState(null);
                      setAiParseError(null);
                      setEditorMode('ai_text');
                    }}
                    className="inline-flex items-center gap-1 font-semibold tk-text-forest hover:underline py-1 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{walletCopy.pasteConfirmTextBtn}</span>
                  </button>
                  <span className="tk-text-ink2" aria-hidden="true">
                    ·
                  </span>
                  <button
                    type="button"
                    onClick={() => openCreateForm()}
                    className="inline-flex items-center gap-1 font-semibold tk-text-ink2 hover:tk-text-ink py-1 cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>{walletCopy.fillManuallyBtn}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fullscreen High-Contrast Gate QR / Offline PDF / Taxi Driver Spotlight Overlay */}
        {fullscreenSpotlight && activePass && (
          <div className="absolute inset-0 z-50 bg-white flex flex-col justify-between p-5 sm:p-8 overflow-y-auto">
            <div className="flex items-center justify-between gap-4 shrink-0">
              <div className="min-w-0">
                <div className="text-xs font-semibold tk-text-ink2 tabular-nums">
                  {fullscreenSpotlight === 'driver'
                    ? walletCopy.driverSpotlightHeader
                    : `${activePass.title}${
                        activePass.dateTimeLabel ? ` · ${activePass.dateTimeLabel}` : ''
                      }`}
                </div>
                <h3 className="mt-1 text-xl sm:text-2xl font-extrabold tk-text-ink truncate">
                  {activePass.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setFullscreenSpotlight(null)}
                className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl tk-bg-forest px-4 text-xs font-bold text-white cursor-pointer shrink-0"
              >
                <Minimize2 className="h-4 w-4" />
                <span>{walletCopy.exitFullscreenBtn}</span>
              </button>
            </div>

            {fullscreenSpotlight === 'driver' ? (
              <div className="my-auto py-8 space-y-6 max-w-2xl mx-auto w-full text-left">
                <div className="rounded-3xl border-2 tk-bc-forest tk-bg-card p-6 sm:p-8 space-y-4">
                  <div className="text-2xl sm:text-4xl font-extrabold tk-text-ink leading-tight">
                    {activePass.localLanguageTitle || activePass.title}
                  </div>
                  {activePass.localLanguageAddress && (
                    <div className="text-lg sm:text-2xl font-semibold tk-text-ink leading-relaxed pt-2 border-t tk-bc-hair">
                      {activePass.localLanguageAddress}
                    </div>
                  )}
                  {activePass.confirmationCode && (
                    <div className="pt-2 text-sm font-mono tabular-nums tk-text-ink2">
                      {walletCopy.confirmationPrefix}{' '}
                      <strong className="tk-text-ink">{activePass.confirmationCode}</strong>
                    </div>
                  )}
                </div>
              </div>
            ) : isActivePassPdf && activePdfBlobUrl ? (
              <div className="flex-1 my-4 flex flex-col min-h-[65vh]">
                <iframe
                  src={activePdfBlobUrl}
                  title={activePass.title}
                  className="w-full flex-1 min-h-[65vh] rounded-2xl border tk-bc-hair tk-bg-paper"
                />
              </div>
            ) : (
              <div className="my-auto py-6 flex flex-col items-center justify-center text-center space-y-5">
                {activePassDataUrl ? (
                  <img
                    src={activePassDataUrl}
                    alt={activePass.title}
                    referrerPolicy="no-referrer"
                    className="max-h-[60vh] w-auto object-contain rounded-2xl border tk-bc-hair"
                  />
                ) : qrStringForActive ? (
                  <div className="p-6 rounded-3xl border-2 tk-bc-ink bg-white">
                    <QRCodeSVG value={qrStringForActive} size={260} level="M" />
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-center gap-6 text-center tabular-nums">
                  {activePass.confirmationCode && (
                    <div>
                      <div className="text-xs tk-text-ink2">
                        {walletCopy.referenceLabel}
                      </div>
                      <div className="font-mono text-2xl font-extrabold tk-text-forest">
                        {activePass.confirmationCode}
                      </div>
                    </div>
                  )}
                  {activePass.terminalOrPlatform && (
                    <div>
                      <div className="text-xs tk-text-ink2">
                        {walletCopy.terminalLabel}
                      </div>
                      <div className="text-xl font-extrabold tk-text-ink">
                        {activePass.terminalOrPlatform}
                      </div>
                    </div>
                  )}
                  {activePass.seatOrRoom && (
                    <div>
                      <div className="text-xs tk-text-ink2">
                        {walletCopy.seatLabel}
                      </div>
                      <div className="text-xl font-extrabold tk-text-ink">
                        {activePass.seatOrRoom}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="text-center text-xs tk-text-ink2 shrink-0">
              {walletCopy.brightnessTip}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
