import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ImagePlus,
  Loader2,
  MoveVertical,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  compressCoverImageFile,
  deleteCustomTripCover,
  saveCustomTripCover,
} from '../utils/coverImageVault';
import {
  COVER_PRESETS,
  COVER_TONES,
  resolveAutoCoverPresetId,
} from '../utils/tripCoverHelpers';
import { getTripCoverCopy } from '../i18n/packs/utilsAndModalsPack';
import type {
  AppLanguage,
  CoverPresetId,
  CoverToneId,
  TripCoverConfig,
  TripSetup,
} from '../types';

interface TripCoverModalProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  destinationTitle: string;
  subtitlePreview: string;
  setup: TripSetup;
  coverConfig?: TripCoverConfig;
  customCoverDataUrl: string | null;
  language: AppLanguage;
  onSaveCover: (nextConfig: TripCoverConfig, nextCustomDataUrl: string | null) => void;
  onToast: (msg: string) => void;
}

export const TripCoverModal: React.FC<TripCoverModalProps> = ({
  open,
  onClose,
  tripId,
  destinationTitle,
  subtitlePreview,
  setup,
  coverConfig,
  customCoverDataUrl,
  language,
  onSaveCover,
  onToast,
}) => {
  const copy = getTripCoverCopy(language);
  const autoPresetId = resolveAutoCoverPresetId(setup.cities, setup.tripStyle);

  const [mode, setMode] = useState<TripCoverConfig['mode']>('auto');
  const [selectedPresetId, setSelectedPresetId] = useState<CoverPresetId>(autoPresetId);
  const [focusY, setFocusY] = useState<number>(48);
  const [tone, setTone] = useState<CoverToneId>('natural');
  const [draftCustomUrl, setDraftCustomUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggingFocus, setDraggingFocus] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragStartRef = useRef<{ startY: number; startFocusY: number } | null>(null);
  const previewBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const initialMode = coverConfig?.mode ?? 'auto';
    const initialPreset = coverConfig?.presetId ?? autoPresetId;
    const presetMeta =
      COVER_PRESETS.find((p) => p.id === initialPreset) || COVER_PRESETS[0];
    setMode(initialMode === 'custom' && !customCoverDataUrl ? 'auto' : initialMode);
    setSelectedPresetId(initialPreset);
    setFocusY(
      typeof coverConfig?.focusY === 'number'
        ? Math.max(0, Math.min(100, Math.round(coverConfig.focusY)))
        : presetMeta.defaultFocusY
    );
    setTone(coverConfig?.tone ?? 'natural');
    setDraftCustomUrl(customCoverDataUrl);
  }, [open, coverConfig, customCoverDataUrl, autoPresetId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const effectivePresetId = mode === 'auto' ? autoPresetId : selectedPresetId;
  const activePresetMeta =
    COVER_PRESETS.find((p) => p.id === effectivePresetId) || COVER_PRESETS[0];
  const activeToneMeta = COVER_TONES.find((t) => t.id === tone) || COVER_TONES[0];
  const previewImgUrl =
    mode === 'custom' && draftCustomUrl ? draftCustomUrl : activePresetMeta.imageUrl;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onToast(copy.invalidImageToast);
      return;
    }
    setUploading(true);
    try {
      const compressed = await compressCoverImageFile(file, 1600, 1000, 0.85);
      setDraftCustomUrl(compressed);
      setMode('custom');
      setFocusY(50);
    } catch {
      onToast(copy.processFailedToast);
    } finally {
      setUploading(false);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStartRef.current = {
      startY: e.clientY,
      startFocusY: focusY,
    };
    setDraggingFocus(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current || !previewBoxRef.current) return;
    const boxHeight = Math.max(120, previewBoxRef.current.clientHeight);
    const deltaY = e.clientY - dragStartRef.current.startY;
    // Dragging image downward reveals higher part of photo -> decreases focusY
    const nextFocus = Math.max(
      0,
      Math.min(100, Math.round(dragStartRef.current.startFocusY - (deltaY / boxHeight) * 100))
    );
    setFocusY(nextFocus);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    dragStartRef.current = null;
    setDraggingFocus(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if capture already released
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let nextCustomUrl: string | null = draftCustomUrl;
      if (mode === 'custom' && draftCustomUrl) {
        await saveCustomTripCover(tripId, draftCustomUrl);
      } else if (!draftCustomUrl) {
        await deleteCustomTripCover(tripId);
        nextCustomUrl = null;
      }

      const nextCfg: TripCoverConfig = {
        mode: mode === 'custom' && !nextCustomUrl ? 'auto' : mode,
        presetId: mode === 'preset' ? selectedPresetId : autoPresetId,
        focusY,
        tone,
        updatedAt: Date.now(),
      };
      onSaveCover(nextCfg, mode === 'custom' ? nextCustomUrl : draftCustomUrl);
      onClose();
      onToast(copy.coverUpdatedToast);
    } catch {
      onToast(copy.saveFailedToast);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCustomPhoto = async () => {
    await deleteCustomTripCover(tripId);
    setDraftCustomUrl(null);
    setMode('auto');
    setFocusY(
      (COVER_PRESETS.find((p) => p.id === autoPresetId) || COVER_PRESETS[0]).defaultFocusY
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center tk-bg-ink/55 p-0 sm:p-4 [font-family:'Inter_Variable',Inter,system-ui,'PingFang_SC',sans-serif] [--font-serif:'Playfair_Display',Georgia,'Songti_SC',serif]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={copy.dialogAria}
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-white tk-text-ink tk-elev-soft overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile grab handle */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
          <span className="h-1.5 w-10 rounded-full tk-bg-forest-plate" />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 sm:pt-4 pb-3 border-b tk-bc-hair flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-serif font-extrabold tracking-tight tk-text-ink">
              {copy.modalTitle}
            </h2>
            <p className="text-sm tk-text-ink2 mt-0.5">
              {copy.modalSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.closeAria}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[16px] border tk-bc-hair tk-bg-paper tk-text-ink2 hover:tk-text-ink transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto px-5 py-4 space-y-5">
          {/* Live Interactive Cover Preview + Drag Focal Point */}
          <div>
            <div
              ref={previewBoxRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`relative h-40 sm:h-44 w-full rounded-[20px] overflow-hidden select-none touch-none shadow-sm ring-1 ring-black/10 ${
 draggingFocus ? 'cursor-grabbing' : 'cursor-grab'
 }`}
            >
              <img
                src={previewImgUrl}
                alt={destinationTitle}
                draggable={false}
                style={{
                  objectPosition: `50% ${focusY}%`,
                  filter: activeToneMeta.filterCss,
                }}
                className="h-full w-full object-cover transition-[filter] duration-200"
              />
              {activeToneMeta.scrimExtraClass && (
                <div className={`absolute inset-0 pointer-events-none ${activeToneMeta.scrimExtraClass}`} />
              )}
              <div className="absolute inset-x-0 top-0 h-14 tk-grad-cover-scrim pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-24 tk-grad-cover-scrim pointer-events-none" />

              {/* Drag Hint Badge */}
              <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-[16px] tk-bg-overlay border border-white/20 px-2.5 py-1 text-[13px] font-semibold text-white pointer-events-none">
                <MoveVertical className="h-3 w-3 tk-text-card" />
                <span>
                  {draggingFocus
                    ? copy.framingPct(focusY)
                    : copy.dragRepositionHint}
                </span>
              </div>

              {focusY !== 50 && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setFocusY(50)}
                  className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-[16px] tk-bg-overlay hover:tk-bg-ink/55 border border-white/20 px-2 py-1 text-[13px] font-semibold text-white cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>{copy.centerBtn}</span>
                </button>
              )}

              {/* Bottom Overlaid Title Preview */}
              <div className="absolute inset-x-3.5 bottom-3 pointer-events-none">
                <div className="text-lg sm:text-xl font-serif font-extrabold tracking-tight text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)] truncate">
                  {destinationTitle}
                </div>
                <div className="mt-0.5 text-[13px] font-medium text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.45)] truncate">
                  {subtitlePreview}
                </div>
              </div>
            </div>
          </div>

          {/* Upload Custom Photo Row */}
          <div className="flex items-center gap-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-[20px] border px-4 py-2.5 text-sm font-bold transition-all cursor-pointer ${
 mode === 'custom' && draftCustomUrl
 ? 'tk-bc-forest tk-bg-forest-tint tk-text-forest'
 : 'tk-bc-hair tk-bg-paper tk-text-ink hover:tk-bc-forest hover:tk-bg-warning-tint'
 }`}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin tk-text-forest" />
              ) : draftCustomUrl ? (
                <ImagePlus className="h-4 w-4 tk-text-forest" />
              ) : (
                <Upload className="h-4 w-4 tk-text-forest" />
              )}
              <span>
                {uploading
                  ? copy.optimizingPhoto
                  : draftCustomUrl
                  ? copy.replaceCustomPhoto
                  : copy.choosePhotoBtn}
              </span>
            </button>

            {draftCustomUrl && (
              <>
                {mode !== 'custom' && (
                  <button
                    type="button"
                    onClick={() => setMode('custom')}
                    className="min-h-[44px] rounded-[20px] border tk-bc-hair bg-white px-3 text-sm font-semibold tk-text-ink hover:tk-bc-forest cursor-pointer shrink-0"
                  >
                    {copy.useUploadedBtn}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRemoveCustomPhoto}
                  title={copy.removeCustomTitle}
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-[20px] border tk-bc-danger-hair tk-bg-danger-tint tk-text-danger hover:tk-bg-danger-tint transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {/* Curated Destination Landscape Gallery */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-serif font-bold tk-text-ink">
                {copy.landscapesHeading}
              </span>
              <button
                type="button"
                onClick={() => {
                  setMode('auto');
                  setSelectedPresetId(autoPresetId);
                  const autoMeta =
                    COVER_PRESETS.find((p) => p.id === autoPresetId) || COVER_PRESETS[0];
                  setFocusY(autoMeta.defaultFocusY);
                }}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-semibold transition-colors cursor-pointer ${
 mode === 'auto'
 ? 'tk-bg-forest-tint tk-text-forest'
 : 'tk-text-ink2 hover:tk-text-forest'
 }`}
              >
                <Sparkles className="h-3 w-3" />
                <span>{copy.autoMatchBtn}</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {COVER_PRESETS.map((preset) => {
                const isSelected =
                  (mode === 'preset' && selectedPresetId === preset.id) ||
                  (mode === 'auto' && autoPresetId === preset.id);
                const presetText = copy.presets[preset.id];
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setMode('preset');
                      setSelectedPresetId(preset.id);
                      setFocusY(preset.defaultFocusY);
                    }}
                    className={`group relative rounded-[16px] overflow-hidden text-left transition-all cursor-pointer ring-2 ${
 isSelected
 ? 'tk-ring-forest shadow-sm'
 : 'ring-transparent hover:tk-ring-forest'
 }`}
                  >
                    <div className="aspect-16/10 w-full overflow-hidden tk-bg-forest-plate">
                      <img
                        src={preset.imageUrl}
                        alt={presetText.label}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="absolute inset-0 tk-grad-cover-scrim" />
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full tk-bg-forest text-white shadow-xs">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    <div className="absolute inset-x-2 bottom-1.5">
                      <div className="text-[13px] font-bold text-white leading-tight truncate">
                        {presetText.label}
                      </div>
                      <div className="text-[13px] text-white/80 truncate">
                        {presetText.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tone & Contrast Mood Adjustment */}
          <div>
            <div className="text-sm font-serif font-bold tk-text-ink mb-2">
              {copy.toneHeading}
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {COVER_TONES.map((tItem) => {
                const active = tone === tItem.id;
                return (
                  <button
                    key={tItem.id}
                    type="button"
                    onClick={() => setTone(tItem.id)}
                    className={`rounded-[16px] border py-2 px-1.5 text-[13px] font-semibold text-center transition-colors cursor-pointer truncate ${
 active
 ? 'tk-bc-forest tk-bg-forest-tint tk-text-forest'
 : 'tk-bc-hair tk-bg-paper tk-text-ink2 hover:tk-bc-hair hover:tk-text-ink'
 }`}
                  >
                    {copy.tones[tItem.id]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t tk-bc-hair tk-bg-paper flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-[16px] border tk-bc-hair bg-white px-4 text-sm font-semibold tk-text-ink2 hover:tk-text-ink transition-colors cursor-pointer"
          >
            {copy.cancelBtn}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="h-10 inline-flex items-center justify-center gap-1.5 rounded-[16px] tk-bg-ink hover:tk-bg-forest px-5 text-sm font-bold text-white transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{copy.applyCoverBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
