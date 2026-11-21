import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { resolveApiUrl } from '../services/apiUrl';
import {
  getBrowserSpeechRecognitionConstructor,
  resolveSpeechRecognitionLang,
  type BrowserSpeechRecognitionErrorEvent,
  type BrowserSpeechRecognitionEvent,
  type BrowserSpeechRecognitionInstance,
} from '../utils/speechHelpers';

interface AiVoiceInputButtonProps {
  onTranscript: (transcript: string) => void | Promise<void>;
  onInterimTranscript?: (liveTranscript: string) => void;
  contextHint?: 'packing' | 'task' | 'expense' | 'assistant' | 'itinerary' | 'trip_setup';
  disabled?: boolean;
  compact?: boolean;
  iconOnly?: boolean;
  variant?: 'default' | 'gridTile';
  label?: string;
  onError?: (message: string) => void;
  /** Optional visual class (e.g. tk-voice). Idle trigger only; does not change props/structure/copy. */
  className?: string;
}

const PREFERRED_AUDIO_MIMES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/wav',
];

const SILENCE_AUTO_FINISH_MS = 1800;

function detectSupportedMimeType(): string {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return '';
  }
  for (const mime of PREFERRED_AUDIO_MIMES) {
    if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return '';
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Audio read failed'));
    reader.readAsDataURL(blob);
  });
}

export const AiVoiceInputButton: React.FC<AiVoiceInputButtonProps> = ({
  onTranscript,
  onInterimTranscript,
  contextHint = 'packing',
  disabled = false,
  compact = false,
  iconOnly = false,
  variant = 'default',
  label,
  onError,
  className,
}) => {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [livePreview, setLivePreview] = useState('');

  const recognitionRef = useRef<BrowserSpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const transcriptBufferRef = useRef<string>('');
  const deliveredRef = useRef<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const cancelledRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const cleanupAll = () => {
    clearSilenceTimer();
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {
        // Ignore abort errors on already-stopped recognition
      }
      recognitionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
  };

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      cleanupAll();
    };
  }, []);

  const reportError = (msg: string) => {
    if (onError) {
      onError(msg);
    }
  };

  const startDurationTicker = (onMaxReached: () => void) => {
    setSeconds(0);
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
    }
    timerRef.current = window.setInterval(() => {
      setSeconds((prev) => {
        if (prev + 1 >= 55) {
          onMaxReached();
        }
        return prev + 1;
      });
    }, 1000);
  };

  const startMediaRecorderFallback = async () => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      reportError(t('voice.unsupportedError'));
      return;
    }

    try {
      reportError('');
      cancelledRef.current = false;
      deliveredRef.current = false;
      chunksRef.current = [];
      setLivePreview('');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const supportedMime = detectSupportedMimeType();
      const recorder = supportedMime
        ? new MediaRecorder(stream, { mimeType: supportedMime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const rawMime = recorder.mimeType || supportedMime || 'audio/webm';
        const cleanMime = rawMime.split(';')[0].trim() || 'audio/webm';
        const recordedChunks = [...chunksRef.current];
        chunksRef.current = [];
        cleanupAll();

        if (cancelledRef.current) {
          setStatus('idle');
          setSeconds(0);
          setLivePreview('');
          return;
        }

        const audioBlob = new Blob(recordedChunks, { type: cleanMime });
        if (audioBlob.size < 200) {
          setStatus('idle');
          setSeconds(0);
          reportError(t('voice.noSpeechError'));
          return;
        }

        setStatus('transcribing');
        try {
          const audioBase64 = await blobToBase64(audioBlob);
          const res = await fetch(resolveApiUrl('/api/ai/transcribe-audio'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64,
              mimeType: cleanMime,
              contextHint,
              language: i18n.language,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || t('voice.noSpeechError'));
          }
          const transcript = String(data.transcript || '').trim();
          if (!transcript) {
            reportError(t('voice.noSpeechError'));
          } else if (!deliveredRef.current) {
            deliveredRef.current = true;
            await onTranscript(transcript);
          }
        } catch (err) {
          reportError(err instanceof Error ? err.message : t('voice.noSpeechError'));
        } finally {
          setStatus('idle');
          setSeconds(0);
          setLivePreview('');
        }
      };

      recorder.start(250);
      setStatus('recording');
      startDurationTicker(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      });
    } catch (err) {
      cleanupAll();
      setStatus('idle');
      const isDenied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      reportError(isDenied ? t('voice.micDeniedError') : t('voice.unsupportedError'));
    }
  };

  const commitBrowserSpeechResult = async (rawFinalText: string) => {
    if (deliveredRef.current || cancelledRef.current) return;
    const cleaned = rawFinalText.trim();
    cleanupAll();
    setSeconds(0);
    setLivePreview('');

    if (!cleaned) {
      setStatus('idle');
      reportError(t('voice.noSpeechError'));
      return;
    }

    deliveredRef.current = true;
    setStatus('transcribing');
    try {
      await onTranscript(cleaned);
    } finally {
      setStatus('idle');
    }
  };

  const startRecording = async () => {
    if (disabled || status !== 'idle') return;

    const SpeechRecognitionCtor = getBrowserSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) {
      await startMediaRecorderFallback();
      return;
    }

    try {
      reportError('');
      cancelledRef.current = false;
      deliveredRef.current = false;
      transcriptBufferRef.current = '';
      setLivePreview('');

      const recognition = new SpeechRecognitionCtor();
      recognitionRef.current = recognition;
      recognition.lang = resolveSpeechRecognitionLang(i18n.language);
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
        if (cancelledRef.current) return;
        let combined = '';
        for (let i = 0; i < event.results.length; i += 1) {
          const segment = event.results[i]?.[0]?.transcript || '';
          combined += segment;
        }
        const trimmed = combined.trim();
        transcriptBufferRef.current = trimmed;
        setLivePreview(trimmed);
        if (trimmed && onInterimTranscript) {
          onInterimTranscript(trimmed);
        }

        // Reset silence auto-commit timer so natural speech finishes hands-free
        clearSilenceTimer();
        if (trimmed) {
          silenceTimerRef.current = window.setTimeout(() => {
            if (recognitionRef.current && !cancelledRef.current && !deliveredRef.current) {
              try {
                recognitionRef.current.stop();
              } catch {
                void commitBrowserSpeechResult(transcriptBufferRef.current);
              }
            }
          }, SILENCE_AUTO_FINISH_MS);
        }
      };

      recognition.onerror = (event: BrowserSpeechRecognitionErrorEvent) => {
        if (cancelledRef.current) return;
        clearSilenceTimer();
        const errCode = event.error;

        if (errCode === 'aborted') {
          return;
        }

        // In cross-origin/sandboxed iframes or restricted browsers, Web Speech cloud recognition
        // often emits service-not-allowed / not-allowed / network / language-not-supported / audio-capture
        // even when MediaRecorder + getUserMedia works. Fall back seamlessly if nothing captured yet;
        // getUserMedia will surface NotAllowedError if microphone permission is genuinely denied.
        if (
          !transcriptBufferRef.current.trim() &&
          (errCode === 'service-not-allowed' ||
            errCode === 'not-allowed' ||
            errCode === 'network' ||
            errCode === 'language-not-supported' ||
            errCode === 'audio-capture')
        ) {
          cleanupAll();
          setStatus('idle');
          setSeconds(0);
          setLivePreview('');
          void startMediaRecorderFallback();
          return;
        }

        if (errCode === 'no-speech' && !transcriptBufferRef.current.trim()) {
          cleanupAll();
          setStatus('idle');
          setSeconds(0);
          setLivePreview('');
          reportError(t('voice.noSpeechError'));
        }
      };

      recognition.onend = () => {
        if (cancelledRef.current || deliveredRef.current) {
          setStatus('idle');
          setSeconds(0);
          setLivePreview('');
          return;
        }
        void commitBrowserSpeechResult(transcriptBufferRef.current);
      };

      recognition.start();
      setStatus('recording');
      startDurationTicker(() => {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {
            void commitBrowserSpeechResult(transcriptBufferRef.current);
          }
        }
      });
    } catch {
      cleanupAll();
      setStatus('idle');
      await startMediaRecorderFallback();
    }
  };

  const finishRecording = () => {
    clearSilenceTimer();
    cancelledRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        void commitBrowserSpeechResult(transcriptBufferRef.current);
      }
      return;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    cancelledRef.current = true;
    transcriptBufferRef.current = '';
    setLivePreview('');
    if (recognitionRef.current) {
      cleanupAll();
      setStatus('idle');
      setSeconds(0);
      return;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      cleanupAll();
      setStatus('idle');
      setSeconds(0);
    }
  };

  const formattedDuration = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const displayLabel = label ?? t('voice.startLabel');

  if (variant === 'gridTile') {
    if (status === 'recording') {
      return (
        <div
          title={livePreview || t('voice.listening')}
          className="min-h-[60px] w-full rounded-2xl border border-[#E6B8AE] bg-[#FDF4F2] px-2 py-2 flex flex-col items-center justify-center gap-1.5 text-[#A1422C]"
        >
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C85A3F] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C85A3F]" />
            </span>
            <span className="font-num text-[11px] font-bold tabular-nums">{formattedDuration}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={finishRecording}
              className="inline-flex items-center gap-0.5 rounded-md bg-[#078C88] px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-[#067572] whitespace-nowrap cursor-pointer"
            >
              <Square className="h-2 w-2 fill-current" />
              <span>{t('voice.doneBtn')}</span>
            </button>
            <button
              type="button"
              onClick={cancelRecording}
              title={t('voice.cancelTitle')}
              aria-label={t('voice.cancelTitle')}
              className="flex h-5 w-5 items-center justify-center rounded-md text-[#8C5042] hover:bg-[#F8E2DC] cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      );
    }

    if (status === 'transcribing') {
      return (
        <div className="min-h-[60px] w-full rounded-2xl border border-[#BEE5E2] bg-[#EFF9F8] px-2 py-2.5 flex flex-col items-center justify-center gap-1.5 text-[#076E6A]">
          <Loader2 className="h-4 w-4 animate-spin text-[#078C88] shrink-0" />
          <span className="text-[11px] font-semibold whitespace-nowrap truncate max-w-full">
            {t('voice.transcribing')}
          </span>
        </div>
      );
    }

    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => void startRecording()}
        title={t('voice.tooltipSpeech')}
        aria-label={displayLabel}
        className="min-h-[60px] w-full rounded-2xl border border-[#DCE8E5] bg-[#F8FAF9] hover:border-[#078C88] hover:bg-[#EFF9F8] disabled:opacity-50 px-2 py-2.5 flex flex-col items-center justify-center gap-1.5 text-[#152B29] transition-colors cursor-pointer"
      >
        <Mic className="h-4 w-4 text-[#078C88] shrink-0" />
        <span className="text-[11px] sm:text-xs font-semibold whitespace-nowrap truncate max-w-full">
          {displayLabel}
        </span>
      </button>
    );
  }

  if (status === 'recording') {
    return (
      <div
        title={livePreview || t('voice.listening')}
        className={`inline-flex items-center gap-1.5 rounded-xl border border-[#E6B8AE] bg-[#FDF4F2] px-2.5 text-xs font-semibold text-[#A1422C] max-w-full shrink-0 ${
          compact ? 'min-h-[32px] py-1' : 'min-h-[36px] py-1'
        }`}
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C85A3F] opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#C85A3F]" />
        </span>
        <span className="font-num tabular-nums shrink-0">{formattedDuration}</span>
        {!compact && (
          <span className="max-w-[120px] sm:max-w-[180px] truncate text-[#7A3524] font-medium">
            {livePreview ? `“${livePreview}”` : t('voice.listening')}
          </span>
        )}
        <button
          type="button"
          onClick={finishRecording}
          className="inline-flex items-center gap-1 rounded-lg bg-[#078C88] px-2 py-0.5 text-xs font-bold text-white hover:bg-[#067572] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Square className="h-2.5 w-2.5 fill-current" />
          {t('voice.doneBtn')}
        </button>
        <button
          type="button"
          onClick={cancelRecording}
          title={t('voice.cancelTitle')}
          aria-label={t('voice.cancelTitle')}
          className="flex h-6 w-6 items-center justify-center rounded-lg text-[#8C5042] hover:bg-[#F8E2DC] shrink-0 cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  if (status === 'transcribing') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-xl border border-[#BEE5E2] bg-[#EFF9F8] text-xs font-semibold text-[#076E6A] whitespace-nowrap shrink-0 ${
          compact ? 'h-8 px-2.5' : 'h-9 px-3'
        }`}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#078C88]" />
        {t('voice.transcribing')}
      </span>
    );
  }

  const useTkVoice = Boolean(className && /\btk-voice\b/.test(className));

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => void startRecording()}
      title={t('voice.tooltipSpeech')}
      aria-label={displayLabel}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#CDEAE7] bg-[#EAF7F6] font-semibold text-[#076E6A] hover:border-[#078C88] hover:bg-[#DEF2F0] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
        iconOnly
          ? 'h-8 w-8 p-0'
          : compact
          ? 'h-8 px-2.5 text-xs'
          : 'h-9 px-3 text-xs'
      }${className ? ` ${className}` : ''}`}
    >
      <Mic
        className={
          useTkVoice
            ? 'tk-glyph shrink-0'
            : 'h-3.5 w-3.5 text-[#078C88] shrink-0'
        }
        strokeWidth={1.5}
      />
      {!iconOnly && <span>{displayLabel}</span>}
    </button>
  );
};
