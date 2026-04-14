import { useState, useEffect, useCallback } from 'react';
import {
  BellIcon,
  CameraIcon,
  CheckCircleIcon,
  ClockIcon,
  CalendarIcon,
  RefreshCwIcon,
} from 'lucide-react';
import type { NavPage } from './OperatorInterface';

const API = 'http://localhost:5293/api/data';

interface DashboardProps {
  onNavigate?: (page: NavPage) => void;
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
  coachId: string;
  line: string;
  lineId: string;
  station: string;
  time: string;
  status: string;
  confidence: number | null;
  source: 'ai' | 'passenger';
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

export function Dashboard({ onNavigate }: DashboardProps) {
  const [selectedRange, setSelectedRange] = useState<DateRange>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const [alerts, setAlerts] = useState<RecentAlert[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Fetch from backend ────────────────────────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/operator/dashboard`);
      const data = await res.json();
      setStats(data.stats);
      setAlerts(data.recentAlerts ?? []);
    } catch (err) {
      console.error('Dashboard fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // ── Dynamic subtitle ──────────────────────────────────────────────────────────
  const getSubtitle = () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const fmt = (d: Date) =>
      d.toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const fmtShort = (d: Date) =>
      d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });

    const sevenAgo = new Date(now);  sevenAgo.setDate(now.getDate() - 6);
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

  const camerasOffline = stats ? stats.camerasTotal - stats.camerasOnline : 0;

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
            <button
              onClick={fetchDashboard}
              disabled={loading}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-40 transition-colors"
            >
              <RefreshCwIcon size={11} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <CalendarIcon size={13} className="text-gray-400" aria-hidden="true" />
            <span className="text-xs text-gray-400 font-medium">Filter by date</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {(Object.keys(RANGE_LABELS) as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setSelectedRange(range)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors duration-150 ${
                  selectedRange === range
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
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
              <BellIcon size={16} className="text-orange-400" />
            </div>
          </div>
          <div className="text-4xl font-bold text-gray-900 mb-1">
            {loading ? <span className="text-2xl text-gray-300">—</span> : (stats?.pending ?? 0)}
          </div>
          <div className="text-xs text-gray-400">Awaiting operator review</div>
        </div>

        {/* Verified */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Verified &amp; Escalated</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <CheckCircleIcon size={16} style={{ color: '#0B4F6C' }} />
            </div>
          </div>
          <div className="text-4xl font-bold text-gray-900 mb-1">
            {loading ? <span className="text-2xl text-gray-300">—</span> : (stats?.verified ?? 0)}
          </div>
          <div className="text-xs text-gray-400">
            {loading ? '' : `${stats?.resolved ?? 0} resolved`}
          </div>
        </div>

        {/* Cameras */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Cameras Online</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <CameraIcon size={16} style={{ color: '#0B4F6C' }} />
            </div>
          </div>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-4xl font-bold text-gray-900">
              {loading ? <span className="text-2xl text-gray-300">—</span> : (stats?.camerasOnline ?? 0)}
            </span>
            {!loading && stats && (
              <span className="text-lg text-gray-400 font-medium">/{stats.camerasTotal}</span>
            )}
          </div>
          <div className="text-xs text-gray-400">{loading ? '' : `${camerasOffline} offline`}</div>
        </div>

        {/* Avg Response */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Avg Response</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <ClockIcon size={16} style={{ color: '#0B4F6C' }} />
            </div>
          </div>
          <div className="text-4xl font-bold text-gray-900 mb-1">
            {loading ? <span className="text-2xl text-gray-300">—</span> : (stats?.avgResponseMinutes.toFixed(1) ?? '—')}
          </div>
          <div className="text-xs text-gray-400">minutes to verify</div>
        </div>
      </div>

      {/* ── Recent Alerts ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 min-w-0">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900">Recent Alerts</h2>
            {!loading && alerts.length > 0 && (
              <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                {alerts.length} latest
              </span>
            )}
          </div>
          <button
            className="text-sm font-medium flex items-center gap-1 hover:opacity-80 transition-opacity"
            style={{ color: '#0B4F6C' }}
            onClick={() => onNavigate?.('live-alerts')}
            aria-label="View all alerts"
          >
            View All <span aria-hidden="true">→</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12">
            <RefreshCwIcon size={18} className="text-gray-300 animate-spin" />
            <span className="text-sm text-gray-400">Loading alerts…</span>
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarIcon size={32} className="text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-400">No alerts in the database yet</p>
            <p className="text-xs text-gray-300 mt-1">Incidents will appear here once detected</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {alerts.map((alert) => {
              const lineColor = getLineColor(alert.lineId);
              return (
                <div key={alert.id} className="flex items-center gap-4 py-5">
                  <div
                    className="w-1.5 h-14 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor:
                        alert.status === 'pending'  ? '#f87171' :
                        alert.status === 'verified' ? '#4ade80' : '#d1d5db'
                    }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-4 mb-2 flex-wrap">
                      <span className="text-lg font-bold text-gray-800">{alert.coachId}</span>
                      <span
                        className="text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider"
                        style={{ backgroundColor: lineColor + '28', color: lineColor }}
                      >
                        {alert.line}
                      </span>
                      <span className="text-sm px-3 py-1 rounded-full bg-gray-50 font-semibold text-gray-500 border border-gray-100">
                        {alert.station}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5">
                      {alert.source === 'ai' && alert.confidence !== null ? (
                        <span
                          className="text-xs font-bold px-3 py-1.5 rounded-full"
                          style={{ backgroundColor: '#FEF2F0', color: '#D34026' }}
                        >
                          AI detected, {alert.confidence}% confidence
                        </span>
                      ) : (
                        <span
                          className="text-xs font-bold px-3 py-1.5 rounded-full"
                          style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
                        >
                          Passenger reported
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2.5 flex-shrink-0">
                    <span className="text-xs font-semibold text-gray-400">{alert.time}</span>
                    <span
                      className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-extrabold"
                      style={{
                        backgroundColor:
                          alert.status === 'pending'  ? '#FFF7ED' :
                          alert.status === 'verified' ? '#F0FDF4' : '#F9FAFB',
                        color:
                          alert.status === 'pending'  ? '#C2410C' :
                          alert.status === 'verified' ? '#15803D' : '#6B7280'
                      }}
                    >
                      {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}