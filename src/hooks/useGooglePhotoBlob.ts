import { useEffect, useState } from 'react';

type CacheEntry = {
  promise: Promise<string>;
  objectUrl?: string;
  refs: number;
  revokeTimer: ReturnType<typeof setTimeout> | null;
};

const cache = new Map<string, CacheEntry>();
const REVOKE_DELAY_MS = 30_000;

function clearRevokeTimer(entry: CacheEntry) {
  if (entry.revokeTimer) {
    clearTimeout(entry.revokeTimer);
    entry.revokeTimer = null;
  }
}

function scheduleRevoke(uri: string, entry: CacheEntry) {
  clearRevokeTimer(entry);
  entry.revokeTimer = setTimeout(() => {
    const current = cache.get(uri);
    if (!current || current !== entry || current.refs > 0) return;
    if (current.objectUrl) {
      URL.revokeObjectURL(current.objectUrl);
    }
    cache.delete(uri);
  }, REVOKE_DELAY_MS);
}

async function fetchObjectUrl(uri: string): Promise<string> {
  const response = await fetch(uri, { mode: 'cors', credentials: 'omit' });
  if (!response.ok) {
    throw new Error('photo_http');
  }
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) {
    throw new Error('photo_not_image');
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

function acquire(uri: string): Promise<string> {
  const existing = cache.get(uri);
  if (existing) {
    existing.refs += 1;
    clearRevokeTimer(existing);
    return existing.promise;
  }

  let resolveEntry!: (value: string) => void;
  let rejectEntry!: (reason?: unknown) => void;
  const promise = new Promise<string>((resolve, reject) => {
    resolveEntry = resolve;
    rejectEntry = reject;
  });

  const entry: CacheEntry = {
    promise,
    refs: 1,
    revokeTimer: null,
  };
  cache.set(uri, entry);

  fetchObjectUrl(uri)
    .then((objectUrl) => {
      entry.objectUrl = objectUrl;
      resolveEntry(objectUrl);
    })
    .catch((err) => {
      // Drop failed uri so a later remount can retry.
      if (cache.get(uri) === entry) {
        cache.delete(uri);
      }
      rejectEntry(err);
    });

  return promise;
}

function release(uri: string) {
  const entry = cache.get(uri);
  if (!entry) return;
  entry.refs = Math.max(0, entry.refs - 1);
  if (entry.refs === 0) {
    scheduleRevoke(uri, entry);
  }
}

/**
 * Loads a Google Places media URI via fetch→blob→objectURL so Chrome ORB
 * cannot block the image the way a bare <img src={mediaUri}> would.
 */
export function useGooglePhotoBlob(uri: string | undefined | null): {
  url: string | null;
  loading: boolean;
  failed: boolean;
} {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(uri));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!uri) {
      setUrl(null);
      setLoading(false);
      setFailed(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setUrl(null);

    acquire(uri)
      .then((objectUrl) => {
        if (cancelled) return;
        setUrl(objectUrl);
        setLoading(false);
        setFailed(false);
      })
      .catch(() => {
        if (cancelled) return;
        setUrl(null);
        setLoading(false);
        setFailed(true);
      });

    return () => {
      cancelled = true;
      release(uri);
    };
  }, [uri]);

  return { url, loading, failed };
}
