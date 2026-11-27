import { jsPDF } from 'jspdf';
import type {
  MemoryPhotoMeta,
  PhotobookDraft,
  SavedTripEntry,
} from '../types';
import { loadAllMemoryPhotoBlobsMap } from './memoryPhotoVault';
import {
  buildPrintPhotobookPages,
  getPhotobookGridCount,
  type PhotobookPageKind,
} from './photobookPagePlan';

const FONT_SANS =
  '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif';
const FONT_SERIF =
  '"Playfair Display", "Cormorant Garamond", "Songti SC", "STSong", "Noto Serif SC", Georgia, serif';
const FONT_MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

const BLEED_MM = 3;

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return [];
  const lines: string[] = [];
  let cur = '';
  for (const ch of Array.from(text)) {
    if (ch === '\n') {
      lines.push(cur);
      cur = '';
      continue;
    }
    const next = cur + ch;
    if (ctx.measureText(next).width > maxWidth && cur.length > 0) {
      lines.push(cur);
      cur = ch;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function loadImageElement(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawCoverFitImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 0
) {
  ctx.save();
  if (radius > 0) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.clip();
  } else {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
  }
  const imgRatio = (img.naturalWidth || img.width) / Math.max(1, img.naturalHeight || img.height);
  const boxRatio = w / h;
  let drawW = w;
  let drawH = h;
  let drawX = x;
  let drawY = y;
  if (imgRatio > boxRatio) {
    drawH = h;
    drawW = h * imgRatio;
    drawX = x - (drawW - w) / 2;
  } else {
    drawW = w;
    drawH = w / imgRatio;
    drawY = y - (drawH - h) / 2;
  }
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  ctx.restore();
}

function drawCropMarks(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  bleedPx: number
) {
  ctx.save();
  ctx.strokeStyle = 'rgba(21, 43, 41, 0.48)';
  ctx.lineWidth = 1.4;
  const markLen = Math.max(10, bleedPx * 0.72);
  const gap = 3;

  // Top-left
  ctx.beginPath();
  ctx.moveTo(bleedPx, 0);
  ctx.lineTo(bleedPx, Math.max(0, bleedPx - gap));
  ctx.moveTo(0, bleedPx);
  ctx.lineTo(Math.max(0, bleedPx - gap), bleedPx);
  // Top-right
  ctx.moveTo(canvasW - bleedPx, 0);
  ctx.lineTo(canvasW - bleedPx, Math.max(0, bleedPx - gap));
  ctx.moveTo(canvasW - markLen, bleedPx);
  ctx.lineTo(canvasW, bleedPx);
  // Bottom-left
  ctx.moveTo(bleedPx, canvasH - markLen);
  ctx.lineTo(bleedPx, canvasH);
  ctx.moveTo(0, canvasH - bleedPx);
  ctx.lineTo(Math.max(0, bleedPx - gap), canvasH - bleedPx);
  // Bottom-right
  ctx.moveTo(canvasW - bleedPx, canvasH - markLen);
  ctx.lineTo(canvasW - bleedPx, canvasH);
  ctx.moveTo(canvasW - markLen, canvasH - bleedPx);
  ctx.lineTo(canvasW, canvasH - bleedPx);
  ctx.stroke();
  ctx.restore();
}

/**
 * Exports a print-ready Photobook PDF with real 3mm outer bleed, corner trim crop
 * marks and multiple-of-4 signature padding. The page order is taken verbatim
 * from photobookPagePlan, i.e. exactly the sequence shown in the studio preview.
 */
export async function exportPrintReadyPhotobookPdf(params: {
  draft: PhotobookDraft;
  photos: MemoryPhotoMeta[];
  trips: SavedTripEntry[];
  includeCropMarks?: boolean;
}): Promise<{ fileName: string; totalPages: number; pageKinds: PhotobookPageKind[] }> {
  const { draft, photos, trips, includeCropMarks = true } = params;
  const isSquare = draft.formatId === 'square_210';
  const trimWmm = isSquare ? 210 : 148;
  const trimHmm = 210;
  const fullWmm = trimWmm + BLEED_MM * 2;
  const fullHmm = trimHmm + BLEED_MM * 2;

  // High-res print canvas (~7.5 px per mm)
  const PX_PER_MM = 7.5;
  const canvasW = Math.round(fullWmm * PX_PER_MM);
  const canvasH = Math.round(fullHmm * PX_PER_MM);
  const bleedPx = Math.round(BLEED_MM * PX_PER_MM);
  const safeMarginPx = bleedPx + Math.round(14 * PX_PER_MM);

  const curatedPhotos = draft.includedPhotoIds
    .map((id) => photos.find((p) => p.id === id))
    .filter((p): p is MemoryPhotoMeta => Boolean(p));

  const blobMap = await loadAllMemoryPhotoBlobsMap(curatedPhotos.map((p) => p.id));
  const loadedImages: Record<string, HTMLImageElement | null> = {};
  await Promise.all(
    curatedPhotos.map(async (p) => {
      const src = blobMap[p.id]?.fullDataUrl || p.sampleImageUrl || '';
      loadedImages[p.id] = await loadImageElement(src);
    })
  );

  const pages = buildPrintPhotobookPages({ draft, photos, trips });
  const gridCount = getPhotobookGridCount(draft);

  const isScrapbook = draft.templateId === 'scrapbook';
  const isEditorial = draft.templateId === 'editorial';
  const paperBg = isScrapbook ? '#FBF8F1' : isEditorial ? '#F9FBFA' : '#FFFFFF';
  const inkPrimary = '#152B29';
  const inkMuted = '#5B7370';
  const accentHex = isScrapbook ? '#B85E2B' : isEditorial ? '#078C88' : '#152B29';

  const coverHeroImg = curatedPhotos[0] ? loadedImages[curatedPhotos[0].id] : null;
  const routeNames = trips
    .filter((t) => draft.selectedTripIds.includes(t.id))
    .map((t) => t.state.intel.routeTitle || t.state.setup.cities.join(' · '))
    .join('  /  ');

  type RenderSlideFn = (ctx: CanvasRenderingContext2D, pageNum: number, totalP: number) => void;
  const pageRenderers: RenderSlideFn[] = [];
  let photoOrdinal = 0;

  const drawPageNumber = (ctx: CanvasRenderingContext2D, pageNum: number) => {
    ctx.fillStyle = inkMuted;
    ctx.textAlign = 'right';
    ctx.font = `500 ${Math.round(canvasW * 0.017)}px ${FONT_MONO}`;
    ctx.fillText(String(pageNum), canvasW - safeMarginPx, canvasH - safeMarginPx * 0.7);
  };

  for (const page of pages) {
    if (page.kind === 'cover') {
      pageRenderers.push((ctx) => {
        ctx.fillStyle = isScrapbook ? '#EFE8D8' : '#093B35';
        ctx.fillRect(0, 0, canvasW, canvasH);

        if (isScrapbook) {
          const frameW = canvasW - safeMarginPx * 2.2;
          const frameH = canvasH * 0.56;
          const frameX = (canvasW - frameW) / 2;
          const frameY = safeMarginPx * 1.3;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(frameX - 18, frameY - 18, frameW + 36, frameH + 68);
          if (coverHeroImg) {
            drawCoverFitImage(ctx, coverHeroImg, frameX, frameY, frameW, frameH);
          }
          ctx.fillStyle = inkPrimary;
          ctx.textAlign = 'center';
          ctx.font = `700 ${Math.round(canvasW * 0.046)}px ${FONT_SERIF}`;
          ctx.fillText(draft.bookTitle, canvasW / 2, frameY + frameH + safeMarginPx * 1.15);
          ctx.fillStyle = inkMuted;
          ctx.font = `500 ${Math.round(canvasW * 0.021)}px ${FONT_SANS}`;
          ctx.fillText(draft.bookSubtitle, canvasW / 2, frameY + frameH + safeMarginPx * 1.55);
        } else {
          if (coverHeroImg) {
            drawCoverFitImage(ctx, coverHeroImg, 0, 0, canvasW, canvasH * 0.68);
          }
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, canvasH * 0.68, canvasW, canvasH * 0.32);
          ctx.fillStyle = inkPrimary;
          ctx.textAlign = 'left';
          ctx.font = `700 ${Math.round(canvasW * 0.048)}px ${isEditorial ? FONT_SANS : FONT_SERIF}`;
          const titleLines = wrapCanvasText(ctx, draft.bookTitle, canvasW - safeMarginPx * 2);
          titleLines.slice(0, 2).forEach((ln, idx) => {
            ctx.fillText(ln, safeMarginPx, canvasH * 0.77 + idx * Math.round(canvasW * 0.056));
          });
          ctx.fillStyle = inkMuted;
          ctx.font = `500 ${Math.round(canvasW * 0.021)}px ${FONT_SANS}`;
          ctx.fillText(
            draft.bookSubtitle,
            safeMarginPx,
            canvasH * 0.77 + Math.min(2, titleLines.length) * Math.round(canvasW * 0.056) + 16
          );
        }
      });
      continue;
    }

    if (page.kind === 'epigraph') {
      pageRenderers.push((ctx) => {
        ctx.fillStyle = paperBg;
        ctx.fillRect(0, 0, canvasW, canvasH);
        ctx.fillStyle = accentHex;
        ctx.textAlign = 'center';
        ctx.font = `600 ${Math.round(canvasW * 0.018)}px ${FONT_MONO}`;
        ctx.fillText('TRAVEL MONOGRAPH · EDITION I', canvasW / 2, canvasH * 0.32);

        ctx.fillStyle = inkPrimary;
        ctx.font = `italic 500 ${Math.round(canvasW * 0.026)}px ${FONT_SERIF}`;
        const epiLines = wrapCanvasText(ctx, `“${draft.epigraph}”`, canvasW - safeMarginPx * 3);
        epiLines.slice(0, 4).forEach((ln, i) => {
          ctx.fillText(ln, canvasW / 2, canvasH * 0.44 + i * Math.round(canvasW * 0.042));
        });

        ctx.fillStyle = inkMuted;
        ctx.font = `500 ${Math.round(canvasW * 0.019)}px ${FONT_SANS}`;
        ctx.fillText(routeNames, canvasW / 2, canvasH * 0.74);
      });
      continue;
    }

    if (page.kind === 'chapter' && page.chapter) {
      const ch = page.chapter;
      pageRenderers.push((ctx, pNum) => {
        ctx.fillStyle = paperBg;
        ctx.fillRect(0, 0, canvasW, canvasH);
        ctx.textAlign = 'left';
        ctx.fillStyle = accentHex;
        ctx.font = `600 ${Math.round(canvasW * 0.02)}px ${FONT_MONO}`;
        ctx.fillText(
          `CHAPTER ${String(ch.chapterNumber).padStart(2, '0')} · ${ch.dateSpanLabel}`,
          safeMarginPx,
          safeMarginPx * 1.8
        );

        ctx.fillStyle = inkPrimary;
        ctx.font = `700 ${Math.round(canvasW * 0.046)}px ${FONT_SERIF}`;
        const cTitleLines = wrapCanvasText(ctx, ch.chapterTitle, canvasW - safeMarginPx * 2);
        cTitleLines.slice(0, 2).forEach((ln, idx) => {
          ctx.fillText(ln, safeMarginPx, safeMarginPx * 2.5 + idx * Math.round(canvasW * 0.055));
        });

        ctx.strokeStyle = '#DCE8E5';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(safeMarginPx, canvasH * 0.42);
        ctx.lineTo(canvasW - safeMarginPx, canvasH * 0.42);
        ctx.stroke();

        ctx.fillStyle = '#2B4441';
        ctx.font = `400 ${Math.round(canvasW * 0.024)}px ${FONT_SANS}`;
        const introLines = wrapCanvasText(ctx, ch.narrativeIntro, canvasW - safeMarginPx * 2);
        introLines.slice(0, 6).forEach((ln, idx) => {
          ctx.fillText(ln, safeMarginPx, canvasH * 0.5 + idx * Math.round(canvasW * 0.04));
        });

        if (ch.highlightsLine) {
          ctx.fillStyle = inkMuted;
          ctx.font = `500 ${Math.round(canvasW * 0.018)}px ${FONT_MONO}`;
          ctx.fillText(ch.highlightsLine.slice(0, 68), safeMarginPx, canvasH - safeMarginPx * 1.3);
        }
        drawPageNumber(ctx, pNum);
      });
      continue;
    }

    if (page.kind === 'photo' && page.photo) {
      const photo = page.photo;
      const idx = photoOrdinal++;
      const cap = draft.photoCaptions[photo.id];
      const imgEl = loadedImages[photo.id];
      const headline = cap?.headline || photo.matchedStopTitle || photo.matchedCity;
      const story =
        cap?.storyCaption ||
        photo.userNote ||
        `Day ${photo.matchedDay} · ${photo.matchedCity}${photo.matchedStopTitle ? ` · ${photo.matchedStopTitle}` : ''}`;

      pageRenderers.push((ctx, pNum) => {
        ctx.fillStyle = paperBg;
        ctx.fillRect(0, 0, canvasW, canvasH);

        if (idx % 3 === 0 && cap?.layoutHint !== 'polaroid_pair') {
          const imgH = Math.round(canvasH * 0.66);
          if (imgEl) {
            drawCoverFitImage(ctx, imgEl, 0, 0, canvasW, imgH);
          }
          ctx.textAlign = 'left';
          ctx.fillStyle = accentHex;
          ctx.font = `600 ${Math.round(canvasW * 0.017)}px ${FONT_MONO}`;
          const metaLine = `DAY ${photo.matchedDay} · ${photo.matchedCity.toUpperCase()}${
            photo.lat !== undefined && photo.lng !== undefined
              ? ` · ${photo.lat.toFixed(3)}°N, ${photo.lng.toFixed(3)}°E`
              : ''
          }`;
          ctx.fillText(metaLine, safeMarginPx, imgH + safeMarginPx * 0.72);

          ctx.fillStyle = inkPrimary;
          ctx.font = `700 ${Math.round(canvasW * 0.028)}px ${FONT_SERIF}`;
          ctx.fillText(headline.slice(0, 36), safeMarginPx, imgH + safeMarginPx * 1.18);

          ctx.fillStyle = '#3B5552';
          ctx.font = `400 ${Math.round(canvasW * 0.021)}px ${FONT_SANS}`;
          const lines = wrapCanvasText(ctx, story, canvasW - safeMarginPx * 2);
          lines.slice(0, 3).forEach((ln, lIdx) => {
            ctx.fillText(
              ln,
              safeMarginPx,
              imgH + safeMarginPx * 1.62 + lIdx * Math.round(canvasW * 0.034)
            );
          });
        } else {
          const boxW = canvasW - safeMarginPx * 2;
          const boxH = Math.round(canvasH * 0.56);
          if (isScrapbook) {
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = 'rgba(21,43,41,0.10)';
            ctx.shadowBlur = 24;
            ctx.fillRect(safeMarginPx - 14, safeMarginPx - 14, boxW + 28, boxH + 46);
            ctx.shadowBlur = 0;
          }
          if (imgEl) {
            drawCoverFitImage(ctx, imgEl, safeMarginPx, safeMarginPx, boxW, boxH, isScrapbook ? 0 : 8);
          }
          ctx.textAlign = 'left';
          ctx.fillStyle = inkPrimary;
          ctx.font = `700 ${Math.round(canvasW * 0.028)}px ${FONT_SERIF}`;
          ctx.fillText(headline.slice(0, 36), safeMarginPx, safeMarginPx + boxH + safeMarginPx * 0.75);

          ctx.fillStyle = '#3B5552';
          ctx.font = `400 ${Math.round(canvasW * 0.021)}px ${FONT_SANS}`;
          const lines = wrapCanvasText(ctx, story, boxW);
          lines.slice(0, 3).forEach((ln, lIdx) => {
            ctx.fillText(
              ln,
              safeMarginPx,
              safeMarginPx + boxH + safeMarginPx * 1.2 + lIdx * Math.round(canvasW * 0.034)
            );
          });

          ctx.fillStyle = inkMuted;
          ctx.font = `500 ${Math.round(canvasW * 0.016)}px ${FONT_MONO}`;
          ctx.fillText(
            `D${photo.matchedDay} · ${photo.matchedCity}${photo.cameraLabel ? ` · ${photo.cameraLabel}` : ''}`,
            safeMarginPx,
            canvasH - safeMarginPx * 0.7
          );
        }
        drawPageNumber(ctx, pNum);
      });
      continue;
    }

    if (page.kind === 'photo_grid') {
      const group = page.photos || [];
      const gc = page.gridCount || gridCount;
      const cols = gc === 4 ? 2 : 3;
      const rows = gc === 4 ? 2 : gc === 6 ? 2 : 3;

      pageRenderers.push((ctx, pNum) => {
        ctx.fillStyle = paperBg;
        ctx.fillRect(0, 0, canvasW, canvasH);
        const padX = safeMarginPx;
        const top = safeMarginPx * 1.5;

        ctx.textAlign = 'left';
        ctx.fillStyle = accentHex;
        ctx.font = `600 ${Math.round(canvasW * 0.017)}px ${FONT_MONO}`;
        ctx.fillText(`${page.label.split(' · ')[0]} · CONTACT SHEET`, padX, top);
        ctx.textAlign = 'right';
        ctx.fillStyle = inkMuted;
        ctx.fillText(`${group.length} / ${gc} FRAMES`, canvasW - padX, top);

        ctx.strokeStyle = '#DCE8E5';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(padX, top + safeMarginPx * 0.35);
        ctx.lineTo(canvasW - padX, top + safeMarginPx * 0.35);
        ctx.stroke();

        const gridTop = top + safeMarginPx * 0.8;
        const gridBottom = canvasH - safeMarginPx * 1.5;
        const gap = Math.round(canvasW * 0.018);
        const cellW = (canvasW - padX * 2 - gap * (cols - 1)) / cols;
        const cellH = (gridBottom - gridTop - gap * (rows - 1)) / rows;

        for (let i = 0; i < gc; i += 1) {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = padX + col * (cellW + gap);
          const y = gridTop + row * (cellH + gap);
          const ph = group[i];
          if (!ph) {
            ctx.save();
            ctx.setLineDash([8, 8]);
            ctx.strokeStyle = '#D8E3E0';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, cellW, cellH);
            ctx.restore();
            continue;
          }
          const imgEl = loadedImages[ph.id];
          ctx.fillStyle = '#E9EFED';
          ctx.fillRect(x, y, cellW, cellH);
          if (imgEl) {
            drawCoverFitImage(ctx, imgEl, x, y, cellW, cellH);
          }
          const capBarH = Math.round(canvasW * 0.03);
          ctx.fillStyle = 'rgba(9,59,53,0.74)';
          ctx.fillRect(x, y + cellH - capBarH, cellW, capBarH);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'left';
          ctx.font = `500 ${Math.round(canvasW * 0.014)}px ${FONT_SANS}`;
          const capText =
            draft.photoCaptions[ph.id]?.headline ||
            ph.matchedStopTitle ||
            ph.matchedCity ||
            `FRAME ${i + 1}`;
          ctx.fillText(capText.slice(0, 22), x + gap * 0.5, y + cellH - capBarH * 0.32);
        }

        ctx.fillStyle = inkMuted;
        ctx.textAlign = 'left';
        ctx.font = `500 ${Math.round(canvasW * 0.015)}px ${FONT_MONO}`;
        ctx.fillText('ARCHIVAL CONTACT SHEET · 300 DPI', padX, canvasH - safeMarginPx * 0.7);
        drawPageNumber(ctx, pNum);
      });
      continue;
    }

    if (page.kind === 'blank') {
      const noteIndex = page.blankIndex ?? 0;
      pageRenderers.push((ctx, pNum) => {
        ctx.fillStyle = paperBg;
        ctx.fillRect(0, 0, canvasW, canvasH);
        ctx.strokeStyle = '#E3ECEA';
        ctx.lineWidth = 1.5;
        const lineStart = safeMarginPx * 2.2;
        ctx.fillStyle = inkMuted;
        ctx.textAlign = 'left';
        ctx.font = `600 ${Math.round(canvasW * 0.017)}px ${FONT_MONO}`;
        ctx.fillText(
          noteIndex % 2 === 0
            ? 'FIELD NOTES & POSTMARKS · 手写旅途札记页'
            : 'SOUVENIR & TICKET STUBS · 票根留白纪念页',
          safeMarginPx,
          safeMarginPx * 1.5
        );
        for (let y = lineStart; y < canvasH - safeMarginPx * 1.6; y += Math.round(canvasH * 0.065)) {
          ctx.beginPath();
          ctx.moveTo(safeMarginPx, y);
          ctx.lineTo(canvasW - safeMarginPx, y);
          ctx.stroke();
        }
        drawPageNumber(ctx, pNum);
      });
      continue;
    }

    // colophon / back cover
    pageRenderers.push((ctx) => {
      ctx.fillStyle = '#093B35';
      ctx.fillRect(0, 0, canvasW, canvasH);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.font = `700 ${Math.round(canvasW * 0.03)}px ${FONT_SERIF}`;
      ctx.fillText(draft.bookTitle, canvasW / 2, canvasH * 0.44);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = `400 ${Math.round(canvasW * 0.019)}px ${FONT_SANS}`;
      const colLines = wrapCanvasText(
        ctx,
        draft.colophonSummary || 'Printed in 300 DPI Archival Edition · Curated with Trip Kit Memories',
        canvasW - safeMarginPx * 3
      );
      colLines.slice(0, 3).forEach((ln, idx) => {
        ctx.fillText(ln, canvasW / 2, canvasH * 0.52 + idx * Math.round(canvasW * 0.034));
      });
      ctx.fillStyle = '#7CE7E3';
      ctx.font = `600 ${Math.round(canvasW * 0.016)}px ${FONT_MONO}`;
      ctx.fillText(
        `TRIM ${trimWmm}×${trimHmm}MM · +${BLEED_MM}MM BLEED`,
        canvasW / 2,
        canvasH - safeMarginPx * 1.2
      );
    });
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [fullWmm, fullHmm],
    compress: true,
  });

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  const totalP = pageRenderers.length;
  for (let i = 0; i < totalP; i += 1) {
    if (i > 0) {
      pdf.addPage([fullWmm, fullHmm], 'portrait');
    }
    ctx.clearRect(0, 0, canvasW, canvasH);
    pageRenderers[i](ctx, i + 1, totalP);
    if (includeCropMarks) {
      drawCropMarks(ctx, canvasW, canvasH, bleedPx);
    }
    const pageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    pdf.addImage(pageDataUrl, 'JPEG', 0, 0, fullWmm, fullHmm, undefined, 'FAST');
  }

  const safeSlug = (draft.bookTitle || 'Trip-Photobook')
    .replace(/[\\/:*?"<>|\s]+/g, '-')
    .slice(0, 36);
  const fileName = `${safeSlug}-${trimWmm}x${trimHmm}mm-3mmBleed-${totalP}P.pdf`;
  pdf.save(fileName);
  return { fileName, totalPages: totalP, pageKinds: pages.map((p) => p.kind) };
}
