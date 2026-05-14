import type { AlertStatus } from '../type/Alert';
import { API } from './config';

export async function fetchOperatorAlerts(token?: string) {
  const res = await fetch(`${API}/operator/alerts`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch operator alerts');
  return res.json();
}

export async function fetchAuxiliaryAlerts(stationId: string, token?: string) {
  const res = await fetch(`${API}/auxiliary/alerts?stationId=${stationId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
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
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ status, comment }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to update alert status');
  return res.json();
}
