import { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:5293/api/data';

// ── Types ────────────────────────────────────────────────────────────────────

export type AlertStatus =
  | 'pending'
  | 'verified'
  | 'escalated'
  | 'en_route'
  | 'resolved'
  | 'dismissed';

export type AlertSource = 'ai' | 'passenger';

export interface Alert {
  id: string;
  trainId: number | string;
  coachId: number | string;
  coach?: number | string | null;
  door?: string;
  line: string;
  lineId: string;
  station: string;
  platform?: string;
  
  time: string;
  date: string;
  elapsed: string | number;

  status: AlertStatus;
  source: AlertSource;
  type: string;

  confidence?: number | null;
  deviceId?: string | null;

  reportedBy?: string;
  passengerComment?: string;
  imageUrl?: string;
  snapshotUrl?: string;

  // Audit trail
  verifiedBy?: string | null | undefined;
  verifiedAt?: string | null | undefined;
  verifiedComment?: string | null | undefined;
  escalatedBy?: string | null | undefined;
  escalatedAt?: string | null | undefined;
  escalatedComment?: string | null | undefined;
  enrouteBy?: string | null | undefined;
  enrouteAt?: string | null | undefined;
  resolvedBy?: string | null | undefined;
  resolvedAt?: string | null | undefined;
  resolvedComment?: string | null | undefined;
  dismissedBy?: string | null | undefined;
  dismissedAt?: string | null | undefined;
  dismissedComment?: string | null | undefined;
}

// ── API Functions ─────────────────────────────────────────────────────────────

export async function fetchOperatorAlerts() {
  const res = await fetch(`${API}/operator/alerts`);
  if (!res.ok) throw new Error('Failed to fetch operator alerts');
  return res.json();
}

export async function fetchAuxiliaryAlerts(stationId: string) {
  const res = await fetch(`${API}/auxiliary/alerts?stationId=${stationId}`);
  if (!res.ok) throw new Error('Failed to fetch auxiliary alerts');
  return res.json();
}

export async function updateAlertStatus(
  id: string,
  status: AlertStatus,
  comment: string,
  token?: string,
  userId?: string
) {
  const endpoint = token 
    ? `${API}/indicent-alerts/${id}/status`
    : `${API}/auxiliary/alerts/${id}/status`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    body: JSON.stringify({ status, comment, userId }),
  });
  
  if (!res.ok) throw new Error('Failed to update alert status');
  return res.json();
}

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useAlerts(fetchFn: () => Promise<any>, intervalMs = 30000) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [extraData, setExtraData] = useState<any>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFn();
      if (Array.isArray(data)) {
        setAlerts(data);
      } else {
        setAlerts(data.alerts || []);
        setExtraData(data);
      }
      setLastRefresh(new Date());
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, intervalMs);
    return () => clearInterval(timer);
  }, [loadData, intervalMs]);

  return { alerts, loading, error, lastRefresh, extraData, reload: loadData };
}
