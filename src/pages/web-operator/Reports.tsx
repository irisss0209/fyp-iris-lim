import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StatusTimeline, buildTimelineSteps } from '../../components/StatusTimeline';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  CalendarIcon, DownloadIcon, FileTextIcon, TrendingUpIcon,
  RefreshCwIcon, ChevronDownIcon,
  ChevronRightIcon
} from 'lucide-react';
import { useTime } from '../../context/TimeContext';
import { formatDateTimeLabel } from '../../utils/Time';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import '../../Operator.css';

const API = `${import.meta.env.VITE_API_BASE}/api/data`;
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

interface StatusSlice { name: string; value: number; color: string; }
interface LineInfo { lineId: string; lineName: string; }
interface MonthOption { year: number; month: number; label: string; }

interface IncidentRow {
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
  // Status timeline
  verifiedBy?: string; verifiedAt?: string; verifiedComment?: string;
  enrouteBy?: string; enrouteAt?: string;
  resolvedBy?: string; resolvedAt?: string; resolvedComment?: string;
  escalatedBy?: string; escalatedAt?: string; escalatedComment?: string;
  dismissedBy?: string; dismissedAt?: string; dismissedComment?: string;
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
  if (s === 'resolved') return { bg: '#F0FBF6', text: '#2D7A5D' };
  if (s === 'escalated') return { bg: '#FEF2F0', text: '#D34026' };
  if (s === 'pending') return { bg: '#FFF7ED', text: '#C05621' };
  if (s === 'verified') return { bg: '#EFF6FF', text: '#1D4ED8' };
  if (s === 'en_route') return { bg: '#EFF6FF', text: '#0B4F6C' };
  if (s === 'dismissed') return { bg: '#F7FAFC', text: '#4A5568' };
  return { bg: '#F7FAFC', text: '#718096' };
};

const fmtDelta = (v: number, invertGood = false, diff?: number) => {
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

const fmtCountDelta = (v: number, invertGood = true) => {
  if (v === 0) return null;
  const good = invertGood ? v < 0 : v > 0;
  return { label: `${Math.abs(v)} ${v > 0 ? 'more' : 'less'}`, good };
};

const fmtTimeDiff = (v?: number) => {
  if (v === undefined || v === 0) return '';
  const absV = Math.abs(v);
  const timeStr = absV < 60 ? `${Math.round(absV)} mins` : `${(absV / 60).toFixed(1)} hrs`;
  return `${timeStr} ${v > 0 ? 'more' : 'less'}`;
};

const getCountDiffText = (v?: number) => {
  if (v === undefined) return '';
  if (v === 0) return `same as last month`;
  return `${Math.abs(v)} ${v > 0 ? 'more' : 'less'} than last month`;
};

// ── Component ─────────────────────────────────────────────────────────────────
export function Reports() {
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [data, setData] = useState<ReportData | null>(null);
  const [months, setMonths] = useState<MonthOption[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<MonthOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Incidents-tab filters
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [lineFilter, setLineFilter] = useState('');
  const [trainFilter, setTrainFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // ── Data fetching ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const token: string | undefined = (() => { try { return JSON.parse(localStorage.getItem('user_session') ?? '{}')?.token; } catch { return undefined; } })();
        const res = await fetch(`${API}/operator/reports`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include'
        });
        const json = await res.json();
        if (json.months?.length > 0) {
          setMonths(json.months);
          setSelectedMonth(json.months[0]);
        } else {
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
        console.error('Reports load failed:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fetchReport = useCallback(async (m: MonthOption) => {
    setLoading(true);
    try {
      const token: string | undefined = (() => { try { return JSON.parse(localStorage.getItem('user_session') ?? '{}')?.token; } catch { return undefined; } })();
      const res = await fetch(`${API}/operator/reports?year=${m.year}&month=${m.month}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include'
      });
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
  const stats = data?.stats;

  // ── Derived analytics ──────────────────────────────────────────────────────

  // Incidents grouped by train
  const byTrain = useMemo(() => {
    const groups: Record<string, { count: number; resolved: number; line: string }> = {};
    allIncidents.forEach(inc => {
      const key = inc.trainId ? `${inc.trainId}` : 'Unknown';
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
    const ai = allIncidents.filter(i => i.type === 'AI Detection').length;
    const report = allIncidents.filter(i => i.type === 'Passenger Report').length;
    return [
      { name: 'AI Detection', value: ai, color: '#0B4F6C' },
      { name: 'Passenger Report', value: report, color: '#D34026' },
    ].filter(s => s.value > 0);
  }, [allIncidents]);

  const resolvedCount = useMemo(() =>
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
      day: d.day as string,
      total: Object.entries(d)
        .filter(([k]) => k !== 'day')
        .reduce((s, [, v]) => s + (Number(v) || 0), 0),
    }));
    const peakDay = [...dayTotals].sort((a, b) => b.total - a.total)[0];

    // Peak Time of Day
    const hourTotals = new Array(24).fill(0);
    allIncidents.forEach(i => {
      if (i.datetime) {
        const hour = new Date(i.datetime).getHours();
        if (!isNaN(hour)) {
          hourTotals[hour]++;
        }
      }
    });

    let peakHour = 0;
    let maxIncidents = 0;
    for (let i = 0; i < 24; i++) {
      if (hourTotals[i] > maxIncidents) {
        maxIncidents = hourTotals[i];
        peakHour = i;
      }
    }

    const formatHour = (h: number) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hr = h % 12 || 12;
      return `${hr} ${ampm}`;
    };

    const peakTimeLabel = maxIncidents > 0 ? `${formatHour(peakHour)} - ${formatHour((peakHour + 1) % 24)}` : 'N/A';

    // Peak Date of the Month
    const dateTotals: Record<string, number> = {};
    allIncidents.forEach(i => {
      if (i.datetime) {
        const d = new Date(i.datetime);
        if (!isNaN(d.getTime())) {
          const dateStr = d.toLocaleDateString('en-MY', { month: 'short', day: 'numeric' });
          dateTotals[dateStr] = (dateTotals[dateStr] || 0) + 1;
        }
      }
    });

    let peakDateStr = '';
    let peakDateCount = 0;
    Object.entries(dateTotals).forEach(([dateStr, count]) => {
      if (count > peakDateCount) {
        peakDateCount = count;
        peakDateStr = dateStr;
      }
    });

    return [
      topLine
        ? { color: '#7B5EA7', label: 'Most Affected Line', value: topLine[0], sub: `${topLine[1]} incidents` }
        : null,
      topTrain
        ? { color: '#D34026', label: 'Highest Risk Train', value: topTrain.train, sub: `${topTrain.count} incidents` }
        : null,
      peakDay?.total > 0
        ? { color: '#B45309', label: 'Peak Day of Week', value: peakDay.day, sub: `${peakDay.total} incidents` }
        : null,
      maxIncidents > 0
        ? { color: '#0B4F6C', label: 'Peak Time of Day', value: peakTimeLabel, sub: `${maxIncidents} incidents` }
        : null,
      peakDateCount > 0
        ? { color: '#2D7A5D', label: 'Peak Day of Month', value: peakDateStr, sub: `${peakDateCount} incidents` }
        : null,
    ].filter(Boolean) as { color: string; label: string; value: string; sub: string }[];
  }, [allIncidents, byTrain, data, resolutionRate, resolvedCount, stats]);

  const uniqueTrains = useMemo(() => {
    const t = new Set(allIncidents.map(i => i.trainId).filter(Boolean));
    return Array.from(t).sort((a, b) => Number(a) - Number(b));
  }, [allIncidents]);

  // Filtered incidents for the Incidents tab
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allIncidents.filter(inc => {
      const matchStatus = !statusFilter || inc.status?.toLowerCase() === statusFilter;
      const matchSource = !sourceFilter || inc.type === sourceFilter;
      const matchLine = !lineFilter || inc.lineId === lineFilter;
      const matchTrain = !trainFilter || String(inc.trainId) === trainFilter;
      const matchSearch = !q
        || inc.id?.toLowerCase().includes(q)
        || String(inc.trainId).includes(q)
        || inc.line?.toLowerCase().includes(q)
        || [inc.verifiedBy, inc.resolvedBy, inc.escalatedBy, inc.dismissedBy].some(v => v?.toLowerCase().includes(q));
      return matchStatus && matchSource && matchLine && matchTrain && matchSearch;
    });
  }, [allIncidents, statusFilter, sourceFilter, lineFilter, trainFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // CSV export (exports current filtered set)
  const exportCSV = () => {
    const rows = [
      [
        'Case ID',
        'Train',
        'Coach',
        'Line',
        'Type',

        'Reported At',
        'Reported By',
        'Passenger Comment',

        'Verified At',
        'Verified By',
        'Verification Comment',

        'En Route At',
        'En Route By',

        'Resolved At',
        'Resolved By',
        'Resolution Comment',

        'Escalated At',
        'Escalated By',
        'Escalation Comment',

        'Dismissed At',
        'Dismissed By',
        'Dismissal Comment',


      ],

      ...filtered.map(i => [
        i.id,
        i.trainId,
        i.coachId,
        i.line,
        i.type,

        i.datetime,
        i.reportedBy ?? '',
        i.passengerComment ?? '',

        i.verifiedAt ?? '',
        i.verifiedBy ?? '',
        i.verifiedComment ?? '',

        i.enrouteAt ?? '',
        i.enrouteBy ?? '',

        i.resolvedAt ?? '',
        i.resolvedBy ?? '',
        i.resolvedComment ?? '',

        i.escalatedAt ?? '',
        i.escalatedBy ?? '',
        i.escalatedComment ?? '',

        i.dismissedAt ?? '',
        i.dismissedBy ?? '',
        i.dismissedComment ?? '',

      ])
    ];

    const csv = rows
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `incidents-full-${selectedMonth?.label ?? 'report'}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  };
  // ── PDF export ────────────────────────────────────────────────────────────


  const downloadPDF = async () => {
    const element = document.getElementById('report-export');
    if (!element) return;

    try {
      document.body.style.cursor = 'wait';

      const clone = element.cloneNode(true) as HTMLElement;

      clone.style.width = '1200px';
      clone.style.minWidth = '1200px';
      clone.style.maxWidth = '1200px';
      clone.style.margin = '0 auto';
      clone.style.background = 'white';
      clone.style.padding = '32px';
      clone.style.paddingBottom = '100px';
      clone.style.boxSizing = 'border-box';
      const header = clone.querySelector('.pdf-header') as HTMLElement;
      if (header) header.style.display = 'block';
      clone.querySelectorAll('.grid').forEach((el) => {
        const e = el as HTMLElement;

        if (e.className.includes('grid-cols-4')) {
          e.style.gridTemplateColumns = 'repeat(4, 1fr)';
        }

        if (e.className.includes('grid-cols-3')) {
          e.style.gridTemplateColumns = 'repeat(3, 1fr)';
        }

        if (e.className.includes('grid-cols-2')) {
          e.style.gridTemplateColumns = 'repeat(2, 1fr)';
        }
      });
      clone.querySelectorAll('[class*="rounded-xl"]').forEach((el) => {
        const e = el as HTMLElement;
        e.style.width = '100%';
      });
      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let position = 0;
      let heightLeft = imgHeight;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = - (imgHeight - heightLeft); // ✅ KEY FIX
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`railly-report-${selectedMonth?.label ?? 'report'}.pdf`);

      document.body.removeChild(clone);

    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      document.body.style.cursor = 'default';
    }
  };

  const tabs = [
    { id: 'overview' as ReportTab, label: 'Overview' },
    { id: 'incidents' as ReportTab, label: 'Incident Reports' },
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
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${selectedMonth?.year === m.year && selectedMonth?.month === m.month
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
              {tab.label}
            </button>
          ))}
        </div>
        {activeTab === 'overview' && !loading && (
          <button
            onClick={downloadPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <DownloadIcon className="w-4 h-4" />
            Download PDF
          </button>
        )}
        {activeTab === 'incidents' && !loading && (
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"

          >
            <DownloadIcon className="w-4 h-4" /> Export CSV
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
        <div
          id="report-export"
          className="space-y-5"

        >
          <div
            className="pdf-header"
            style={{
              display: 'none', // still hidden normally
              textAlign: 'center',
              marginBottom: '24px'
            }}
          >
            <h1 style={{
              fontSize: '24px',
              fontWeight: '800',
              color: '#0B4F6C'
            }}>
              Railly Safety Analytics Report
            </h1>

            <p style={{ fontSize: '12px', color: '#4A5568' }}>
              {selectedMonth?.label}
            </p>

            <p style={{ fontSize: '11px', color: '#718096' }}>
              Generated on {new Date().toLocaleString('en-MY')}
            </p>
          </div>
          {/* ── KPI stat cards ── */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">

            {/* Section header */}
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Key performance metrics</h2>
            </div>
            <div className="grid grid-cols-5 gap-4">
              {([
                {
                  label: 'Total Incidents',
                  value: stats?.total ?? 0,
                  fmt: (v: number) => String(v),
                  delta: stats ? fmtDelta(stats.totalDelta, true, stats.totalDifference) : null,
                  sub: stats?.hasPreviousData
                    ? getCountDiffText(stats?.totalDifference)
                    : '',
                },
                {
                  label: 'Unresolved Incidents',
                  value: stats?.unresolvedCount ?? 0,
                  fmt: (v: number) => String(v),
                  delta: stats ? fmtDelta(stats.unresolvedDelta, true, stats.unresolvedDifference) : null,
                  sub: stats?.hasPreviousData
                    ? getCountDiffText(stats?.unresolvedDifference)
                    : 'not resolved or dismissed',
                },
                {
                  label: 'Resolution Rate',
                  value: stats?.resolutionRate ?? resolutionRate,
                  fmt: (v: number) => `${v}%`,
                  delta: stats ? fmtDelta(stats.resolutionDelta, false) : null,
                  sub: stats?.hasPreviousData
                    ? getCountDiffText(stats?.resolvedDifference)
                    : `${resolvedCount} of ${stats?.total ?? 0} resolved`,
                },
                {
                  label: 'Avg Response Time',
                  value: stats?.avgResponseMinutes ?? 0,
                  fmt: (v: number) => {
                    if (v === 0) return 'N/A';

                    if (v < 60) {
                      return `${v} min`;
                    }

                    if (v < 1440) {
                      const hours = (v / 60).toFixed(1);
                      return `${hours} hr`;
                    }

                    const days = (v / 1440).toFixed(1);
                    return `${days} day`;
                  },
                  delta: stats ? fmtDelta(stats.avgResponseDelta, true) : null,
                  sub: stats && stats.avgResponseDifference
                    ? `${fmtTimeDiff(stats.avgResponseDifference)} than last month`
                    : (stats?.avgResponseMinutes === 0 ? 'No verified incidents' : ''),
                },
                {
                  label: 'False Alarm Rate',
                  value: stats?.falseAlarmRate ?? 0,
                  fmt: (v: number) => `${v}%`,
                  delta: stats ? fmtDelta(stats.falseAlarmDelta, true) : null,
                  sub: stats?.hasPreviousData
                    ? getCountDiffText(stats?.dismissedDifference)
                    : 'No previous data',
                },
              ] as const).map(card => {
                return (
                  <div key={card.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-gray-400">{card.label}</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{card.fmt(card.value)}</div>
                    <div className="flex flex-col mt-1.5">

                      {!stats?.hasPreviousData ? (
                        <span className="text-xs text-gray-400">
                          No previous data
                        </span>
                      ) : card.delta ? (
                        <span
                          className="text-xs font-semibold"
                          style={{ color: card.delta.good ? '#2D7A5D' : '#D34026' }}
                        >
                          {card.delta.label} from last month
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">
                          No change
                        </span>
                      )}

                      {card.sub && (
                        <span className="text-xs text-gray-400">
                          {card.sub}
                        </span>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Smart insight callouts ── */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">

            {/* Section header */}
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Key Insights</h2>
            </div>
            {topInsights.length > 0 && (
              <div className="grid grid-cols-5 gap-3">
                {topInsights.map(insight => {
                  return (
                    <div key={insight.label} className="bg-white rounded-xl p-3.5 border border-gray-100 shadow-sm flex items-center gap-3">
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
          </div>
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
            title=" Incidents (Preview)"
            showPagination={false}
            onViewAll={() => setActiveTab('incidents')}
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
            <select
              value={trainFilter}
              onChange={e => { setTrainFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]"
            >
              <option value="">All Trains</option>
              {uniqueTrains.map(t => (
                <option key={t} value={String(t)}>Train {t}</option>
              ))}
            </select>

          </div>

          <IncidentTable
            incidents={paginated}
            title={`All Incident Reports (${filtered.length})`}
            showPagination
            page={page}
            totalPages={totalPages}
            totalCount={filtered.length}
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
  totalCount?: number;
  onPageChange?: (p: number) => void;
  onViewAll?: () => void;
}

function IncidentTable({ incidents, title, showPagination, page = 1, totalPages = 1, totalCount, onPageChange, onViewAll }: IncidentTableProps) {
  const { format } = useTime();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-900">{title}</h3>

        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs font-semibold text-[#0B4F6C] hover:underline"
          >
            View all →
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="w-8 px-2" />
              {['Incident ID', 'Train ID (Coach ID)', 'Line', 'DateTime', 'Source', 'Status'].map(h => (
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
              const sc = statusColor(inc.status);
              const isAI = inc.type === 'AI Detection';
              const open = expandedId === inc.id;

              // Build timeline steps from non-null status fields
              const steps = buildTimelineSteps({
                source: inc.type,
                datetime: inc.datetime,
                reportedBy: inc.reportedBy,
                passengerComment: inc.passengerComment,
                confidence: inc.confidence,
                verifiedBy: inc.verifiedBy, verifiedAt: inc.verifiedAt, verifiedComment: inc.verifiedComment,
                enrouteBy: inc.enrouteBy, enrouteAt: inc.enrouteAt,
                resolvedBy: inc.resolvedBy, resolvedAt: inc.resolvedAt, resolvedComment: inc.resolvedComment,
                escalatedBy: inc.escalatedBy, escalatedAt: inc.escalatedAt, escalatedComment: inc.escalatedComment,
                dismissedBy: inc.dismissedBy, dismissedAt: inc.dismissedAt, dismissedComment: inc.dismissedComment,
              });

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
                      <span className="text-xs font-semibold text-gray-800">{inc.trainId} ({inc.coachId})</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{inc.line}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {formatDateTimeLabel(inc.datetime, format)}
                    </td>
                    <td className="px-4 py-3">
                      {isAI ? (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor:
                              inc.confidence != null
                                ? inc.confidence >= 0.8
                                  ? 'rgba(239, 255, 251, 1)'
                                  : inc.confidence >= 0.5
                                    ? '#fff6efff'
                                    : '#ffefefff'
                                : '#EFF6FF',
                            color:
                              inc.confidence != null
                                ? inc.confidence >= 0.8
                                  ? '#2D7A5D'
                                  : inc.confidence >= 0.5
                                    ? '#B45309'
                                    : '#D34026'
                                : '#0B4F6C'
                          }}
                        >
                          System
                          {inc.confidence != null && ` (${Math.round(inc.confidence * 100)}%)`}
                        </span>
                      ) : (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: '#FEF2F0', color: '#D34026' }}
                        >
                          Passenger
                        </span>
                      )}
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
                        <StatusTimeline steps={steps} />
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
          <span className="text-xs text-gray-400">
            Page {page} of {totalPages}{totalCount !== undefined ? ` · ${totalCount} incidents` : ''}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((item, i) =>
                item === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-xs text-gray-400">…</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => onPageChange?.(item as number)}
                    className={`w-8 h-8 text-xs font-medium rounded-lg border transition-colors ${page === item ? 'bg-[#0B4F6C] text-white border-[#0B4F6C]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {item}
                  </button>
                )
              )}
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
