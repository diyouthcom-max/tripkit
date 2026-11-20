import { jsPDF } from 'jspdf';
import type {
  AppLanguage,
  PackingGroup,
  PackingItem,
  SmartBagId,
  TripState,
  UnitSystem,
} from '../types';
import { loadCustomTripCover } from './coverImageVault';
import { getCityForDay, sortNodesChronologically } from './itineraryHelpers';
import {
  CARRY_ON_LIMIT_KG,
  CHECKED_LIMIT_KG,
  SMART_BAG_SPECS,
  formatItemDisplayName,
  getLocalizedSmartBagSpec,
  isItemCarryOnWeight,
  resolveItemSmartBag,
} from './packingHelpers';
import {
  computeDynamicRolloverLocal,
  computeMyDailySpendForDay,
  getVatStatusLabel,
  resolveExpenseSplitDetails,
} from './splitHelpers';
import {
  formatCompactTripDateRange,
  formatDestinationOnlyTitle,
  resolveActiveCoverVisual,
} from './tripCoverHelpers';
import { getExportPdfCopy } from '../i18n/packs/exportPdfPack';

// Exact A4 Portrait proportions (210mm x 297mm -> 794 x 1123 at 96dpi, rendered at 2.25x for crisp print)
const PAGE_W = 794;
const PAGE_H = 1123;
const SCALE = 2.25;

// Print-safe margins (~12.2mm left/right so home laser & inkjet printers never clip borders)
const MARGIN_X = 46;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const INNER_TOP_Y = 54;
const PAGE_BOTTOM = PAGE_H - 50;

// Print-friendly editorial ink palette (pure white paper, crisp hairlines, zero heavy ink blocks on inner pages)
const INK_PRIMARY = '#112422';
const INK_SECONDARY = '#48615E';
const INK_MUTED = '#6E8581';
const INK_ACCENT = '#077A76';
const RULE_STRONG = '#B8CECA';
const RULE_LIGHT = '#DCE8E5';
const PAPER_TINT = '#F6FAF9';
const PAPER_WARM = '#FCFBF6';

const FONT_SANS =
  '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif';
const FONT_MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

export interface ExportTripPdfOptions {
  carryOnLimitKg?: number;
  checkedLimitKg?: number;
  tripId?: string;
  customCoverDataUrl?: string | null;
  language?: AppLanguage;
  unitSystem?: UnitSystem;
  /** Defaults to true: renders a dedicated print-friendly A4 cover page with destination photo */
  includeCoverPage?: boolean;
  /** Defaults to true: appends an A5/A6 quarter-fold compact packing checklist sheet for physical folding */
  includeFoldableChecklist?: boolean;
}

interface EnrichedPackEntry {
  grp: PackingGroup;
  item: PackingItem;
  bagId: SmartBagId;
  bagLabel: string;
  isCarryOn: boolean;
  ownerLabel: string;
}

interface PdfPageRecord {
  canvas: HTMLCanvasElement;
  kind: 'cover' | 'handbook' | 'foldable';
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (!text) return [''];
  const lines: string[] = [];
  let current = '';

  for (const ch of Array.from(text)) {
    if (ch === '\n') {
      lines.push(current);
      current = '';
      continue;
    }
    const next = current + ch;
    if (ctx.measureText(next).width > maxWidth && current.length > 0) {
      lines.push(current);
      current = ch;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function truncateLine(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (!text) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  const chars = Array.from(text);
  let out = '';
  for (const ch of chars) {
    if (ctx.measureText(`${out}${ch}…`).width > maxWidth) {
      return `${out}…`;
    }
    out += ch;
  }
  return out;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill?: string,
  stroke?: string,
  lineWidth = 1
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawPrintCheckbox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  checked: boolean,
  strokeColor = INK_PRIMARY
) {
  // Print-friendly hollow or crisp-tick checkbox (high legibility on B&W and color laser printers)
  drawRoundedRect(
    ctx,
    x,
    y,
    size,
    size,
    2.2,
    checked ? '#EAF6F5' : '#FFFFFF',
    checked ? INK_ACCENT : strokeColor,
    1.15
  );
  if (checked) {
    ctx.save();
    ctx.strokeStyle = INK_ACCENT;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x + size * 0.22, y + size * 0.52);
    ctx.lineTo(x + size * 0.44, y + size * 0.74);
    ctx.lineTo(x + size * 0.79, y + size * 0.28);
    ctx.stroke();
    ctx.restore();
  }
}

function loadImageSafe(src: string): Promise<HTMLImageElement | null> {
  if (!src || typeof Image === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (img: HTMLImageElement | null) => {
      if (settled) return;
      settled = true;
      resolve(img);
    };
    const timer = setTimeout(() => finish(null), 4500);
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      clearTimeout(timer);
      finish(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      finish(null);
    };
    img.src = src;
  });
}

function drawCoverPhotoFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  x: number,
  y: number,
  w: number,
  h: number,
  focusYPercent: number,
  filterCss: string,
  badgeLeft: string,
  badgeRight: string
) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.clip();

  if (img && (img.naturalWidth || img.width) > 0 && (img.naturalHeight || img.height) > 0) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const boxRatio = w / h;
    const imgRatio = iw / ih;

    let sx = 0;
    let sy = 0;
    let sw = iw;
    let sh = ih;

    if (imgRatio > boxRatio) {
      sw = ih * boxRatio;
      sx = (iw - sw) * 0.5;
    } else {
      sh = iw / boxRatio;
      const clampedFocus = Math.max(0, Math.min(100, focusYPercent)) / 100;
      sy = (ih - sh) * clampedFocus;
    }

    ctx.save();
    if (filterCss && filterCss !== 'none' && 'filter' in ctx) {
      ctx.filter = filterCss;
    }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    ctx.restore();

    // Subtle bottom scrim only along bottom 24% for crisp caption badge contrast
    const grad = ctx.createLinearGradient(0, y + h * 0.74, 0, y + h);
    grad.addColorStop(0, 'rgba(12, 26, 24, 0)');
    grad.addColorStop(1, 'rgba(12, 26, 24, 0.52)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y + h * 0.74, w, h * 0.26);
  } else {
    // Print-friendly architectural fallback when offline asset decoding is unavailable
    ctx.fillStyle = '#EEF5F4';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#D1E2DF';
    ctx.lineWidth = 1;
    for (let gx = x + 36; gx < x + w; gx += 48) {
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + h);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x + w * 0.76, y + h * 0.34, 54, 0, Math.PI * 2);
    ctx.fillStyle = '#DCEBE8';
    ctx.fill();
  }

  // Editorial frosted caption strip inside bottom of photo frame
  const pillH = 28;
  const pillY = y + h - pillH - 14;
  ctx.font = `600 10.5px ${FONT_SANS}`;
  const leftTxt = truncateLine(ctx, badgeLeft, w * 0.62);
  const leftW = ctx.measureText(leftTxt).width + 24;
  drawRoundedRect(
    ctx,
    x + 14,
    pillY,
    leftW,
    pillH,
    6,
    'rgba(17, 36, 34, 0.76)',
    'rgba(255, 255, 255, 0.24)',
    0.8
  );
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(leftTxt, x + 26, pillY + 18);

  if (badgeRight) {
    ctx.font = `600 10px ${FONT_MONO}`;
    const rightW = ctx.measureText(badgeRight).width + 22;
    drawRoundedRect(
      ctx,
      x + w - rightW - 14,
      pillY,
      rightW,
      pillH,
      6,
      'rgba(255, 255, 255, 0.88)',
      'rgba(17, 36, 34, 0.15)',
      0.8
    );
    ctx.fillStyle = INK_PRIMARY;
    ctx.textAlign = 'right';
    ctx.fillText(badgeRight, x + w - 25, pillY + 18);
    ctx.textAlign = 'left';
  }

  ctx.restore();

  // Crisp outer frame rule
  drawRoundedRect(ctx, x, y, w, h, 10, undefined, RULE_STRONG, 1);
}

function formatTotalKgOrLb(grams: number, unitSystem: UnitSystem): string {
  const kg = grams / 1000;
  if (unitSystem === 'imperial') {
    return `${(kg * 2.20462).toFixed(1)}lb`;
  }
  return `${kg.toFixed(2)}kg`;
}

function formatLimitKgOrLb(kg: number, unitSystem: UnitSystem, decimals = 1): string {
  if (unitSystem === 'imperial') {
    return `${(kg * 2.20462).toFixed(decimals)}lb`;
  }
  return `${kg.toFixed(decimals)}kg`;
}

function formatItemGramsOrOz(grams: number, unitSystem: UnitSystem): string {
  if (unitSystem === 'imperial') {
    const oz = grams * 0.035274;
    return oz >= 16 ? `${(oz / 16).toFixed(1)}lb` : `${oz.toFixed(1)}oz`;
  }
  return `${Math.round(grams)}g`;
}

export async function exportTripPdf(
  trip: TripState,
  options?: ExportTripPdfOptions
): Promise<string> {
  const lang: AppLanguage = options?.language ?? 'zh-CN';
  const copy = getExportPdfCopy(lang);
  const unitSystem: UnitSystem = options?.unitSystem ?? 'metric';
  const carryOnLimit = options?.carryOnLimitKg ?? CARRY_ON_LIMIT_KG;
  const checkedLimit = options?.checkedLimitKg ?? CHECKED_LIMIT_KG;
  const includeCoverPage = options?.includeCoverPage !== false;
  const includeFoldableChecklist = options?.includeFoldableChecklist !== false;

  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // Proceed with fallback system fonts
    }
  }

  // Resolve active destination cover photo (custom IndexedDB cover or smart scenic preset)
  let resolvedCustomCover = options?.customCoverDataUrl ?? null;
  if (!resolvedCustomCover && options?.tripId) {
    resolvedCustomCover = await loadCustomTripCover(options.tripId);
  }
  const coverVisual = resolveActiveCoverVisual(trip, resolvedCustomCover);
  const coverImageEl = includeCoverPage
    ? await loadImageSafe(coverVisual.imageUrl)
    : null;

  const destinationTitle = formatDestinationOnlyTitle(trip, lang);
  const compactDateRange = formatCompactTripDateRange(trip.setup, lang);
  const safeDays = Math.max(1, trip.setup.days || 1);
  const travelersCount = Math.max(1, trip.setup.travelers || trip.crew.length || 1);
  const isSoloTrip = travelersCount <= 1;
  const sym = trip.intel.currencySymbol;
  const todayStr = new Date().toLocaleDateString(copy.dateLocale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const crewMap = new Map<string, string>(
    (trip.crew || []).map((m) => [m.id, m.name])
  );
  const multiTraveler = (trip.crew?.length || trip.setup.travelers) > 1;

  // Enriched packing entries
  const bagShortMap = SMART_BAG_SPECS.reduce(
    (acc, spec) => {
      acc[spec.id] = getLocalizedSmartBagSpec(spec.id, lang).shortLabel;
      return acc;
    },
    {} as Record<SmartBagId, string>
  );

  const allEntries: EnrichedPackEntry[] = trip.packing.flatMap((grp) =>
    grp.items.map((item) => {
      const bagId = resolveItemSmartBag(item, grp, trip.smartBagOverrides);
      const isCarryOn = isItemCarryOnWeight(item, grp, trip.smartBagOverrides);
      let ownerLabel = '';
      if (item.ownership === 'shared') {
        const packer = item.packedByMemberId
          ? crewMap.get(item.packedByMemberId)
          : undefined;
        ownerLabel = packer
          ? `${copy.sharedOwnerPrefix}·${packer}`
          : copy.sharedOwnerOnly;
      } else if (multiTraveler && item.ownerId) {
        ownerLabel = crewMap.get(item.ownerId) || '';
      }
      return {
        grp,
        item,
        bagId,
        bagLabel: bagShortMap[bagId] || grp.title,
        isCarryOn,
        ownerLabel,
      };
    })
  );

  const totalPackCount = allEntries.length;
  const donePackCount = allEntries.filter((e) => e.item.done).length;
  const pendingEntries = allEntries.filter((e) => !e.item.done);
  const morningEntries = allEntries.filter((e) => Boolean(e.item.morningOfDeparture));
  const toBuyEntries = allEntries.filter((e) => Boolean(e.item.toBuy) && !e.item.done);

  let carryOnGrams = 0;
  let checkedGrams = 0;
  allEntries.forEach((entry) => {
    if (entry.isCarryOn) {
      carryOnGrams += entry.item.weightGrams;
    } else {
      checkedGrams += entry.item.weightGrams;
    }
  });

  const tripTasks = trip.tasks ?? [];
  const pendingTasks = tripTasks.filter((t) => !t.done);
  const doneTasksCount = tripTasks.length - pendingTasks.length;

  const pageRecords: PdfPageRecord[] = [];
  let activeSectionLabel = '';

  const createCanvasPage = (
    kind: PdfPageRecord['kind']
  ): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } => {
    const c = document.createElement('canvas');
    c.width = Math.round(PAGE_W * SCALE);
    c.height = Math.round(PAGE_H * SCALE);
    const context = c.getContext('2d')!;
    context.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, PAGE_W, PAGE_H);
    pageRecords.push({ canvas: c, kind });

    if (kind === 'handbook') {
      // Crisp, low-ink running header on inner handbook pages
      context.fillStyle = INK_MUTED;
      context.font = `600 9.5px ${FONT_SANS}`;
      context.fillText(
        `TRIP KIT HANDBOOK  ·  ${truncateLine(context, destinationTitle, 320)}`,
        MARGIN_X,
        29
      );
      context.textAlign = 'right';
      context.font = `500 9.5px ${FONT_MONO}`;
      const rightHdr = activeSectionLabel
        ? `${activeSectionLabel}  ·  ${trip.setup.departureDate}`
        : `${trip.setup.departureDate} · ${safeDays}D`;
      context.fillText(rightHdr, PAGE_W - MARGIN_X, 29);
      context.textAlign = 'left';

      context.strokeStyle = RULE_LIGHT;
      context.lineWidth = 0.9;
      context.beginPath();
      context.moveTo(MARGIN_X, 37);
      context.lineTo(PAGE_W - MARGIN_X, 37);
      context.stroke();
    }

    return { canvas: c, ctx: context };
  };

  // ============================================================================
  // PAGE 1: PRINT-FRIENDLY A4 COVER PAGE WITH DESTINATION PHOTO
  // ============================================================================
  if (includeCoverPage) {
    const { ctx: cCtx } = createCanvasPage('cover');

    // Top Editorial Masthead
    cCtx.fillStyle = INK_ACCENT;
    cCtx.font = `700 10.5px ${FONT_MONO}`;
    cCtx.fillText(copy.mastheadLeft, MARGIN_X, 48);

    cCtx.textAlign = 'right';
    cCtx.fillStyle = INK_MUTED;
    cCtx.font = `500 10px ${FONT_MONO}`;
    cCtx.fillText(copy.mastheadIssued(todayStr), PAGE_W - MARGIN_X, 48);
    cCtx.textAlign = 'left';

    cCtx.strokeStyle = RULE_STRONG;
    cCtx.lineWidth = 1.1;
    cCtx.beginPath();
    cCtx.moveTo(MARGIN_X, 58);
    cCtx.lineTo(PAGE_W - MARGIN_X, 58);
    cCtx.stroke();

    // Framed Destination Hero Photograph (428px tall, generous white border around it)
    const photoY = 74;
    const photoH = 426;
    const dateBadge =
      compactDateRange ||
      `${trip.setup.departureDate}${trip.setup.returnDate ? ` → ${trip.setup.returnDate}` : ''}`;
    drawCoverPhotoFrame(
      cCtx,
      coverImageEl,
      MARGIN_X,
      photoY,
      CONTENT_W,
      photoH,
      coverVisual.focusY,
      coverVisual.tone.filterCss,
      destinationTitle,
      `${dateBadge} · ${safeDays}${copy.dayUnitShort}`
    );

    // Editorial Route Headline & Trip Metadata
    let cy = photoY + photoH + 30;
    cCtx.fillStyle = INK_ACCENT;
    cCtx.font = `700 10px ${FONT_MONO}`;
    cCtx.fillText(copy.dossierEyebrow, MARGIN_X, cy);
    cy += 30;

    cCtx.fillStyle = INK_PRIMARY;
    cCtx.font = `800 28px ${FONT_SANS}`;
    const routeHeadlineLines = wrapLines(cCtx, destinationTitle, CONTENT_W).slice(0, 2);
    routeHeadlineLines.forEach((ln) => {
      cCtx.fillText(ln, MARGIN_X, cy);
      cy += 34;
    });

    if (trip.intel.routeTitle && trip.intel.routeTitle.trim() !== destinationTitle.trim()) {
      cCtx.fillStyle = INK_SECONDARY;
      cCtx.font = `600 13px ${FONT_SANS}`;
      cCtx.fillText(truncateLine(cCtx, trip.intel.routeTitle, CONTENT_W), MARGIN_X, cy - 6);
      cy += 18;
    }

    const metaSegments = [
      copy.metaDeparture(trip.setup.departureDate, trip.setup.returnDate || undefined),
      copy.metaDays(safeDays),
      copy.metaTravelers(travelersCount),
      trip.setup.tripStyle,
    ].filter(Boolean);

    cCtx.fillStyle = INK_MUTED;
    cCtx.font = `500 11px ${FONT_SANS}`;
    cCtx.fillText(metaSegments.join('   ·   '), MARGIN_X, cy);
    cy += 22;

    // 6-Cell Print-Friendly Trip Essentials Grid (2 columns x 3 rows, crisp hairlines, white fill)
    const gridCellW = (CONTENT_W - 12) / 2;
    const gridCellH = 56;
    const dossierCells = [
      {
        k: copy.cellClimate,
        v: `${trip.intel.tempRange} · ${trip.intel.rainChance} · ${copy.sunsetWord} ${trip.intel.sunsetTime}`,
      },
      {
        k: copy.cellPowerCurrency,
        v: `${trip.intel.plugType} (${trip.intel.voltage}) · ${trip.intel.currencyCode} (${sym})`,
      },
      {
        k: copy.cellTransitTax,
        v: `${trip.intel.transitPassName} · ${trip.intel.vatExitAirport}`,
      },
      {
        k: copy.cellBaggageStatus,
        v: copy.baggageStatusValue(
          donePackCount,
          totalPackCount,
          formatTotalKgOrLb(carryOnGrams, unitSystem),
          formatLimitKgOrLb(carryOnLimit, unitSystem, 0),
          formatTotalKgOrLb(checkedGrams, unitSystem),
          formatLimitKgOrLb(checkedLimit, unitSystem, 0)
        ),
      },
      {
        k: copy.cellMeetupAnchor,
        v: `${trip.meetup.time} · ${trip.meetup.placeName} (${trip.meetup.address})`,
      },
      {
        k: copy.cellSafetyLifeline,
        v: trip.intel.localEmergencyNote,
      },
    ];

    dossierCells.forEach((cell, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const bx = MARGIN_X + col * (gridCellW + 12);
      const by = cy + row * (gridCellH + 8);
      drawRoundedRect(cCtx, bx, by, gridCellW, gridCellH, 8, '#FFFFFF', RULE_STRONG, 0.9);

      cCtx.fillStyle = INK_MUTED;
      cCtx.font = `700 9px ${FONT_MONO}`;
      cCtx.fillText(cell.k, bx + 12, by + 18);

      cCtx.fillStyle = INK_PRIMARY;
      cCtx.font = `600 10.5px ${FONT_SANS}`;
      const lines = wrapLines(cCtx, cell.v, gridCellW - 24).slice(0, 2);
      if (lines.length === 1) {
        cCtx.fillText(lines[0], bx + 12, by + 38);
      } else {
        cCtx.fillText(lines[0], bx + 12, by + 33);
        cCtx.fillStyle = INK_SECONDARY;
        cCtx.font = `500 9.5px ${FONT_SANS}`;
        cCtx.fillText(truncateLine(cCtx, lines[1], gridCellW - 24), bx + 12, by + 47);
      }
    });

    cy += 3 * (gridCellH + 8) + 12;

    // Bottom Handbook Directory & Physical Folding Guide Box
    const dirH = Math.max(78, PAGE_BOTTOM - cy - 6);
    drawRoundedRect(cCtx, MARGIN_X, cy, CONTENT_W, dirH, 8, PAPER_TINT, RULE_STRONG, 0.9);

    cCtx.fillStyle = INK_ACCENT;
    cCtx.font = `700 10px ${FONT_MONO}`;
    cCtx.fillText(copy.directoryTitle, MARGIN_X + 14, cy + 20);

    const tocLine = copy.directoryToc;
    cCtx.fillStyle = INK_PRIMARY;
    cCtx.font = `600 10px ${FONT_SANS}`;
    cCtx.fillText(truncateLine(cCtx, tocLine, CONTENT_W - 28), MARGIN_X + 14, cy + 40);

    const foldTip = copy.directoryFoldTip;
    cCtx.fillStyle = INK_SECONDARY;
    cCtx.font = `500 9.5px ${FONT_SANS}`;
    const tipLines = wrapLines(cCtx, foldTip, CONTENT_W - 28).slice(0, 2);
    tipLines.forEach((tl, ti) => {
      cCtx.fillText(tl, MARGIN_X + 14, cy + 57 + ti * 13);
    });
  }

  // ============================================================================
  // INNER PAGES: PRINT-FRIENDLY A4 HANDBOOK (ITINERARY -> BUDGET -> 9-BAG & TASKS)
  // ============================================================================
  activeSectionLabel = copy.sec01Label;
  let { ctx } = createCanvasPage('handbook');
  let y = INNER_TOP_Y;

  const nextHandbookPage = () => {
    const created = createCanvasPage('handbook');
    ctx = created.ctx;
    y = INNER_TOP_Y;
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_BOTTOM) {
      nextHandbookPage();
    }
  };

  const drawSectionHeading = (numCode: string, headingTitle: string) => {
    ensureSpace(44);
    ctx.fillStyle = INK_ACCENT;
    ctx.font = `700 10.5px ${FONT_MONO}`;
    ctx.fillText(numCode, MARGIN_X, y + 13);
    const codeW = ctx.measureText(numCode).width + 10;

    ctx.fillStyle = INK_PRIMARY;
    ctx.font = `700 14px ${FONT_SANS}`;
    ctx.fillText(headingTitle, MARGIN_X + codeW, y + 13);

    ctx.strokeStyle = RULE_STRONG;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(MARGIN_X, y + 21);
    ctx.lineTo(PAGE_W - MARGIN_X, y + 21);
    ctx.stroke();
    y += 32;
  };

  // ----- SECTION 01: Multi-Day Itinerary, Stay Anchors & Offline Passes -----
  const currentDay = Math.min(safeDays, Math.max(1, trip.activeFinanceDay ?? 1));
  drawSectionHeading('01', copy.sec01Heading);

  for (let d = 1; d <= safeDays; d += 1) {
    const rawDayNodes = trip.timeline.filter((n) => (n.day ?? 1) === d);
    const dayNodes = sortNodesChronologically(rawDayNodes);
    const dayStay = trip.dayStays?.[d];
    if (dayNodes.length === 0 && !dayStay) continue;

    const dayCity = getCityForDay(
      trip.setup.cities,
      d,
      safeDays,
      dayNodes,
      undefined,
      trip.setup.cityDays
    );
    const dayRainSwapped =
      trip.rainSwappedDays?.[d] ?? (d === currentDay ? trip.rainSwapped : false);
    const daySummary =
      trip.spatialSummariesByDay?.[d] || (d === currentDay ? trip.spatialSummary : '');

    ensureSpace(58);
    drawRoundedRect(ctx, MARGIN_X, y, CONTENT_W, 28, 6, PAPER_TINT, RULE_STRONG, 0.9);
    ctx.fillStyle = INK_PRIMARY;
    ctx.font = `700 11.5px ${FONT_SANS}`;
    const rainTag = dayRainSwapped ? copy.rainPlanTag : '';
    ctx.fillText(
      copy.dayHeaderTitle(d, dayCity, dayNodes.length, rainTag),
      MARGIN_X + 12,
      y + 18
    );

    if (dayStay?.placeName) {
      ctx.textAlign = 'right';
      ctx.fillStyle = INK_SECONDARY;
      ctx.font = `600 9.5px ${FONT_SANS}`;
      const stayLabel = copy.dayStayLabel(dayStay.placeName);
      ctx.fillText(
        truncateLine(ctx, stayLabel, CONTENT_W * 0.48),
        PAGE_W - MARGIN_X - 12,
        y + 18
      );
      ctx.textAlign = 'left';
    }
    y += 34;

    if (daySummary) {
      ctx.font = `500 9.5px ${FONT_SANS}`;
      const sumLines = wrapLines(ctx, daySummary, CONTENT_W - 12).slice(0, 2);
      ensureSpace(sumLines.length * 13 + 6);
      ctx.fillStyle = INK_SECONDARY;
      sumLines.forEach((line, li) => {
        ctx.fillText(line, MARGIN_X + 6, y + 9 + li * 13);
      });
      y += sumLines.length * 13 + 6;
    }

    for (const node of dayNodes) {
      const useRain = dayRainSwapped && node.isOutdoor && node.rainSwapTitle;
      const title = useRain ? node.rainSwapTitle! : node.title;
      const district =
        useRain && node.rainSwapDistrict ? node.rainSwapDistrict : node.district;
      const address =
        useRain && node.rainSwapAddress ? node.rainSwapAddress : node.address;

      ctx.font = `500 10px ${FONT_SANS}`;
      const addrLines = wrapLines(ctx, `${district} · ${address}`, CONTENT_W - 142).slice(0, 2);
      const transitLines = node.transitNote
        ? wrapLines(ctx, node.transitNote, CONTENT_W - 142).slice(0, 2)
        : [];
      const cardH = 36 + addrLines.length * 14 + transitLines.length * 14;

      ensureSpace(cardH + 7);
      drawRoundedRect(ctx, MARGIN_X, y, CONTENT_W, cardH, 7, '#FFFFFF', RULE_LIGHT, 0.9);

      // Left time column
      ctx.fillStyle = INK_PRIMARY;
      ctx.font = `700 12.5px ${FONT_MONO}`;
      ctx.fillText(node.time, MARGIN_X + 12, y + 21);

      if (node.closeTime) {
        ctx.fillStyle = INK_MUTED;
        ctx.font = `500 9px ${FONT_MONO}`;
        ctx.fillText(copy.closesAt(node.closeTime), MARGIN_X + 12, y + 36);
      }

      ctx.strokeStyle = RULE_LIGHT;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(MARGIN_X + 94, y + 10);
      ctx.lineTo(MARGIN_X + 94, y + cardH - 10);
      ctx.stroke();

      // Print checkable stop square + title
      const textX = MARGIN_X + 108;
      drawPrintCheckbox(ctx, textX, y + 10, 11, Boolean(node.visited || node.logged));

      ctx.fillStyle = INK_PRIMARY;
      ctx.font = `700 11.5px ${FONT_SANS}`;
      const anchorSuffix = node.isAnchor ? copy.anchorBadge : '';
      ctx.fillText(
        truncateLine(ctx, `${title}${anchorSuffix}`, CONTENT_W - 268),
        textX + 17,
        y + 20
      );

      ctx.textAlign = 'right';
      ctx.fillStyle = node.logged || node.visited ? INK_ACCENT : INK_MUTED;
      ctx.font = `600 9.5px ${FONT_MONO}`;
      const rightStatus = node.logged
        ? copy.statusLogged
        : node.visited
        ? copy.statusVisited
        : node.estLocal > 0
        ? `${sym}${node.estLocal.toFixed(0)}`
        : copy.statusFreePrepaid;
      ctx.fillText(
        `★ ${(Number(node.rating) || 4.6).toFixed(1)} · ${rightStatus}`,
        PAGE_W - MARGIN_X - 12,
        y + 20
      );
      ctx.textAlign = 'left';

      let lineY = y + 36;
      ctx.fillStyle = INK_SECONDARY;
      ctx.font = `500 9.5px ${FONT_SANS}`;
      addrLines.forEach((ln) => {
        ctx.fillText(ln, textX + 17, lineY);
        lineY += 14;
      });

      ctx.fillStyle = INK_MUTED;
      transitLines.forEach((ln) => {
        ctx.fillText(ln, textX + 17, lineY);
        lineY += 14;
      });

      y += cardH + 7;
    }

    y += 6;
  }

  // Offline Travel Passes Reference Table (if any)
  const passes = trip.travelPasses ?? [];
  if (passes.length > 0) {
    ensureSpace(56);
    ctx.fillStyle = INK_PRIMARY;
    ctx.font = `700 11px ${FONT_SANS}`;
    ctx.fillText(copy.passesHeading(passes.length), MARGIN_X, y + 12);
    y += 20;

    passes.forEach((p, idx) => {
      ensureSpace(26);
      if (idx % 2 === 0) {
        drawRoundedRect(ctx, MARGIN_X, y, CONTENT_W, 23, 4, PAPER_TINT);
      }
      ctx.fillStyle = INK_PRIMARY;
      ctx.font = `600 10px ${FONT_SANS}`;
      const dayPrefix = p.day ? `D${p.day} · ` : '';
      ctx.fillText(
        truncateLine(ctx, `${dayPrefix}${p.title}`, CONTENT_W * 0.56),
        MARGIN_X + 10,
        y + 15
      );

      ctx.textAlign = 'right';
      ctx.fillStyle = INK_SECONDARY;
      ctx.font = `600 9.5px ${FONT_MONO}`;
      const refDetails = [
        p.confirmationCode ? `REF: ${p.confirmationCode}` : '',
        p.terminalOrPlatform ? p.terminalOrPlatform : '',
        p.seatOrRoom ? p.seatOrRoom : '',
        p.dateTimeLabel ? p.dateTimeLabel : '',
      ]
        .filter(Boolean)
        .join(' · ');
      ctx.fillText(
        truncateLine(ctx, refDetails || p.category, CONTENT_W * 0.4),
        PAGE_W - MARGIN_X - 10,
        y + 15
      );
      ctx.textAlign = 'left';
      y += 24;
    });
    y += 10;
  }

  // Meetup & Wishlist Summary Strip
  ensureSpace(64);
  const meetupText = copy.meetupLine(trip.meetup.time, trip.meetup.placeName, trip.meetup.address);
  const wishText = trip.wishlist.length
    ? copy.wishlistBackupsLine(trip.wishlist.join(' · '))
    : copy.wishlistAllScheduled;
  drawRoundedRect(ctx, MARGIN_X, y, CONTENT_W, 48, 7, PAPER_TINT, RULE_LIGHT, 0.9);
  ctx.fillStyle = INK_PRIMARY;
  ctx.font = `600 10px ${FONT_SANS}`;
  ctx.fillText(truncateLine(ctx, meetupText, CONTENT_W - 24), MARGIN_X + 12, y + 19);
  ctx.fillStyle = INK_SECONDARY;
  ctx.font = `500 9.5px ${FONT_SANS}`;
  ctx.fillText(truncateLine(ctx, wishText, CONTENT_W - 24), MARGIN_X + 12, y + 36);
  y += 62;

  // ----- SECTION 02: Budget & Expense Ledger -----
  activeSectionLabel = copy.sec02Label;
  ensureSpace(175);
  drawSectionHeading('02', copy.sec02Heading);

  const shoppingExpenses = trip.expenses.filter((e) => e.bucket === 'shopping');
  const dailySpent = computeMyDailySpendForDay(
    trip.expenses,
    currentDay,
    1,
    travelersCount
  );
  const dynamicRollover = computeDynamicRolloverLocal(
    trip.expenses,
    trip.budget.dailyBudgetLocal,
    currentDay,
    travelersCount
  );
  const dailyAvail = trip.budget.dailyBudgetLocal + dynamicRollover;
  const dailyRemain = dailyAvail - dailySpent;
  const shoppingSpent = shoppingExpenses.reduce((s, e) => s + e.amountLocal, 0);
  const vatEligibleTotal = shoppingExpenses
    .filter((e) => e.vatEligible || e.amountLocal >= trip.intel.vatThresholdLocal)
    .reduce((s, e) => s + e.amountLocal, 0);
  const estVatRefund = vatEligibleTotal * trip.budget.vatRefundRate;

  const companionName = isSoloTrip
    ? ''
    : trip.crew[1]?.name || copy.partnerFallback;
  const owed = trip.budget.partnerOwedLocal;
  const owedLabel = isSoloTrip
    ? copy.soloNoSplit
    : owed > 0.01
    ? copy.partnerOwesYou(companionName, `${sym}${owed.toFixed(2)}`)
    : owed < -0.01
    ? copy.youOwePartner(companionName, `${sym}${Math.abs(owed).toFixed(2)}`)
    : copy.allSettledUp;

  const boxW = (CONTENT_W - 12) / 2;
  const boxH = 58;
  const budgetBoxes = [
    {
      label: copy.boxTotalBudget,
      main: `$${trip.budget.tripTotalUsd.toFixed(2)} USD`,
      sub: copy.boxTotalSub(
        trip.budget.prepaidUsd.toFixed(2),
        `${sym}${trip.budget.dailyBudgetLocal}`
      ),
    },
    {
      label: copy.boxDayAllowance(currentDay),
      main:
        dailyRemain >= 0
          ? `${copy.leftWord} ${sym}${dailyRemain.toFixed(2)}`
          : `${copy.overWord} -${sym}${Math.abs(dailyRemain).toFixed(2)}`,
      sub: copy.boxDaySub(
        `${sym}${dailySpent.toFixed(2)}`,
        `${sym}${dailyAvail.toFixed(2)}`
      ),
    },
    {
      label: copy.boxShoppingVat,
      main: `${sym}${shoppingSpent.toFixed(2)} / ${sym}${trip.budget.shoppingReserveLocal}`,
      sub: copy.boxShoppingSub(
        `${sym}${estVatRefund.toFixed(2)}`,
        `${sym}${trip.intel.vatThresholdLocal}`
      ),
    },
    {
      label: copy.boxWalletSplit,
      main: owedLabel,
      sub: copy.boxWalletSub(
        `${sym}${trip.budget.cashLocal.toFixed(0)}`,
        trip.budget.cardUsd.toFixed(0),
        `${sym}${trip.budget.transitPassLocal.toFixed(0)}`
      ),
    },
  ];

  budgetBoxes.forEach((b, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = MARGIN_X + col * (boxW + 12);
    const by = y + row * (boxH + 8);
    drawRoundedRect(ctx, bx, by, boxW, boxH, 7, '#FFFFFF', RULE_LIGHT, 0.9);
    ctx.fillStyle = INK_MUTED;
    ctx.font = `700 9px ${FONT_MONO}`;
    ctx.fillText(b.label, bx + 12, by + 17);
    ctx.fillStyle = INK_PRIMARY;
    ctx.font = `700 14px ${FONT_MONO}`;
    ctx.fillText(truncateLine(ctx, b.main, boxW - 24), bx + 12, by + 36);
    ctx.fillStyle = INK_SECONDARY;
    ctx.font = `500 9.5px ${FONT_SANS}`;
    ctx.fillText(truncateLine(ctx, b.sub, boxW - 24), bx + 12, by + 50);
  });
  y += boxH * 2 + 20;

  if (trip.expenses.length > 0) {
    ensureSpace(58);
    ctx.fillStyle = INK_PRIMARY;
    ctx.font = `700 11px ${FONT_SANS}`;
    ctx.fillText(copy.recordedExpensesHeading(trip.expenses.length), MARGIN_X, y + 11);
    y += 18;

    drawRoundedRect(ctx, MARGIN_X, y, CONTENT_W, 24, 5, PAPER_TINT, RULE_LIGHT, 0.8);
    ctx.fillStyle = INK_SECONDARY;
    ctx.font = `600 9.5px ${FONT_SANS}`;
    ctx.fillText(copy.colTime, MARGIN_X + 10, y + 15.5);
    ctx.fillText(copy.colItem, MARGIN_X + 68, y + 15.5);
    ctx.fillText(copy.colBucketPaymentSplit, MARGIN_X + 332, y + 15.5);
    ctx.textAlign = 'right';
    ctx.fillText(copy.colAmount, PAGE_W - MARGIN_X - 10, y + 15.5);
    ctx.textAlign = 'left';
    y += 25;

    trip.expenses.forEach((ex, idx) => {
      ensureSpace(26);
      if (idx % 2 === 1) {
        ctx.fillStyle = '#FAFDFC';
        ctx.fillRect(MARGIN_X, y, CONTENT_W, 24);
      }
      ctx.strokeStyle = RULE_LIGHT;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(MARGIN_X, y + 24);
      ctx.lineTo(PAGE_W - MARGIN_X, y + 24);
      ctx.stroke();

      const bucketText =
        ex.bucket === 'daily'
          ? copy.bucketDaily
          : ex.bucket === 'shopping'
          ? copy.bucketShopping
          : copy.bucketPrepaid;
      const acctText =
        ex.account === 'cash'
          ? copy.accountCash
          : ex.account === 'card'
          ? copy.accountCard
          : copy.accountPass;
      const splitText = resolveExpenseSplitDetails(
        ex,
        companionName,
        sym,
        lang,
        travelersCount
      ).shortLabel;
      const isVat = Boolean(
        ex.vatEligible ||
          (ex.bucket === 'shopping' && ex.amountLocal >= trip.intel.vatThresholdLocal)
      );
      const vatText = isVat
        ? ` · ${getVatStatusLabel(ex.vatStatus ?? 'pending_form', lang)}`
        : '';

      ctx.fillStyle = INK_MUTED;
      ctx.font = `500 9.5px ${FONT_MONO}`;
      ctx.fillText(`D${ex.day ?? 1} ${ex.time}`, MARGIN_X + 10, y + 15.5);

      ctx.fillStyle = INK_PRIMARY;
      ctx.font = `600 10px ${FONT_SANS}`;
      ctx.fillText(truncateLine(ctx, ex.title, 250), MARGIN_X + 68, y + 15.5);

      ctx.fillStyle = INK_SECONDARY;
      ctx.font = `500 9.5px ${FONT_SANS}`;
      ctx.fillText(
        truncateLine(ctx, `${bucketText} · ${acctText} · ${splitText}${vatText}`, 265),
        MARGIN_X + 332,
        y + 15.5
      );

      ctx.textAlign = 'right';
      ctx.fillStyle = INK_PRIMARY;
      ctx.font = `700 10px ${FONT_MONO}`;
      ctx.fillText(`-${sym}${ex.amountLocal.toFixed(2)}`, PAGE_W - MARGIN_X - 10, y + 15.5);
      ctx.textAlign = 'left';

      y += 24;
    });
    y += 16;
  }

  // ----- SECTION 03: 9-Bag Distribution Overview & Travel Tasks -----
  activeSectionLabel = copy.sec03Label;
  ensureSpace(150);
  drawSectionHeading('03', copy.sec03Heading);

  const populatedBags = SMART_BAG_SPECS.map((spec) => {
    const localizedSpec = getLocalizedSmartBagSpec(spec.id, lang);
    const bagItems = allEntries.filter((e) => e.bagId === spec.id);
    const bagGrams = bagItems.reduce((sum, e) => sum + e.item.weightGrams, 0);
    const bagDone = bagItems.filter((e) => e.item.done).length;
    return { spec, localizedSpec, bagItems, bagGrams, bagDone };
  }).filter((b) => b.bagItems.length > 0);

  if (populatedBags.length > 0) {
    const bagCardW = (CONTENT_W - 12) / 2;
    for (let i = 0; i < populatedBags.length; i += 2) {
      const pair = [populatedBags[i], populatedBags[i + 1]].filter(Boolean);
      const maxSummaryLines = Math.max(
        ...pair.map((b) => {
          ctx.font = `500 9px ${FONT_SANS}`;
          const namesText = b.bagItems
            .map((e) => `${e.item.done ? '✓' : '☐'}${formatItemDisplayName(e.item)}`)
            .join(' · ');
          return Math.min(3, wrapLines(ctx, namesText, bagCardW - 22).length);
        })
      );
      const bCardH = 31 + maxSummaryLines * 13;
      ensureSpace(bCardH + 7);

      pair.forEach((b, colIdx) => {
        const bx = MARGIN_X + colIdx * (bagCardW + 12);
        drawRoundedRect(ctx, bx, y, bagCardW, bCardH, 7, '#FFFFFF', RULE_LIGHT, 0.9);

        ctx.fillStyle = b.spec.dotColor;
        ctx.beginPath();
        ctx.arc(bx + 12, y + 15, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = INK_PRIMARY;
        ctx.font = `700 10px ${FONT_SANS}`;
        const bagZone = b.spec.defaultCarryOn ? copy.zoneCabin : copy.zoneHold;
        ctx.fillText(`${b.localizedSpec.shortLabel} (${bagZone})`, bx + 21, y + 18.5);

        ctx.textAlign = 'right';
        ctx.fillStyle = b.bagDone === b.bagItems.length ? INK_ACCENT : INK_MUTED;
        ctx.font = `600 9px ${FONT_MONO}`;
        ctx.fillText(
          `${b.bagDone}/${b.bagItems.length} · ${formatItemGramsOrOz(b.bagGrams, unitSystem)}`,
          bx + bagCardW - 10,
          y + 18.5
        );
        ctx.textAlign = 'left';

        ctx.fillStyle = INK_SECONDARY;
        ctx.font = `500 9px ${FONT_SANS}`;
        const namesText = b.bagItems
          .map((e) => `${e.item.done ? '✓' : '☐'}${formatItemDisplayName(e.item)}`)
          .join(' · ');
        const lines = wrapLines(ctx, namesText, bagCardW - 22).slice(0, 3);
        lines.forEach((ln, li) => {
          ctx.fillText(ln, bx + 11, y + 33 + li * 13);
        });
      });

      y += bCardH + 7;
    }
    y += 10;
  }

  if (tripTasks.length > 0) {
    ensureSpace(54);
    ctx.fillStyle = INK_PRIMARY;
    ctx.font = `700 11px ${FONT_SANS}`;
    ctx.fillText(copy.tasksHeading(doneTasksCount, tripTasks.length), MARGIN_X, y + 11);
    y += 18;

    const orderedTasks = [
      ...tripTasks.filter((t) => !t.done),
      ...tripTasks.filter((t) => t.done),
    ];

    orderedTasks.forEach((tk, idx) => {
      ensureSpace(26);
      if (idx % 2 === 0) {
        drawRoundedRect(ctx, MARGIN_X, y, CONTENT_W, 23, 4, '#FAFDFC');
      }
      drawPrintCheckbox(ctx, MARGIN_X + 8, y + 6, 11, tk.done);
      ctx.fillStyle = tk.done ? INK_MUTED : INK_PRIMARY;
      ctx.font = `600 10px ${FONT_SANS}`;
      ctx.fillText(
        truncateLine(ctx, tk.title, CONTENT_W - 190),
        MARGIN_X + 26,
        y + 15
      );

      ctx.textAlign = 'right';
      ctx.fillStyle = INK_SECONDARY;
      ctx.font = `500 9.5px ${FONT_SANS}`;
      ctx.fillText(`${tk.category} · ${tk.timing}`, PAGE_W - MARGIN_X - 8, y + 15);
      ctx.textAlign = 'left';
      y += 24;
    });
  }

  // ============================================================================
  // FINAL SHEET(S): COMPACT PACKING CHECKLIST ENGINEERED FOR PHYSICAL FOLDING
  // Symmetrical 4-Quadrant A6 Pocket Layout around X=397 (105mm) & Y=561.5 (148.5mm)
  // ============================================================================
  if (includeFoldableChecklist) {
    const bagOrderIndex = new Map<SmartBagId, number>(
      SMART_BAG_SPECS.map((s, idx) => [s.id, idx])
    );

    const sortForChecklist = (list: EnrichedPackEntry[]) =>
      [...list].sort((a, b) => {
        // Unpacked items always appear first so remaining items jump out immediately
        if (a.item.done !== b.item.done) return a.item.done ? 1 : -1;
        const bagDiff =
          (bagOrderIndex.get(a.bagId) ?? 99) - (bagOrderIndex.get(b.bagId) ?? 99);
        if (bagDiff !== 0) return bagDiff;
        return b.item.weightGrams - a.item.weightGrams;
      });

    const rawCarryOn = sortForChecklist(allEntries.filter((e) => e.isCarryOn));
    const rawChecked = sortForChecklist(allEntries.filter((e) => !e.isCarryOn));

    // If user is traveling 100% carry-on-only (0 checked items), split evenly across Q2 & Q3 so neither fold panel sits empty
    const carryOnOnlySplit = rawChecked.length === 0 && rawCarryOn.length > 10;
    const splitPivot = carryOnOnlySplit ? Math.ceil(rawCarryOn.length / 2) : rawCarryOn.length;

    const panelAItems = carryOnOnlySplit ? rawCarryOn.slice(0, splitPivot) : rawCarryOn;
    const panelBItems = carryOnOnlySplit ? rawCarryOn.slice(splitPivot) : rawChecked;

    const panelATitle = carryOnOnlySplit ? copy.panelACabinSplit : copy.panelACabinFull;
    const panelBTitle = carryOnOnlySplit ? copy.panelBCabinSplit : copy.panelBHoldFull;

    // Symmetrical A4 Fold Geometry
    const FOLD_OUTER_X = 36;
    const FOLD_OUTER_TOP = 38;
    const FOLD_MID_X = PAGE_W / 2; // 397.0 (105mm)
    const FOLD_MID_Y = PAGE_H / 2; // 561.5 (148.5mm)
    const CREASE_GUTTER = 18; // 18px safety margin on each side of both physical fold creases
    const QUAD_W = FOLD_MID_X - FOLD_OUTER_X - CREASE_GUTTER; // 343px
    const QUAD_H = FOLD_MID_Y - FOLD_OUTER_TOP - CREASE_GUTTER; // 505.5px
    const MAX_ITEMS_PER_QUAD = 46; // 23 rows x 2 compact sub-columns

    const drawFoldGuides = (fCtx: CanvasRenderingContext2D, sheetSubtitle: string) => {
      // Top folding instruction above top safe margin
      fCtx.fillStyle = INK_MUTED;
      fCtx.font = `600 8.8px ${FONT_SANS}`;
      fCtx.fillText(copy.foldGuideTop(sheetSubtitle), FOLD_OUTER_X, 24);

      fCtx.save();
      fCtx.strokeStyle = '#9EB4B0';
      fCtx.lineWidth = 0.9;
      fCtx.setLineDash([5, 4]);

      // Horizontal Center Fold Line (148.5mm)
      fCtx.beginPath();
      fCtx.moveTo(18, FOLD_MID_Y);
      fCtx.lineTo(PAGE_W - 18, FOLD_MID_Y);
      fCtx.stroke();

      // Vertical Center Fold Line (105mm)
      fCtx.beginPath();
      fCtx.moveTo(FOLD_MID_X, 30);
      fCtx.lineTo(FOLD_MID_X, PAGE_H - 30);
      fCtx.stroke();
      fCtx.restore();

      // Center Crease Intersection Pill
      const foldBadge = copy.foldCenterBadge;
      fCtx.font = `600 8px ${FONT_MONO}`;
      const badgeW = fCtx.measureText(foldBadge).width + 14;
      drawRoundedRect(
        fCtx,
        FOLD_MID_X - badgeW / 2,
        FOLD_MID_Y - 7.5,
        badgeW,
        15,
        7.5,
        '#FFFFFF',
        '#B2C7C3',
        0.8
      );
      fCtx.fillStyle = INK_MUTED;
      fCtx.textAlign = 'center';
      fCtx.fillText(foldBadge, FOLD_MID_X, FOLD_MID_Y + 2.8);
      fCtx.textAlign = 'left';
    };

    const drawCompactChecklistQuadrant = (
      fCtx: CanvasRenderingContext2D,
      qx: number,
      qy: number,
      title: string,
      rightMeta: string,
      entries: EnrichedPackEntry[]
    ) => {
      drawRoundedRect(fCtx, qx, qy, QUAD_W, QUAD_H, 8, '#FFFFFF', RULE_STRONG, 0.95);
      // Quadrant Header Bar
      drawRoundedRect(fCtx, qx + 1, qy + 1, QUAD_W - 2, 28, 7, PAPER_TINT);
      fCtx.strokeStyle = RULE_LIGHT;
      fCtx.lineWidth = 0.8;
      fCtx.beginPath();
      fCtx.moveTo(qx, qy + 29);
      fCtx.lineTo(qx + QUAD_W, qy + 29);
      fCtx.stroke();

      fCtx.fillStyle = INK_ACCENT;
      fCtx.font = `700 9.5px ${FONT_MONO}`;
      fCtx.fillText(title, qx + 10, qy + 18.5);

      fCtx.textAlign = 'right';
      fCtx.fillStyle = INK_SECONDARY;
      fCtx.font = `600 8.5px ${FONT_MONO}`;
      fCtx.fillText(rightMeta, qx + QUAD_W - 10, qy + 18.5);
      fCtx.textAlign = 'left';

      if (entries.length === 0) {
        fCtx.fillStyle = INK_MUTED;
        fCtx.font = `500 9.5px ${FONT_SANS}`;
        fCtx.fillText(copy.emptySectionText, qx + 12, qy + 52);
        return;
      }

      const bodyTop = qy + 36;
      const bodyH = QUAD_H - 42;
      // Adaptive layout: spacious 1-column up to 23 items, dense 2-column up to 46 items
      const useTwoCols = entries.length > 23;

      if (!useTwoCols) {
        const rowH = Math.min(20, Math.floor(bodyH / Math.max(1, entries.length)));
        entries.slice(0, 23).forEach((entry, idx) => {
          const ry = bodyTop + idx * rowH;
          if (idx > 0) {
            fCtx.strokeStyle = '#EEF4F3';
            fCtx.lineWidth = 0.6;
            fCtx.beginPath();
            fCtx.moveTo(qx + 10, ry);
            fCtx.lineTo(qx + QUAD_W - 10, ry);
            fCtx.stroke();
          }

          drawPrintCheckbox(fCtx, qx + 10, ry + (rowH - 10) / 2, 10, entry.item.done);

          const morningDot = entry.item.morningOfDeparture ? copy.morningDotBadge : '';
          const itemLabel = `${formatItemDisplayName(entry.item)}${morningDot}`;

          fCtx.fillStyle = entry.item.done ? INK_MUTED : INK_PRIMARY;
          fCtx.font = `${entry.item.done ? '500' : '600'} 9.5px ${FONT_SANS}`;
          fCtx.fillText(
            truncateLine(fCtx, itemLabel, QUAD_W - 122),
            qx + 25,
            ry + rowH * 0.68
          );

          fCtx.textAlign = 'right';
          fCtx.fillStyle = INK_MUTED;
          fCtx.font = `500 8.5px ${FONT_SANS}`;
          const metaStr = `${entry.bagLabel} · ${formatItemGramsOrOz(entry.item.weightGrams, unitSystem)}`;
          fCtx.fillText(
            truncateLine(fCtx, metaStr, 92),
            qx + QUAD_W - 10,
            ry + rowH * 0.68
          );
          fCtx.textAlign = 'left';
        });
      } else {
        const subColW = (QUAD_W - 24) / 2;
        const maxRows = 23;
        const rowH = Math.floor(bodyH / maxRows);

        // Subtle center divider between the two micro-columns
        fCtx.strokeStyle = '#EDF3F2';
        fCtx.lineWidth = 0.7;
        fCtx.beginPath();
        fCtx.moveTo(qx + QUAD_W / 2, bodyTop);
        fCtx.lineTo(qx + QUAD_W / 2, qy + QUAD_H - 8);
        fCtx.stroke();

        entries.slice(0, MAX_ITEMS_PER_QUAD).forEach((entry, idx) => {
          const col = Math.floor(idx / maxRows);
          const row = idx % maxRows;
          const cx = qx + 9 + col * (subColW + 6);
          const ry = bodyTop + row * rowH;

          drawPrintCheckbox(fCtx, cx, ry + (rowH - 9) / 2, 9, entry.item.done);

          const rawLabel = formatItemDisplayName(entry.item);
          fCtx.fillStyle = entry.item.done ? INK_MUTED : INK_PRIMARY;
          fCtx.font = `${entry.item.done ? '500' : '600'} 8.6px ${FONT_SANS}`;
          fCtx.fillText(
            truncateLine(fCtx, rawLabel, subColW - 44),
            cx + 12.5,
            ry + rowH * 0.69
          );

          fCtx.textAlign = 'right';
          fCtx.fillStyle = INK_MUTED;
          fCtx.font = `500 7.6px ${FONT_SANS}`;
          fCtx.fillText(
            truncateLine(fCtx, entry.bagLabel, 30),
            cx + subColW - 2,
            ry + rowH * 0.69
          );
          fCtx.textAlign = 'left';
        });
      }
    };

    // ----- PRIMARY FOLDABLE POCKET SHEET -----
    const { ctx: fCtx } = createCanvasPage('foldable');
    drawFoldGuides(
      fCtx,
      `${destinationTitle} (${trip.setup.departureDate})`
    );

    const q1X = FOLD_OUTER_X;
    const q1Y = FOLD_OUTER_TOP;
    const q2X = FOLD_MID_X + CREASE_GUTTER;
    const q2Y = FOLD_OUTER_TOP;
    const q3X = FOLD_OUTER_X;
    const q3Y = FOLD_MID_Y + CREASE_GUTTER;
    const q4X = FOLD_MID_X + CREASE_GUTTER;
    const q4Y = FOLD_MID_Y + CREASE_GUTTER;

    // === QUADRANT 1 (Top-Left): POCKET FRONT CARD + MORNING GRAB + PENDING TASKS ===
    drawRoundedRect(fCtx, q1X, q1Y, QUAD_W, QUAD_H, 8, '#FFFFFF', RULE_STRONG, 0.95);
    drawRoundedRect(fCtx, q1X + 1, q1Y + 1, QUAD_W - 2, 66, 7, PAPER_TINT);
    fCtx.strokeStyle = RULE_LIGHT;
    fCtx.lineWidth = 0.8;
    fCtx.beginPath();
    fCtx.moveTo(q1X, q1Y + 67);
    fCtx.lineTo(q1X + QUAD_W, q1Y + 67);
    fCtx.stroke();

    fCtx.fillStyle = INK_ACCENT;
    fCtx.font = `700 8.8px ${FONT_MONO}`;
    fCtx.fillText(copy.q1FrontBadge, q1X + 11, q1Y + 17);

    fCtx.fillStyle = INK_PRIMARY;
    fCtx.font = `800 14px ${FONT_SANS}`;
    fCtx.fillText(
      truncateLine(fCtx, destinationTitle, QUAD_W - 22),
      q1X + 11,
      q1Y + 38
    );

    fCtx.fillStyle = INK_SECONDARY;
    fCtx.font = `600 8.8px ${FONT_MONO}`;
    const q1WeightMeta = copy.q1WeightMeta(
      trip.setup.departureDate,
      donePackCount,
      totalPackCount,
      formatTotalKgOrLb(carryOnGrams, unitSystem),
      formatTotalKgOrLb(checkedGrams, unitSystem)
    );
    fCtx.fillText(truncateLine(fCtx, q1WeightMeta, QUAD_W - 22), q1X + 11, q1Y + 56);

    // Morning Last-Minute Grab Box inside Q1
    let q1CursorY = q1Y + 76;
    const fallbackMorning = copy.fallbackMorning;

    const morningRows =
      morningEntries.length > 0
        ? morningEntries
            .slice()
            .sort((a, b) => Number(a.item.done) - Number(b.item.done))
            .slice(0, 9)
            .map((e) => ({
              title: formatItemDisplayName(e.item),
              sub: e.bagLabel,
              done: e.item.done,
            }))
        : fallbackMorning;

    const morningBoxH = 26 + morningRows.length * 21 + 6;
    drawRoundedRect(
      fCtx,
      q1X + 10,
      q1CursorY,
      QUAD_W - 20,
      morningBoxH,
      6,
      PAPER_WARM,
      '#DEC978',
      0.9
    );
    fCtx.fillStyle = '#73580B';
    fCtx.font = `700 9.2px ${FONT_SANS}`;
    fCtx.fillText(copy.q1MorningHeading, q1X + 18, q1CursorY + 16);

    morningRows.forEach((m, idx) => {
      const my = q1CursorY + 24 + idx * 21;
      drawPrintCheckbox(fCtx, q1X + 18, my + 3, 9.5, m.done, '#8C6E14');
      fCtx.fillStyle = m.done ? INK_MUTED : INK_PRIMARY;
      fCtx.font = `600 9px ${FONT_SANS}`;
      fCtx.fillText(truncateLine(fCtx, m.title, QUAD_W - 134), q1X + 33, my + 11.5);

      fCtx.textAlign = 'right';
      fCtx.fillStyle = '#7C6318';
      fCtx.font = `500 8px ${FONT_SANS}`;
      fCtx.fillText(truncateLine(fCtx, m.sub, 84), q1X + QUAD_W - 18, my + 11.5);
      fCtx.textAlign = 'left';
    });

    q1CursorY += morningBoxH + 10;

    // Remaining space in Q1: To-Buy Gear & Pending Pre-Trip Tasks
    const remainingQ1H = q1Y + QUAD_H - q1CursorY - 10;
    if (remainingQ1H >= 64) {
      drawRoundedRect(
        fCtx,
        q1X + 10,
        q1CursorY,
        QUAD_W - 20,
        remainingQ1H,
        6,
        '#FFFFFF',
        RULE_LIGHT,
        0.85
      );
      fCtx.fillStyle = INK_PRIMARY;
      fCtx.font = `700 9px ${FONT_SANS}`;
      fCtx.fillText(copy.q1ToBuyHeading, q1X + 18, q1CursorY + 16);

      const actionLines: { label: string; tag: string; done: boolean }[] = [
        ...toBuyEntries.map((e) => ({
          label: formatItemDisplayName(e.item),
          tag: copy.toBuyTag,
          done: false,
        })),
        ...pendingTasks.map((t) => ({
          label: t.title,
          tag: t.timing,
          done: false,
        })),
      ];

      const maxActionRows = Math.max(1, Math.floor((remainingQ1H - 26) / 19));
      if (actionLines.length === 0) {
        fCtx.fillStyle = INK_ACCENT;
        fCtx.font = `600 9px ${FONT_SANS}`;
        fCtx.fillText(copy.q1AllReady, q1X + 18, q1CursorY + 38);
      } else {
        actionLines.slice(0, maxActionRows).forEach((act, idx) => {
          const ay = q1CursorY + 24 + idx * 19;
          drawPrintCheckbox(fCtx, q1X + 18, ay + 2.5, 9, act.done, '#A84E38');
          fCtx.fillStyle = INK_PRIMARY;
          fCtx.font = `500 8.8px ${FONT_SANS}`;
          fCtx.fillText(truncateLine(fCtx, act.label, QUAD_W - 126), q1X + 32, ay + 10.5);

          fCtx.textAlign = 'right';
          fCtx.fillStyle = INK_MUTED;
          fCtx.font = `500 7.8px ${FONT_SANS}`;
          fCtx.fillText(truncateLine(fCtx, act.tag, 76), q1X + QUAD_W - 18, ay + 10.5);
          fCtx.textAlign = 'left';
        });
      }
    }

    // === QUADRANT 2 (Top-Right): CABIN / CARRY-ON CHECKLIST ===
    const panelAGrams = panelAItems.reduce((s, e) => s + e.item.weightGrams, 0);
    const panelAPending = panelAItems.filter((e) => !e.item.done).length;
    drawCompactChecklistQuadrant(
      fCtx,
      q2X,
      q2Y,
      panelATitle,
      copy.quadProgress(
        panelAPending,
        panelAItems.length,
        formatTotalKgOrLb(panelAGrams, unitSystem)
      ),
      panelAItems
    );

    // === QUADRANT 3 (Bottom-Left): CHECKED / HOLD LUGGAGE CHECKLIST ===
    const panelBGrams = panelBItems.reduce((s, e) => s + e.item.weightGrams, 0);
    const panelBPending = panelBItems.filter((e) => !e.item.done).length;
    drawCompactChecklistQuadrant(
      fCtx,
      q3X,
      q3Y,
      panelBTitle,
      copy.quadProgress(
        panelBPending,
        panelBItems.length,
        formatTotalKgOrLb(panelBGrams, unitSystem)
      ),
      panelBItems
    );

    // === QUADRANT 4 (Bottom-Right): POCKET BACK CARD — ROUTE SNAPSHOT, LIFELINE & MEMO ===
    drawRoundedRect(fCtx, q4X, q4Y, QUAD_W, QUAD_H, 8, '#FFFFFF', RULE_STRONG, 0.95);
    drawRoundedRect(fCtx, q4X + 1, q4Y + 1, QUAD_W - 2, 28, 7, PAPER_TINT);
    fCtx.strokeStyle = RULE_LIGHT;
    fCtx.lineWidth = 0.8;
    fCtx.beginPath();
    fCtx.moveTo(q4X, q4Y + 29);
    fCtx.lineTo(q4X + QUAD_W, q4Y + 29);
    fCtx.stroke();

    fCtx.fillStyle = INK_ACCENT;
    fCtx.font = `700 9.5px ${FONT_MONO}`;
    fCtx.fillText(copy.q4BackBadge, q4X + 10, q4Y + 18.5);

    let q4CursorY = q4Y + 42;
    fCtx.fillStyle = INK_PRIMARY;
    fCtx.font = `700 9px ${FONT_SANS}`;
    fCtx.fillText(copy.q4RouteHeading, q4X + 12, q4CursorY);
    q4CursorY += 14;

    const maxRouteDays = Math.min(safeDays, 8);
    for (let d = 1; d <= maxRouteDays; d += 1) {
      const dNodes = sortNodesChronologically(
        trip.timeline.filter((n) => (n.day ?? 1) === d)
      );
      const city = getCityForDay(
        trip.setup.cities,
        d,
        safeDays,
        dNodes,
        undefined,
        trip.setup.cityDays
      );
      const stopsStr =
        dNodes.length > 0
          ? dNodes.map((n) => n.title).join(' -> ')
          : copy.freeExploration;
      fCtx.fillStyle = INK_ACCENT;
      fCtx.font = `700 8.5px ${FONT_MONO}`;
      const dayTag = `${copy.dayUnitShort}${d}`;
      fCtx.fillText(dayTag, q4X + 12, q4CursorY);

      fCtx.fillStyle = INK_PRIMARY;
      fCtx.font = `500 8.6px ${FONT_SANS}`;
      fCtx.fillText(
        truncateLine(fCtx, `${city}: ${stopsStr}`, QUAD_W - 44),
        q4X + 32,
        q4CursorY
      );
      q4CursorY += 17;
    }
    if (safeDays > maxRouteDays) {
      fCtx.fillStyle = INK_MUTED;
      fCtx.font = `500 8px ${FONT_SANS}`;
      fCtx.fillText(
        copy.moreDaysInHandbook(safeDays - maxRouteDays),
        q4X + 32,
        q4CursorY
      );
      q4CursorY += 14;
    }

    q4CursorY += 6;
    // Emergency & Meetup Lifeline Block
    drawRoundedRect(
      fCtx,
      q4X + 10,
      q4CursorY,
      QUAD_W - 20,
      98,
      6,
      PAPER_TINT,
      RULE_LIGHT,
      0.85
    );
    const lifelineRows = [
      {
        k: copy.lifelineMeetup,
        v: `${trip.meetup.time} · ${trip.meetup.placeName}`,
      },
      {
        k: copy.lifelineTransit,
        v: `${trip.intel.transitPassName} · ${trip.intel.plugType} (${trip.intel.voltage})`,
      },
      {
        k: copy.lifelineTaxFree,
        v: `${trip.intel.vatExitAirport} (${copy.lifelineMinPrefix} ${sym}${trip.intel.vatThresholdLocal})`,
      },
      {
        k: copy.lifelineSos,
        v: trip.intel.localEmergencyNote,
      },
    ];
    lifelineRows.forEach((lr, idx) => {
      const ly = q4CursorY + 18 + idx * 21;
      fCtx.fillStyle = INK_MUTED;
      fCtx.font = `700 8px ${FONT_MONO}`;
      fCtx.fillText(lr.k, q4X + 18, ly);
      fCtx.fillStyle = INK_PRIMARY;
      fCtx.font = `500 8.5px ${FONT_SANS}`;
      fCtx.fillText(truncateLine(fCtx, lr.v, QUAD_W - 88), q4X + 68, ly);
    });
    q4CursorY += 112;

    // Handwritten Field Memo Ruled Lines at bottom of Q4
    const memoSpace = q4Y + QUAD_H - q4CursorY - 12;
    if (memoSpace >= 42) {
      fCtx.fillStyle = INK_MUTED;
      fCtx.font = `700 8px ${FONT_MONO}`;
      fCtx.fillText(copy.q4MemoHeading, q4X + 12, q4CursorY + 8);
      const lineCount = Math.min(4, Math.floor((memoSpace - 14) / 20));
      fCtx.strokeStyle = '#CBDAD7';
      fCtx.lineWidth = 0.75;
      for (let li = 1; li <= lineCount; li += 1) {
        const ruleY = q4CursorY + 10 + li * 20;
        fCtx.beginPath();
        fCtx.moveTo(q4X + 12, ruleY);
        fCtx.lineTo(q4X + QUAD_W - 12, ruleY);
        fCtx.stroke();
      }
    }

    // Overflow Foldable Sheet if user has >46 items in either Panel A or Panel B
    const overflowEntries = [
      ...panelAItems.slice(MAX_ITEMS_PER_QUAD),
      ...panelBItems.slice(MAX_ITEMS_PER_QUAD),
    ];
    if (overflowEntries.length > 0) {
      const { ctx: ofCtx } = createCanvasPage('foldable');
      drawFoldGuides(ofCtx, copy.overflowSubtitle);
      const chunks = [
        overflowEntries.slice(0, MAX_ITEMS_PER_QUAD),
        overflowEntries.slice(MAX_ITEMS_PER_QUAD, MAX_ITEMS_PER_QUAD * 2),
        overflowEntries.slice(MAX_ITEMS_PER_QUAD * 2, MAX_ITEMS_PER_QUAD * 3),
        overflowEntries.slice(MAX_ITEMS_PER_QUAD * 3, MAX_ITEMS_PER_QUAD * 4),
      ];
      const coords = [
        [q1X, q1Y],
        [q2X, q2Y],
        [q3X, q3Y],
        [q4X, q4Y],
      ];
      chunks.forEach((chunk, cIdx) => {
        if (chunk.length === 0) return;
        const [cx, cyPos] = coords[cIdx];
        drawCompactChecklistQuadrant(
          ofCtx,
          cx,
          cyPos,
          copy.overflowTitle(cIdx + 1),
          copy.itemsCountLabel(chunk.length),
          chunk
        );
      });
    }
  }

  // ============================================================================
  // STAMP FOOTERS & ASSEMBLE HIGH-RESOLUTION A4 PDF
  // ============================================================================
  const totalPages = pageRecords.length;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  doc.setProperties({
    title: copy.pdfTitle(destinationTitle),
    subject:
      'Print-Friendly A4 Travel Handbook with Destination Photo Cover and Foldable Pocket Packing Checklist',
    creator: 'Trip Kit',
  });

  pageRecords.forEach((rec, idx) => {
    const pCtx = rec.canvas.getContext('2d')!;
    const footerX = rec.kind === 'foldable' ? 36 : MARGIN_X;
    const footerY = rec.kind === 'foldable' ? PAGE_H - 15 : PAGE_H - 24;

    pCtx.fillStyle = INK_MUTED;
    pCtx.font = `500 9px ${FONT_SANS}`;
    pCtx.textAlign = 'left';
    const kindLabel =
      rec.kind === 'cover'
        ? copy.kindCover
        : rec.kind === 'foldable'
        ? copy.kindFoldable
        : copy.kindHandbook;
    pCtx.fillText(`Trip Kit · ${destinationTitle} · ${kindLabel}`, footerX, footerY);

    pCtx.textAlign = 'right';
    pCtx.font = `500 9px ${FONT_MONO}`;
    pCtx.fillText(copy.pageCounter(idx + 1, totalPages), PAGE_W - footerX, footerY);
    pCtx.textAlign = 'left';

    if (idx > 0) doc.addPage();
    // Use high-quality JPEG for photo cover page (keeps PDF lightweight) and lossless PNG for crisp vector-sharp text/checklists
    if (rec.kind === 'cover') {
      const jpgData = rec.canvas.toDataURL('image/jpeg', 0.92);
      doc.addImage(jpgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    } else {
      const pngData = rec.canvas.toDataURL('image/png');
      doc.addImage(pngData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    }
  });

  const safeTitle = destinationTitle
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9_-]+/g, '-')
    .replace(/^-|-$/g, '');
  const filename = `Trip-Kit-${safeTitle || 'Trip'}-A4-Handbook.pdf`;
  doc.save(filename);
  return filename;
}
