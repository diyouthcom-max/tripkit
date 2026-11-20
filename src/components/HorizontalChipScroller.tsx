import React, { useRef, useState, useEffect, useCallback } from 'react';

interface HorizontalChipScrollerProps {
  activeKey?: string | number;
  children: React.ReactNode;
  className?: string;
  fadeBgClassName?: string;
  ariaLabel?: string;
}

/**
 * Packy-style single-row horizontal chip scroller:
 * - Native touch swipe on mobile (`overflow-x-auto no-scrollbar`)
 * - Click-and-drag horizontal panning + vertical-wheel-to-horizontal scroll on desktop
 * - Smoothly centers `[data-chip-active="true"]` inside the strip without jumping vertical scroll
 * - Subtle left/right edge fade masks when content overflows
 */
export const HorizontalChipScroller: React.FC<HorizontalChipScrollerProps> = ({
  activeKey,
  children,
  className = '',
  fadeBgClassName = 'from-white',
  ariaLabel,
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    isPointerDown: boolean;
    startX: number;
    startScrollLeft: number;
    didDrag: boolean;
  }>({
    isPointerDown: false,
    startX: 0,
    startScrollLeft: 0,
    didDrag: false,
  });

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateEdgeFades = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(maxScroll - el.scrollLeft > 4);
  }, []);

  useEffect(() => {
    updateEdgeFades();
    const el = scrollerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => updateEdgeFades());
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateEdgeFades, children]);

  // Smoothly center the active chip horizontally without triggering vertical page scroll
  useEffect(() => {
    const container = scrollerRef.current;
    if (!container) return;
    const activeEl = container.querySelector<HTMLElement>('[data-chip-active="true"]');
    if (!activeEl) return;

    const maxScroll = container.scrollWidth - container.clientWidth;
    if (maxScroll <= 0) return;

    const targetLeft = Math.max(
      0,
      Math.min(
        maxScroll,
        activeEl.offsetLeft - container.clientWidth / 2 + activeEl.offsetWidth / 2
      )
    );

    container.scrollTo({
      left: targetLeft,
      behavior: 'smooth',
    });
  }, [activeKey]);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
      updateEdgeFades();
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    const el = scrollerRef.current;
    if (!el) return;
    dragStateRef.current = {
      isPointerDown: true,
      startX: e.clientX,
      startScrollLeft: el.scrollLeft,
      didDrag: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state.isPointerDown || e.pointerType === 'touch') return;
    const el = scrollerRef.current;
    if (!el) return;
    const dx = e.clientX - state.startX;
    if (Math.abs(dx) > 5) {
      state.didDrag = true;
    }
    if (state.didDrag) {
      el.scrollLeft = state.startScrollLeft - dx;
      updateEdgeFades();
    }
  };

  const endPointerDrag = () => {
    dragStateRef.current.isPointerDown = false;
  };

  const handleClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragStateRef.current.didDrag) {
      e.preventDefault();
      e.stopPropagation();
      dragStateRef.current.didDrag = false;
    }
  };

  return (
    <div className={`relative min-w-0 ${className}`} aria-label={ariaLabel}>
      {canScrollLeft && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-5 bg-gradient-to-r ${fadeBgClassName} to-transparent`}
        />
      )}

      <div
        ref={scrollerRef}
        onScroll={updateEdgeFades}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointerDrag}
        onPointerCancel={endPointerDrag}
        onPointerLeave={endPointerDrag}
        onClickCapture={handleClickCapture}
        className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5 touch-pan-x select-none"
      >
        {children}
      </div>

      {canScrollRight && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l ${fadeBgClassName} to-transparent`}
        />
      )}
    </div>
  );
};
