import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CameraIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
  FilterIcon,
  RefreshCwIcon,
  XIcon,
  UserIcon,
} from 'lucide-react';
import { JustificationModal } from '../../components/JustificationModal';

const API = 'http://localhost:5293/api/data';

type AlertStatus = 'all' | 'pending' | 'verified' | 'escalated' | 'en_route' | 'resolved' | 'dismissed';
type AlertSource = 'all' | 'ai' | 'passenger';

interface Alert {
  id: string;
  coachId: string;
  line: string;
  lineId: string;
  station: string;
  time: string;
  date: string;
  elapsed: string;
  status: 'pending' | 'verified' | 'escalated' | 'en_route' | 'resolved' | 'dismissed';
  confidence: number | null;
  deviceId: string | null;
  source: 'ai' | 'passenger';
  reportedBy?: string;
  passengerComment?: string;
  imageUrl?: string;
  // audit trail
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  verifiedComment?: string | null;
  escalatedBy?: string | null;
  escalatedAt?: string | null;
  escalatedComment?: string | null;
  enrouteBy?: string | null;
  enrouteAt?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  resolvedComment?: string | null;
  dismissedBy?: string | null;
  dismissedAt?: string | null;
  dismissedComment?: string | null;
}

interface LineOption { lineId: string; lineName: string; }
interface StationsByLine { lineId: string; stations: { stationId: string; stationName: string }[]; }

const LINE_COLORS: Record<string, string> = {};
const PALETTE = ['#D34026', '#0B4F6C', '#2D7A5D', '#7B5EA7', '#B45309', '#0E7490'];

function getLineColor(lineId: string, idx: number) {
  if (!LINE_COLORS[lineId]) LINE_COLORS[lineId] = PALETTE[idx % PALETTE.length];
  return LINE_COLORS[lineId];
}

// ── Stat box config (one entry per status) ──────────────────────────────────
const STAT_CONFIGS: {
  key: keyof StatsState;
  label: string;
  color: string;
  bg: string;
}[] = [
    { key: 'pending', label: 'Pending', color: '#C2410C', bg: '#FFF7ED' },
    { key: 'verified', label: 'Verified', color: '#2D7A5D', bg: '#F0FBF6' },
    { key: 'escalated', label: 'Escalated', color: '#7B5EA7', bg: '#F5F0FF' },
    { key: 'enRoute', label: 'En Route', color: '#0B4F6C', bg: '#EFF6FF' },
    { key: 'resolved', label: 'Resolved', color: '#1D4ED8', bg: '#EBF8FF' },
    { key: 'dismissed', label: 'Dismissed', color: '#4A5568', bg: '#F7FAFC' },
  ];
const STATUS_THEME: Record<string, { color: string, bg: string }> = {
  pending: { color: '#C2410C', bg: '#FFF7ED' },
  verified: { color: '#2D7A5D', bg: '#F0FBF6' },
  escalated: { color: '#7B5EA7', bg: '#F5F0FF' },
  en_route: { color: '#0B4F6C', bg: '#EFF6FF' },
  resolved: { color: '#1D4ED8', bg: '#EBF8FF' },
  dismissed: { color: '#4A5568', bg: '#F7FAFC' }
}
interface StatsState {
  pending: number;
  verified: number;
  escalated: number;
  enRoute: number;
  resolved: number;
  dismissed: number;
}

export function LiveAlerts() {
  // ── Data from DB ──────────────────────────────────────────────────────────────
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [lines, setLines] = useState<LineOption[]>([]);
  const [stationsByLine, setStationsByLine] = useState<StationsByLine[]>([]);
  const [stats, setStats] = useState<StatsState>({ pending: 0, verified: 0, escalated: 0, enRoute: 0, resolved: 0, dismissed: 0 });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // ── UI state ──────────────────────────────────────────────────────────────────
  const [activeFilter, setActiveFilter] = useState<AlertStatus>('all');
  const [sourceFilter, setSourceFilter] = useState<AlertSource>('all');
  const [lineFilter, setLineFilter] = useState('all');
  const [stationFilter, setStationFilter] = useState('all');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'verify' | 'dismiss' | 'escalate'; alertId: string } | null>(null);
  const [escalatedAt, setEscalatedAt] = useState<Record<string, number>>({}); // alertId → timestamp
  const [, setTick] = useState(0); // force re-render for timer
  // ── Fetch all alerts from DB ──────────────────────────────────────────────────
  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/operator/alerts`);
      const data = await res.json();
      setAlerts(data.alerts ?? []);
      setLines(data.lines ?? []);
      setStationsByLine(data.stationsByLine ?? []);
      setStats(data.stats ?? { pending: 0, verified: 0, escalated: 0, enRoute: 0, resolved: 0, dismissed: 0 });
      // Keep selected alert if it still exists
      setSelectedAlert(prev => {
        if (prev) {
          const updated = (data.alerts as Alert[]).find(a => a.id === prev.id);
          return updated ?? null;
        }
        return null;
      });
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  // ── Auto-refresh every 30 seconds ────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(fetchAlerts, 30_000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // ── Tick every 10s so the 2-min re-escalate button can appear ──
  useEffect(() => {
    if (Object.keys(escalatedAt).length === 0) return;
    const timer = setInterval(() => setTick(t => t + 1), 10_000);
    return () => clearInterval(timer);
  }, [escalatedAt]);

  // ── Derived filter options ────────────────────────────────────────────────────
  const availableStations = useMemo(() => {
    if (lineFilter === 'all') {
      const all = stationsByLine.flatMap(s => s.stations);
      return [...new Map(all.map(s => [s.stationId, s])).values()];
    }
    return stationsByLine.find(s => s.lineId === lineFilter)?.stations ?? [];
  }, [lineFilter, stationsByLine]);

  const handleLineChange = (line: string) => { setLineFilter(line); setStationFilter('all'); };

  // ── Filtered alerts ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => alerts.filter(a => {
    if (activeFilter !== 'all' && a.status !== activeFilter) return false;
    if (sourceFilter !== 'all' && a.source !== sourceFilter) return false;
    if (lineFilter !== 'all' && a.lineId !== lineFilter) return false;
    if (stationFilter !== 'all' && a.station !== stationFilter) return false;
    return true;
  }), [alerts, activeFilter, sourceFilter, lineFilter, stationFilter]);

  const statusTabs: { id: AlertStatus; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'verified', label: 'Verified' },
    { id: 'escalated', label: 'Escalated' },
    { id: 'en_route', label: 'En Route' },
    { id: 'resolved', label: 'Resolved' },
    { id: 'dismissed', label: 'Dismissed' },
  ];

  // ── Status update ─────────────────────────────────────────────────────────────
  const handleModalConfirm = async (comment: string) => {
    if (!pendingAction) return;

    let newStatus: string;
    switch (pendingAction.type) {
      case 'verify': newStatus = 'verified'; break;
      case 'dismiss': newStatus = 'dismissed'; break;
      case 'escalate': newStatus = 'escalated'; break;
      default: return;
    }

    const id = pendingAction.alertId;

    // Optimistic update
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: newStatus as any } : a));
    setSelectedAlert(prev => prev?.id === id ? { ...prev, status: newStatus as any } : prev);

    // Track escalation timestamp for the 2-min re-escalate logic
    if (pendingAction.type === 'escalate') {
      setEscalatedAt(prev => ({ ...prev, [id]: Date.now() }));
    }

    console.log(`[${pendingAction.type.toUpperCase()}] ${id}: ${comment}`);

    const numericId = id.replace('ALT-', '').replace('RPT-', '');
    const token = JSON.parse(localStorage.getItem('user_session') || '{}')?.token;

    await fetch(`${API}/indicent-alerts/${numericId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus, comment }),
    });
    setModalOpen(false);
    setPendingAction(null);
  };

  const openModal = (type: 'verify' | 'dismiss' | 'escalate', alertId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPendingAction({ type, alertId });
    setModalOpen(true);
  };
  const pendingAlertForModal = pendingAction ? alerts.find(a => a.id === pendingAction.alertId) : null;

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#FAF9F5' }}>

      {/* ── Header ── */}
      <div className="px-6 pt-6 pb-2 bg-[#FAF9F5] border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-bold text-gray-900 leading-tight">Live Alerts</h1>
            <p className="text-sm mt-0.5" style={{ color: '#4A5568' }}>
              Real-time gender compliance monitoring feed
              {!loading && (
                <span className="ml-2 text-xs text-gray-400">
                  · Last updated {lastRefresh.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={fetchAlerts}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCwIcon size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* ── Stats: 6 boxes in one row ── */}
        <div className="grid grid-cols-6 gap-2 mt-4">
          {STAT_CONFIGS.map(s => (
            <div
              key={s.key}
              className="rounded-lg px-3 py-2.5 cursor-pointer transition-all duration-150 hover:opacity-90"
              style={{ backgroundColor: s.bg }}
              onClick={() => setActiveFilter(s.key === 'enRoute' ? 'en_route' : s.key as AlertStatus)}
            >
              <div className="text-xl font-bold" style={{ color: s.color }}>
                {loading ? '—' : stats[s.key]}
              </div>
              <div className="text-xs font-medium mt-0.5" style={{ color: s.color }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}


        <div className="flex items-center gap-3 mt-4">

          {/* Status tabs (DON'T shrink) */}
          <div className="flex gap-1 flex-shrink-0">
            {statusTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150"
                style={{
                  backgroundColor: activeFilter === tab.id ? '#0B4F6C' : 'transparent',
                  color: activeFilter === tab.id ? 'white' : '#4A5568',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-gray-200 flex-shrink-0" />

          {/* Filters (SHARE SPACE) */}
          <div className="flex items-center gap-2 flex-1 min-w-0">

            {/* Source */}
            <div className="flex items-center gap-1 w-full min-w-0">
              <FilterIcon size={13} className="text-gray-400 flex-shrink-0" />
              <select
                value={sourceFilter}
                onChange={e => setSourceFilter(e.target.value as AlertSource)}
                className="w-full min-w-0 text-xs px-3 py-2 rounded-lg border border-gray-200 bg-gray-50"
              >
                <option value="all">All Sources</option>
                <option value="ai">AI Detected</option>
                <option value="passenger">Passenger Reported</option>
              </select>
            </div>

            {/* Line */}
            <select
              value={lineFilter}
              onChange={e => handleLineChange(e.target.value)}
              className="w-full min-w-0 text-xs px-3 py-2 rounded-lg border border-gray-200 bg-gray-50"
            >
              <option value="all">All Lines</option>
              {lines.map((l) => (
                <option key={l.lineId} value={l.lineId}>
                  {l.lineName}
                </option>
              ))}
            </select>

            {/* Station */}
            <select
              value={stationFilter}
              onChange={e => setStationFilter(e.target.value)}
              className="w-full min-w-0 text-xs px-3 py-2 rounded-lg border border-gray-200 bg-gray-50"
            >
              <option value="all">All Stations</option>
              {availableStations.map(s => (
                <option key={s.stationId} value={s.stationName}>
                  {s.stationName}
                </option>
              ))}
            </select>

          </div>

          {/* Clear button*/}
          {(sourceFilter !== 'all' || lineFilter !== 'all' || stationFilter !== 'all') && (
            <button
              onClick={() => {
                setSourceFilter('all');
                setLineFilter('all');
                setStationFilter('all');
              }}
              className="text-xs font-medium hover:underline text-gray-500 flex-shrink-0"
            >
              Clear filters
            </button>
          )}

        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex flex-1 overflow-hidden gap-2 p-2">

        {/* Alert List */}
        <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin pr-1 transition-all duration-300" style={{ maxWidth: selectedAlert ? '60%' : '100%' }}>

          {loading && alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <RefreshCwIcon size={28} className="text-gray-300 animate-spin mb-3" />
              <p className="text-sm text-gray-400">Loading alerts from database…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FilterIcon size={32} className="text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-400">
                {alerts.length === 0 ? 'No alerts in the database yet.' : 'No alerts match your filters.'}
              </p>
              {alerts.length > 0 && (
                <p className="text-xs text-gray-300 mt-1">Try adjusting your filter criteria</p>
              )}
            </div>
          ) : (
            filtered.map((alert) => {
              const lineColor = getLineColor(alert.lineId, lines.findIndex(l => l.lineId === alert.lineId));
              return (
                <div
                  key={alert.id}
                  onClick={() => { setSelectedAlert(prev => prev?.id === alert.id ? null : alert); }}
                  className={`bg-white rounded-xl border cursor-pointer transition-all duration-150 overflow-hidden ${selectedAlert?.id === alert.id
                    ? 'ring-2 ring-[#0B4F6C] border-transparent'
                    : 'border-gray-100 hover:border-gray-200'
                    }`}
                >
                  <div className="flex">
                    <div
                      className="w-1 flex-shrink-0 rounded-l-xl transition-colors duration-150"
                      style={{
                        backgroundColor: selectedAlert?.id === alert.id
                          ? '#0B4F6C'
                          : 'transparent'
                      }}
                    />
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-gray-900">{alert.coachId}</span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: lineColor + '18', color: lineColor }}
                            >
                              {alert.line}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                              {alert.station}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="text-xs text-gray-500">
                              <ClockIcon className="w-3 h-3 inline mr-1" />
                              {alert.time}
                            </span>
                            {alert.source === 'ai' ? (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#FEF2F0] text-[#D34026]">
                                AI detected{alert.confidence !== null ? `, ${alert.confidence}% confidence` : ''}
                              </span>
                            ) : (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]">
                                Passenger reported
                              </span>
                            )}
                          </div>
                          {alert.source === 'ai' && alert.confidence !== null && (
                            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden w-32">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${alert.confidence}%`, backgroundColor: '#D34026' }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className="text-xs font-semibold px-2 py-1 rounded-md"
                            style={{
                              backgroundColor: STATUS_THEME[alert.status]?.bg || '#F7FAFC',
                              color: STATUS_THEME[alert.status]?.color || '#718096',
                            }}
                          >
                            {alert.status.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {alert.status === 'pending' && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={e => openModal('verify', alert.id, e)}
                            className="flex-1 text-xs font-semibold py-1.5 rounded-lg text-white hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: '#0B4F6C' }}
                          >
                            Verify
                          </button>
                          <button
                            onClick={e => openModal('dismiss', alert.id, e)}
                            className="flex-1 text-xs font-semibold py-1.5 rounded-lg text-white hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: '#D34026' }}
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                      {alert.status === 'verified' && (
                        <div className="mt-3">
                          <button
                            onClick={e => openModal('escalate', alert.id, e)}
                            className="w-full text-xs font-semibold py-1.5 rounded-lg text-white hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: '#7B5EA7' }}
                          >
                            Escalate
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Detail Panel ── */}
        {selectedAlert && (
          <div className="w-[45%] flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden h-full">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="font-semibold text-sm text-gray-900 leading-tight">
                    Alert Detail <span className="text-xs font-mono text-gray-400 font-normal">({selectedAlert.id})</span>
                  </h2>
                  <div className="mt-0.5">
                    {selectedAlert.source === 'ai' ? (
                      <span className="text-[11px] font-medium text-[#D34026]">
                        AI detected{selectedAlert.confidence !== null ? `, ${selectedAlert.confidence}% confidence` : ''}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-[#92400E]">Passenger reported</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedAlert(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <XIcon size={18} />
                </button>
              </div>

              {/* Unified Scrollable Container */}
              <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                {/* Snapshot / image */}
                <div className="rounded-lg overflow-hidden bg-gray-800" style={{ aspectRatio: '21/9' }}>
                  {selectedAlert.imageUrl ? (
                    <img src={selectedAlert.imageUrl} alt="Snapshot" className="w-full h-full object-cover opacity-80" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      {selectedAlert.source === 'ai' ? (
                        <>
                          <CameraIcon className="w-10 h-10 text-white/30" />
                          <span className="text-white/40 text-xs font-medium">Snapshot</span>
                          <span className="text-white/25 text-xs">{selectedAlert.deviceId ?? '—'}</span>
                        </>
                      ) : (
                        <>
                          <UserIcon className="w-10 h-10 text-white/30" />
                          <span className="text-white/40 text-xs font-medium">Passenger Report</span>
                          <span className="text-white/25 text-xs">No photo attached</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Details Body */}
                <div className="space-y-4 p-2">
                  {/* Core info grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Coach ID', value: selectedAlert.coachId },
                      { label: 'Line', value: selectedAlert.line },
                      { label: 'Station', value: selectedAlert.station },
                      { label: 'Time', value: selectedAlert.time },
                      ...(selectedAlert.source === 'ai'
                        ? [{ label: 'Device', value: selectedAlert.deviceId ?? '—' }]
                        : []),
                    ].map(item => (
                      <div key={item.label} className="bg-gray-50 rounded-lg px-3 py-2">
                        <div className="text-gray-400 text-[10px] mb-0.5">{item.label}</div>
                        <div className="font-medium text-xs text-gray-900 leading-tight">{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Passenger comment */}
                  {selectedAlert.source === 'passenger' && selectedAlert.passengerComment && (
                    <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5">
                      <div className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Passenger comment</div>
                      <p className="text-xs text-amber-900 leading-relaxed">{selectedAlert.passengerComment}</p>
                    </div>
                  )}

                  {/* Audit trail */}
                  {(() => {
                    const steps: { label: string, by?: string | null, at?: string | null, comment?: string | null, color: string, bg: string }[] = []

                    if (selectedAlert.verifiedAt || selectedAlert.verifiedBy)
                      steps.push({ label: 'Verified', by: selectedAlert.verifiedBy, at: selectedAlert.verifiedAt, comment: selectedAlert.verifiedComment, color: '#2D7A5D', bg: '#F0FBF6' })
                    if (selectedAlert.escalatedAt || selectedAlert.escalatedBy)
                      steps.push({ label: 'Escalated', by: selectedAlert.escalatedBy, at: selectedAlert.escalatedAt, comment: selectedAlert.escalatedComment, color: '#7B5EA7', bg: '#F5F0FF' })
                    if (selectedAlert.enrouteAt || selectedAlert.enrouteBy)
                      steps.push({ label: 'En Route', by: selectedAlert.enrouteBy, at: selectedAlert.enrouteAt, color: '#0B4F6C', bg: '#EFF6FF' })
                    if (selectedAlert.resolvedAt || selectedAlert.resolvedBy)
                      steps.push({ label: 'Resolved', by: selectedAlert.resolvedBy, at: selectedAlert.resolvedAt, comment: selectedAlert.resolvedComment, color: '#1D4ED8', bg: '#EBF8FF' })
                    if (selectedAlert.dismissedAt || selectedAlert.dismissedBy)
                      steps.push({ label: 'Dismissed', by: selectedAlert.dismissedBy, at: selectedAlert.dismissedAt, comment: selectedAlert.dismissedComment, color: '#718096', bg: '#F7FAFC' })

                    if (steps.length === 0) return null

                    return (
                      <div>
                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Audit trail</div>
                        <div className="space-y-2">
                          {steps.map(s => (
                            <div key={s.label} className="rounded-lg px-3 py-2.5" style={{ backgroundColor: s.bg }}>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-xs font-semibold" style={{ color: s.color }}>{s.label} By: {s.by ? s.by : 'N/A'}</span>
                                {s.at && <span className="text-[10px] text-gray-400">{s.at}</span>}
                              </div>



                              {/* Always display the comment block to maintain the aesthetic */}
                              <div className="mt-1.5 text-[11px] italic text-gray-600 border-l-2 pl-2" style={{ borderColor: s.color + '60' }}>
                                {s.comment ? `"${s.comment}"` : 'No comment'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}

                  {/* ── Actions ── */}
                  {selectedAlert.status === 'pending' && (
                    <div className="space-y-2 pt-2">
                      <button
                        onClick={() => openModal('verify', selectedAlert.id)}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 flex items-center justify-center gap-2 transition-opacity"
                        style={{ backgroundColor: '#0B4F6C' }}
                      >
                        <CheckCircleIcon className="w-4 h-4" /> Verify Alert
                      </button>
                      <button
                        onClick={() => openModal('dismiss', selectedAlert.id)}
                        className="w-full py-2 text-sm font-medium hover:underline text-gray-500 transition-colors flex items-center justify-center gap-1"
                      >
                        <XCircleIcon className="w-4 h-4 inline" /> Dismiss Alert
                      </button>
                    </div>
                  )}

                  {selectedAlert.status === 'verified' && (
                    <button
                      onClick={() => openModal('escalate', selectedAlert.id)}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 flex items-center justify-center gap-2 transition-opacity"
                      style={{ backgroundColor: '#7B5EA7' }}
                    >
                      Escalate Alert
                    </button>
                  )}

                  {selectedAlert.status === 'escalated' && (() => {
                    const ts = escalatedAt[selectedAlert.id];
                    const elapsed = ts ? (Date.now() - ts) / 1000 : Infinity;
                    const canReEscalate = elapsed >= 120;
                    return canReEscalate ? (
                      <div>
                        <button
                          onClick={() => openModal('escalate', selectedAlert.id)}
                          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 flex items-center justify-center gap-2 transition-opacity"
                          style={{ backgroundColor: '#D34026' }}
                        >
                          <AlertTriangleIcon className="w-4 h-4" /> Re-Escalate Alert
                        </button>
                        <p className="text-[10px] text-gray-400 text-center mt-1">No response received after 2 minutes</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-xs text-gray-400">Waiting for auxiliary response…</p>
                        <p className="text-[10px] text-gray-300 mt-0.5">Re-escalate in {Math.ceil(120 - elapsed)}s</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Justification Modal */}
      <JustificationModal
        isOpen={modalOpen}
        actionType={pendingAction?.type ?? 'verify'}
        alertId={pendingAction?.alertId ?? ''}
        alertCoach={pendingAlertForModal?.coachId ?? ''}
        onConfirm={handleModalConfirm}
        onCancel={() => { setModalOpen(false); setPendingAction(null); }}
      />
    </div>
  );
}