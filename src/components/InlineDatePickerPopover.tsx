import React, { useMemo, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { AppLanguage } from '../types';

interface InlineDatePickerPopoverProps {
  departureDate: string;
  returnDate: string;
  /** When true (multi-city mode), picking 1 date shifts departureDate while keeping per-stop days intact */
  singleStartOnly?: boolean;
  lang: AppLanguage;
  pickStartLabel: string;
  pickEndLabel: string;
  onSelectRange: (startIso: string, endIso: string) => void;
  onSelectStartOnly: (startIso: string) => void;
  onClose: () => void;
}

function parseIsoDate(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function toIsoDate(year: number, monthIndex: number, day: number): string {
  const d = new Date(year, monthIndex, day);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function addDaysIso(iso: string, delta: number): string {
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() + delta);
  return toIsoDate(d.getFullYear(), d.getMonth(), d.getDate());
}

export const InlineDatePickerPopover: React.FC<InlineDatePickerPopoverProps> = ({
  departureDate,
  returnDate,
  singleStartOnly = false,
  lang,
  pickStartLabel,
  pickEndLabel,
  onSelectRange,
  onSelectStartOnly,
  onClose,
}) => {
  const initialFocus = parseIsoDate(departureDate);
  const [viewYear, setViewYear] = useState(initialFocus.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialFocus.getMonth());
  const [draftStart, setDraftStart] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const todayIso = useMemo(() => {
    const now = new Date();
    return toIsoDate(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const monthHeading = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(lang, {
        year: 'numeric',
        month: 'long',
      }).format(new Date(viewYear, viewMonth, 1));
    } catch {
      return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    }
  }, [lang, viewYear, viewMonth]);

  const weekdayLabels = useMemo(() => {
    const labels: string[] = [];
    for (let i = 0; i < 7; i += 1) {
      try {
        labels.push(
          new Intl.DateTimeFormat(lang, { weekday: 'narrow' }).format(
            new Date(2026, 0, 4 + i)
          )
        );
      } catch {
        labels.push(['S', 'M', 'T', 'W', 'T', 'F', 'S'][i]);
      }
    }
    return labels;
  }, [lang]);

  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: Array<{ iso: string; day: number } | null> = [];
    for (let i = 0; i < firstDayOfWeek; i += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({
        iso: toIsoDate(viewYear, viewMonth, day),
        day,
      });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const maxEndIso = draftStart ? addDaysIso(draftStart, 29) : undefined;
  const activeStart = draftStart ?? departureDate;
  const activeEnd = draftStart ? null : returnDate;

  const handleDayClick = (iso: string) => {
    if (singleStartOnly) {
      onSelectStartOnly(iso);
      onClose();
      return;
    }

    if (!draftStart) {
      setDraftStart(iso);
      return;
    }

    if (iso <= draftStart) {
      setDraftStart(iso);
      return;
    }

    const cappedEnd = maxEndIso && iso > maxEndIso ? maxEndIso : iso;
    onSelectRange(draftStart, cappedEnd);
    setDraftStart(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-label={draftStart ? pickEndLabel : pickStartLabel}
      className="mt-3 rounded-2xl border tk-bc-hair tk-bg-card p-3.5 tk-elev-card space-y-2.5"
    >
      {/* Calendar Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold tk-text-forest truncate">
          {draftStart && !singleStartOnly ? pickEndLabel : pickStartLabel}
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Previous month"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full tk-text-ink2 hover:tk-bg-warning-tint hover:tk-text-ink transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[112px] text-center text-xs font-extrabold tk-text-ink tabular-nums">
            {monthHeading}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Next month"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full tk-text-ink2 hover:tk-bg-warning-tint hover:tk-text-ink transition-colors cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close calendar"
            className="ml-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full tk-text-ink2 hover:tk-bg-warning-tint hover:tk-text-ink transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Weekday Row */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdayLabels.map((lbl, idx) => (
          <div
            key={`${lbl}_${idx}`}
            className="py-1 text-[11px] font-semibold tk-text-ink2"
          >
            {lbl}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarCells.map((cell, idx) => {
          if (!cell) {
            return <div key={`empty_${idx}`} className="h-9" />;
          }
          const isStart = cell.iso === activeStart;
          const isEnd = activeEnd ? cell.iso === activeEnd : false;
          const isInRange =
            activeStart &&
            activeEnd &&
            cell.iso > activeStart &&
            cell.iso < activeEnd;
          const isToday = cell.iso === todayIso;
          const isBeyondCap = Boolean(
            draftStart && !singleStartOnly && maxEndIso && cell.iso > maxEndIso
          );

          return (
            <button
              key={cell.iso}
              type="button"
              disabled={isBeyondCap}
              onClick={() => handleDayClick(cell.iso)}
              className={`h-9 w-full rounded-xl text-xs font-num tabular-nums transition-colors flex items-center justify-center ${
 isBeyondCap
 ? 'tk-text-ink2 opacity-40 cursor-not-allowed'
 : isStart || isEnd
 ? 'tk-bg-forest font-bold text-white shadow-xs cursor-pointer'
 : isInRange
 ? 'tk-bg-forest-tint font-semibold tk-text-forest hover:tk-bg-forest-tint cursor-pointer'
 : isToday
 ? 'tk-bg-paper font-bold tk-text-forest ring-1 tk-ring-forest-35 hover:tk-bg-forest-tint cursor-pointer'
 : 'tk-text-forest font-medium hover:tk-bg-warning-tint cursor-pointer'
 }`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
};
