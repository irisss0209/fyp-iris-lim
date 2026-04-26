import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  CalendarIcon, DownloadIcon, FileTextIcon, TrendingUpIcon,
  RefreshCwIcon, ChevronDownIcon,
} from 'lucide-react';
import { useTime } from '../../context/TimeContext';
import { formatDateTimeLabel } from '../../utils/Time';

const API = 'http://localhost:5293/api/data';

// ── Colour palette (consistent with Dashboard) ────────────────────────────
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

// ── Types ─────────────────────────────────────────────────────────────────
type ReportTab = 'overview' | 'incidents' | 'export';

interface ReportStats {
  total: number;
  falseAlarmRate: number;
  avgResponseMinutes: number;
  complianceScore: number;
  totalDelta: number;
  falseAlarmDelta: number;
  complianceDelta: number;
}

interface StatusSlice {
  name: string;
  value: number;
  color: string;
}

interface LineInfo {
  lineId: string;
  lineName: string;
}

interface MonthOption {
  year: number;
  month: number;
  label: string;
}

interface IncidentRow {
  id: string;
  trainId: number | string;
  coach: number | string;
  line: string;
  lineId: string;
  datetime: string;
  type: string;
  status: string;
  handledBy?: string;
}

interface ReportData {
  year: number;
  month: number;
  stats: ReportStats;
  dailyData: Record<string, number | string>[];   // { day, [lineName]: count }
  lines: LineInfo[];
  statusBreakdown: StatusSlice[];
  incidents: IncidentRow[];
}

// ── Helpers ───────────────────────────────────────────────────────────────
const statusColor = (status: string) => {
  const s = status.toLowerCase();
  if (s === 'resolved') return { bg: '#F0FBF6', text: '#2D7A5D' };
  if (s === 'escalated') return { bg: '#FEF2F0', text: '#D34026' };
  if (s === 'pending') return { bg: '#FFF7ED', text: '#C05621' };
  if (s === 'verified') return { bg: '#EFF6FF', text: '#1D4ED8' };
  if (s === 'en_route') return { bg: '#EFF6FF', text: '#0B4F6C' };
  return { bg: '#F7FAFC', text: '#718096' };
};

const fmtDelta = (v: number, invert = false) => {
  if (v === 0) return null;
  const good = invert ? v < 0 : v > 0;
  const arrow = v > 0 ? '↑' : '↓';
  return { label: `${arrow} ${Math.abs(v)}%`, good };
};

// ── Component ─────────────────────────────────────────────────────────────
export function Reports() {
  const { format } = useTime();
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [data, setData] = useState<ReportData | null>(null);
  const [months, setMonths] = useState<MonthOption[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<MonthOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // ── Load available months first ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/operator/reports`);
        const json = await res.json();
        // The endpoint returns months list too on first load
        if (json.months && json.months.length > 0) {
          setMonths(json.months);
          setSelectedMonth(json.months[0]); // newest first
        } else {
          // fallback: use current month
          const now = new Date();
          const cur = {
            year: now.getFullYear(), month: now.getMonth() + 1,
            label: now.toLocaleDateString('en-MY', { month: 'short', year: 'numeric' })
          };
          setMonths([cur]);
          setSelectedMonth(cur);
        }
        setData(json);
      } catch (err) {
        console.error('Reports initial load failed:', err);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-fetch when month changes ──────────────────────────────────────
  const fetchReport = useCallback(async (m: MonthOption) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/operator/reports?year=${m.year}&month=${m.month}`);
      const json = await res.json();
      setData(json);
      // also refresh months list
      if (json.months && json.months.length > 0) setMonths(json.months);
    } catch (err) {
      console.error('Reports fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedMonth) fetchReport(selectedMonth);
  }, [selectedMonth, fetchReport]);

  // ── Filtered incidents ───────────────────────────────────────────────
  const allIncidents = data?.incidents ?? [];
  const filtered = allIncidents.filter(inc => {
    const matchStatus = !statusFilter || inc.status.toLowerCase() === statusFilter;
    const q = search.toLowerCase();
    const handledBy = (inc.handledBy ?? '').toLowerCase();
    const matchSearch = !q || inc.id.toLowerCase().includes(q)
      || inc.coach.toLowerCase().includes(q)
      || inc.line.toLowerCase().includes(q)
      || handledBy.includes(q);
    return matchStatus && matchSearch;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── CSV export ───────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [
      ['Case ID', 'Coach', 'Line', 'Date/Time', 'Type', 'Status'],
      ...allIncidents.map(i => [i.id, i.coach, i.line, i.datetime, i.type, i.status]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `incidents-${selectedMonth?.label ?? 'report'}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Tabs ─────────────────────────────────────────────────────────────
  const tabs: { id: ReportTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <TrendingUpIcon className="w-4 h-4" /> },
    { id: 'incidents', label: 'Incident Reports', icon: <FileTextIcon className="w-4 h-4" /> },
  ];

  const stats = data?.stats;

  return (
    <div className="p-6 min-h-full" style={{ backgroundColor: '#FAF9F5' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-bold text-gray-900 leading-tight">
            Reports &amp; Analytics
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#4A5568' }}>
            Compliance monitoring insights
          </p>
        </div>

        {/* Month picker */}
        <div className="relative">
          <button
            id="month-picker-btn"
            onClick={() => setPickerOpen(p => !p)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            style={{ color: '#1A202C' }}
          >
            <CalendarIcon className="w-4 h-4" style={{ color: '#4A5568' }} />
            {loading ? '…' : (selectedMonth?.label ?? 'Select month')}
            <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {pickerOpen && (
            <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 min-w-[160px] py-1 max-h-64 overflow-y-auto">
              {months.map(m => (
                <button
                  key={`${m.year}-${m.month}`}
                  onClick={() => { setSelectedMonth(m); setPickerOpen(false); setPage(1); }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${selectedMonth?.year === m.year && selectedMonth?.month === m.month
                    ? 'bg-[#EFF6FF] text-[#0B4F6C] font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  {m.label}
                </button>
              ))}
              {months.length === 0 && (
                <p className="px-4 py-2 text-xs text-gray-400">No data yet</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 shadow-sm border border-gray-100 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150`}
            style={{
              backgroundColor: activeTab === tab.id ? '#0B4F6C' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#4A5568',
            }}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ── Loading skeleton ─────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center gap-2 py-16 justify-center">
          <RefreshCwIcon className="w-5 h-5 text-gray-300 animate-spin" />
          <span className="text-sm text-gray-400">Loading report data…</span>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          OVERVIEW TAB
      ════════════════════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'overview' && (
        <div className="space-y-5">

          {/* Summary stat cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              {
                label: 'Total Incidents',
                value: stats?.total ?? 0,
                fmt: (v: number) => String(v),
                sub: stats && stats.totalDelta !== 0
                  ? fmtDelta(stats.totalDelta)?.label
                  : 'This month',
                subGood: stats ? fmtDelta(stats.totalDelta)?.good : undefined,
                color: '#1A202C',
              },
              {
                label: 'False Alarm Rate',
                value: stats?.falseAlarmRate ?? 0,
                fmt: (v: number) => `${v}%`,
                sub: stats && stats.falseAlarmDelta !== 0
                  ? fmtDelta(stats.falseAlarmDelta, true)?.label
                  : undefined,
                subGood: stats ? fmtDelta(stats.falseAlarmDelta, true)?.good : undefined,
                color: '#2D7A5D',
              },
              {
                label: 'Avg Response Time',
                value: stats?.avgResponseMinutes ?? 0,
                fmt: (v: number) => `${v}m`,
                sub: stats?.avgResponseMinutes === 0 ? 'No verified incidents' : 'to verify',
                color: '#0B4F6C',
              },
              {
                label: 'Compliance Score',
                value: stats?.complianceScore ?? 0,
                fmt: (v: number) => `${v}%`,
                sub: stats && stats.complianceDelta !== 0
                  ? fmtDelta(stats.complianceDelta)?.label
                  : 'This month',
                subGood: stats ? fmtDelta(stats.complianceDelta)?.good : undefined,
                color: '#2D7A5D',
              },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="text-xs font-medium mb-2" style={{ color: '#4A5568' }}>{s.label}</div>
                <div className="text-3xl font-bold" style={{ color: s.color }}>
                  {s.fmt(s.value)}
                </div>
                {s.sub && (
                  <div
                    className="text-xs mt-1"
                    style={{ color: s.subGood === true ? '#2D7A5D' : s.subGood === false ? '#D34026' : '#4A5568' }}
                  >
                    {s.sub}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Bar chart: Daily incidents by line */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-sm mb-4" style={{ color: '#1A202C' }}>
                Daily Incidents by Line
              </h3>
              {(data?.dailyData?.length ?? 0) === 0 ? (
                <div className="flex items-center justify-center h-[220px] text-sm text-gray-400">
                  No incidents this month
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data!.dailyData} barSize={8} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#4A5568' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#4A5568' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {(data?.lines ?? []).map(l => (
                      <Bar key={l.lineId} dataKey={l.lineName} fill={getLineColor(l.lineId)} radius={[3, 3, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Pie chart: status breakdown */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-sm mb-4" style={{ color: '#1A202C' }}>
                Alert Resolution Status
              </h3>
              {(data?.statusBreakdown?.length ?? 0) === 0 ? (
                <div className="flex items-center justify-center h-[220px] text-sm text-gray-400">
                  No incidents this month
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="60%" height={220}>
                    <PieChart>
                      <Pie
                        data={data!.statusBreakdown}
                        cx="50%" cy="50%"
                        innerRadius={55} outerRadius={85}
                        paddingAngle={3} dataKey="value"
                      >
                        {data!.statusBreakdown.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {data!.statusBreakdown.map(item => {
                      const total = data!.statusBreakdown.reduce((s, x) => s + x.value, 0);
                      const pct = total > 0 ? Math.round(item.value * 100 / total) : 0;
                      return (
                        <div key={item.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.color }} />
                          <div className="flex-1">
                            <div className="text-xs" style={{ color: '#1A202C' }}>{item.name}</div>
                            <div className="text-sm font-bold" style={{ color: item.color }}>{pct}%</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent incidents table (top 6) */}
          <IncidentTable
            incidents={allIncidents.slice(0, 6)}
            title="Recent Incidents"
            showPagination={false}
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          INCIDENTS TAB
      ════════════════════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'incidents' && (
        <div className="space-y-4">
          {/* Filters row */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search ID, coach, line, operator…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F6C] bg-white"
            />
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]"
              style={{ color: '#1A202C' }}
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="en_route">En Route</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: '#0B4F6C' }}
            >
              <DownloadIcon className="w-4 h-4" /> Export CSV
            </button>
          </div>

          <IncidentTable
            incidents={paginated}
            title={`All Incident Reports (${filtered.length})`}
            showPagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

    </div>
  );
}

// ── Shared incident table sub-component ──────────────────────────────────
interface IncidentTableProps {
  incidents: IncidentRow[];
  title: string;
  showPagination: boolean;
  page?: number;
  totalPages?: number;
  onPageChange?: (p: number) => void;
}

function IncidentTable({ incidents, title, showPagination, page = 1, totalPages = 1, onPageChange }: IncidentTableProps) {
  const { format } = useTime();
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-sm" style={{ color: '#1A202C' }}>{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['Incident ID', 'Coach', 'Line', 'Date/Time', 'Type', 'Status'].map(h => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: '#4A5568' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {incidents.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                  No incidents found
                </td>
              </tr>
            ) : incidents.map(inc => {
              const sc = statusColor(inc.status);
              return (
                <tr key={inc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: '#0B4F6C' }}>{inc.id}</td>
                  <td className="px-4 py-3 font-medium text-xs" style={{ color: '#1A202C' }}>T.{inc.trainId} C.{inc.coach}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#4A5568' }}>{inc.line}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#4A5568' }}>
                    {formatDateTimeLabel(inc.datetime, format)}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#1A202C' }}>{inc.type}</td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: sc.bg, color: sc.text }}
                    >
                      {inc.status}
                    </span>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
              className="px-3 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              ←
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
              className="px-3 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
