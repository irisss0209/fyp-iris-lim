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


