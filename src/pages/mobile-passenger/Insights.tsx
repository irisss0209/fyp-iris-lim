import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  LightbulbIcon,
  Loader2,
  MapPinIcon,
} from 'lucide-react';
import { detectNearbyLines } from '../../utils/location';
import { UserSession } from '../../App';

const API = `${import.meta.env.VITE_API_BASE}/api/data`;
const SAFE   = '#2D7A5D';
const WARN   = '#B45309';
const DANGER = '#D34026';
const ACCENT = '#0B4F6C';

interface OperatorAlert {
  line?: string;
  station?: string;
  trainId?: number | null;
  date?: string;
  time?: string;
  status?: string;
}

interface LineResponse { lineName: string; }

async function getJson<T>(url: string, token?: string): Promise<T> {
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(url, { headers, credentials: 'include' });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

function toMalaysiaDate(d: Date) {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
}

function parseHour(time?: string) {
  if (!time) return null;
  const h = Number(time.split(':')[0]);
  return Number.isFinite(h) && h >= 0 && h <= 23 ? h : null;
}

function fmtHour(h: number) {
  return new Date(Date.UTC(2000, 0, 1, h))
    .toLocaleTimeString('en-MY', { hour: 'numeric', hour12: true, timeZone: 'UTC' })
    .replace(' ', '');
}

function isActive(a: OperatorAlert) {
  const s = a.status?.toLowerCase() ?? '';
  return s !== 'resolved' && s !== 'dismissed';
}

function safetyLevel(count: number): 'clear' | 'moderate' | 'high' {
  return count === 0 ? 'clear' : count <= 2 ? 'moderate' : 'high';
}

function safetyStyle(level: 'clear' | 'moderate' | 'high') {
  if (level === 'clear')    return { bg: '#F0FBF6', text: SAFE,   dot: SAFE,   label: 'Clear'      };
  if (level === 'moderate') return { bg: '#FFFBEB', text: WARN,   dot: WARN,   label: 'Active'     };
  return                           { bg: '#FEF2F0', text: DANGER, dot: DANGER, label: 'High Alert' };
}

function statusStyle(status?: string) {
  const s = status?.toLowerCase() ?? '';
  if (s === 'pending')  return { bg: '#FFF7ED', text: '#C05621' };
  if (s === 'verified') return { bg: '#EFF6FF', text: '#1D4ED8' };
  if (s === 'en_route') return { bg: '#EFF6FF', text: ACCENT    };
  if (s === 'escalated')return { bg: '#FEF2F0', text: DANGER    };
  return                       { bg: '#F7FAFC', text: '#718096' };
}

export function Insights({ session }: { session?: UserSession }) {
  const [selectedLine, setSelectedLine]     = useState('All Lines');
  const [lines, setLines]                   = useState<string[]>(['All Lines']);
  const [loading, setLoading]               = useState(true);
  const [errorText, setErrorText]           = useState('');
  const [isLocating, setIsLocating]         = useState(false);
  const [showLinePicker, setShowLinePicker] = useState(false);
  const [alerts, setAlerts]                 = useState<OperatorAlert[]>([]);
  const [aiAdvice, setAiAdvice]             = useState<string | null>(null);
  const [aiLoading, setAiLoading]           = useState(false);

  const handleDetectLocation = () => {
    if (selectedLine !== 'All Lines') { setSelectedLine('All Lines'); return; }
    detectNearbyLines(
      setIsLocating,
      (found) => { if (found.length > 0) setSelectedLine(found[0]); },
      (msg) => alert(msg),
    );
  };

  // Fetch alerts + lines
  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setErrorText('');
      const [alertsRes, linesRes] = await Promise.allSettled([
        getJson<OperatorAlert[]>(`${API}/incident-alerts`, session?.token),
        getJson<LineResponse[]>(`${API}/lines`, session?.token),
      ]);
      if (!alive) return;

      const data = alertsRes.status === 'fulfilled' && Array.isArray(alertsRes.value)
        ? alertsRes.value : [];
      setAlerts(data);

      const fromBackend = linesRes.status === 'fulfilled'
        ? linesRes.value.map(l => l.lineName).filter(Boolean) : [];
      const fromAlerts  = data.map(a => a.line ?? '').filter(Boolean);
      setLines(['All Lines', ...Array.from(new Set([...fromBackend, ...fromAlerts]))]);

      if (alertsRes.status === 'rejected') setErrorText('Unable to load safety data.');
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [session]);

  useEffect(() => {
    if (!lines.includes(selectedLine)) setSelectedLine('All Lines');
  }, [lines, selectedLine]);

  // Dates
  const todayStr = useMemo(() => toMalaysiaDate(new Date()), []);
  const weekAgoStr = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return toMalaysiaDate(d);
  }, []);

  // Filtered by selected line
  const filtered = useMemo(() =>
    selectedLine === 'All Lines' ? alerts : alerts.filter(a => a.line === selectedLine),
    [alerts, selectedLine]);

  // Today's alerts
  const todayAlerts = useMemo(() => filtered.filter(a => a.date === todayStr), [filtered, todayStr]);

  // Active (not resolved/dismissed) today
  const activeNow = useMemo(() => todayAlerts.filter(isActive), [todayAlerts]);

  // Per-line active count for "All Lines" view
  const lineStatus = useMemo(() => {
    const map: Record<string, number> = {};
    lines.filter(l => l !== 'All Lines').forEach(name => {
      map[name] = alerts.filter(a => a.line === name && a.date === todayStr && isActive(a)).length;
    });
    return map;
  }, [lines, alerts, todayStr]);

  // Train to avoid — train with most active incidents today
  const trainToAvoid = useMemo(() => {
    const map = new Map<number, number>();
    activeNow.forEach(a => { if (a.trainId != null) map.set(a.trainId, (map.get(a.trainId) ?? 0) + 1); });
    if (!map.size) return null;
    const [id, count] = [...map.entries()].sort((a, b) => b[1] - a[1])[0];
    return { id, count };
  }, [activeNow]);

  // Live feed — last 3 active today, newest first
  const liveFeed = useMemo(() =>
    [...activeNow].sort((a, b) => (b.time ?? '').localeCompare(a.time ?? '')).slice(0, 3),
    [activeNow]);

  // Best travel window from past 7 days (6 AM–10 PM only)
  const bestWindow = useMemo(() => {
    const past = filtered.filter(a => a.date && a.date >= weekAgoStr && a.date < todayStr);
    if (!past.length) return null;
    const counts = new Array(24).fill(0);
    past.forEach(a => { const h = parseHour(a.time); if (h !== null) counts[h]++; });
    let min = Infinity, best = -1;
    for (let h = 6; h < 22; h++) {
      if (counts[h] < min) { min = counts[h]; best = h; }
    }
    return best === -1 ? null : `${fmtHour(best)} – ${fmtHour(best + 1)}`;
  }, [filtered, todayStr, weekAgoStr]);

  // Fetch AI travel tip when data is ready or selected line changes
  useEffect(() => {
    if (loading || !session?.token) return;
    setAiAdvice(null);
    setAiLoading(true);
    fetch(`${API}/ai/travel-advice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
      credentials: 'include',
      body: JSON.stringify({
        activeCount:   activeNow.length,
        trainToAvoid:  trainToAvoid ? `Train ${trainToAvoid.id}` : '',
        bestWindow:    bestWindow ?? '',
        line:          selectedLine,
        todayCount:    todayAlerts.length,
        currentHour:   new Date().getHours(),
      }),
    })
      .then(r => r.json())
      .then(d => setAiAdvice(d.advice))
      .catch(() => setAiAdvice(null))
      .finally(() => setAiLoading(false));
  }, [loading, selectedLine]); // re-runs when line changes

  const overallLevel = safetyLevel(activeNow.length);
  const overallStyle = safetyStyle(overallLevel);

  return (
    <div className="px-4 pt-5 pb-6 space-y-4">
      <div>
        <h2 className="text-xl font-black text-gray-900 mb-1">Safety Insights</h2>
        <p className="text-sm text-gray-500">Live safety data for your journey.</p>
      </div>

      {/* Line Picker */}
      <div className={`relative w-full bg-white border border-white/20 transition-all duration-300 ${showLinePicker ? 'rounded-t-[28px] rounded-b-none z-50' : 'rounded-[28px] z-30'}`}>
        <div className="flex items-center gap-2 p-2">
          <button
            onClick={handleDetectLocation}
            disabled={isLocating}
            className={`relative w-16 h-20 rounded-[32px] flex-shrink-0 flex flex-col items-center justify-center transition-all duration-300 ${isLocating ? 'text-gray-400' : 'text-[#0B4F6C] active:scale-90'} border-r border-white/20`}
          >
            <MapPinIcon size={22} />
            <span className="text-[9px] font-black uppercase tracking-[0.1em] mt-2">
              {selectedLine === 'All Lines' ? 'All' : 'Near Me'}
            </span>
          </button>
          <button
            onClick={() => setShowLinePicker(!showLinePicker)}
            className="flex-grow flex flex-col items-start text-left pl-3 pr-4 py-2 rounded-2xl hover:bg-white/10 active:scale-[0.98] transition-all"
          >
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1.5">
              Showing results for
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-gray-900 leading-none">{selectedLine}</span>
              <ChevronRightIcon size={14} className={`text-gray-400 transition-transform duration-300 ${showLinePicker ? 'rotate-90' : ''}`} />
            </div>
          </button>
        </div>
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
          <p className="text-xs font-semibold text-gray-400">Loading safety data…</p>
        </div>
      ) : errorText ? (
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
          <p className="text-sm font-bold text-red-600">{errorText}</p>
        </div>
      ) : (
        <>
          {/* Line Safety Status */}
          {selectedLine === 'All Lines' ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Line Safety Status</p>
              {lines.filter(l => l !== 'All Lines').length === 0 ? (
                <p className="text-sm text-gray-400">No line data available.</p>
              ) : (
                <div className="space-y-2">
                  {lines.filter(l => l !== 'All Lines').map(name => {
                    const count = lineStatus[name] ?? 0;
                    const lvl   = safetyLevel(count);
                    const st    = safetyStyle(lvl);
                    return (
                      <div key={name} className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ backgroundColor: st.bg }}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: st.dot }} />
                          <span className="text-sm font-semibold text-gray-800">{name}</span>
                        </div>
                        <span className="text-xs font-bold" style={{ color: st.text }}>
                          {lvl === 'clear' ? 'Clear' : `${count} active`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl p-4 border" style={{ backgroundColor: overallStyle.bg, borderColor: `${overallStyle.dot}40` }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: overallStyle.text }}>
                    {selectedLine}
                  </p>
                  <p className="text-2xl font-black" style={{ color: overallStyle.text }}>{overallStyle.label}</p>
                  <p className="text-xs font-semibold mt-1" style={{ color: overallStyle.text }}>
                    {activeNow.length === 0
                      ? 'No active incidents right now'
                      : `${activeNow.length} active incident${activeNow.length !== 1 ? 's' : ''} right now`}
                  </p>
                </div>
                {overallLevel === 'clear'
                  ? <CheckCircleIcon size={40} style={{ color: overallStyle.dot, opacity: 0.5 }} />
                  : <AlertCircleIcon size={40} style={{ color: overallStyle.dot, opacity: 0.5 }} />}
              </div>
            </div>
          )}

          {/* Active Now + Train to Avoid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Active Now</p>
              <p className="text-3xl font-black text-gray-900 mt-1">{activeNow.length}</p>
              <p className="text-xs font-semibold text-gray-400 mt-1">
                {activeNow.length === 0 ? 'All incidents resolved' : 'unresolved incidents'}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Train to Avoid</p>
              {trainToAvoid ? (
                <>
                  <p className="text-lg font-black mt-1" style={{ color: DANGER }}>Train {trainToAvoid.id}</p>
                  <p className="text-xs font-semibold text-gray-400 mt-1">
                    {trainToAvoid.count} active incident{trainToAvoid.count !== 1 ? 's' : ''}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-black mt-1" style={{ color: SAFE }}>All Clear</p>
                  <p className="text-xs font-semibold text-gray-400 mt-1">No trains flagged today</p>
                </>
              )}
            </div>
          </div>

          {/* Live Incidents Feed */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Live Incidents</p>
            {liveFeed.length === 0 ? (
              <div className="py-3 text-center">
                <p className="text-sm font-bold text-gray-700">No active incidents right now</p>
                <p className="text-xs text-gray-400 mt-1">
                  All clear on {selectedLine === 'All Lines' ? 'all lines' : selectedLine}
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {liveFeed.map((a, i) => {
                  const sc = statusStyle(a.status);
                  return (
                    <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {a.trainId != null ? `Train ${a.trainId}` : (a.station ?? 'Unknown location')}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {[a.line, a.station].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        {a.time && (
                          <span className="text-xs text-gray-400">{a.time.slice(0, 5)}</span>
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                          style={{ backgroundColor: sc.bg, color: sc.text }}>
                          {a.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Best Travel Window */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Best Time to Travel</p>
            {bestWindow ? (
              <>
                <p className="text-xl font-black text-gray-900 mt-1">{bestWindow}</p>
                <p className="text-xs font-semibold text-gray-400 mt-1">Historically quietest · based on past 7 days</p>
              </>
            ) : (
              <>
                <p className="text-base font-black text-gray-400 mt-1">Not enough data yet</p>
                <p className="text-xs font-semibold text-gray-400 mt-1">Check back once more data is collected</p>
              </>
            )}
          </div>

          {/* AI Travel Tip */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl shadow-sm p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
                <LightbulbIcon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">AI Travel Tip</p>
                {aiLoading ? (
                  <div className="flex items-center gap-2 mt-2">
                    <Loader2 size={14} className="animate-spin text-amber-500" />
                    <span className="text-xs text-amber-600">Generating tip…</span>
                  </div>
                ) : aiAdvice ? (
                  <p className="text-sm font-semibold text-amber-950 mt-1">{aiAdvice}</p>
                ) : (
                  <p className="text-sm font-semibold text-amber-950 mt-1">
                    {activeNow.length === 0
                      ? 'Conditions look good right now. Travel safely.'
                      : 'Check live incidents above before boarding.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
