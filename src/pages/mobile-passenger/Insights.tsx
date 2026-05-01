import { useEffect, useMemo, useState } from 'react';
import {
  BarChart2Icon,
  ChevronRightIcon,
  LightbulbIcon,
  Loader2,
  MapPinIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from 'lucide-react';
import { detectNearbyLines } from '../../utils/location';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const API = `${import.meta.env.VITE_API_BASE}/api/data`;
const ACCENT = '#0B4F6C';
const ALERT = '#D34026';
const SAFE = '#2D7A5D';

interface ReportIncident {
  line?: string;
  lineId?: string;
  trainId?: number | null;
  datetime?: string;
}

interface ReportStats {
  totalDifference?: number;
  hasPreviousData?: boolean;
}

interface OperatorReportsResponse {
  year?: number;
  month?: number;
  incidents?: ReportIncident[];
  stats?: ReportStats;
}

interface OperatorAlert {
  line?: string;
  station?: string;
  trainId?: number | null;
  date?: string;
  time?: string;
  status?: string;
}

interface TrainChartPoint {
  train: string;
  pending: number;
  verified: number;
  enRoute: number;
  escalated: number;
  resolved: number;
}


interface LineResponse {
  lineName: string;
}

interface TopMetric {
  label: string;
  count: number;
}


async function getJson<T>(url: string, token?: string): Promise<T> {
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url, { headers, credentials: 'include' });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

function pluralize(count: number, singular: string, pluralWord: string) {
  return `${count} ${count === 1 ? singular : pluralWord}`;
}

function toUtcDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseHourFromTime(time?: string) {
  if (!time) return null;
  const [hour] = time.split(':');
  const parsed = Number(hour);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 23) return null;
  return parsed;
}

function formatHourRange(startHour: number) {
  const start = new Date(Date.UTC(2000, 0, 1, startHour, 0, 0));
  const end = new Date(Date.UTC(2000, 0, 1, (startHour + 1) % 24, 0, 0));
  const fmt = (d: Date) => d.toLocaleTimeString('en-MY', {
    hour: 'numeric',
    hour12: true,
    timeZone: 'UTC',
  }).replace(' ', '');
  return `${fmt(start)}-${fmt(end)}`;
}

function topFromList(values: string[]): TopMetric | null {
  const map = new Map<string, number>();

  values.forEach(raw => {
    const key = raw.trim();
    if (!key || key.toLowerCase() === 'unknown') return;
    map.set(key, (map.get(key) ?? 0) + 1);
  });

  const [top] = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  return top ? { label: top[0], count: top[1] } : null;
}

function buildTrainStatusChart(alerts: OperatorAlert[]): TrainChartPoint[] {
  const map = new Map<string, { pending: number; verified: number; enRoute: number; escalated: number; resolved: number }>();

  alerts.forEach(alert => {
    let trainPart = alert.trainId != null ? `T.${alert.trainId}` : '';
    if (!trainPart) {
      trainPart = alert.station && alert.station !== 'Unknown' ? `Stn: ${alert.station}` : 'Platform/Other';
    }

    const key = alert.line && alert.line !== 'Unknown' ? `${trainPart} (${alert.line})` : trainPart;

    if (!map.has(key)) map.set(key, { pending: 0, verified: 0, enRoute: 0, escalated: 0, resolved: 0 });
    const entry = map.get(key)!;
    const s = alert.status?.toLowerCase() ?? '';
    
    if (s === 'pending') entry.pending++;
    else if (s === 'verified') entry.verified++;
    else if (s === 'en_route') entry.enRoute++;
    else if (s === 'escalated') entry.escalated++;
    else if (s === 'resolved') entry.resolved++;
  });

  return Array.from(map.entries())
    .map(([train, counts]) => ({ train, ...counts }))
    .sort((a, b) => 
      (b.pending + b.verified + b.enRoute + b.escalated + b.resolved) - 
      (a.pending + a.verified + a.enRoute + a.escalated + a.resolved)
    )
    .slice(0, 10);
}

function resolveTrend(stats?: ReportStats) {
  if (!stats || stats.totalDifference === undefined || stats.hasPreviousData === false) {
    return {
      text: 'Monthly trend unavailable from report delta',
      sub: 'No previous-month baseline was returned',
      color: ACCENT,
      icon: BarChart2Icon,
    };
  }

  if (stats.totalDifference > 0) {
    return {
      text: 'Monthly incidents increased',
      sub: `${stats.totalDifference} more than previous month`,
      color: ALERT,
      icon: TrendingUpIcon,
    };
  }

  if (stats.totalDifference < 0) {
    return {
      text: 'Monthly incidents decreased',
      sub: `${Math.abs(stats.totalDifference)} fewer than previous month`,
      color: SAFE,
      icon: TrendingDownIcon,
    };
  }

  return {
    text: 'Monthly incidents stayed the same',
    sub: 'No change against previous month',
    color: ACCENT,
    icon: BarChart2Icon,
  };
}

import { UserSession } from '../../App';

export function Insights({ session }: { session?: UserSession }) {
  const [selectedLine, setSelectedLine] = useState('All Lines');
  const [lines, setLines] = useState<string[]>(['All Lines']);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [showLinePicker, setShowLinePicker] = useState(false);

  const handleDetectLocation = () => {
    if (selectedLine !== 'All Lines') {
      setSelectedLine('All Lines');
      return;
    }

    detectNearbyLines(
      setIsLocating,
      (foundLines) => {
        if (foundLines.length > 0) {
          setSelectedLine(foundLines[0]);
        }
      },
      (msg) => alert(msg)
    );
  };

  const [monthlyReport, setMonthlyReport] = useState<OperatorReportsResponse | null>(null);
  const [operatorAlerts, setOperatorAlerts] = useState<OperatorAlert[]>([]);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setErrorText('');

      const [reportRes, alertsRes, linesRes] = await Promise.allSettled([
        getJson<OperatorReportsResponse>(`${API}/operator/reports`, session?.token),
        getJson<OperatorAlert[]>(`${API}/incident-alerts`, session?.token),
        getJson<LineResponse[]>(`${API}/lines`, session?.token),
      ]);

      if (!active) return;

      if (reportRes.status === 'fulfilled') setMonthlyReport(reportRes.value);
      else setMonthlyReport(null);

      if (alertsRes.status === 'fulfilled') setOperatorAlerts(Array.isArray(alertsRes.value) ? alertsRes.value : []);
      else setOperatorAlerts([]);

      const backendLines = linesRes.status === 'fulfilled'
        ? linesRes.value.map(line => line.lineName).filter(Boolean)
        : [];

      const reportLines = reportRes.status === 'fulfilled'
        ? (reportRes.value.incidents ?? []).map(incident => incident.line ?? '').filter(Boolean)
        : [];

      const alertLines = alertsRes.status === 'fulfilled'
        ? alertsRes.value.map(alert => alert.line ?? '').filter(Boolean)
        : [];

      const mergedLines = ['All Lines', ...Array.from(new Set([...backendLines, ...reportLines, ...alertLines]))];
      setLines(mergedLines.length > 1 ? mergedLines : ['All Lines']);

      if (
        reportRes.status === 'rejected' &&
        alertsRes.status === 'rejected'
      ) {
        setErrorText('Unable to load insights from backend endpoints.');
      }

      setLoading(false);
    }

    loadData();

    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    if (!lines.includes(selectedLine)) setSelectedLine('All Lines');
  }, [lines, selectedLine]);

  const monthlyIncidents = monthlyReport?.incidents ?? [];
  const filteredMonthly = selectedLine === 'All Lines'
    ? monthlyIncidents
    : monthlyIncidents.filter(incident => incident.line === selectedLine);

  const filteredAlerts = selectedLine === 'All Lines'
    ? operatorAlerts
    : operatorAlerts.filter(alert => alert.line === selectedLine);



  const currentMonthKey = useMemo(() => {
    if (!monthlyReport?.year || !monthlyReport?.month) return '';
    const month = String(monthlyReport.month).padStart(2, '0');
    return `${monthlyReport.year}-${month}`;
  }, [monthlyReport?.year, monthlyReport?.month]);

  const monthlyAlerts = useMemo(() => {
    if (!currentMonthKey) return [];
    return filteredAlerts.filter(alert => (alert.date ?? '').startsWith(currentMonthKey));
  }, [filteredAlerts, currentMonthKey]);

  const todayUtc = useMemo(() => toUtcDateString(new Date()), []);
  const lastWeekUtc = useMemo(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 7);
    return toUtcDateString(d);
  }, []);

  const todayAlerts = useMemo(
    () => filteredAlerts.filter(alert => alert.date === todayUtc),
    [filteredAlerts, todayUtc]
  );

  const lastWeekTodayAlerts = useMemo(
    () => filteredAlerts.filter(alert => alert.date === lastWeekUtc),
    [filteredAlerts, lastWeekUtc]
  );

  const peakHour = useMemo(() => {
    const hours = Array.from({ length: 24 }, () => 0);
    todayAlerts.forEach(alert => {
      const hour = parseHourFromTime(alert.time);
      if (hour !== null) hours[hour] += 1;
    });

    const peakCount = Math.max(...hours);
    if (peakCount <= 0) return { label: '-', count: 0 };

    const peakIndex = hours.findIndex(count => count === peakCount);
    return { label: formatHourRange(peakIndex), count: peakCount };
  }, [todayAlerts]);

  const topLine = useMemo(() => {
    const found = topFromList(filteredMonthly.map(incident => incident.line ?? ''));
    return found ?? { label: '-', count: 0 };
  }, [filteredMonthly]);

  const topStation = useMemo(() => {
    const found = topFromList(monthlyAlerts.map(alert => alert.station ?? ''));
    return found ?? { label: '-', count: 0 };
  }, [monthlyAlerts]);

  const topTrain = useMemo(() => {
    const monthlyTrainIds = filteredMonthly
      .map(incident => incident.trainId)
      .filter((trainId): trainId is number => typeof trainId === 'number');

    const map = new Map<number, number>();
    monthlyTrainIds.forEach(trainId => map.set(trainId, (map.get(trainId) ?? 0) + 1));
    const [top] = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);

    if (!top) return { label: '-', count: 0 };
    return { label: `Train ${top[0]}`, count: top[1] };
  }, [filteredMonthly]);

  const comparison = useMemo(() => {
    const today = todayAlerts.length;
    const lastWeek = lastWeekTodayAlerts.length;
    const delta = today - lastWeek;
    return { today, lastWeek, delta };
  }, [todayAlerts.length, lastWeekTodayAlerts.length]);

  const trend = resolveTrend(monthlyReport?.stats);

  const trainChart = useMemo(() => buildTrainStatusChart(todayAlerts), [todayAlerts]);
  const chartHasData = trainChart.some(p => p.pending + p.verified + p.enRoute + p.escalated + p.resolved > 0);

  const travelAdvice = peakHour.count > 0
    ? `Avoid ${peakHour.label} when possible; incidents are highest in that hour today.`
    : 'No clear peak hour today. Keep checking live alerts before boarding.';

  return (
    <div
      key="insights"
      className="px-4 pt-5 pb-6 space-y-4"
    >
      <div>
        <h2 className="text-xl font-black text-gray-900 mb-1">Real-Time Insights</h2>
        <p className="text-sm text-gray-500">See incidents happening near you.</p>
      </div>

      <div className={`relative w-full bg-white backdrop-blur-md border border-white/20 transition-all duration-300 ${showLinePicker ? 'rounded-t-[28px] rounded-b-none z-50' : 'rounded-[28px] z-30'}`}>
        <div className="flex items-center gap-2 p-2">
          {/* Action 1: Detect Location (Simplified Grey-out state) */}
          <button
            onClick={handleDetectLocation}
            disabled={isLocating}
            className={`relative w-16 h-20 rounded-[32px] flex-shrink-0 flex flex-col items-center justify-center transition-all duration-300 ${isLocating ? 'text-gray-400' : 'text-[#0B4F6C] active:scale-90'} border-r border-white/20`}
          >
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="relative">
                <MapPinIcon size={22} />
              </div>
              <span className={`text-[9px] font-black uppercase tracking-[0.1em] ${isLocating ? 'text-gray-400' : 'text-[#0B4F6C]'}`}>
                {selectedLine === 'All Lines' ? 'All' : 'Near Me'}
              </span>
            </div>
          </button>

          {/* Action 2: Line Trigger */}
          <button
            onClick={() => setShowLinePicker(!showLinePicker)}
            className="flex-grow flex flex-col items-start text-left pl-3 pr-4 py-2 rounded-2xl hover:bg-white/10 active:scale-[0.98] transition-all"
          >
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1.5">Showing results for</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-gray-900 leading-none">{selectedLine}</span>
              <ChevronRightIcon size={14} className={`text-gray-400 transition-transform duration-300 ${showLinePicker ? 'rotate-90' : ''}`} />
            </div>
          </button>
        </div>

        {/* Floating Dropdown (Full-Width, Connected Style) */}
        {showLinePicker && (
          <div className="absolute top-[calc(100%-1px)] left-[-1px] right-[-1px] bg-[#FAF9F5] rounded-b-[28px] border-x border-b border-white/20 shadow-2xl z-[100] overflow-hidden">
            <div className="p-2 max-h-[280px] overflow-y-auto">
              {lines.map(l => (
                <button
                  key={l}
                  onClick={() => { setSelectedLine(l); setShowLinePicker(false); }}
                  className={`w-full px-5 py-3.5 text-left text-sm font-bold transition-all flex items-center justify-between rounded-xl mb-1 last:mb-0 ${selectedLine === l ? 'text-[#0B4F6C] bg-[#0B4F6C]/10' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  {l}
                  {selectedLine === l && <div className="w-1.5 h-1.5 rounded-full bg-[#0B4F6C]" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-10 flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[#0B4F6C]" size={20} />
          <p className="text-xs font-semibold text-gray-400">Loading insights from backend...</p>
        </div>
      ) : errorText ? (
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
          <p className="text-sm font-bold text-red-600">{errorText}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">

              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Peak Hour (Today)</p>
              <p className="text-lg font-black text-gray-900 mt-1">{peakHour.label}</p>
              <p className="text-xs font-semibold text-gray-400 mt-1">
                {peakHour.count > 0 ? pluralize(peakHour.count, 'incident', 'incidents') : 'No incident spike today'}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">

              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Most Incident Train</p>
              <p className="text-lg font-black text-gray-900 mt-1">{topTrain.label}</p>
              <p className="text-xs font-semibold text-gray-400 mt-1">
                {topTrain.count > 0 ? pluralize(topTrain.count, 'case', 'cases') : 'No train data'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="mb-3">
              <h3 className="text-sm font-black text-gray-900">Real-Time Pattern by Train</h3>
              <p className="text-[10px] font-semibold text-gray-400 mt-0.5 uppercase tracking-widest">Incidents grouped by train · all active reports</p>
            </div>

            {chartHasData ? (
              <div className="h-[210px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trainChart} margin={{ top: 6, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="train" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} dy={6} />
                    <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                    <Tooltip
                      cursor={{ fill: '#F3F4F6' }}
                      contentStyle={{ border: 'none', borderRadius: 10, fontSize: 12, boxShadow: '0 8px 24px rgb(0 0 0 / 0.08)' }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={7}
                      wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
                    />
                    <Bar dataKey="pending" name="Pending" stackId="s" fill="#C2410C" />
                    <Bar dataKey="verified" name="Verified" stackId="s" fill="#F59E0B" />
                    <Bar dataKey="enRoute" name="En Route" stackId="s" fill={ACCENT} />
                    <Bar dataKey="escalated" name="Escalated" stackId="s" fill="#D34026" />
                    <Bar dataKey="resolved" name="Resolved" stackId="s" fill={SAFE} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-sm font-bold text-gray-700">No active incidents right now</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex items-start gap-3">

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Most Happened Line (Monthly)</p>
                <p className="text-sm font-black text-gray-900 mt-1">
                  {topLine.label} {topLine.count > 0 ? `- ${topLine.count} incidents` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Most Happened Station (Monthly)</p>
                <p className="text-sm font-black text-gray-900 mt-1">
                  {topStation.label} {topStation.count > 0 ? `- ${topStation.count} incidents` : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start gap-3">

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Today vs Last Week (Same Day)</p>
                <p className="text-sm font-black text-gray-900 mt-1">
                  Today: {comparison.today}, Last Week: {comparison.lastWeek}
                </p>
                <p className="text-xs font-semibold text-gray-400 mt-1">
                  {comparison.delta > 0 && `${comparison.delta} more incidents today`}
                  {comparison.delta < 0 && `${Math.abs(comparison.delta)} fewer incidents today`}
                  {comparison.delta === 0 && 'Same incident count as last week'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start gap-3">

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Monthly Trend</p>
                <p className="text-sm font-black text-gray-900 mt-1">{trend.text}</p>
                <p className="text-xs font-semibold text-gray-400 mt-1">{trend.sub}</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl shadow-sm p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
                <LightbulbIcon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Travel Advice</p>
                <p className="text-sm font-black text-amber-950 mt-1">{travelAdvice}</p>

              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
