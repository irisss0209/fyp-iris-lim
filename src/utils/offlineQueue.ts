const DB_NAME = 'railly-offline';
const DB_VERSION = 1;
const STORE = 'pending-reports';

export interface PendingReport {
  id: string;
  userId: string;
  payload: Record<string, unknown>;
  photoData?: string;  // base64-encoded image
  photoMime?: string;
  queuedAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueReport(
  userId: string,
  payload: Record<string, unknown>,
  photoFile?: File | null,
): Promise<PendingReport> {
  let photoData: string | undefined;
  let photoMime: string | undefined;

  if (photoFile) {
    const buf = await photoFile.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    photoData = btoa(binary);
    photoMime = photoFile.type;
  }

  const report: PendingReport = {
    id: crypto.randomUUID(),
    userId,
    payload,
    photoData,
    photoMime,
    queuedAt: new Date().toISOString(),
  };

  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(report);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return report;
}

export async function getPendingReports(): Promise<PendingReport[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => { db.close(); resolve(req.result); };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  } catch {
    return [];
  }
}

export async function removeReport(id: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function flushPendingReports(apiBase: string): Promise<number> {
  const pending = await getPendingReports();
  if (pending.length === 0) return 0;

  let flushed = 0;
  for (const report of pending) {
    try {
      const res = await fetch(`${apiBase}/api/data/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report.payload),
        credentials: 'include',
      });
      if (!res.ok) continue;

      const { reportId } = await res.json().catch(() => ({}));

      if (report.photoData && report.photoMime && reportId) {
        try {
          const binary = atob(report.photoData);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const blob = new Blob([bytes], { type: report.photoMime });
          const form = new FormData();
          form.append('image', blob, 'photo.jpg');
          await fetch(`${apiBase}/api/data/report/${reportId}/image`, {
            method: 'POST',
            body: form,
            credentials: 'include',
          });
        } catch { /* photo upload failure is non-fatal */ }
      }

      await removeReport(report.id);
      flushed++;
    } catch {
      break; // still offline
    }
  }
  return flushed;
}
