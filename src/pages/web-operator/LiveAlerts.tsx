import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CameraIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
  ChevronRightIcon,
  MessageSquareIcon,
  UserIcon,
  FilterIcon,
  RefreshCwIcon,
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
  elapsed: string;
  status: 'pending' | 'verified' | 'escalated' | 'en_route' | 'resolved' | 'dismissed';
  confidence: number | null;
  deviceId: string | null;
  source: 'ai' | 'passenger';
  reportedBy?: string;
  imageUrl?: string;
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
  { key: 'pending',   label: 'Pending',   color: '#C2410C', bg: '#FFF7ED' },
  { key: 'verified',  label: 'Verified',  color: '#2D7A5D', bg: '#F0FBF6' },
  { key: 'escalated', label: 'Escalated', color: '#7B5EA7', bg: '#F5F0FF' },
  { key: 'enRoute',   label: 'En Route',  color: '#0B4F6C', bg: '#EFF6FF' },
  { key: 'resolved',  label: 'Resolved',  color: '#1D4ED8', bg: '#EBF8FF' },
  { key: 'dismissed', label: 'Dismissed', color: '#4A5568', bg: '#F7FAFC' },
];

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
  const [notes, setNotes] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'verify' | 'dismiss'; alertId: string } | null>(null);

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
      // Keep or auto-select first alert
      setSelectedAlert(prev => {
        if (prev) {
          const updated = (data.alerts as Alert[]).find(a => a.id === prev.id);
          return updated ?? (data.alerts[0] ?? null);
        }
        return data.alerts[0] ?? null;
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
    { id: 'all',       label: 'All' },
    { id: 'pending',   label: 'Pending' },
    { id: 'verified',  label: 'Verified' },
    { id: 'escalated', label: 'Escalated' },
    { id: 'en_route',  label: 'En Route' },
    { id: 'resolved',  label: 'Resolved' },
    { id: 'dismissed', label: 'Dismissed' },
  ];

  // ── Status update ─────────────────────────────────────────────────────────────
  const handleModalConfirm = async (comment: string) => {
    if (!pendingAction) return;
    const newStatus = pendingAction.type === 'verify' ? 'verified' : 'dismissed';
    const id = pendingAction.alertId;

    // Optimistic update
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    setSelectedAlert(prev => prev?.id === id ? { ...prev, status: newStatus } : prev);

    console.log(`[${pendingAction.type.toUpperCase()}] ${id}: ${comment}`);

    // Persist to DB — strip prefix to get numeric id
    const numericId = id.replace('ALT-', '').replace('RPT-', '');
    try {
      await fetch(`${API}/police-alerts/${numericId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error('Failed to update status:', err);
    }

    setModalOpen(false);
    setPendingAction(null);
  };

  const openModal = (type: 'verify' | 'dismiss', alertId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPendingAction({ type, alertId });
    setModalOpen(true);
  };

  const pendingAlertForModal = pendingAction ? alerts.find(a => a.id === pendingAction.alertId) : null;

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#FAF9F5' }}>

      {/* ── Header ── */}
      <div className="px-6 pt-6 pb-4 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1A202C' }}>Live Alerts</h1>
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
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <div className="flex gap-1">
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

          <div className="w-px h-6 bg-gray-200" />

          <div className="flex items-center gap-1.5">
            <FilterIcon size={13} className="text-gray-400" />
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value as AlertSource)}
              className="text-xs bg-gray-50 border border-gray-200 text-gray-700 py-1.5 px-2.5 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/30"
            >
              <option value="all">All Sources</option>
              <option value="ai">AI Detected</option>
              <option value="passenger">Passenger Reported</option>
            </select>
          </div>

          <select
            value={lineFilter}
            onChange={e => handleLineChange(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 text-gray-700 py-1.5 px-2.5 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/30"
          >
            <option value="all">All Lines</option>
            {lines.map((l, i) => (
              <option key={l.lineId} value={l.lineId} style={{ color: getLineColor(l.lineId, i) }}>
                {l.lineName}
              </option>
            ))}
          </select>

          <select
            value={stationFilter}
            onChange={e => setStationFilter(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 text-gray-700 py-1.5 px-2.5 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/30"
          >
            <option value="all">All Stations</option>
            {availableStations.map(s => (
              <option key={s.stationId} value={s.stationName}>{s.stationName}</option>
            ))}
          </select>

          {(sourceFilter !== 'all' || lineFilter !== 'all' || stationFilter !== 'all') && (
            <button
              onClick={() => { setSourceFilter('all'); setLineFilter('all'); setStationFilter('all'); }}
              className="text-xs font-medium hover:underline text-gray-500"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex flex-1 overflow-hidden gap-4 p-4">

        {/* Alert List */}
        <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin pr-1" style={{ maxWidth: '60%' }}>

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
                  onClick={() => { setSelectedAlert(alert); setNotes(''); }}
                  className={`bg-white rounded-xl shadow-sm border cursor-pointer transition-all duration-150 overflow-hidden ${selectedAlert?.id === alert.id
                    ? 'ring-2 ring-[#0B4F6C] border-transparent'
                    : 'border-gray-100 hover:border-gray-200'
                    }`}
                >
                  <div className="flex">
                    <div
                      className="w-1 flex-shrink-0 rounded-l-xl"
                      style={{
                        backgroundColor: alert.status === 'pending' ? '#D34026'
                          : alert.status === 'verified' ? '#2D7A5D' : '#CBD5E0'
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
                              {alert.time} · {alert.elapsed}
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
                              backgroundColor: alert.status === 'pending' ? '#FEF2F0'
                                : alert.status === 'verified' ? '#F0FBF6' : '#F7FAFC',
                              color: alert.status === 'pending' ? '#D34026'
                                : alert.status === 'verified' ? '#2D7A5D' : '#718096',
                            }}
                          >
                            {alert.status.toUpperCase()}
                          </span>
                          <ChevronRightIcon className="w-4 h-4 text-gray-300" />
                        </div>
                      </div>

                      {alert.status === 'pending' && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={e => openModal('verify', alert.id, e)}
                            className="flex-1 text-xs font-semibold py-1.5 rounded-lg text-white hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: '#0B4F6C' }}
                          >
                            Verify & Escalate
                          </button>
                          <button
                            onClick={e => openModal('dismiss', alert.id, e)}
                            className="flex-1 text-xs font-semibold py-1.5 rounded-lg text-white hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: '#D34026' }}
                          >
                            Dismiss Alert
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
        <div className="w-[40%] flex-shrink-0">
          {selectedAlert ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 sticky top-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-sm text-gray-900">Alert Detail</h2>
                <span className="text-xs font-mono text-gray-400">{selectedAlert.id}</span>
              </div>

              {/* Source banner */}
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                {selectedAlert.source === 'ai' ? (
                  <span className="text-sm font-semibold text-[#D34026]">
                    AI detected{selectedAlert.confidence !== null ? `, ${selectedAlert.confidence}% confidence` : ''}
                  </span>
                ) : (
                  <>
                    <span className="text-sm font-semibold text-[#92400E]">Passenger reported</span>
                    <span className="text-xs text-gray-500">By: {selectedAlert.reportedBy || 'Anonymous'}</span>
                  </>
                )}
              </div>

              {/* Snapshot / image */}
              <div className="mx-4 mt-4 rounded-xl overflow-hidden bg-gray-800" style={{ aspectRatio: '16/9' }}>
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
                        <span className="text-white/25 text-xs">{selectedAlert.reportedBy || 'No photo attached'}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="px-5 py-4 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: 'Coach ID', value: selectedAlert.coachId },
                    { label: 'Line', value: selectedAlert.line },
                    { label: 'Station', value: selectedAlert.station },
                    { label: 'Time', value: selectedAlert.time },
                    ...(selectedAlert.source === 'ai' ? [{ label: 'Device', value: selectedAlert.deviceId ?? '—' }] : []),
                  ].map(item => (
                    <div key={item.label} className="bg-gray-50 rounded-lg px-3 py-2">
                      <div className="text-gray-400 text-xs mb-0.5">{item.label}</div>
                      <div className="font-medium text-xs text-gray-900">{item.value}</div>
                    </div>
                  ))}
                </div>

                {/* Status Timeline */}
                <div className="pt-2">
                  <div className="text-xs font-medium mb-3 text-gray-500">Status Timeline</div>
                  <div className="flex items-center gap-0">
                    {['Detected', 'Under Review', 'Resolved'].map((step, i) => {
                      const isActive = i <= (selectedAlert.status === 'pending' ? 1 : 2);
                      return (
                        <div key={step} className="flex items-center flex-1">
                          <div className="flex flex-col items-center">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                              style={{ backgroundColor: isActive ? '#0B4F6C' : '#E2E8F0', color: isActive ? 'white' : '#A0AEC0' }}
                            >
                              {i + 1}
                            </div>
                            <span
                              className="text-xs mt-1 text-center leading-tight"
                              style={{ color: isActive ? '#0B4F6C' : '#A0AEC0', fontSize: '10px' }}
                            >
                              {i === 0 && selectedAlert.source === 'passenger' ? 'Reported' : step}
                            </span>
                          </div>
                          {i < 2 && (
                            <div
                              className="flex-1 h-0.5 mx-1 mb-4"
                              style={{ backgroundColor: i < (selectedAlert.status === 'pending' ? 1 : 2) ? '#0B4F6C' : '#E2E8F0' }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-medium block mb-1.5 text-gray-500">
                    <MessageSquareIcon className="w-3 h-3 inline mr-1" />
                    Operator Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Add notes about this alert..."
                    className="w-full text-xs rounded-lg border border-gray-200 p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/30 text-gray-900"
                    rows={2}
                  />
                </div>

                {/* Actions */}
                {selectedAlert.status === 'pending' && (
                  <div className="space-y-2 pt-1">
                    <button
                      onClick={() => openModal('verify', selectedAlert.id)}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 flex items-center justify-center gap-2 transition-opacity"
                      style={{ backgroundColor: '#0B4F6C' }}
                    >
                      <CheckCircleIcon className="w-4 h-4" /> Verify & Escalate
                    </button>
                    <button
                      onClick={() => openModal('dismiss', selectedAlert.id)}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 flex items-center justify-center gap-2 transition-opacity"
                      style={{ backgroundColor: '#D34026' }}
                    >
                      <AlertTriangleIcon className="w-4 h-4" /> Dismiss Alert
                    </button>
                    <button
                      onClick={() => openModal('dismiss', selectedAlert.id)}
                      className="w-full py-2 text-sm font-medium hover:underline text-gray-500 transition-colors flex items-center justify-center gap-1"
                    >
                      <XCircleIcon className="w-4 h-4 inline" /> Dismiss as False Alarm
                    </button>
                  </div>
                )}

                {selectedAlert.status !== 'pending' && (
                  <div className="pt-1 text-center">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                      style={{
                        backgroundColor: selectedAlert.status === 'verified' ? '#F0FBF6' : '#F7FAFC',
                        color: selectedAlert.status === 'verified' ? '#2D7A5D' : '#718096',
                      }}
                    >
                      {selectedAlert.status === 'verified' ? <CheckCircleIcon className="w-3.5 h-3.5" /> : <XCircleIcon className="w-3.5 h-3.5" />}
                      {selectedAlert.status === 'verified' ? 'Verified & Escalated' : 'Dismissed'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 h-64 flex flex-col items-center justify-center text-center">
              <FilterIcon size={28} className="text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">Select an alert to view details</p>
            </div>
          )}
        </div>
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