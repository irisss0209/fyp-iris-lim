


const API = `${import.meta.env.VITE_API_BASE}/api/data`;

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
  datetime?: string;
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
  enrouteComment?: string | null | undefined;
  resolvedBy?: string | null | undefined;
  resolvedAt?: string | null | undefined;
  resolvedComment?: string | null | undefined;
  dismissedBy?: string | null | undefined;
  dismissedAt?: string | null | undefined;
  dismissedComment?: string | null | undefined;
}

// ── API Functions ─────────────────────────────────────────────────────────────

export async function fetchOperatorAlerts(token?: string) {
  const res = await fetch(`${API}/operator/alerts`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch operator alerts');
  return res.json();
}

export async function fetchAuxiliaryAlerts(stationId: string, token?: string) {
  const res = await fetch(`${API}/auxiliary/alerts?stationId=${stationId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch auxiliary alerts');
  return res.json();
}

export async function updateAlertStatus(
  id: string,
  status: AlertStatus,
  comment: string,
  token?: string,
  role?: 'operator' | 'auxiliary' | 'passenger'
) {
  const endpoint = role === 'auxiliary'
    ? `${API}/auxiliary/alerts/${id}/status`
    : `${API}/incident-alerts/${id}/status`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    body: JSON.stringify({ status, comment }),
    credentials: 'include'
  });
  
  if (!res.ok) throw new Error('Failed to update alert status');
  return res.json();
}


