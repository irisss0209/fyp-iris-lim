import { useEffect, useMemo, useState } from 'react';
import {
  BarChart2Icon,
  ChevronRightIcon,
  ClockIcon,
  LightbulbIcon,
  Loader2,
  MapPinIcon,
  TrainFrontIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from 'lucide-react';
import { detectNearbyLines } from '../../utils/location';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const API = 'http://localhost:5293/api/data';
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
}

interface PassengerLiveIncident {
  line?: string;
  station?: string;
  trainId?: number | null;
  time?: string;
}

interface LineResponse {
  lineName: string;
}

interface TopMetric {
  label: string;
  count: number;
}

interface ChartPoint {
  slot: string;
  count: number;
}


async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
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

function buildTodayHourChart(alerts: OperatorAlert[]): ChartPoint[] {
  const hourCounts = Array.from({ length: 24 }, () => 0);

  alerts.forEach(alert => {
    const hour = parseHourFromTime(alert.time);
    if (hour === null) return;
    hourCounts[hour] += 1;
  });

  return Array.from({ length: 12 }, (_, i) => {
    const start = i * 2;
    const count = hourCounts[start] + hourCounts[start + 1];
    const label = `${start.toString().padStart(2, '0')}-${(start + 1).toString().padStart(2, '0')}`;
    return { slot: label, count };
  });
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

export function Insights() {
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
  const [liveIncidents, setLiveIncidents] = useState<PassengerLiveIncident[]>([]);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setErrorText('');

      const [reportRes, alertsRes, linesRes, liveRes] = await Promise.allSettled([
        getJson<OperatorReportsResponse>(`${API}/operator/reports`),
        getJson<OperatorAlert[]>(`${API}/incident-alerts`),
        getJson<LineResponse[]>(`${API}/lines`),
        getJson<PassengerLiveIncident[]>(`${API}/incident-near-me`),
      ]);

      if (!active) return;

      if (reportRes.status === 'fulfilled') setMonthlyReport(reportRes.value);
      else setMonthlyReport(null);

      if (alertsRes.status === 'fulfilled') setOperatorAlerts(Array.isArray(alertsRes.value) ? alertsRes.value : []);
      else setOperatorAlerts([]);

      if (liveRes.status === 'fulfilled') setLiveIncidents(Array.isArray(liveRes.value) ? liveRes.value : []);
      else setLiveIncidents([]);

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
        alertsRes.status === 'rejected' &&
        liveRes.status === 'rejected'
      ) {
        setErrorText('Unable to load insights from backend endpoints.');
      }

      setLoading(false);
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

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

  const filteredLive = selectedLine === 'All Lines'
    ? liveIncidents
    : liveIncidents.filter(incident => incident.line === selectedLine);

  const monthTag = useMemo(() => {
    if (!monthlyReport?.year || !monthlyReport?.month) return 'Current Month';
    return new Date(monthlyReport.year, monthlyReport.month - 1, 1).toLocaleDateString('en-MY', {
      month: 'long',
      year: 'numeric',
    });
  }, [monthlyReport?.year, monthlyReport?.month]);

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
    const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
    return { today, lastWeek, delta, direction };
  }, [todayAlerts.length, lastWeekTodayAlerts.length]);

  const liveNowCount = filteredLive.length;
  const trend = resolveTrend(monthlyReport?.stats);
  const TrendIcon = trend.icon;

  const hourChart = useMemo(() => buildTodayHourChart(todayAlerts), [todayAlerts]);
  const chartHasData = hourChart.some(point => point.count > 0);
  const maxChartCount = Math.max(...hourChart.map(point => point.count), 0);

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
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-black text-gray-900">Today Real-Time Pattern</h3>
              </div>

            </div>

            {chartHasData ? (
              <div className="h-[190px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourChart} margin={{ top: 6, right: 0, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="slot" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} dy={6} />
                    <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                    <Tooltip
                      cursor={{ fill: '#F3F4F6' }}
                      contentStyle={{ border: 'none', borderRadius: 10, fontSize: 12, boxShadow: '0 8px 24px rgb(0 0 0 / 0.08)' }}
                      formatter={(value: number) => [`${value} incidents`, 'Count']}
                    />
                    <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                      {hourChart.map(point => (
                        <Cell key={point.slot} fill={point.count === maxChartCount ? ALERT : ACCENT} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-sm font-bold text-gray-700">No incidents logged for today yet</p>
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
