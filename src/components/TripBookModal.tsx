import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Check,
  SlidersHorizontal,
  Copy,
  Trash2,
  Cloud,
  Sparkles,
  ImagePlus,
} from 'lucide-react';
import { formatDateByPref } from '../utils/preferencesHelpers';
import { formatDestinationOnlyTitle } from '../utils/tripCoverHelpers';
import type { AppLanguage, SavedTripEntry } from '../types';

interface TripBookModalProps {
  open: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
  trips: SavedTripEntry[];
  activeTripId: string;
  language?: AppLanguage;
  onSelectTrip: (tripId: string) => void;
  onOpenCreateNewWizard: () => void;
  onOpenEditCurrentSetup: () => void;
  onOpenCoverModal?: () => void;
  onDuplicateTrip: (tripId: string) => void;
  onDeleteTrip: (tripId: string) => void;
  onAddDemoTrip: () => void;
}

export const TripBookModal: React.FC<TripBookModalProps> = ({
  open,
  onClose,
  anchorRef,
  trips,
  activeTripId,
  language = 'zh-CN',
  onSelectTrip,
  onOpenCreateNewWizard,
  onOpenEditCurrentSetup,
  onOpenCoverModal,
  onDuplicateTrip,
  onDeleteTrip,
  onAddDemoTrip,
}) => {
  const { t } = useTranslation();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      setConfirmDeleteId(null);
      return;
    }

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (menuRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  const sortedTrips = [...trips].sort((a, b) => {
    if (a.id === activeTripId) return -1;
    if (b.id === activeTripId) return 1;
    return b.updatedAt - a.updatedAt;
  });

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={t('tripBook.menuAria')}
      className="absolute left-0 top-full mt-2 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border tk-bc-hair bg-white shadow-xl overflow-hidden"
    >
      {/* Saved Trips List */}
      <div className="px-3 pt-3 pb-2">
        <div className="px-2 pb-1.5 flex items-center justify-between text-[11px] font-semibold tk-text-ink2">
          <span>{t('tripBook.savedTrips')}</span>
          <span className="tabular-nums">{t('tripBook.setsCount', { count: trips.length })}</span>
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1">
          {sortedTrips.map((entry) => {
            const isActive = entry.id === activeTripId;
            const st = entry.state;
            const routeTitle =
              formatDestinationOnlyTitle(st, language) || t('tripBook.unnamedTrip');
            const allItems = (st.packing || []).flatMap((g) => g.items);
            const packedCount = allItems.filter((i) => i.done).length;
            const totalItemsCount = allItems.length;
            const isConfirmingDelete = confirmDeleteId === entry.id;

            return (
              <div
                key={entry.id}
                className={`group rounded-xl px-2.5 py-2 transition-colors ${
 isActive
 ? 'tk-bg-forest-tint tk-text-ink'
 : 'hover:tk-bg-paper tk-text-ink'
 }`}
              >
                {isConfirmingDelete ? (
                  <div className="flex items-center justify-between gap-2 py-0.5">
                    <span className="text-xs font-semibold tk-text-danger truncate">
                      {t('tripBook.deleteConfirm', { title: routeTitle })}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDeleteId(null);
                          onDeleteTrip(entry.id);
                        }}
                        className="rounded-lg tk-bg-danger px-2.5 py-1 text-[11px] font-bold text-white hover:tk-bg-danger whitespace-nowrap cursor-pointer"
                      >
                        {t('tripBook.confirm')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-lg border tk-bc-hair bg-white px-2 py-1 text-[11px] font-semibold tk-text-ink2 whitespace-nowrap cursor-pointer"
                      >
                        {t('tripBook.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTrip(entry.id);
                        onClose();
                      }}
                      className="min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-bold tk-text-ink">
                          {routeTitle}
                        </span>
                        {entry.cloudRoomId && (
                          <Cloud
                            className="h-3.5 w-3.5 tk-text-forest shrink-0"
                            aria-label={`Room ${entry.cloudRoomId}`}
                          />
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] tk-text-ink2">
                        <span className="font-num tabular-nums">
                          {formatDateByPref(st.setup.departureDate, language)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {t('tripBook.daysCompact', { count: st.setup.days })}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {t('tripBook.packedProgress', {
                            packed: packedCount,
                            total: totalItemsCount,
                          })}
                        </span>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      {isActive && (
                        <span
                          className="inline-flex h-6 w-6 items-center justify-center tk-text-forest"
                          aria-label="Active"
                        >
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateTrip(entry.id);
                          onClose();
                        }}
                        className="rounded-lg p-1.5 tk-text-ink2 hover:bg-white hover:tk-text-forest transition-colors cursor-pointer"
                        title={t('tripBook.duplicateTitle')}
                        aria-label={t('tripBook.duplicateTitle')}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(entry.id);
                        }}
                        className="rounded-lg p-1.5 tk-text-ink2 hover:tk-bg-danger-tint hover:tk-text-danger transition-colors cursor-pointer"
                        title={t('tripBook.deleteTitle')}
                        aria-label={t('tripBook.deleteTitle')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions Footer */}
      <div className="border-t tk-bc-hair tk-bg-paper p-2 space-y-0.5">
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenEditCurrentSetup();
          }}
          className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold tk-text-ink hover:bg-white hover:tk-text-forest transition-colors text-left cursor-pointer"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 tk-text-forest shrink-0" />
          <span>{t('tripBook.editCurrentSetup')}</span>
        </button>

        {onOpenCoverModal && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCoverModal();
            }}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold tk-text-ink hover:bg-white hover:tk-text-forest transition-colors text-left cursor-pointer"
          >
            <ImagePlus className="h-3.5 w-3.5 tk-text-forest shrink-0" />
            <span>
              {language === 'zh-CN' ? '更换当前行程封面' : 'Change Cover Photo'}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenCreateNewWizard();
          }}
          className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold tk-text-forest hover:bg-white transition-colors text-left cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          <span>{t('tripBook.createNewTrip')}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onAddDemoTrip();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-[11px] font-medium tk-text-ink2 hover:bg-white hover:tk-text-forest transition-colors text-left cursor-pointer"
        >
          <Sparkles className="h-3 w-3 tk-text-forest shrink-0" />
          <span>{t('tripBook.loadDemoTrip')}</span>
        </button>
      </div>
    </div>
  );
};
