import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { formatCloudSyncError } from '../firebase';
import i18n from '../i18n';
import { getErrorBoundaryCopy } from '../i18n/packs/settingsAndProPack';
import { normalizeAppLanguage } from '../utils/preferencesHelpers';
import { reportClientError } from '../utils/errorReporter';

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  AppErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: formatCloudSyncError(error),
    };
  }

  override componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    console.error('AppErrorBoundary caught error:', error, info);
    reportClientError({
      message: String(error),
      stack: info?.componentStack ?? undefined,
      url: typeof location !== 'undefined' ? location.href : undefined,
      source: 'boundary',
    });

    // After redeploy, stale lazy chunks 404 → React.lazy fails. Auto-reload once
    // so the user picks up the new index.html asset map (sessionStorage debounce).
    const msg = String(error ?? '').toLowerCase();
    const isChunkMismatch =
      msg.includes('dynamically imported module') ||
      msg.includes('loading chunk') ||
      msg.includes('chunkloaderror') ||
      msg.includes('javascript mime type') ||
      msg.includes('failed to fetch');
    if (!isChunkMismatch || typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return;
    }
    const RELOAD_KEY = 'tripkit_chunk_reload_v1';
    try {
      const last = Number(sessionStorage.getItem(RELOAD_KEY) || '0');
      const now = Date.now();
      if (Number.isFinite(last) && now - last <= 30_000) {
        return;
      }
      sessionStorage.setItem(RELOAD_KEY, String(now));
      window.location.reload();
    } catch {
      // Ignore storage / reload failures; error UI remains.
    }
  }

  private handleResetRoomAndReload = () => {
    try {
      localStorage.removeItem('packpoint_active_room_v1');
    } catch {
      // Ignore storage errors
    }
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      const lang = normalizeAppLanguage(i18n.language, 'en-US');
      const copy = getErrorBoundaryCopy(lang);
      return (
        <div className="[font-family:'Inter_Variable',Inter,system-ui,'PingFang_SC',sans-serif] [--font-serif:'Playfair_Display',Georgia,'Songti_SC',serif] min-h-screen tk-bg-paper flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-[20px] border tk-bc-hair bg-white p-6 tk-elev-soft space-y-4">
            <div className="flex items-center gap-2.5 tk-text-ink">
              <AlertTriangle className="h-5 w-5 tk-text-warning shrink-0" />
              <h2 className="text-base font-serif font-extrabold">{copy.title}</h2>
            </div>
            <p className="text-sm tk-text-ink2 leading-relaxed break-all">
              {this.state.errorMessage || copy.fallbackBody}
            </p>
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-[16px] tk-bg-forest px-4 py-2.5 text-sm font-bold text-white hover:tk-bg-press cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {copy.reloadBtn}
              </button>
              <button
                type="button"
                onClick={this.handleResetRoomAndReload}
                className="rounded-[16px] border tk-bc-hair tk-bg-paper px-3.5 py-2.5 text-sm font-semibold tk-text-ink2 hover:tk-text-ink cursor-pointer"
              >
                {copy.localModeBtn}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
