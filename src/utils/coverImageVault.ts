const DB_NAME = 'trip_kit_cover_vault_v1';
const STORE_NAME = 'trip_covers';
const DB_VERSION = 1;

interface StoredTripCoverRecord {
  tripId: string;
  dataUrl: string;
  updatedAt: number;
}

function openCoverDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'tripId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open cover vault'));
  });
}

export async function saveCustomTripCover(tripId: string, dataUrl: string): Promise<void> {
  const db = await openCoverDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const record: StoredTripCoverRecord = {
      tripId,
      dataUrl,
      updatedAt: Date.now(),
    };
    store.put(record);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Failed to save custom trip cover'));
    };
  });
}

export async function loadCustomTripCover(tripId: string): Promise<string | null> {
  if (!tripId) return null;
  try {
    const db = await openCoverDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(tripId);
      req.onsuccess = () => {
        const res = req.result as StoredTripCoverRecord | undefined;
        db.close();
        resolve(res?.dataUrl ?? null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

export async function deleteCustomTripCover(tripId: string): Promise<void> {
  if (!tripId) return;
  try {
    const db = await openCoverDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(tripId);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    });
  } catch {
    // Ignore cleanup errors when IndexedDB is restricted
  }
}

export async function duplicateCustomTripCover(
  sourceTripId: string,
  targetTripId: string
): Promise<void> {
  const existing = await loadCustomTripCover(sourceTripId);
  if (existing) {
    await saveCustomTripCover(targetTripId, existing);
  }
}

/**
 * Resizes and compresses a user-selected cover image on the client via Canvas
 * so high-res phone photos render crisply (up to 1600px wide) with instant load speed.
 */
export function compressCoverImageFile(
  file: File,
  maxWidth = 1600,
  maxHeight = 1000,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const srcUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!srcUrl) {
        reject(new Error('Empty image data'));
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error('Unsupported image format'));
      img.onload = () => {
        let targetW = img.naturalWidth || img.width;
        let targetH = img.naturalHeight || img.height;
        if (targetW > maxWidth || targetH > maxHeight) {
          const ratio = Math.min(maxWidth / targetW, maxHeight / targetH);
          targetW = Math.max(1, Math.round(targetW * ratio));
          targetH = Math.max(1, Math.round(targetH * ratio));
        }
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(srcUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.src = srcUrl;
    };
    reader.readAsDataURL(file);
  });
}
