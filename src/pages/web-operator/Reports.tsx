import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  CalendarIcon, DownloadIcon, FileTextIcon, TrendingUpIcon,
  RefreshCwIcon, ChevronDownIcon, AlertTriangleIcon,
  CheckCircleIcon, ZapIcon, MapPinIcon, ClockIcon,
  ChevronRightIcon, PrinterIcon,
} from 'lucide-react';
import { useTime } from '../../context/TimeContext';
import { formatDateTimeLabel } from '../../utils/Time';

const API = 'http://localhost:5293/api/data';
const ACCENT = '#0B4F6C';
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

// ── Types ─────────────────────────────────────────────────────────────────────
type ReportTab = 'overview' | 'incidents';

interface ReportStats {
  total: number;
  falseAlarmRate: number;
  avgResponseMinutes: number;
  complianceScore: number;
  totalDelta: number;
  falseAlarmDelta: number;
  complianceDelta: number;
}

interface StatusSlice { name: string; value: number; color: string; }
interface LineInfo    { lineId: string; lineName: string; }
interface MonthOption { year: number; month: number; label: string; }

interface IncidentRow {
  id: string;
  trainId: number | string;
  coachId: number | string;
  line: string;
  lineId: string;
  datetime: string;
  type: string;
  status: string;
  source: string;
  reportedBy?: string;
  // Status timeline
  verifiedBy?: string;      verifiedAt?: string;   verifiedComment?: string;
  enrouteBy?: string;       enrouteAt?: string;
  resolvedBy?: string;      resolvedAt?: string;   resolvedComment?: string;
  escalatedBy?: string;     escalatedAt?: string;  escalatedComment?: string;
  dismissedBy?: string;     dismissedAt?: string;  dismissedComment?: string;
}

interface ReportData {
  year: number;
  month: number;
  stats: ReportStats;
  dailyData: Record<string, number | string>[];
  lines: LineInfo[];
  statusBreakdown: StatusSlice[];
  incidents: IncidentRow[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const statusColor = (status: string) => {
  const s = status?.toLowerCase() ?? '';
  if (s === 'resolved')  return { bg: '#F0FBF6', text: '#2D7A5D' };
  if (s === 'escalated') return { bg: '#FEF2F0', text: '#D34026' };
  if (s === 'pending')   return { bg: '#FFF7ED', text: '#C05621' };
  if (s === 'verified')  return { bg: '#EFF6FF', text: '#1D4ED8' };
  if (s === 'en_route')  return { bg: '#EFF6FF', text: '#0B4F6C' };
  if (s === 'dismissed') return { bg: '#F7FAFC', text: '#4A5568' };
  return { bg: '#F7FAFC', text: '#718096' };
};

const fmtDelta = (v: number, invertGood = false) => {
  if (v === 0) return null;
  const good = invertGood ? v < 0 : v > 0;
  return { label: `${v > 0 ? '↑' : '↓'} ${Math.abs(v)}%`, good };
};

// ── Component ─────────────────────────────────────────────────────────────────
export function Reports() {
  const [activeTab, setActiveTab]           = useState<ReportTab>('overview');
  const [data, setData]                     = useState<ReportData | null>(null);
  const [months, setMonths]                 = useState<MonthOption[]>([]);
  const [selectedMonth, setSelectedMonth]   = useState<MonthOption | null>(null);
  const [loading, setLoading]               = useState(true);
  const [pickerOpen, setPickerOpen]         = useState(false);

  // Incidents-tab filters
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [lineFilter, setLineFilter]     = useState('');
  const [search, setSearch]             = useState('');
  const [page, setPage]                 = useState(1);
  const PAGE_SIZE = 10;

  // ── Data fetching ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`${API}/operator/reports`);
        const json = await res.json();
        if (json.months?.length > 0) {
          setMonths(json.months);
          setSelectedMonth(json.months[0]);
        } else {
          const now = new Date();
          const cur = { year: now.getFullYear(), month: now.getMonth() + 1,
            label: now.toLocaleDateString('en-MY', { month: 'short', year: 'numeric' }) };
          setMonths([cur]);
          setSelectedMonth(cur);
        }
        setData(json);
      } catch (err) {
        console.error('Reports load failed:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fetchReport = useCallback(async (m: MonthOption) => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/operator/reports?year=${m.year}&month=${m.month}`);
      const json = await res.json();
      setData(json);
      if (json.months?.length > 0) setMonths(json.months);
    } catch (err) {
      console.error('Reports fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (selectedMonth) fetchReport(selectedMonth); }, [selectedMonth, fetchReport]);

  const allIncidents = data?.incidents ?? [];
  const stats        = data?.stats;

  // ── Derived analytics ──────────────────────────────────────────────────────

  // Incidents grouped by train
  const byTrain = useMemo(() => {
    const groups: Record<string, { count: number; resolved: number; line: string }> = {};
    allIncidents.forEach(inc => {
      const key = inc.trainId ? `T.${inc.trainId}` : 'Unknown';
      if (!groups[key]) groups[key] = { count: 0, resolved: 0, line: inc.line ?? '' };
      groups[key].count++;
      if (inc.status?.toLowerCase() === 'resolved') groups[key].resolved++;
    });
    return Object.entries(groups)
      .map(([train, v]) => ({ train, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [allIncidents]);

  // AI vs Passenger split
  const sourceSplit = useMemo(() => {
    const ai     = allIncidents.filter(i => i.type === 'AI Detection').length;
    const report = allIncidents.filter(i => i.type === 'Passenger Report').length;
    return [
      { name: 'AI Detection',     value: ai,     color: '#0B4F6C' },
      { name: 'Passenger Report', value: report,  color: '#D34026' },
    ].filter(s => s.value > 0);
  }, [allIncidents]);

  const resolvedCount  = useMemo(() =>
    allIncidents.filter(i => i.status?.toLowerCase() === 'resolved').length, [allIncidents]);
  const resolutionRate = stats?.total ? Math.round(resolvedCount * 100 / stats.total) : 0;

  // Smart insight callouts
  const topInsights = useMemo(() => {
    if (!allIncidents.length) return [];

    const lineMap: Record<string, number> = {};
    allIncidents.forEach(i => { if (i.line) lineMap[i.line] = (lineMap[i.line] || 0) + 1; });
    const topLine = Object.entries(lineMap).sort((a, b) => b[1] - a[1])[0];

    const topTrain = byTrain[0];

    const dayTotals = (data?.dailyData ?? []).map(d => ({
      day:   d.day as string,
      total: Object.entries(d)
               .filter(([k]) => k !== 'day')
               .reduce((s, [, v]) => s + (Number(v) || 0), 0),
    }));
    const peakDay = [...dayTotals].sort((a, b) => b.total - a.total)[0];

    return [
      topLine
        ? { Icon: MapPinIcon,        color: '#7B5EA7', label: 'Most Affected Line',  value: topLine[0],    sub: `${topLine[1]} incidents` }
        : null,
      topTrain
        ? { Icon: AlertTriangleIcon, color: '#D34026', label: 'Highest Risk Train',  value: topTrain.train, sub: `${topTrain.count} incidents` }
        : null,
      peakDay?.total > 0
        ? { Icon: CalendarIcon,      color: '#B45309', label: 'Peak Day of Week',    value: peakDay.day,   sub: `${peakDay.total} incidents` }
        : null,
      { Icon: CheckCircleIcon,       color: '#2D7A5D', label: 'Resolution Rate',     value: `${resolutionRate}%`, sub: `${resolvedCount} of ${stats?.total ?? 0} resolved` },
    ].filter(Boolean) as { Icon: React.ElementType; color: string; label: string; value: string; sub: string }[];
  }, [allIncidents, byTrain, data, resolutionRate, resolvedCount, stats]);

  // Filtered incidents for the Incidents tab
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allIncidents.filter(inc => {
      const matchStatus = !statusFilter || inc.status?.toLowerCase() === statusFilter;
      const matchSource = !sourceFilter || inc.type === sourceFilter;
      const matchLine   = !lineFilter   || inc.lineId === lineFilter;
      const matchSearch = !q
        || inc.id?.toLowerCase().includes(q)
        || String(inc.trainId).includes(q)
        || inc.line?.toLowerCase().includes(q)
        || [inc.verifiedBy, inc.resolvedBy, inc.escalatedBy, inc.dismissedBy].some(v => v?.toLowerCase().includes(q));
      return matchStatus && matchSource && matchLine && matchSearch;
    });
  }, [allIncidents, statusFilter, sourceFilter, lineFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // CSV export (exports current filtered set)
  const exportCSV = () => {
    const rows = [
      ['Case ID', 'Train', 'Coach', 'Line', 'Date/Time', 'Source', 'Status', 'Handled By'],
      ...filtered.map(i => [i.id, `T.${i.trainId}`, `C.${i.coachId}`, i.line, i.datetime, i.type, i.status, i.verifiedBy ?? i.resolvedBy ?? i.escalatedBy ?? i.dismissedBy ?? '']),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `incidents-${selectedMonth?.label ?? 'report'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── PDF export ────────────────────────────────────────────────────────────
  const downloadPDF = () => {
    const win = window.open('', '_blank');
    if (!win) return;

    const fmtDate = (d?: string | null) =>
      d ? new Date(d).toLocaleString('en-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

    const kpiRows = [
      ['Total Incidents',  String(stats?.total ?? 0),         stats?.totalDelta ? `${stats.totalDelta > 0 ? '↑' : '↓'} ${Math.abs(stats.totalDelta)}% vs last month` : ''],
      ['Resolution Rate',  `${resolutionRate}%`,              `${resolvedCount} of ${stats?.total ?? 0} resolved`],
      ['Avg Response',     stats?.avgResponseMinutes ? `${stats.avgResponseMinutes}m` : 'N/A', 'to first verification'],
      ['False Alarm Rate', `${stats?.falseAlarmRate ?? 0}%`,  'dismissed incidents'],
    ];

    const trainRows = byTrain.map(t => [t.train, String(t.count), String(t.resolved), t.count > 0 ? `${Math.round(t.resolved * 100 / t.count)}%` : '0%', t.line]);
    const statusRows = (data?.statusBreakdown ?? []).map(s => {
      const total = data!.statusBreakdown.reduce((a, x) => a + x.value, 0);
      return [s.name, String(s.value), total > 0 ? `${Math.round(s.value * 100 / total)}%` : '0%'];
    });

    const tableStyle = 'width:100%;border-collapse:collapse;margin-bottom:24px;font-size:12px';
    const thStyle    = 'background:#0B4F6C;color:#fff;padding:8px 10px;text-align:left;font-weight:600';
    const tdStyle    = 'padding:7px 10px;border-bottom:1px solid #E2E8F0;color:#1A202C';
    const tdAlt      = 'padding:7px 10px;border-bottom:1px solid #E2E8F0;color:#1A202C;background:#F8FAFC';

    const makeTable = (headers: string[], rows: string[][], title: string) => `
      <h3 style="font-size:13px;font-weight:700;color:#0B4F6C;margin:0 0 8px">${title}</h3>
      <table style="${tableStyle}">
        <thead><tr>${headers.map(h => `<th style="${thStyle}">${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map((r, i) => `<tr>${r.map(c => `<td style="${i % 2 === 0 ? tdStyle : tdAlt}">${c}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>`;

    const incidentTableRows = allIncidents.slice(0, 50).map((inc, i) => {
      const sc = inc.status?.toLowerCase();
      const statusColor = sc === 'resolved' ? '#2D7A5D' : sc === 'escalated' ? '#D34026' : sc === 'dismissed' ? '#4A5568' : '#B45309';
      return `<tr>
        <td style="${i % 2 === 0 ? tdStyle : tdAlt};font-family:monospace;color:#0B4F6C">${inc.id}</td>
        <td style="${i % 2 === 0 ? tdStyle : tdAlt}">T.${inc.trainId} C.${inc.coachId}</td>
        <td style="${i % 2 === 0 ? tdStyle : tdAlt}">${inc.line}</td>
        <td style="${i % 2 === 0 ? tdStyle : tdAlt}">${fmtDate(inc.datetime)}</td>
        <td style="${i % 2 === 0 ? tdStyle : tdAlt}">${inc.type}</td>
        <td style="${i % 2 === 0 ? tdStyle : tdAlt};color:${statusColor};font-weight:600">${inc.status}</td>
        <td style="${i % 2 === 0 ? tdStyle : tdAlt}">${inc.verifiedBy ?? inc.resolvedBy ?? inc.dismissedBy ?? inc.escalatedBy ?? '—'}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Railly Reports – ${selectedMonth?.label ?? ''}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, -apple-system, sans-serif; color: #1A202C; background: #fff; padding: 32px 40px; }
        @media print { body { padding: 16px 20px; } @page { margin: 16mm; } }
      </style>
    </head><body>
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #0B4F6C;padding-bottom:12px;margin-bottom:24px">
        <div>
          <div style="font-size:22px;font-weight:800;color:#0B4F6C">Railly Command Center</div>
          <div style="font-size:13px;color:#4A5568;margin-top:2px">Reports &amp; Analytics — ${selectedMonth?.label ?? ''}</div>
        </div>
        <div style="font-size:11px;color:#718096">Generated ${new Date().toLocaleString('en-MY')}</div>
      </div>

      ${makeTable(['Metric', 'Value', 'Note'], kpiRows, 'Key Performance Indicators')}
      ${makeTable(['Status', 'Count', 'Share'], statusRows, 'Resolution Status Breakdown')}
      ${makeTable(['Train', 'Incidents', 'Resolved', 'Resolution Rate', 'Top Line'], trainRows, 'Incidents by Train (Top 10)')}

      <h3 style="font-size:13px;font-weight:700;color:#0B4F6C;margin:0 0 8px">Incident Report (${allIncidents.length} total, showing first 50)</h3>
      <table style="${tableStyle}">
        <thead><tr>${['Case ID','Train · Coach','Line','Date/Time','Source','Status','Handled By'].map(h => `<th style="${thStyle}">${h}</th>`).join('')}</tr></thead>
        <tbody>${incidentTableRows}</tbody>
      </table>
    </body></html>`;

    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const tabs = [
    { id: 'overview'   as ReportTab, label: 'Overview',          icon: <TrendingUpIcon className="w-4 h-4" /> },
    { id: 'incidents'  as ReportTab, label: 'Incident Reports',  icon: <FileTextIcon   className="w-4 h-4" /> },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 min-h-full" style={{ backgroundColor: '#FAF9F5' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-bold text-gray-900 leading-tight">Reports &amp; Analytics</h1>
          <p className="text-sm mt-0.5 text-gray-400">
            {selectedMonth?.label}{stats?.total != null ? ` · ${stats.total} incidents` : ''}
          </p>
        </div>

        {/* Month picker */}
        <div className="relative">
          <button
            onClick={() => setPickerOpen(p => !p)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors text-gray-800"
          >
            <CalendarIcon className="w-4 h-4 text-gray-400" />
            {loading ? '…' : (selectedMonth?.label ?? 'Select month')}
            <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400" />
          </button>
          {pickerOpen && (
            <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 min-w-[160px] py-1 max-h-64 overflow-y-auto">
              {months.map(m => (
                <button
                  key={`${m.year}-${m.month}`}
                  onClick={() => { setSelectedMonth(m); setPickerOpen(false); setPage(1); }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    selectedMonth?.year === m.year && selectedMonth?.month === m.month
                      ? 'bg-[#EFF6FF] text-[#0B4F6C] font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
              {months.length === 0 && <p className="px-4 py-2 text-xs text-gray-400">No data yet</p>}
            </div>
          )}
        </div>
      </div>

      {/* Tabs + PDF button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
              style={{ backgroundColor: activeTab === tab.id ? ACCENT : 'transparent', color: activeTab === tab.id ? 'white' : '#4A5568' }}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
        {activeTab === 'overview' && !loading && (
          <button
            onClick={downloadPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <PrinterIcon className="w-4 h-4" />
            Download PDF
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 py-16 justify-center">
          <RefreshCwIcon className="w-5 h-5 text-gray-300 animate-spin" />
          <span className="text-sm text-gray-400">Loading report data…</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          OVERVIEW TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'overview' && (
        <div className="space-y-5">

          {/* ── KPI stat cards ── */}
          <div className="grid grid-cols-4 gap-4">
            {([
              {
                label: 'Total Incidents',
                value: stats?.total ?? 0,
                fmt:   (v: number) => String(v),
                delta: stats ? fmtDelta(stats.totalDelta) : null,
                Icon:  AlertTriangleIcon,
                iconColor: '#D34026',
                sub: 'vs last month',
              },
              {
                label: 'Resolution Rate',
                value: resolutionRate,
                fmt:   (v: number) => `${v}%`,
                delta: null,
                Icon:  CheckCircleIcon,
                iconColor: '#2D7A5D',
                sub: `${resolvedCount} of ${stats?.total ?? 0} resolved`,
              },
              {
                label: 'Avg Response Time',
                value: stats?.avgResponseMinutes ?? 0,
                fmt:   (v: number) => v === 0 ? 'N/A' : `${v}m`,
                delta: null,
                Icon:  ClockIcon,
                iconColor: '#0B4F6C',
                sub: stats?.avgResponseMinutes === 0 ? 'No verified incidents' : 'to first verification',
              },
              {
                label: 'False Alarm Rate',
                value: stats?.falseAlarmRate ?? 0,
                fmt:   (v: number) => `${v}%`,
                delta: stats ? fmtDelta(stats.falseAlarmDelta, true) : null,
                Icon:  ZapIcon,
                iconColor: '#B45309',
                sub: 'dismissed incidents',
              },
            ] as const).map(card => {
              const { Icon } = card;
              return (
                <div key={card.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-gray-400">{card.label}</span>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: card.iconColor + '18' }}>
                      <Icon size={14} style={{ color: card.iconColor }} />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{card.fmt(card.value)}</div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {card.delta && (
                      <span className="text-xs font-semibold" style={{ color: card.delta.good ? '#2D7A5D' : '#D34026' }}>
                        {card.delta.label}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{card.sub}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Smart insight callouts ── */}
          {topInsights.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {topInsights.map(insight => {
                const { Icon } = insight;
                return (
                  <div key={insight.label} className="bg-white rounded-xl p-3.5 border border-gray-100 shadow-sm flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: insight.color + '18' }}>
                      <Icon size={16} style={{ color: insight.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 truncate">{insight.label}</p>
                      <p className="text-sm font-bold text-gray-900 truncate">{insight.value}</p>
                      <p className="text-[10px] text-gray-400 truncate">{insight.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Charts row 1: Daily by Line + Status Breakdown ── */}
          <div className="grid grid-cols-2 gap-4">

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-sm text-gray-900 mb-1">Daily Incidents by Line</h3>
              <p className="text-xs text-gray-400 mb-4">Grouped by day of week for {selectedMonth?.label}</p>
              {(data?.dailyData?.length ?? 0) === 0 ? (
                <div className="flex items-center justify-center h-[220px] text-sm text-gray-400">No incidents this month</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data!.dailyData} barSize={8} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#4A5568' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#4A5568' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {(data?.lines ?? []).map(l => (
                      <Bar key={l.lineId} dataKey={l.lineName} fill={getLineColor(l.lineId)} radius={[3, 3, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-sm text-gray-900 mb-1">Resolution Status Breakdown</h3>
              <p className="text-xs text-gray-400 mb-4">Distribution of final incident outcomes</p>
              {(data?.statusBreakdown?.length ?? 0) === 0 ? (
                <div className="flex items-center justify-center h-[220px] text-sm text-gray-400">No incidents this month</div>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="55%" height={220}>
                    <PieChart>
                      <Pie data={data!.statusBreakdown} cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={3} dataKey="value">
                        {data!.statusBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-3">
                    {(() => {
                      const total = data!.statusBreakdown.reduce((s, x) => s + x.value, 0);
                      return data!.statusBreakdown.map(item => {
                        const pct = total > 0 ? Math.round(item.value * 100 / total) : 0;
                        return (
                          <div key={item.name}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-xs text-gray-600">{item.name}</span>
                              </div>
                              <span className="text-xs font-bold" style={{ color: item.color }}>{item.value}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Charts row 2: Incidents by Train + Source Split ── */}
          <div className="grid grid-cols-3 gap-4">

            {/* Incidents by Train — 2/3 width */}
            <div className="col-span-2 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-sm text-gray-900 mb-1">Incidents by Train</h3>
              <div className="flex items-center gap-4 mb-4">
                <p className="text-xs text-gray-400 flex-1">Top {byTrain.length} trains by incident volume</p>
                <div className="flex items-center gap-3 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: '#2D7A5D' }} /> ≥70% resolved</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: '#B45309' }} /> 40–70%</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: '#D34026' }} /> &lt;40%</span>
                </div>
              </div>
              {byTrain.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-sm text-gray-400">No incidents this month</div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(200, byTrain.length * 36)}>
                  <BarChart data={byTrain} layout="vertical" barSize={14} margin={{ left: 0, right: 24, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#4A5568' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="train" width={68} tick={{ fontSize: 11, fill: '#4A5568' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}
                      formatter={(value: number, _name, props) => [
                        `${value} incidents · ${props.payload.resolved} resolved`,
                        'Count',
                      ]}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {byTrain.map((entry, i) => {
                        const rate = entry.count > 0 ? entry.resolved / entry.count : 0;
                        const fill = rate >= 0.7 ? '#2D7A5D' : rate >= 0.4 ? '#B45309' : '#D34026';
                        return <Cell key={i} fill={fill} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Source split — 1/3 width */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-sm text-gray-900 mb-1">Incident Source</h3>
              <p className="text-xs text-gray-400 mb-4">AI Detection vs Passenger Report</p>
              {sourceSplit.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-sm text-gray-400">No data</div>
              ) : (
                <div>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={sourceSplit} cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={4} dataKey="value">
                        {sourceSplit.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-3">
                    {(() => {
                      const total = sourceSplit.reduce((s, x) => s + x.value, 0);
                      return sourceSplit.map(s => {
                        const pct = total > 0 ? Math.round(s.value * 100 / total) : 0;
                        return (
                          <div key={s.name}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                                <span className="text-xs text-gray-600">{s.name}</span>
                              </div>
                              <span className="text-xs font-bold" style={{ color: s.color }}>{pct}% ({s.value})</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Recent incidents ── */}
          <IncidentTable
            incidents={allIncidents.slice(0, 5)}
            title="Recent Incidents"
            showPagination={false}
          />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          INCIDENTS TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'incidents' && (
        <div className="space-y-4">

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              placeholder="Search ID, train, line, operator…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="flex-1 min-w-[180px] px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F6C] bg-white text-gray-800"
            />
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="en_route">En Route</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
            <select
              value={sourceFilter}
              onChange={e => { setSourceFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]"
            >
              <option value="">All Sources</option>
              <option value="AI Detection">AI Detection</option>
              <option value="Passenger Report">Passenger Report</option>
            </select>
            <select
              value={lineFilter}
              onChange={e => { setLineFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]"
            >
              <option value="">All Lines</option>
              {(data?.lines ?? []).map(l => (
                <option key={l.lineId} value={l.lineId}>{l.lineName}</option>
              ))}
            </select>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: ACCENT }}
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

// ── Shared incident table ─────────────────────────────────────────────────────
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fmtAt = (d?: string | null) =>
    d ? new Date(d).toLocaleString('en-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-sm text-gray-900">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="w-8 px-2" />
              {['Incident ID', 'Train · Coach', 'Line', 'Date / Time', 'Source', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {incidents.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">No incidents found</td>
              </tr>
            ) : incidents.map(inc => {
              const sc    = statusColor(inc.status);
              const isAI  = inc.type === 'AI Detection';
              const open  = expandedId === inc.id;

              // Build timeline steps from non-null status fields
              const steps: { label: string; by?: string; at?: string; comment?: string; color: string }[] = [
                { label: 'Reported',  by: inc.reportedBy, at: inc.datetime, color: '#4A5568' },
              ];
              if (inc.verifiedBy || inc.verifiedAt)
                steps.push({ label: 'Verified',  by: inc.verifiedBy,  at: inc.verifiedAt,  comment: inc.verifiedComment,  color: '#1D4ED8' });
              if (inc.enrouteBy || inc.enrouteAt)
                steps.push({ label: 'En Route',  by: inc.enrouteBy,   at: inc.enrouteAt,                                  color: '#0B4F6C' });
              if (inc.resolvedBy || inc.resolvedAt)
                steps.push({ label: 'Resolved',  by: inc.resolvedBy,  at: inc.resolvedAt,  comment: inc.resolvedComment,  color: '#2D7A5D' });
              if (inc.escalatedBy || inc.escalatedAt)
                steps.push({ label: 'Escalated', by: inc.escalatedBy, at: inc.escalatedAt, comment: inc.escalatedComment, color: '#D34026' });
              if (inc.dismissedBy || inc.dismissedAt)
                steps.push({ label: 'Dismissed', by: inc.dismissedBy, at: inc.dismissedAt, comment: inc.dismissedComment, color: '#4A5568' });

              return (
                <React.Fragment key={inc.id}>
                  {/* Main row */}
                  <tr
                    className="hover:bg-gray-50 transition-colors cursor-pointer border-t border-gray-50"
                    onClick={() => setExpandedId(open ? null : inc.id)}
                  >
                    <td className="pl-3 pr-1 py-3 text-gray-300">
                      <ChevronRightIcon
                        size={14}
                        className="transition-transform duration-200"
                        style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: ACCENT }}>{inc.id}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold text-gray-800">T.{inc.trainId}</span>
                      <span className="text-xs text-gray-400 ml-1">C.{inc.coachId}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{inc.line}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {formatDateTimeLabel(inc.datetime, format)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: isAI ? '#EFF6FF' : '#FEF2F0', color: isAI ? '#0B4F6C' : '#D34026' }}>
                        {isAI ? 'AI' : 'Passenger'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: sc.bg, color: sc.text }}>
                        {inc.status}
                      </span>
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {open && (
                    <tr className="bg-gray-50/80">
                      <td colSpan={7} className="px-6 pb-4 pt-2">
                        <div className="flex gap-0">
                          {steps.map((step, i) => (
                            <div key={i} className="flex items-start flex-1 min-w-0">
                              {/* Connector line + dot */}
                              <div className="flex flex-col items-center mr-2 mt-1 flex-shrink-0">
                                <div className="w-3 h-3 rounded-full border-2 border-white flex-shrink-0" style={{ backgroundColor: step.color, boxShadow: `0 0 0 2px ${step.color}40` }} />
                                {i < steps.length - 1 && (
                                  <div className="flex-1 w-px mt-1" style={{ backgroundColor: '#E2E8F0', minHeight: 16 }} />
                                )}
                              </div>
                              {/* Content */}
                              <div className="min-w-0 pr-4 pb-2">
                                <div className="text-[11px] font-bold" style={{ color: step.color }}>{step.label}</div>
                                {step.at && (
                                  <div className="text-[10px] text-gray-400 mt-0.5">{fmtAt(step.at)}</div>
                                )}
                                {step.by && (
                                  <div className="text-[10px] text-gray-600 font-medium mt-0.5">by {step.by}</div>
                                )}
                                {step.comment && (
                                  <div className="text-[10px] text-gray-500 mt-1 italic bg-white rounded px-2 py-1 border border-gray-100">
                                    "{step.comment}"
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
          <div className="flex gap-1">
            <button disabled={page <= 1}      onClick={() => onPageChange?.(page - 1)} className="px-3 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">←</button>
            <button disabled={page >= totalPages} onClick={() => onPageChange?.(page + 1)} className="px-3 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">→</button>
          </div>
        </div>
      )}
    </div>
  );
}
