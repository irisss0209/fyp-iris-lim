// ── Shared types ──────────────────────────────────────────────────────────────

export interface ReportStats {
  total: number;
  falseAlarmRate: number;
  avgResponseMinutes: number;
  complianceScore: number;
  resolutionRate: number;
  totalDelta: number;
  falseAlarmDelta: number;
  hasPreviousData: boolean;
  complianceDelta: number;
  resolutionDelta: number;
  avgResponseDelta: number;
  totalDifference: number;
  avgResponseDifference: number;
  resolvedDifference: number;
  dismissedDifference: number;
  unresolvedCount: number;
  unresolvedDifference: number;
  unresolvedDelta: number;
}

export interface StatusSlice { name: string; value: number; color: string; }
export interface LineInfo    { lineId: string; lineName: string; }

export interface IncidentRow {
  id: string;
  trainId: number;
  coachId: number;
  line: string;
  lineId: string;
  passengerComment?: string;
  confidence?: number;
  datetime: string;
  type: string;
  status: string;
  source: string;
  reportedBy?: string;
  verifiedBy?: string;  verifiedAt?: string;  verifiedComment?: string;
  enrouteBy?: string;   enrouteAt?: string;   enrouteComment?: string;
  resolvedBy?: string;  resolvedAt?: string;  resolvedComment?: string;
  escalatedBy?: string; escalatedAt?: string; escalatedComment?: string;
  dismissedBy?: string; dismissedAt?: string; dismissedComment?: string;
}

export interface ByTrainItem {
  train: string;
  count: number;
  resolved: number;
  line: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const ACCENT = '#0B4F6C';
export const LINE_PALETTE = ['#D34026', '#0B4F6C', '#2D7A5D', '#7B5EA7', '#B45309', '#0E7490'];

const lineColorCache: Record<string, string> = {};
let _colorIdx = 0;

export function getLineColor(lineId: string) {
  if (!lineColorCache[lineId]) {
    lineColorCache[lineId] = LINE_PALETTE[_colorIdx % LINE_PALETTE.length];
    _colorIdx++;
  }
  return lineColorCache[lineId];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export const statusColor = (status: string) => {
  const s = status?.toLowerCase() ?? '';
  if (s === 'resolved')  return { bg: '#F0FBF6', text: '#2D7A5D' };
  if (s === 'escalated') return { bg: '#FEF2F0', text: '#D34026' };
  if (s === 'pending')   return { bg: '#FFF7ED', text: '#C05621' };
  if (s === 'verified')  return { bg: '#EFF6FF', text: '#1D4ED8' };
  if (s === 'en_route')  return { bg: '#EFF6FF', text: '#0B4F6C' };
  if (s === 'dismissed') return { bg: '#F7FAFC', text: '#4A5568' };
  return                        { bg: '#F7FAFC', text: '#718096' };
};

export const fmtDelta = (v: number, invertGood = false, diff?: number) => {
  if (v === 0) {
    if (diff !== undefined && diff !== 0) {
      const good = invertGood ? diff < 0 : diff > 0;
      return { label: `${diff > 0 ? '↑' : '↓'} 100%`, good };
    }
    return null;
  }
  const good = invertGood ? v < 0 : v > 0;
  return { label: `${v > 0 ? '↑' : '↓'} ${Math.abs(v)}%`, good };
};

export const fmtCountDelta = (v: number, invertGood = true) => {
  if (v === 0) return null;
  const good = invertGood ? v < 0 : v > 0;
  return { label: `${Math.abs(v)} ${v > 0 ? 'more' : 'less'}`, good };
};

export const fmtTimeDiff = (v?: number) => {
  if (v === undefined || v === 0) return '';
  const absV = Math.abs(v);
  const timeStr = absV < 60 ? `${Math.round(absV)} mins` : `${(absV / 60).toFixed(1)} hrs`;
  return `${timeStr} ${v > 0 ? 'more' : 'less'}`;
};

export const getCountDiffText = (v?: number) => {
  if (v === undefined) return '';
  if (v === 0) return 'same as last month';
  return `${Math.abs(v)} ${v > 0 ? 'more' : 'less'} than last month`;
};
