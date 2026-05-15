import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarIcon, DownloadIcon, TrendingUpIcon,
  RefreshCwIcon, ChevronDownIcon,
} from 'lucide-react';
import { IncidentTable } from '../../components/IncidentTable';
import { ReportKPICards } from '../../components/ReportKPICards';
import { ReportCharts } from '../../components/ReportCharts';
import {
  ReportStats, StatusSlice, LineInfo, IncidentRow, ByTrainItem,
} from '../../utils/reportUtils';
import { parseMYTDatetime, toMYTHour } from '../../utils/myt';
import { API } from '../../api/config';
import '../../Operator.css';
const ACCENT = '#0B4F6C';

type ReportTab = 'overview' | 'incidents';
interface MonthOption { year: number; month: number; label: string; }

interface ReportData {
  year: number;
  month: number;
  stats: ReportStats;
  dailyData: Record<string, number | string>[];
  lines: LineInfo[];
  statusBreakdown: StatusSlice[];
  incidents: IncidentRow[];
}

export function Reports({ session }: { session?: { token?: string } | null }) {
  const [activeTab, setActiveTab]         = useState<ReportTab>('overview');
  const [data, setData]                   = useState<ReportData | null>(null);
  const [months, setMonths]               = useState<MonthOption[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<MonthOption | null>(null);
  const [loading, setLoading]             = useState(true);
  const [pickerOpen, setPickerOpen]       = useState(false);
  const [aiSummary, setAiSummary]         = useState<string | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryError, setAiSummaryError] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const [filter, setFilter] = useState({ status: '', source: '', line: '', train: '', search: '', page: 1 });
  const setF = <K extends keyof typeof filter>(k: K, v: typeof filter[K]) =>
    setFilter(f => ({ ...f, [k]: v, ...(k !== 'page' && { page: 1 }) }));
  const PAGE_SIZE = 10;

  const getToken = () => session?.token;

  // ── Data fetching ────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`${API}/operator/reports`, {
          headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
          credentials: 'include',
        });
        const json = await res.json();
        if (json.months?.length > 0) {
          setMonths(json.months);
          setSelectedMonth(json.months[0]);
        } else {
          const now = new Date();
          const cur = { year: now.getFullYear(), month: now.getMonth() + 1,
            label: now.toLocaleDateString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', month: 'short', year: 'numeric' }) };
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
      const res  = await fetch(`${API}/operator/reports?year=${m.year}&month=${m.month}`, {
        headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
        credentials: 'include',
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

  // ── AI summary ───────────────────────────────────────────────────────────────
  // Deps: `data` only (not `selectedMonth`) so the effect fires once the fetched
  // data reflects the chosen month. topInsights is intentionally omitted from deps
  // because it is declared later in the function body — reading it in the dep array
  // would cause a TDZ error. It is safe in the callback body (effects run after render).
  useEffect(() => {
    if (loading || !data?.stats) return;
    const controller = new AbortController();
    setAiSummary(null);
    setAiSummaryError(false);
    setAiSummaryLoading(true);
    const s = data.stats;
    fetch(`${API}/ai/report-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
      credentials: 'include',
      signal: controller.signal,
      body: JSON.stringify({
        total:              s.total,
        totalDelta:         s.totalDelta,
        resolutionRate:     s.resolutionRate,
        falseAlarmRate:     s.falseAlarmRate,
        avgResponseMinutes: s.avgResponseMinutes,
        mostAffectedLine:   topInsights.find(i => i.label === 'Most Affected Line')?.value ?? '',
        highestRiskTrain:   topInsights.find(i => i.label === 'Highest Risk Train')?.value ?? '',
        peakTime:           topInsights.find(i => i.label === 'Peak Time of Day')?.value ?? '',
        month:              selectedMonth?.label ?? '',
      }),
    })
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(d => setAiSummary(d.summary ?? null))
      .catch(err => { if (err.name !== 'AbortError') setAiSummaryError(true); })
      .finally(() => setAiSummaryLoading(false));
    return () => controller.abort();
  }, [loading, data]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived analytics ────────────────────────────────────────────────────────
  const allIncidents = data?.incidents ?? [];
  const stats        = data?.stats;

  const byTrain = useMemo<ByTrainItem[]>(() => {
    const groups: Record<string, ByTrainItem> = {};
    allIncidents.forEach(inc => {
      const key = inc.trainId ? `${inc.trainId}` : 'Unknown';
      if (!groups[key]) groups[key] = { train: key, count: 0, closed: 0, line: inc.line ?? '' };
      groups[key].count++;
      const s = inc.status?.toLowerCase();
      if (s === 'resolved' || s === 'dismissed') groups[key].closed++;
    });
    return Object.values(groups).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [allIncidents]);

  const sourceSplit = useMemo<StatusSlice[]>(() => {
    const ai     = allIncidents.filter(i => i.type === 'AI Detection').length;
    const report = allIncidents.filter(i => i.type === 'Passenger Report').length;
    return [
      { name: 'AI Detection',    value: ai,     color: '#0B4F6C' },
      { name: 'Passenger Report', value: report, color: '#D34026' },
    ].filter(s => s.value > 0);
  }, [allIncidents]);

  const resolvedCount  = useMemo(() => allIncidents.filter(i => i.status?.toLowerCase() === 'resolved').length, [allIncidents]);
  const resolutionRate = stats?.total ? Math.round(resolvedCount * 100 / stats.total) : 0;

  const topInsights = useMemo(() => {
    if (!allIncidents.length) return [];

    const lineMap: Record<string, number> = {};
    allIncidents.forEach(i => { if (i.line) lineMap[i.line] = (lineMap[i.line] || 0) + 1; });
    const topLine  = Object.entries(lineMap).sort((a, b) => b[1] - a[1])[0];
    const topTrain = byTrain[0];

    const dayTotals = (data?.dailyData ?? []).map(d => ({
      day: d.day as string,
      total: Object.entries(d).filter(([k]) => k !== 'day').reduce((s, [, v]) => s + (Number(v) || 0), 0),
    }));
    const peakDay = [...dayTotals].sort((a, b) => b.total - a.total)[0];

    const hourTotals = new Array(24).fill(0);
    allIncidents.forEach(i => {
      if (i.datetime) { const h = toMYTHour(parseMYTDatetime(i.datetime)); hourTotals[h]++; }
    });
    let peakHour = 0, maxIncidents = 0;
    for (let i = 0; i < 24; i++) { if (hourTotals[i] > maxIncidents) { maxIncidents = hourTotals[i]; peakHour = i; } }
    const fmtH = (h: number) => `${h % 12 || 12} ${h >= 12 ? 'PM' : 'AM'}`;
    const peakTimeLabel = maxIncidents > 0 ? `${fmtH(peakHour)} - ${fmtH((peakHour + 1) % 24)}` : 'N/A';

    const dateTotals: Record<string, number> = {};
    allIncidents.forEach(i => {
      if (i.datetime) {
        const d = parseMYTDatetime(i.datetime);
        if (!isNaN(d.getTime())) {
          const key = d.toLocaleDateString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', month: 'short', day: 'numeric' });
          dateTotals[key] = (dateTotals[key] || 0) + 1;
        }
      }
    });
    let peakDateStr = '', peakDateCount = 0;
    Object.entries(dateTotals).forEach(([k, v]) => { if (v > peakDateCount) { peakDateCount = v; peakDateStr = k; } });

    return [
      topLine  ? { color: '#7B5EA7', label: 'Most Affected Line',  value: topLine[0],       sub: `${topLine[1]} incidents`  } : null,
      topTrain ? { color: '#D34026', label: 'Highest Risk Train',  value: topTrain.train,   sub: `${topTrain.count} incidents` } : null,
      peakDay?.total > 0      ? { color: '#B45309', label: 'Peak Day of Week',   value: peakDay.day,    sub: `${peakDay.total} incidents`    } : null,
      maxIncidents > 0        ? { color: '#0B4F6C', label: 'Peak Time of Day',   value: peakTimeLabel,  sub: `${maxIncidents} incidents`     } : null,
      peakDateCount > 0       ? { color: '#2D7A5D', label: 'Peak Day of Month',  value: peakDateStr,    sub: `${peakDateCount} incidents`    } : null,
    ].filter(Boolean) as { color: string; label: string; value: string; sub: string }[];
  }, [allIncidents, byTrain, data]);

  const uniqueTrains = useMemo(() => {
    return Array.from(new Set(allIncidents.map(i => i.trainId).filter(Boolean))).sort((a, b) => Number(a) - Number(b));
  }, [allIncidents]);

  const filtered = useMemo(() => {
    const q = filter.search.toLowerCase();
    return allIncidents.filter(inc => {
      const matchStatus = !filter.status || inc.status?.toLowerCase() === filter.status;
      const matchSource = !filter.source || inc.type === filter.source;
      const matchLine   = !filter.line   || inc.lineId === filter.line;
      const matchTrain  = !filter.train  || String(inc.trainId) === filter.train;
      const matchSearch = !q
        || inc.id?.toLowerCase().includes(q)
        || String(inc.trainId).includes(q)
        || inc.line?.toLowerCase().includes(q)
        || [inc.verifiedBy, inc.resolvedBy, inc.escalatedBy, inc.dismissedBy].some(v => v?.toLowerCase().includes(q));
      return matchStatus && matchSource && matchLine && matchTrain && matchSearch;
    });
  }, [allIncidents, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((filter.page - 1) * PAGE_SIZE, filter.page * PAGE_SIZE);

  // ── Exports ──────────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = [
      'Case ID', 'Train', 'Coach', 'Line', 'Type',
      'Reported At', 'Reported By', 'Passenger Comment',
      'Verified At', 'Verified By', 'Verification Comment',
      'En Route At', 'En Route By', 'En Route Comment',
      'Resolved At', 'Resolved By', 'Resolution Comment',
      'Escalated At', 'Escalated By', 'Escalation Comment',
      'Dismissed At', 'Dismissed By', 'Dismissal Comment',
      'Evidence Link',
    ];
    const rows = [
      headers,
      ...filtered.map(i => [
        i.id, i.trainId, i.coachId, i.line, i.type,
        i.datetime, i.reportedBy ?? '', i.passengerComment ?? '',
        i.verifiedAt ?? '', i.verifiedBy ?? '', i.verifiedComment ?? '',
        i.enrouteAt ?? '', i.enrouteBy ?? '', i.enrouteComment ?? '',
        i.resolvedAt ?? '', i.resolvedBy ?? '', i.resolvedComment ?? '',
        i.escalatedAt ?? '', i.escalatedBy ?? '', i.escalatedComment ?? '',
        i.dismissedAt ?? '', i.dismissedBy ?? '', i.dismissedComment ?? '',
        (i.imageUrl || (i as any).ImageUrl) && i.id ? `${import.meta.env.VITE_API_BASE}/api/data/incident/${i.id.replace('ALT-', '').replace('RPT-', '')}/image-redirect` : 'No Image',
      ]),
    ];
    const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `incidents-full-${selectedMonth?.label ?? 'report'}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = async () => {
    if (!stats) return;
    try {
      // Disable Recharts animation so html2canvas doesn't capture a mid-sweep state
      setIsCapturing(true);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const h2c = (await import('html2canvas')).default;
      const capture = async (id: string): Promise<string | null> => {
        const el = document.getElementById(id);
        if (!el) return null;
        const canvas = await h2c(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
        return canvas.toDataURL('image/png');
      };
      const [chartDaily, chartStatus, chartTrain, chartSource] = await Promise.all([
        capture('pdf-chart-daily'),
        capture('pdf-chart-status'),
        capture('pdf-chart-train'),
        capture('pdf-chart-source'),
      ]);

      setIsPdfGenerating(true);
      const [{ pdf }, { ReportPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../../components/ReportPDF'),
      ]);
      const blob = await pdf(
        <ReportPDF
          month={selectedMonth?.label ?? ''}
          stats={stats}
          topInsights={topInsights}
          statusBreakdown={data?.statusBreakdown ?? []}
          aiSummary={aiSummary}
          resolutionRate={resolutionRate}
          chartImages={{ daily: chartDaily, status: chartStatus, train: chartTrain, source: chartSource }}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `railly-report-${selectedMonth?.label ?? 'report'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsCapturing(false);
      setIsPdfGenerating(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'overview'  as ReportTab, label: 'Overview'         },
    { id: 'incidents' as ReportTab, label: 'Incident Reports' },
  ];

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
                  onClick={() => { setSelectedMonth(m); setPickerOpen(false); setFilter(f => ({ ...f, page: 1 })); }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    selectedMonth?.year === m.year && selectedMonth?.month === m.month
                      ? 'bg-[#EFF6FF] text-[#0B4F6C] font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  {m.label}
                </button>
              ))}
              {months.length === 0 && <p className="px-4 py-2 text-xs text-gray-400">No data yet</p>}
            </div>
          )}
        </div>
      </div>

      {/* Tabs + action button */}
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
          <button onClick={downloadPDF} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors">
            <DownloadIcon className="w-4 h-4" /> Download PDF
          </button>
        )}
        {activeTab === 'incidents' && !loading && (
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors">
            <DownloadIcon className="w-4 h-4" /> Export CSV
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-16 justify-center">
          <RefreshCwIcon className="w-5 h-5 text-gray-300 animate-spin" />
          <span className="text-sm text-gray-400">Loading report data…</span>
        </div>
      )}

      {/* ── Overview Tab ────────────────────────────────────────────────────────── */}
      {!loading && activeTab === 'overview' && (
        <div className="space-y-5">

          {/* AI Summary */}
          {(aiSummaryLoading || aiSummary || aiSummaryError) && (
            <div className={`border rounded-2xl p-5 flex items-start gap-4 ${aiSummaryError ? 'bg-gray-50 border-gray-200' : 'bg-[#EFF6FF] border-[#BFDBFE]'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${aiSummaryError ? 'bg-gray-300' : 'bg-[#0B4F6C]'}`}>
                <TrendingUpIcon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${aiSummaryError ? 'text-gray-400' : 'text-[#0B4F6C]'}`}>AI Report Summary</p>
                {aiSummaryLoading ? (
                  <div className="flex items-center gap-2">
                    <RefreshCwIcon className="w-3.5 h-3.5 text-[#0B4F6C] animate-spin" />
                    <span className="text-xs text-[#0B4F6C]">Generating summary…</span>
                  </div>
                ) : aiSummaryError ? (
                  <p className="text-xs text-gray-400">AI summary unavailable — make sure the backend is running with the latest build and the Gemini API key is set in AWS Secrets Manager.</p>
                ) : (
                  <p className="text-sm text-[#1E3A5F] leading-relaxed">{aiSummary}</p>
                )}
              </div>
            </div>
          )}

          <ReportKPICards stats={stats} resolutionRate={resolutionRate} resolvedCount={resolvedCount} />

          {/* Key Insights */}
          {topInsights.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-gray-900">Key Insights</h2>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {topInsights.map(insight => (
                  <div key={insight.label} className="bg-white rounded-xl p-3.5 border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 truncate">{insight.label}</p>
                    <p className="text-sm font-bold text-gray-900 truncate">{insight.value}</p>
                    <p className="text-[10px] text-gray-400 truncate">{insight.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <ReportCharts
            dailyData={data?.dailyData ?? []}
            lines={data?.lines ?? []}
            statusBreakdown={data?.statusBreakdown ?? []}
            byTrain={byTrain}
            sourceSplit={sourceSplit}
            selectedMonthLabel={selectedMonth?.label ?? ''}
            isCapturing={isCapturing}
          />

          <IncidentTable
            incidents={allIncidents.slice(0, 5)}
            title="Incidents (Preview)"
            showPagination={false}
            onViewAll={() => setActiveTab('incidents')}
          />
        </div>
      )}

      {/* ── Incidents Tab ────────────────────────────────────────────────────────── */}
      {!loading && activeTab === 'incidents' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              placeholder="Search ID, train, line, operator…"
              value={filter.search}
              onChange={e => setF('search', e.target.value)}
              className="flex-1 min-w-[180px] px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F6C] bg-white text-gray-800"
            />
            <select value={filter.status} onChange={e => setF('status', e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]">
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="en_route">En Route</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
            <select value={filter.source} onChange={e => setF('source', e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]">
              <option value="">All Sources</option>
              <option value="AI Detection">AI Detection</option>
              <option value="Passenger Report">Passenger Report</option>
            </select>
            <select value={filter.line} onChange={e => setF('line', e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]">
              <option value="">All Lines</option>
              {(data?.lines ?? []).map(l => <option key={l.lineId} value={l.lineId}>{l.lineName}</option>)}
            </select>
            <select value={filter.train} onChange={e => setF('train', e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]">
              <option value="">All Trains</option>
              {uniqueTrains.map(t => <option key={t} value={String(t)}>Train {t}</option>)}
            </select>
          </div>

          <IncidentTable
            incidents={paginated}
            title={`All Incident Reports (${filtered.length})`}
            showPagination
            page={filter.page}
            totalPages={totalPages}
            totalCount={filtered.length}
            onPageChange={p => setF('page', p)}
          />
        </div>
      )}

      {isPdfGenerating && (
        <div className="fixed inset-0 z-[9999] bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
          <RefreshCwIcon className="w-6 h-6 text-[#0B4F6C] animate-spin" />
          <p className="text-sm font-semibold text-gray-700">Generating PDF…</p>
          <p className="text-xs text-gray-400">This may take a few seconds</p>
        </div>
      )}
    </div>
  );
}
