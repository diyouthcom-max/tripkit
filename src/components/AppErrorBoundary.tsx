import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { formatCloudSyncError } from '../firebase';
import i18n from '../i18n';
import { getErrorBoundaryCopy } from '../i18n/packs/settingsAndProPack';
import { normalizeAppLanguage } from '../utils/preferencesHelpers';

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
        <div className="min-h-screen tk-bg-paper flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border tk-bc-hair bg-white p-6 shadow-lg space-y-4">
            <div className="flex items-center gap-2.5 tk-text-ink">
              <AlertTriangle className="h-5 w-5 tk-text-warning shrink-0" />
              <h2 className="text-base font-extrabold">{copy.title}</h2>
            </div>
            <p className="text-xs tk-text-ink2 leading-relaxed break-all">
              {this.state.errorMessage || copy.fallbackBody}
            </p>
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl tk-bg-forest px-4 py-2.5 text-xs font-bold text-white hover:tk-bg-press cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {copy.reloadBtn}
              </button>
              <button
                type="button"
                onClick={this.handleResetRoomAndReload}
                className="rounded-xl border tk-bc-hair tk-bg-paper px-3.5 py-2.5 text-xs font-semibold tk-text-ink2 hover:tk-text-ink cursor-pointer"
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
