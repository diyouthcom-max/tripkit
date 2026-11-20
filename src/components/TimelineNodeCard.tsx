import React, { useState, useRef, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  CheckCircle2,
  Circle,
  Check,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Loader2,
  X,
  GripVertical,
  BellRing,
  Star,
  ChevronRight,
  QrCode,
  Clock,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  AppLanguage,
  ExpenseBucket,
  PaymentAccount,
  SplitMode,
  StopType,
  TimeFormatPref,
  TimelineNode,
} from '../types';
import { formatTimeByPref, normalizeAppLanguage } from '../utils/preferencesHelpers';
import { translateDemoStopTitle, translateDemoTransitNote } from '../i18n';
import {
  getClosingUrgency,
  getStopTypeLabel,
} from '../utils/itineraryHelpers';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';
import { AiVoiceInputButton } from './AiVoiceInputButton';
import { resolveStopTypeIconMeta } from '../utils/accentTheme';
import {
  formatStayDurationLabel,
  resolveDayOpeningHoursLine,
  resolveStopDurationMinutes,
  type LiveGooglePlaceInfo,
} from '../services/googlePlaceLiveStore';
import { getItineraryUtilsCopy } from '../i18n/packs/itineraryUtilsPack';

export interface QuickExpenseLogPayload {
  amountLocal: number;
  bucket: ExpenseBucket;
  account: PaymentAccount;
  split: SplitMode;
  mySharePct?: number;
}

interface TimelineNodeCardProps {
  node: TimelineNode;
  index: number;
  totalInDay: number;
  dayNumber?: number;
  departureDate?: string;
  rainSwapped: boolean;
  currencySymbol: string;
  currencyCode: string;
  cityHint?: string;
  timeFormat?: TimeFormatPref;
  livePlace?: LiveGooglePlaceInfo | null;
  isPlaceLoading?: boolean;
  linkedPassCount?: number;
  isEditing: boolean;
  isSwipedOpen: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  isDragOverlay?: boolean;
  previousOrderIndex?: number;
  dragHandleRef?: (element: HTMLElement | null) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  onSwipeOpenChange: (open: boolean) => void;
  onToggleVisited: () => void;
  onOpenDetail?: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (updates: Partial<TimelineNode>) => void;
  onDelete: () => void;
  onMoveOrder: (direction: 'up' | 'down') => void;
  scheduledLeadMinutes?: number;
}

export const TimelineNodeCard: React.FC<TimelineNodeCardProps> = ({
  node,
  index,
  totalInDay,
  dayNumber = node.day ?? 1,
  departureDate,
  rainSwapped,
  currencySymbol: sym,
  currencyCode,
  cityHint,
  timeFormat = '24h',
  livePlace,
  isPlaceLoading = false,
  linkedPassCount = 0,
  isEditing,
  isSwipedOpen,
  isDragging = false,
  isDragOver = false,
  isDragOverlay = false,
  previousOrderIndex,
  dragHandleRef,
  dragHandleProps,
  onSwipeOpenChange,
  onToggleVisited,
  onOpenDetail,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onMoveOrder,
  scheduledLeadMinutes,
}) => {
  const isSwappedActive = Boolean(rainSwapped && node.isOutdoor && node.rainSwapTitle);
  const displayTitle = isSwappedActive ? node.rainSwapTitle! : node.title;
  const displayDistrict =
    isSwappedActive && node.rainSwapDistrict ? node.rainSwapDistrict : node.district;

  const isVisited = node.visited !== undefined ? node.visited : Boolean(node.logged);
  const { t, i18n } = useTranslation();
  const activeLang: AppLanguage = normalizeAppLanguage(i18n.language, 'en-US');
  const nodeCopy = getItineraryUtilsCopy(activeLang).nodeCard;
  const localizedTitle = translateDemoStopTitle(displayTitle, activeLang);
  const localizedTransitNote = translateDemoTransitNote(node.transitNote, activeLang);
  const urgency = getClosingUrgency(
    node.time,
    node.closeTime,
    activeLang,
    node.stopType,
    displayTitle
  );

  // Storefront thumbnail fallback state
  const [thumbFailed, setThumbFailed] = useState(false);
  useEffect(() => {
    setThumbFailed(false);
  }, [livePlace?.thumbPhotoUri, node.id]);

  const [voiceNoteError, setVoiceNoteError] = useState<string | null>(null);

  // Inline Node Edit state
  const [editTime, setEditTime] = useState(node.time);
  const [editCloseTime, setEditCloseTime] = useState(node.closeTime);
  const [editDurationMinutes, setEditDurationMinutes] = useState<number>(() =>
    resolveStopDurationMinutes(node)
  );
  const [editStopType, setEditStopType] = useState<StopType>(node.stopType || 'attraction');
  const [editTitle, setEditTitle] = useState(node.title);
  const [editDistrict, setEditDistrict] = useState(node.district);
  const [editAddress, setEditAddress] = useState(node.address);
  const [editPlaceId, setEditPlaceId] = useState<string | undefined>(node.placeId);
  const [editLat, setEditLat] = useState<number | undefined>(node.lat);
  const [editLng, setEditLng] = useState<number | undefined>(node.lng);
  const [editEst, setEditEst] = useState(String(node.estLocal));
  const [editTransit, setEditTransit] = useState(node.transitNote);
  const [editIsAnchor, setEditIsAnchor] = useState(Boolean(node.isAnchor));
  const [editIsOutdoor, setEditIsOutdoor] = useState(Boolean(node.isOutdoor));
  const [editRainTitle, setEditRainTitle] = useState(node.rainSwapTitle ?? '');
  const [editRainDistrict, setEditRainDistrict] = useState(node.rainSwapDistrict ?? '');
  const [editRainAddress, setEditRainAddress] = useState(node.rainSwapAddress ?? '');

  // Track pointer press on the dnd-kit drag handle so card whileTap stays still during drag
  const [handlePressed, setHandlePressed] = useState(false);

  // Horizontal swipe gesture state (Touch + Desktop Mouse: Right-swipe = toggle visited, Left-swipe = edit/delete)
  const [dragDeltaX, setDragDeltaX] = useState<number | null>(null);
  const articleRef = useRef<HTMLElement | null>(null);
  const didSwipeRef = useRef(false);
  const swipeGestureRef = useRef<{
    startX: number;
    startY: number;
    baseOffset: number;
    locked: 'h' | 'v' | null;
    pointerId: number | null;
  } | null>(null);

  // Reset handlePressed reliably even if pointerup happens over DragOverlay or outside the button
  useEffect(() => {
    if (!handlePressed) return;
    const clearHandle = () => setHandlePressed(false);
    window.addEventListener('pointerup', clearHandle);
    window.addEventListener('pointercancel', clearHandle);
    return () => {
      window.removeEventListener('pointerup', clearHandle);
      window.removeEventListener('pointercancel', clearHandle);
    };
  }, [handlePressed]);

  // Apply live 1:1 horizontal translation on the foreground article without inline JSX style props
  useEffect(() => {
    const el = articleRef.current;
    if (!el) return;
    if (dragDeltaX !== null) {
      el.style.transform = `translate3d(${dragDeltaX}px, 0, 0)`;
    } else if (isSwipedOpen) {
      el.style.transform = 'translate3d(-132px, 0, 0)';
    } else {
      el.style.transform = 'translate3d(0px, 0, 0)';
    }
  }, [dragDeltaX, isSwipedOpen]);

  // Lightweight Framer Motion tactile scale state (check-in bounce + tap feedback)
  const shouldReduceMotion = useReducedMotion();
  const prevVisitedRef = useRef(isVisited);
  const pointerDownAtRef = useRef(0);
  const [pulseMode, setPulseMode] = useState<'idle' | 'tap' | 'checkin' | 'uncheck'>('idle');

  useEffect(() => {
    if (prevVisitedRef.current === isVisited) return;
    prevVisitedRef.current = isVisited;
    if (shouldReduceMotion || isEditing) return;
    setPulseMode(isVisited ? 'checkin' : 'uncheck');
  }, [isVisited, shouldReduceMotion, isEditing]);

  useEffect(() => {
    if (pulseMode === 'idle') return;
    const durationMs = pulseMode === 'checkin' ? 380 : 240;
    const timer = window.setTimeout(() => {
      setPulseMode('idle');
    }, durationMs);
    return () => window.clearTimeout(timer);
  }, [pulseMode]);

  const syncEditForm = () => {
    setEditTime(node.time);
    setEditCloseTime(node.closeTime);
    setEditDurationMinutes(resolveStopDurationMinutes(node));
    setEditStopType(node.stopType || 'attraction');
    setEditTitle(node.title);
    setEditDistrict(node.district);
    setEditAddress(node.address);
    setEditPlaceId(node.placeId);
    setEditLat(node.lat);
    setEditLng(node.lng);
    setEditEst(String(node.estLocal));
    setEditTransit(node.transitNote);
    setEditIsAnchor(Boolean(node.isAnchor));
    setEditIsOutdoor(Boolean(node.isOutdoor));
    setEditRainTitle(node.rainSwapTitle ?? '');
    setEditRainDistrict(node.rainSwapDistrict ?? '');
    setEditRainAddress(node.rainSwapAddress ?? '');
  };

  const handleBeginEdit = () => {
    syncEditForm();
    onSwipeOpenChange(false);
    onStartEdit();
  };

  const clampSwipeOffset = (rawOffset: number): number => {
    if (rawOffset < -132) {
      return -132 - (Math.abs(rawOffset + 132) * 0.22);
    }
    if (rawOffset > 88) {
      return 88 + (rawOffset - 88) * 0.22;
    }
    return rawOffset;
  };

  const beginSwipeGesture = (
    clientX: number,
    clientY: number,
    target: HTMLElement | null,
    pointerId: number | null
  ) => {
    if (isEditing || isDragging || isDragOverlay) return;
    if (
      target?.closest(
        '[data-drag-handle="true"], [data-checkin-trigger="true"], input, select, textarea'
      )
    ) {
      return;
    }
    didSwipeRef.current = false;
    swipeGestureRef.current = {
      startX: clientX,
      startY: clientY,
      baseOffset: isSwipedOpen ? -132 : 0,
      locked: null,
      pointerId,
    };
  };

  const moveSwipeGesture = (clientX: number, clientY: number) => {
    const st = swipeGestureRef.current;
    if (!st) return;
    const dx = clientX - st.startX;
    const dy = clientY - st.startY;

    if (!st.locked) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        st.locked = 'h';
        didSwipeRef.current = true;
      } else if (Math.abs(dy) > 10) {
        st.locked = 'v';
        return;
      } else {
        return;
      }
    }

    if (st.locked === 'h') {
      didSwipeRef.current = true;
      const nextOffset = clampSwipeOffset(st.baseOffset + dx);
      setDragDeltaX(Math.round(nextOffset));
    }
  };

  const finishSwipeGesture = () => {
    const st = swipeGestureRef.current;
    swipeGestureRef.current = null;
    const finalOffset = dragDeltaX;
    setDragDeltaX(null);
    if (!st || st.locked !== 'h' || finalOffset === null) return;

    if (isSwipedOpen) {
      if (finalOffset > -92) {
        onSwipeOpenChange(false);
      }
      return;
    }

    if (finalOffset >= 54) {
      onToggleVisited();
    } else if (finalOffset <= -48) {
      onSwipeOpenChange(true);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const tTouch = e.touches[0];
    beginSwipeGesture(
      tTouch.clientX,
      tTouch.clientY,
      e.target as HTMLElement | null,
      null
    );
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const tTouch = e.touches[0];
    moveSwipeGesture(tTouch.clientX, tTouch.clientY);
  };

  const handleTouchEnd = () => {
    finishSwipeGesture();
  };

  const handleSwipePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    beginSwipeGesture(
      e.clientX,
      e.clientY,
      e.target as HTMLElement | null,
      e.pointerId
    );
  };

  const handleSwipePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'touch') return;
    const st = swipeGestureRef.current;
    if (!st || st.pointerId !== e.pointerId) return;
    const wasUnlocked = st.locked === null;
    moveSwipeGesture(e.clientX, e.clientY);
    if (wasUnlocked && st.locked === 'h') {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture is unavailable
      }
    }
  };

  const handleSwipePointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'touch') return;
    const st = swipeGestureRef.current;
    if (!st || st.pointerId !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
    }
    finishSwipeGesture();
  };

  const handleSwipePointerLeave = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'touch') return;
    const st = swipeGestureRef.current;
    if (!st || st.pointerId !== e.pointerId) return;
    if (st.locked !== 'h') {
      swipeGestureRef.current = null;
    }
  };

  const handleArticleClickCapture = (e: React.MouseEvent<HTMLElement>) => {
    if (didSwipeRef.current) {
      e.preventDefault();
      e.stopPropagation();
      didSwipeRef.current = false;
    }
  };

  if (isEditing) {
    const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editTitle.trim()) return;
      const titleChanged = editTitle.trim() !== node.title.trim();
      onSaveEdit({
        time: editTime.trim() || '10:00',
        closeTime: editCloseTime.trim() || '20:00',
        durationMinutes: editDurationMinutes,
        stopType: editStopType,
        title: editTitle.trim(),
        district: editDistrict.trim() || nodeCopy.defaultDistrict,
        address: editAddress.trim() || editTitle.trim(),
        placeId: editPlaceId ?? (titleChanged ? undefined : node.placeId),
        lat: editLat ?? (titleChanged ? undefined : node.lat),
        lng: editLng ?? (titleChanged ? undefined : node.lng),
        estLocal: Math.max(0, parseFloat(editEst) || 0),
        transitNote:
          editTransit.trim() || nodeCopy.defaultTransitNote,
        isAnchor: editIsAnchor,
        isOutdoor: editIsOutdoor,
        rainSwapTitle: editIsOutdoor && editRainTitle.trim() ? editRainTitle.trim() : undefined,
        rainSwapDistrict:
          editIsOutdoor && editRainDistrict.trim() ? editRainDistrict.trim() : undefined,
        rainSwapAddress:
          editIsOutdoor && editRainAddress.trim() ? editRainAddress.trim() : undefined,
      });
    };

    return (
      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-[#078C88] bg-[#FAFDFC] p-4 sm:p-5 space-y-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#076E6A]">
            {nodeCopy.editStopTitle}
          </span>
          <button
            type="button"
            onClick={onCancelEdit}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#647B78] hover:text-[#152B29] cursor-pointer"
          >
            <X className="h-3.5 w-3.5" /> {nodeCopy.cancel}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-[#5B7370] mb-1">
              {nodeCopy.arrivalLabel}
            </label>
            <input
              type="time"
              value={editTime}
              onChange={(e) => setEditTime(e.target.value)}
              className="w-full rounded-xl border border-[#DCE8E5] bg-white px-2.5 py-1.5 font-num text-xs font-bold text-[#152B29] tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#5B7370] mb-1">
              {nodeCopy.stayDurationLabel}
            </label>
            <select
              value={editDurationMinutes}
              onChange={(e) => setEditDurationMinutes(Number(e.target.value) || 60)}
              className="w-full rounded-xl border border-[#DCE8E5] bg-white px-2 py-1.5 font-num text-xs font-semibold text-[#152B29] tabular-nums"
            >
              {[30, 45, 60, 90, 120, 180, 240].map((m) => (
                <option key={m} value={m}>
                  {formatStayDurationLabel(m, activeLang)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#5B7370] mb-1">
              {nodeCopy.closesAtLabel}
            </label>
            <input
              type="time"
              value={editCloseTime}
              onChange={(e) => setEditCloseTime(e.target.value)}
              className="w-full rounded-xl border border-[#DCE8E5] bg-white px-2.5 py-1.5 font-num text-xs font-bold text-[#152B29] tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#5B7370] mb-1">
              {nodeCopy.stopTypeLabel}
            </label>
            <select
              value={editStopType}
              onChange={(e) => setEditStopType(e.target.value as StopType)}
              className="w-full rounded-xl border border-[#DCE8E5] bg-white px-2 py-1.5 text-xs font-semibold text-[#152B29]"
            >
              <option value="attraction">{getStopTypeLabel('attraction', activeLang)}</option>
              <option value="hotel">{getStopTypeLabel('hotel', activeLang)}</option>
              <option value="transit">{getStopTypeLabel('transit', activeLang)}</option>
              <option value="dining">{getStopTypeLabel('dining', activeLang)}</option>
              <option value="shopping">{getStopTypeLabel('shopping', activeLang)}</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold text-[#5B7370] mb-1">
              {nodeCopy.estSpendLabel(currencyCode)}
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={editEst}
              onChange={(e) => setEditEst(e.target.value)}
              className="w-full rounded-xl border border-[#DCE8E5] bg-white px-3 py-1.5 font-num text-xs font-bold text-[#152B29] tabular-nums"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-start">
          <PlaceAutocompleteInput
            value={editTitle}
            onChange={(val) => {
              setEditTitle(val);
              setEditPlaceId(undefined);
            }}
            cityHint={cityHint || node.city}
            showExternalLookupLink
            onSelectPlace={(place) => {
              setEditTitle(place.name);
              if (place.formattedAddress) setEditAddress(place.formattedAddress);
              if (place.district) setEditDistrict(place.district);
              if (place.placeId) setEditPlaceId(place.placeId);
              if (place.location) {
                setEditLat(place.location.lat);
                setEditLng(place.location.lng);
              }
            }}
            placeholder={nodeCopy.stopNamePlaceholder}
            className="w-full rounded-xl border border-[#DCE8E5] bg-white px-3 py-2 text-sm font-semibold text-[#152B29] focus:border-[#0ABAB5] focus:outline-none"
          />
          <input
            type="text"
            value={editDistrict}
            onChange={(e) => setEditDistrict(e.target.value)}
            placeholder={nodeCopy.districtPlaceholder}
            className="rounded-xl border border-[#DCE8E5] bg-white px-3 py-2 text-xs text-[#152B29] focus:border-[#0ABAB5] focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="text"
            value={editAddress}
            onChange={(e) => setEditAddress(e.target.value)}
            placeholder={nodeCopy.streetAddressPlaceholder}
            className="rounded-xl border border-[#DCE8E5] bg-white px-3 py-2 text-xs text-[#152B29] focus:border-[#0ABAB5] focus:outline-none"
          />
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={editTransit}
                onChange={(e) => setEditTransit(e.target.value)}
                placeholder={nodeCopy.transitNotePlaceholder}
                className="flex-1 min-w-0 rounded-xl border border-[#DCE8E5] bg-white px-3 py-2 text-xs text-[#152B29] focus:border-[#0ABAB5] focus:outline-none"
              />
              <AiVoiceInputButton
                compact
                contextHint="itinerary"
                label={t('voice.startLabel')}
                onInterimTranscript={(live) => {
                  setVoiceNoteError(null);
                  setEditTransit(live);
                }}
                onTranscript={(finalText) => {
                  const cleaned = finalText.trim();
                  if (cleaned) {
                    setVoiceNoteError(null);
                    setEditTransit(cleaned);
                  }
                }}
                onError={(msg) => setVoiceNoteError(msg || null)}
              />
            </div>
            {voiceNoteError && (
              <p className="text-[11px] font-semibold text-[#B96A39]">{voiceNoteError}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <label className="inline-flex items-center gap-1.5 font-semibold text-[#3B5552] cursor-pointer">
            <input
              type="checkbox"
              checked={editIsAnchor}
              onChange={(e) => setEditIsAnchor(e.target.checked)}
              className="rounded border-[#DCE8E5] accent-[#078C88]"
            />
            {nodeCopy.meetupAnchorCheckbox}
          </label>
          <label className="inline-flex items-center gap-1.5 font-semibold text-[#3B5552] cursor-pointer">
            <input
              type="checkbox"
              checked={editIsOutdoor}
              onChange={(e) => setEditIsOutdoor(e.target.checked)}
              className="rounded border-[#DCE8E5] accent-[#078C88]"
            />
            {nodeCopy.outdoorStopCheckbox}
          </label>
        </div>

        {editIsOutdoor && (
          <div className="pt-2 border-t border-[#E5EFED] grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              value={editRainTitle}
              onChange={(e) => setEditRainTitle(e.target.value)}
              placeholder={nodeCopy.rainTitlePlaceholder}
              className="rounded-xl border border-[#DCE8E5] bg-white px-2.5 py-1.5 text-xs text-[#152B29]"
            />
            <input
              type="text"
              value={editRainDistrict}
              onChange={(e) => setEditRainDistrict(e.target.value)}
              placeholder={nodeCopy.rainDistrictPlaceholder}
              className="rounded-xl border border-[#DCE8E5] bg-white px-2.5 py-1.5 text-xs text-[#152B29]"
            />
            <input
              type="text"
              value={editRainAddress}
              onChange={(e) => setEditRainAddress(e.target.value)}
              placeholder={nodeCopy.rainAddressPlaceholder}
              className="rounded-xl border border-[#DCE8E5] bg-white px-2.5 py-1.5 text-xs text-[#152B29]"
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1 rounded-xl border border-[#F0CECA] bg-white px-3 py-1.5 text-xs font-semibold text-[#B83B2E] hover:bg-[#FDF3F2] cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" /> {nodeCopy.deleteStop}
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-xl bg-[#078C88] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#067572] cursor-pointer"
          >
            <Check className="h-3.5 w-3.5" /> {nodeCopy.saveChanges}
          </button>
        </div>
      </form>
    );
  }

  const stopIconMeta = resolveStopTypeIconMeta(node.stopType, isSwappedActive);
  const StopCategoryIcon = stopIconMeta.Icon;
  const stayDurationMin = resolveStopDurationMinutes(node);
  const stayDurationLabel = formatStayDurationLabel(stayDurationMin, activeLang);
  const todayHoursLine = resolveDayOpeningHoursLine(
    livePlace?.weekdayDescriptions,
    departureDate,
    dayNumber,
    activeLang
  );
  const hasRealGoogleRating = typeof livePlace?.rating === 'number' && livePlace.rating > 0;
  const showThumbImage = Boolean(livePlace?.thumbPhotoUri && !thumbFailed);

  return (
    <div data-timeline-index={index}>
      <motion.div
        initial={false}
        onPointerDown={() => {
          pointerDownAtRef.current = performance.now();
        }}
        animate={{
          scale: shouldReduceMotion
            ? 1
            : isDragOverlay
            ? 1.012
            : pulseMode === 'checkin'
            ? [1, 0.984, 1.014, 1]
            : pulseMode === 'uncheck'
            ? [1, 0.988, 1]
            : pulseMode === 'tap'
            ? [1, 0.991, 1]
            : 1,
        }}
        whileTap={
          !shouldReduceMotion &&
          !isDragging &&
          !isDragOverlay &&
          !handlePressed &&
          !isSwipedOpen &&
          dragDeltaX === null
            ? { scale: 0.991 }
            : undefined
        }
        transition={
          pulseMode === 'checkin'
            ? { duration: 0.36, times: [0, 0.28, 0.68, 1], ease: [0.22, 1, 0.36, 1] }
            : pulseMode === 'uncheck' || pulseMode === 'tap'
            ? { duration: 0.22, times: [0, 0.45, 1], ease: [0.22, 1, 0.36, 1] }
            : { type: 'spring', stiffness: 520, damping: 32, mass: 0.6 }
        }
        className={`relative rounded-2xl border bg-white overflow-hidden select-none transition-[border-color,box-shadow,opacity,background-color] duration-200 ${
          isDragOverlay
            ? 'border-[#078C88] shadow-[0_18px_38px_-12px_rgba(7,140,136,0.34)] ring-2 ring-[#0ABAB5]/60 cursor-grabbing'
            : isDragging
            ? 'opacity-35 border-dashed border-[#078C88] bg-[#EFF9F8]/40'
            : isDragOver
            ? 'border-[#078C88] ring-2 ring-[#078C88]/60 bg-[#EFF9F8]/20'
            : pulseMode === 'checkin'
            ? 'border-[#0ABAB5] shadow-[0_8px_22px_-10px_rgba(7,140,136,0.34)]'
            : 'border-[#DCE8E5] hover:border-[#BBDAD7]'
        }`}
      >
        {/* Left-side Swipe Reveal Cue (Right-Swipe = Toggle Visited) */}
        <div
          className={`absolute inset-y-0 left-0 w-24 bg-[#EFF9F8] text-[#076E6A] text-xs font-bold flex items-center justify-center gap-1 transition-opacity ${
            dragDeltaX !== null && dragDeltaX > 10 ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          aria-hidden="true"
        >
          <CheckCircle2 className="h-4 w-4 text-[#078C88] shrink-0" />
          <span>{isVisited ? nodeCopy.swipeUndo : nodeCopy.swipeDone}</span>
        </div>

        {/* Right-side Swipe Action Tray (Left-Swipe = Edit / Delete) */}
        <div
          className={`absolute inset-y-0 right-0 w-[132px] flex items-stretch transition-opacity ${
            isSwipedOpen || (dragDeltaX !== null && dragDeltaX < -10)
              ? 'opacity-100'
              : 'opacity-0 pointer-events-none'
          }`}
          aria-hidden={!isSwipedOpen && dragDeltaX === null}
        >
          <button
            type="button"
            onClick={handleBeginEdit}
            className="w-[66px] bg-[#078C88] hover:bg-[#067572] text-white text-xs font-semibold flex flex-col items-center justify-center gap-1 cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>{nodeCopy.swipeEdit}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onSwipeOpenChange(false);
              onDelete();
            }}
            className="w-[66px] bg-[#B83B2E] hover:bg-[#9E3126] text-white text-xs font-semibold flex flex-col items-center justify-center gap-1 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{nodeCopy.swipeDelete}</span>
          </button>
        </div>

        {/* Foreground Node Content: Packy-Style Left Storefront Visual + Right Execution Details */}
        <article
          ref={articleRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onPointerDown={handleSwipePointerDown}
          onPointerMove={handleSwipePointerMove}
          onPointerUp={handleSwipePointerUp}
          onPointerCancel={handleSwipePointerUp}
          onPointerLeave={handleSwipePointerLeave}
          onClickCapture={handleArticleClickCapture}
          onClick={(e) => {
            if (isSwipedOpen) {
              onSwipeOpenChange(false);
              return;
            }
            if (isDragging || isDragOverlay || handlePressed) {
              return;
            }
            const target = e.target as HTMLElement | null;
            if (
              target?.closest(
                'input, select, textarea, button, a, [data-checkin-trigger="true"], [data-drag-handle="true"]'
              )
            ) {
              return;
            }
            if (onOpenDetail) {
              onOpenDetail();
              return;
            }
            if (!shouldReduceMotion) {
              const heldMs = performance.now() - pointerDownAtRef.current;
              if (heldMs < 90 && pulseMode === 'idle') {
                setPulseMode('tap');
              }
            }
          }}
          className={`relative bg-white p-3.5 sm:p-4 flex gap-3.5 sm:gap-4 touch-pan-y ${
            dragDeltaX !== null ? 'transition-none' : 'transition-transform duration-200 ease-out'
          } ${onOpenDetail ? 'cursor-pointer' : ''}`}
        >
          {/* Left Storefront Visual Thumbnail + Numbered Order Badge */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail?.();
            }}
            title={nodeCopy.thumbTitle}
            className="relative w-24 h-28 sm:w-32 sm:h-34 rounded-xl overflow-hidden shrink-0 bg-[#143734] group text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078C88]"
          >
            {showThumbImage ? (
              <img
                src={livePlace!.thumbPhotoUri}
                alt={localizedTitle}
                loading="lazy"
                draggable={false}
                referrerPolicy="no-referrer"
                onError={() => setThumbFailed(true)}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-[#153936] via-[#1C4D49] to-[#102927] flex flex-col items-center justify-center p-2 text-center">
                {isPlaceLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-[#7DE2DC] mb-1.5" />
                ) : (
                  <StopCategoryIcon className="h-6 w-6 text-[#7DE2DC] mb-1.5" />
                )}
                <span className="text-[10px] font-semibold text-white/85 line-clamp-2 leading-tight">
                  {getStopTypeLabel(node.stopType, activeLang) || displayDistrict}
                </span>
              </div>
            )}

            {/* Subtle top scrim for crisp badge contrast */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-11 bg-gradient-to-b from-black/40 to-transparent" />

            {/* Top-left numbered order badge (Packy-inspired warm gold / visited teal) */}
            <span
              className={`absolute top-2 left-2 h-6 min-w-[24px] px-1.5 rounded-full flex items-center justify-center font-num text-xs font-extrabold text-white ring-2 ring-white shadow-xs tabular-nums ${
                isVisited ? 'bg-[#078C88]' : 'bg-[#D99B26]'
              }`}
            >
              {index + 1}
            </span>

            {isVisited && (
              <span className="absolute bottom-1.5 left-1.5 right-1.5 rounded-md bg-[#078C88]/90 backdrop-blur-xs px-1.5 py-0.5 text-[10px] font-bold text-white text-center truncate">
                {nodeCopy.visitedBadge}
              </span>
            )}
          </button>

          {/* Right Stop Content Column */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              {/* Row 1: Drag Handle + Check-in + Arrival Time + Desktop Controls */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  {totalInDay > 1 && (
                    <button
                      ref={dragHandleRef}
                      type="button"
                      data-drag-handle="true"
                      aria-label={nodeCopy.dragAria(index + 1)}
                      title={nodeCopy.dragTitle}
                      {...dragHandleProps}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setHandlePressed(true);
                        dragHandleProps?.onPointerDown?.(e);
                      }}
                      onPointerUp={(e) => {
                        setHandlePressed(false);
                        dragHandleProps?.onPointerUp?.(e);
                      }}
                      onPointerCancel={(e) => {
                        setHandlePressed(false);
                        dragHandleProps?.onPointerCancel?.(e);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={`inline-flex h-7 w-7 -ml-1.5 -my-1 items-center justify-center rounded-lg transition-colors touch-none shrink-0 ${
                        isDragOverlay
                          ? 'bg-[#EFF9F8] text-[#078C88] cursor-grabbing'
                          : 'text-[#7B928E] hover:bg-[#EFF9F8] hover:text-[#078C88] active:bg-[#EFF9F8] active:text-[#078C88] cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078C88]'
                      }`}
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                  )}

                  <motion.button
                    type="button"
                    data-checkin-trigger="true"
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.84 }}
                    transition={{ type: 'spring', stiffness: 560, damping: 24 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisited();
                    }}
                    title={
                      isVisited
                        ? nodeCopy.visitedUndoTitle
                        : nodeCopy.markVisitedTitle
                    }
                    className="text-[#078C88] hover:opacity-80 cursor-pointer shrink-0 inline-flex items-center justify-center"
                  >
                    <motion.span
                      initial={false}
                      animate={
                        !shouldReduceMotion && pulseMode === 'checkin'
                          ? { scale: [0.75, 1.22, 1] }
                          : { scale: 1 }
                      }
                      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                      className="inline-flex"
                    >
                      {isVisited ? (
                        <CheckCircle2 className="h-4 w-4 text-[#078C88]" />
                      ) : (
                        <Circle className="h-4 w-4 text-[#9DB3AF]" />
                      )}
                    </motion.span>
                  </motion.button>

                  <span
                    className={`font-num text-xs sm:text-sm font-bold tabular-nums ${
                      isVisited ? 'text-[#5B7370]' : 'text-[#4F6865]'
                    }`}
                  >
                    {formatTimeByPref(node.time, timeFormat)}
                  </span>

                  {previousOrderIndex !== undefined && previousOrderIndex !== index && (
                    <span className="text-[11px] font-semibold text-[#D97E4A] tabular-nums">
                      {nodeCopy.wasOrder(previousOrderIndex + 1)}
                    </span>
                  )}

                  {isSwappedActive && (
                    <span className="text-[11px] font-semibold text-[#8E6F12]">
                      {nodeCopy.rainBackupBadge}
                    </span>
                  )}

                  {!isVisited && Boolean(scheduledLeadMinutes) && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#076E6A] tabular-nums">
                      <BellRing className="h-3 w-3 text-[#078C88]" />
                      <span>-{scheduledLeadMinutes}m</span>
                    </span>
                  )}
                </div>

                {/* Top-right Controls */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <div className="hidden sm:inline-flex items-center gap-0.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => onMoveOrder('up')}
                      title={nodeCopy.moveUp}
                      className="h-7 w-7 rounded-lg text-[#647B78] hover:bg-[#F2F6F5] hover:text-[#152B29] disabled:opacity-30 flex items-center justify-center cursor-pointer"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index >= totalInDay - 1}
                      onClick={() => onMoveOrder('down')}
                      title={nodeCopy.moveDown}
                      className="h-7 w-7 rounded-lg text-[#647B78] hover:bg-[#F2F6F5] hover:text-[#152B29] disabled:opacity-30 flex items-center justify-center cursor-pointer"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleBeginEdit}
                      title={nodeCopy.editStop}
                      className="h-7 w-7 rounded-lg text-[#647B78] hover:bg-[#EFF9F8] hover:text-[#078C88] flex items-center justify-center cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={onDelete}
                      title={nodeCopy.deleteStopTip}
                      className="h-7 w-7 rounded-lg text-[#647B78] hover:bg-[#FDF3F2] hover:text-[#B83B2E] flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {onOpenDetail && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDetail();
                      }}
                      className="inline-flex items-center gap-0.5 rounded-lg px-2 py-1 text-xs font-semibold text-[#078C88] hover:bg-[#EFF9F8] whitespace-nowrap cursor-pointer"
                    >
                      <span>{nodeCopy.details}</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Row 2: Clickable Stop Title */}
              <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDetail?.();
                  }}
                  className={`text-left text-base sm:text-lg font-extrabold tracking-tight hover:text-[#078C88] transition-colors cursor-pointer ${
                    isVisited ? 'text-[#4F6865]' : 'text-[#152B29]'
                  }`}
                >
                  {localizedTitle}
                </button>
                {node.isAnchor && (
                  <span className="text-[11px] font-semibold text-[#078C88]">
                    {nodeCopy.meetupAnchorBadge}
                  </span>
                )}
              </div>

              {/* Row 3: Packy-Style Clean Unboxed Metadata (Strictly Real Google Rating when Available) */}
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-[13px] text-[#4F6865]">
                {hasRealGoogleRating ? (
                  <>
                    <span className="inline-flex items-center gap-1 font-num font-bold text-[#152B29] tabular-nums">
                      <Star className="h-3.5 w-3.5 fill-[#D99B26] text-[#D99B26] shrink-0" />
                      {livePlace!.rating!.toFixed(1)}
                      {livePlace?.userRatingCount ? (
                        <span className="font-normal text-[#647B78] text-xs">
                          ({livePlace.userRatingCount.toLocaleString()})
                        </span>
                      ) : null}
                    </span>
                    <span aria-hidden="true" className="text-[#CBDAD7]">
                      ·
                    </span>
                  </>
                ) : getStopTypeLabel(node.stopType, activeLang) ? (
                  <>
                    <span className="font-semibold text-[#078C88]">
                      {getStopTypeLabel(node.stopType, activeLang)}
                    </span>
                    <span aria-hidden="true" className="text-[#CBDAD7]">
                      ·
                    </span>
                  </>
                ) : null}

                <span className="font-num font-medium text-[#2C3A38] tabular-nums">
                  {stayDurationLabel}
                </span>

                <span aria-hidden="true" className="text-[#CBDAD7]">
                  ·
                </span>

                {node.logged ? (
                  <span className="font-num font-semibold text-[#076E6A] tabular-nums">
                    {nodeCopy.loggedAmount(sym, node.estLocal.toFixed(0))}
                  </span>
                ) : node.estLocal === 0 ? (
                  <span className="font-semibold text-[#2C3A38]">
                    {nodeCopy.freeEntry}
                  </span>
                ) : (
                  <span className="font-num tabular-nums text-[#4F6865]">
                    {nodeCopy.estAmount(sym, node.estLocal.toFixed(0))}
                  </span>
                )}

                {displayDistrict && (
                  <>
                    <span aria-hidden="true" className="text-[#CBDAD7]">
                      ·
                    </span>
                    <span className="text-[#5B7370]">{displayDistrict}</span>
                  </>
                )}

                {linkedPassCount > 0 && (
                  <>
                    <span aria-hidden="true" className="text-[#CBDAD7]">
                      ·
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDetail?.();
                      }}
                      className="inline-flex items-center gap-1 font-semibold text-[#076E6A] hover:underline cursor-pointer"
                    >
                      <QrCode className="h-3 w-3 text-[#078C88]" />
                      <span>
                        {nodeCopy.ticketsCount(linkedPassCount)}
                      </span>
                    </button>
                  </>
                )}
              </div>

              {/* Row 4: Clean Opening Hours + One-Line Stop / Transit Summary (Zero Button Bloat) */}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#647B78]">
                <span className="inline-flex items-center gap-1 font-num tabular-nums">
                  <Clock className="h-3 w-3 text-[#7B928E] shrink-0" />
                  {todayHoursLine
                    ? todayHoursLine
                    : `${nodeCopy.closesPrefix}${formatTimeByPref(
                        node.closeTime,
                        timeFormat
                      )}`}
                </span>
              </div>

              {(node.stopNote || localizedTransitNote) && (
                <p className="mt-1 text-xs text-[#4F6865] leading-relaxed line-clamp-1">
                  {node.stopNote ? (
                    <span className="font-medium text-[#152B29]">{node.stopNote}</span>
                  ) : (
                    localizedTransitNote
                  )}
                </p>
              )}

              {!isVisited && urgency.status !== 'ok' && (
                <p
                  className={`mt-1.5 inline-flex items-center gap-1 text-xs font-semibold ${
                    urgency.status === 'conflict' ? 'text-[#B83B2E]' : 'text-[#B96A39]'
                  }`}
                >
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {nodeCopy.urgencyAdvice(urgency.label)}
                  </span>
                </p>
              )}
            </div>
          </div>
        </article>
      </motion.div>
    </div>
  );
};
