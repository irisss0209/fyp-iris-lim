import { useState, useEffect, useCallback } from 'react';
import {
  ClockIcon,
  CalendarIcon,
  RefreshCwIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { StatusTimeline, buildTimelineSteps } from '../../components/StatusTimeline';
import type { NavPage } from './OperatorInterface';
import { useTime } from '../../context/TimeContext';
import { formatClockTime } from '../../utils/Time';

const API = `${import.meta.env.VITE_API_BASE}/api/data`;

interface DashboardProps {
  onNavigate?: (page: NavPage, id?: string | number) => void;
}

type DateRange = 'today' | 'yesterday' | '7days' | '30days' | 'custom';

const RANGE_LABELS: Record<DateRange, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  '7days': '7 Days',
  '30days': '30 Days',
  custom: 'Custom',
};

interface RecentAlert {
  id: string;
  trainId: number | string;
  coachId: number | string;
  line: string;
  lineId: string;
  station: string;
  time: string;
  datetime: string;
  status: string;
  confidence: number | null;
  source: 'ai' | 'passenger';
  reportedBy?: string | null;
  passengerComment?: string | null;
  verifiedBy?: string | null; verifiedAt?: string | null; verifiedComment?: string | null;
  enrouteBy?: string | null; enrouteAt?: string | null;
  resolvedBy?: string | null; resolvedAt?: string | null; resolvedComment?: string | null;
  escalatedBy?: string | null; escalatedAt?: string | null; escalatedComment?: string | null;
  dismissedBy?: string | null; dismissedAt?: string | null; dismissedComment?: string | null;
}

interface DashboardStats {
  pending: number;
  verified: number;
  resolved: number;
  dismissed: number;
  camerasOnline: number;
  camerasTotal: number;
  avgResponseMinutes: number;
}

// Deterministic line colour per lineId
const LINE_PALETTE = ['#D34026', '#0B4F6C', '#2D7A5D', '#7B5EA7', '#B45309', '#0E7490'];
const lineColorCache: Record<string, string> = {};
let _colorIdx = 0;
function getLineColor(lineId: string) {
  if (!lineColorCache[lineId]) {
    lineColorCache[lineId] = LINE_PALETTE[_colorIdx % LINE_PALETTE.length];
    _colorIdx++;
  }
  return lineColorCache[lineId];
}
function formatResponseTime(minutes?: number) {
  if (!minutes || minutes === 0) {
    return { value: '—', unit: '' };
  }

  if (minutes < 60) {
    return {
      value: Math.round(minutes),
      unit: 'min',
    };
  }

  const hours = minutes / 60;

  return {
    value: hours.toFixed(1),
    unit: 'hr',
  };
}
const STATUS_THEME: Record<string, { color: string, bg: string }> = {
  pending: { color: '#C2410C', bg: '#FFF7ED' },
  verified: { color: '#2D7A5D', bg: '#F0FBF6' },
  escalated: { color: '#7B5EA7', bg: '#F5F0FF' },
  en_route: { color: '#0B4F6C', bg: '#EFF6FF' },
  resolved: { color: '#1D4ED8', bg: '#EBF8FF' },
  dismissed: { color: '#4A5568', bg: '#F7FAFC' }
}

const PAGE_SIZE = 10;

export function Dashboard({ onNavigate }: DashboardProps) {
  const { format } = useTime();
  const [selectedRange, setSelectedRange] = useState<DateRange>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const [alerts, setAlerts] = useState<RecentAlert[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [alertPage, setAlertPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Fetch from backend ────────────────────────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      let fromDate: Date | null = null;
      let toDate: Date | null = null;

      if (selectedRange === 'today') {
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        toDate = new Date(fromDate);
        toDate.setDate(toDate.getDate() + 1);
      } else if (selectedRange === 'yesterday') {
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        toDate = new Date(fromDate);
        toDate.setDate(toDate.getDate() + 1);
      } else if (selectedRange === '7days') {
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      } else if (selectedRange === '30days') {
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      } else if (selectedRange === 'custom' && customFrom && customTo) {
        fromDate = new Date(customFrom);
        toDate = new Date(customTo);
        toDate.setDate(toDate.getDate() + 1);
      }

      let query = '';
      if (fromDate && toDate) {
        query = `?from=${fromDate.toISOString()}&to=${toDate.toISOString()}`;
      }

      const token: string | undefined = (() => { try { return JSON.parse(localStorage.getItem('user_session') ?? '{}')?.token; } catch { return undefined; } })();
      const res = await fetch(`${API}/operator/dashboard${query}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include'
      });
      const data = await res.json();
      setStats(data.stats);
      setAlerts(data.recentAlerts ?? []);
    } catch (err) {
      console.error('Dashboard fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedRange, customFrom, customTo]);

  useEffect(() => { fetchDashboard(); setAlertPage(1); setExpandedId(null); }, [fetchDashboard]);

  // ── Dynamic subtitle ──────────────────────────────────────────────────────────
  const getSubtitle = () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const fmt = (d: Date) =>
      d.toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const fmtShort = (d: Date) =>
      d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });

    const sevenAgo = new Date(now); sevenAgo.setDate(now.getDate() - 6);
    const thirtyAgo = new Date(now); thirtyAgo.setDate(now.getDate() - 29);

    switch (selectedRange) {
      case 'today':
        return (
          <>
            <span className="text-gray-400">Real-time overview —</span>{' '}
            <span className="text-gray-500">{fmt(now)}</span>
          </>
        );
      case 'yesterday':
        return (
          <>
            <span className="text-gray-400">Showing data for</span>{' '}
            <span className="text-gray-500">{fmt(yesterday)}</span>
          </>
        );
      case '7days':
        return <span className="text-gray-500">{fmtShort(sevenAgo)} — {fmtShort(now)}</span>;
      case '30days':
        return <span className="text-gray-500">{fmtShort(thirtyAgo)} — {fmtShort(now)}</span>;
      case 'custom':
        if (customFrom && customTo)
          return <span className="text-gray-500">Custom range: {customFrom} → {customTo}</span>;
        return <span className="text-gray-400 italic">Select a date range</span>;
    }
  };

  const response = formatResponseTime(stats?.avgResponseMinutes);

  return (
    <div className="p-8 min-h-full" style={{ backgroundColor: '#FAF9F5' }}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-7 gap-6">
        <div>
          <h1 className="text-[28px] font-bold text-gray-900 leading-tight">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">{getSubtitle()}</p>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <CalendarIcon size={13} className="text-gray-400" aria-hidden="true" />
            <span className="text-xs text-gray-400 font-medium">Filter by date</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {(Object.keys(RANGE_LABELS) as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setSelectedRange(range)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors duration-150 ${selectedRange === range
                  ? 'bg-[#0B4F6C] text-white border-[#0B4F6C]'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                aria-pressed={selectedRange === range}
              >
                {RANGE_LABELS[range]}
              </button>
            ))}

            {selectedRange === 'custom' && (
              <div className="flex items-center gap-1.5 ml-1">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#0B4F6C] bg-white"
                  aria-label="From date"
                />
                <span className="text-xs text-gray-400">→</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#0B4F6C] bg-white"
                  aria-label="To date"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {/* Pending */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Pending Alerts</span>

          </div>
          <div className="text-4xl font-bold text-gray-900 mb-1">
            {loading ? <span className="text-2xl text-gray-300">—</span> : (stats?.pending ?? 0)}
          </div>

        </div>

        {/* Verified */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Verified</span>

          </div>
          <div className="text-4xl font-bold text-gray-900 mb-1">
            {loading ? <span className="text-2xl text-gray-300">—</span> : (stats?.verified ?? 0)}
          </div>

        </div>

        {/* Cameras */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Cameras Online</span>

          </div>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-4xl font-bold text-gray-900">
              {loading ? <span className="text-2xl text-gray-300">—</span> : (stats?.camerasOnline ?? 0)}
            </span>
            {!loading && stats && (
              <span className="text-lg text-gray-400 font-medium">/{stats.camerasTotal}</span>
            )}
          </div>

        </div>

        {/* Avg Response */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Avg Response</span>

          </div>

          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-4xl font-bold text-gray-900">
              {loading ? <span className="text-2xl text-gray-300">—</span> : response.value}
            </span>

            {!loading && response.unit && (
              <span className="text-lg text-gray-400 font-medium">
                {response.unit}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Alerts ── */}
      {(() => {
        const isToday = selectedRange === 'today';
        const visibleAlerts = isToday ? alerts.slice(0, 5) : alerts.slice((alertPage - 1) * PAGE_SIZE, alertPage * PAGE_SIZE);
        const totalPages = Math.ceil(alerts.length / PAGE_SIZE);

        const dateLabel = (() => {
          const now = new Date();
          const fmtShort = (d: Date) => d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
          if (selectedRange === 'yesterday') {
            const y = new Date(now); y.setDate(now.getDate() - 1);
            return fmtShort(y);
          }
          if (selectedRange === '7days') {
            const s = new Date(now); s.setDate(now.getDate() - 6);
            return `${fmtShort(s)} – ${fmtShort(now)}`;
          }
          if (selectedRange === '30days') {
            const s = new Date(now); s.setDate(now.getDate() - 29);
            return `${fmtShort(s)} – ${fmtShort(now)}`;
          }
          if (selectedRange === 'custom' && customFrom && customTo)
            return `${customFrom} – ${customTo}`;
          return '';
        })();

        const AlertRow = ({ alert }: { alert: RecentAlert }) => {
          const lineColor = getLineColor(alert.lineId);
          const open = !isToday && expandedId === alert.id;
          const steps = buildTimelineSteps({
            source: alert.source,
            datetime: alert.datetime,
            reportedBy: alert.reportedBy,
            passengerComment: alert.passengerComment,
            confidence: alert.confidence,
            verifiedBy: alert.verifiedBy, verifiedAt: alert.verifiedAt, verifiedComment: alert.verifiedComment,
            enrouteBy: alert.enrouteBy, enrouteAt: alert.enrouteAt,
            resolvedBy: alert.resolvedBy, resolvedAt: alert.resolvedAt, resolvedComment: alert.resolvedComment,
            escalatedBy: alert.escalatedBy, escalatedAt: alert.escalatedAt, escalatedComment: alert.escalatedComment,
            dismissedBy: alert.dismissedBy, dismissedAt: alert.dismissedAt, dismissedComment: alert.dismissedComment,
          });

          return (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div
                className="flex cursor-pointer hover:bg-gray-50/60 transition-colors"
                onClick={() => {
                  if (isToday) {
                    onNavigate?.('live-alerts', alert.id);
                  } else {
                    setExpandedId(open ? null : alert.id);
                  }
                }}
              >
                <div className="w-1 flex-shrink-0" style={{ backgroundColor: STATUS_THEME[alert.status]?.color || '#d1d5db' }} />
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {!isToday && (
                          <ChevronRightIcon
                            size={13}
                            className="text-gray-400 flex-shrink-0 transition-transform duration-200"
                            style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
                          />
                        )}
                        <span className="font-bold text-sm text-gray-900">T.{alert.trainId} · C.{alert.coachId}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: lineColor + '18', color: lineColor }}>
                          {alert.line}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{alert.station}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-xs text-gray-500">
                          <ClockIcon className="w-3 h-3 inline mr-1" />
                          {formatClockTime(alert.time, format)}
                        </span>
                        {alert.source === 'ai' ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#FEF2F0] text-[#D34026]">
                            AI detected{alert.confidence != null ? `, ${Math.round(alert.confidence * 100)}% confidence` : ''}
                          </span>
                        ) : (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]">
                            Passenger reported
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className="text-xs font-semibold px-2 py-1 rounded-md flex-shrink-0"
                      style={{ backgroundColor: STATUS_THEME[alert.status]?.bg || '#F7FAFC', color: STATUS_THEME[alert.status]?.color || '#718096' }}
                    >
                      {alert.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
              {open && (
                <div className="px-5 pb-4 pt-2 bg-gray-50/80 border-t border-gray-100">
                  <StatusTimeline steps={steps} />
                </div>
              )}
            </div>
          );
        };

        return (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">Recent Alerts</h2>
                {!loading && alerts.length > 0 && (
                  <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                    {isToday ? '5 latest' : `${alerts.length} total`}
                  </span>
                )}
                {!isToday && dateLabel && (
                  <span className="text-xs text-gray-400 font-medium">{dateLabel}</span>
                )}
              </div>
              {isToday && (
                <button
                  className="text-sm font-medium flex items-center gap-1 hover:opacity-80 transition-opacity"
                  style={{ color: '#0B4F6C' }}
                  onClick={() => onNavigate?.('live-alerts')}
                >
                  View All <span aria-hidden="true">→</span>
                </button>
              )}
            </div>

            {/* Body */}
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12">
                <RefreshCwIcon size={18} className="text-gray-300 animate-spin" />
                <span className="text-sm text-gray-400">Loading alerts…</span>
              </div>
            ) : alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarIcon size={32} className="text-gray-200 mb-3" />
                <p className="text-sm font-medium text-gray-400">No incidents for this period</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleAlerts.map((alert) => <AlertRow key={alert.id} alert={alert} />)}
              </div>
            )}

            {/* Pagination — non-today only */}
            {!isToday && !loading && totalPages > 1 && (
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-400">
                  Page {alertPage} of {totalPages} · {alerts.length} alerts
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setAlertPage(p => Math.max(1, p - 1))}
                    disabled={alertPage === 1}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - alertPage) <= 1)
                    .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === '...' ? (
                        <span key={`ellipsis-${i}`} className="px-2 text-xs text-gray-400">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setAlertPage(p as number)}
                          className={`w-8 h-8 text-xs font-medium rounded-lg border transition-colors ${alertPage === p ? 'bg-[#0B4F6C] text-white border-[#0B4F6C]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                          {p}
                        </button>
                      )
                    )}
                  <button
                    onClick={() => setAlertPage(p => Math.min(totalPages, p + 1))}
                    disabled={alertPage === totalPages}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
