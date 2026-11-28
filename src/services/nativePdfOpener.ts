import { Capacitor, registerPlugin } from '@capacitor/core';

export interface PdfOpenerPlugin {
  openPdf(options: {
    path?: string;
    base64?: string;
    fileName?: string;
  }): Promise<{ opened?: boolean; path?: string }>;
  writePdf(options: {
    base64: string;
    fileName: string;
  }): Promise<{ path: string }>;
}

const PdfOpener = registerPlugin<PdfOpenerPlugin>('PdfOpener');

export function isNativePdfOpenerAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('PdfOpener');
}

/**
 * Opens an on-device PDF path with the system viewer (FileProvider / Quick Look).
 */
export async function openPdfInNative(path: string): Promise<void> {
  if (!isNativePdfOpenerAvailable()) {
    throw new Error('NATIVE_PDF_OPENER_UNAVAILABLE');
  }
  const trimmed = path.trim();
  if (!trimmed) {
    throw new Error('NATIVE_PDF_PATH_EMPTY');
  }
  await PdfOpener.openPdf({ path: trimmed });
}

/**
 * Writes a base64 PDF into the app cache directory, then opens it.
 * Prefer this from jsPDF (doc.output) on Capacitor builds.
 */
export async function writeAndOpenPdfInNative(
  base64: string,
  fileName: string
): Promise<string> {
  if (!isNativePdfOpenerAvailable()) {
    throw new Error('NATIVE_PDF_OPENER_UNAVAILABLE');
  }
  const result = await PdfOpener.openPdf({ base64, fileName });
  return result.path || fileName;
}
