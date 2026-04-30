const QUEUE_KEY = 'railly_pending_reports';

export interface PendingReport {
  id: string;
  userId: string;
  payload: Record<string, unknown>;
  queuedAt: string;
}

export function queueReport(userId: string, payload: Record<string, unknown>): PendingReport {
  const report: PendingReport = {
    id: crypto.randomUUID(),
    userId,
    payload,
    queuedAt: new Date().toISOString(),
  };

  const existing = getPendingReports();
  localStorage.setItem(QUEUE_KEY, JSON.stringify([...existing, report]));
  return report;
}

export function getPendingReports(): PendingReport[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function removeReport(id: string) {
  const updated = getPendingReports().filter(r => r.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
}

export async function flushPendingReports(apiBase: string): Promise<number> {
  const pending = getPendingReports();
  if (pending.length === 0) return 0;

  const token: string | undefined = (() => {
    try { return JSON.parse(localStorage.getItem('user_session') ?? '{}')?.token; } catch { return undefined; }
  })();

  let flushed = 0;
  for (const report of pending) {
    try {
      const res = await fetch(`${apiBase}/api/data/report?userId=${report.userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(report.payload),
      });
      if (res.ok) {
        removeReport(report.id);
        flushed++;
      }
    } catch {
      break; // still offline, stop trying
    }
  }
  return flushed;
}
