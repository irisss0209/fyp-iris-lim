import React, { useState, useMemo } from 'react';
import {
  CameraIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
  ChevronRightIcon,
  MessageSquareIcon,
  UserIcon,
  FilterIcon
} from
  'lucide-react';
import { JustificationModal } from '../../components/JustificationModal';

type AlertStatus = 'all' | 'pending' | 'verified' | 'dismissed';
type AlertSource = 'all' | 'ai' | 'passenger';

interface Alert {
  id: string;
  coachId: string;
  line: string;
  station: string;
  time: string;
  elapsed: string;
  status: 'pending' | 'verified' | 'dismissed';
  confidence: number | null; // null for passenger reports
  deviceId: string | null;   // null for passenger reports
  source: 'ai' | 'passenger';
  reportedBy?: string;       // passenger name (for passenger reports)
}

const MOCK_ALERTS: Alert[] = [
  {
    id: 'ALT-001',
    coachId: 'KJ-07 Coach 3',
    line: 'LRT Kelana Jaya',
    station: 'Masjid Jamek',
    time: '14:32:07',
    elapsed: '2m ago',
    status: 'pending',
    confidence: 94,
    deviceId: 'EDGE-KJ-07-C3',
    source: 'ai'
  },
  {
    id: 'RPT-001',
    coachId: 'KJ-07 Coach 3',
    line: 'LRT Kelana Jaya',
    station: 'Masjid Jamek',
    time: '14:30:12',
    elapsed: '4m ago',
    status: 'pending',
    confidence: null,
    deviceId: null,
    source: 'passenger',
    reportedBy: 'Anonymous Passenger'
  },
  {
    id: 'ALT-002',
    coachId: 'KTM-12 Coach 1',
    line: 'KTM Komuter',
    station: 'KL Sentral',
    time: '14:26:44',
    elapsed: '8m ago',
    status: 'verified',
    confidence: 88,
    deviceId: 'EDGE-KTM-12-C1',
    source: 'ai'
  },
  {
    id: 'ALT-003',
    coachId: 'MRT-05 Coach 2',
    line: 'MRT Putrajaya',
    station: 'Cyberjaya Utama',
    time: '14:19:15',
    elapsed: '15m ago',
    status: 'pending',
    confidence: 91,
    deviceId: 'EDGE-MRT-05-C2',
    source: 'ai'
  },
  {
    id: 'RPT-002',
    coachId: 'KTM-12 Coach 1',
    line: 'KTM Komuter',
    station: 'Subang Jaya',
    time: '14:18:55',
    elapsed: '15m ago',
    status: 'pending',
    confidence: null,
    deviceId: null,
    source: 'passenger',
    reportedBy: 'Passenger #4821'
  },
  {
    id: 'ALT-004',
    coachId: 'KJ-03 Coach 3',
    line: 'LRT Kelana Jaya',
    station: 'Bangsar',
    time: '14:12:33',
    elapsed: '22m ago',
    status: 'dismissed',
    confidence: 87,
    deviceId: 'EDGE-KJ-03-C3',
    source: 'ai'
  },
  {
    id: 'ALT-005',
    coachId: 'MRT-08 Coach 2',
    line: 'MRT Putrajaya',
    station: 'Putrajaya Sentral',
    time: '14:05:50',
    elapsed: '29m ago',
    status: 'pending',
    confidence: 97,
    deviceId: 'EDGE-MRT-08-C2',
    source: 'ai'
  },
  {
    id: 'RPT-003',
    coachId: 'MRT-05 Coach 2',
    line: 'MRT Putrajaya',
    station: 'Cyberjaya Utama',
    time: '14:02:10',
    elapsed: '32m ago',
    status: 'verified',
    confidence: null,
    deviceId: null,
    source: 'passenger',
    reportedBy: 'Passenger #7312'
  },
  {
    id: 'ALT-006',
    coachId: 'KTM-07 Coach 1',
    line: 'KTM Komuter',
    station: 'Subang Jaya',
    time: '13:58:22',
    elapsed: '36m ago',
    status: 'verified',
    confidence: 85,
    deviceId: 'EDGE-KTM-07-C1',
    source: 'ai'
  },
  {
    id: 'ALT-007',
    coachId: 'KJ-11 Coach 3',
    line: 'LRT Kelana Jaya',
    station: 'Kelana Jaya',
    time: '13:45:10',
    elapsed: '49m ago',
    status: 'dismissed',
    confidence: 86,
    deviceId: 'EDGE-KJ-11-C3',
    source: 'ai'
  },
  {
    id: 'RPT-004',
    coachId: 'KJ-11 Coach 3',
    line: 'LRT Kelana Jaya',
    station: 'Kelana Jaya',
    time: '13:42:00',
    elapsed: '52m ago',
    status: 'dismissed',
    confidence: null,
    deviceId: null,
    source: 'passenger',
    reportedBy: 'Anonymous Passenger'
  },
  {
    id: 'ALT-008',
    coachId: 'MRT-02 Coach 2',
    line: 'MRT Putrajaya',
    station: 'Kwasa Damansara',
    time: '13:30:05',
    elapsed: '1h ago',
    status: 'pending',
    confidence: 89,
    deviceId: 'EDGE-MRT-02-C2',
    source: 'ai'
  }
];

const LINE_COLORS: Record<string, string> = {
  'LRT Kelana Jaya': '#D34026',
  'KTM Komuter': '#0B4F6C',
  'MRT Putrajaya': '#2D7A5D'
};

// Extract unique lines and stations for filters
const LINES = [...new Set(MOCK_ALERTS.map(a => a.line))];
const STATIONS_BY_LINE: Record<string, string[]> = {};
MOCK_ALERTS.forEach(a => {
  if (!STATIONS_BY_LINE[a.line]) STATIONS_BY_LINE[a.line] = [];
  if (!STATIONS_BY_LINE[a.line].includes(a.station)) STATIONS_BY_LINE[a.line].push(a.station);
});

export function LiveAlerts() {
  const [activeFilter, setActiveFilter] = useState<AlertStatus>('all');
  const [sourceFilter, setSourceFilter] = useState<AlertSource>('all');
  const [lineFilter, setLineFilter] = useState('all');
  const [stationFilter, setStationFilter] = useState('all');
  const [selectedAlert, setSelectedAlert] = useState<Alert>(MOCK_ALERTS[0]);
  const [notes, setNotes] = useState('');
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'verify' | 'dismiss';
    alertId: string;
  } | null>(null);

  // Available stations based on selected line
  const availableStations = useMemo(() => {
    if (lineFilter === 'all') {
      return [...new Set(MOCK_ALERTS.map(a => a.station))];
    }
    return STATIONS_BY_LINE[lineFilter] || [];
  }, [lineFilter]);

  // Reset station when line changes
  const handleLineChange = (line: string) => {
    setLineFilter(line);
    setStationFilter('all');
  };

  const filtered = useMemo(() => {
    return MOCK_ALERTS.filter((a) => {
      if (activeFilter !== 'all' && a.status !== activeFilter) return false;
      if (sourceFilter !== 'all' && a.source !== sourceFilter) return false;
      if (lineFilter !== 'all' && a.line !== lineFilter) return false;
      if (stationFilter !== 'all' && a.station !== stationFilter) return false;
      return true;
    });
  }, [activeFilter, sourceFilter, lineFilter, stationFilter]);

  const stats = {
    unverified: MOCK_ALERTS.filter((a) => a.status === 'pending').length,
    verified: MOCK_ALERTS.filter((a) => a.status === 'verified').length,
    dismissed: MOCK_ALERTS.filter((a) => a.status === 'dismissed').length,
    aiAlerts: MOCK_ALERTS.filter((a) => a.source === 'ai').length,
    passengerReports: MOCK_ALERTS.filter((a) => a.source === 'passenger').length,
    avgResponse: '2.4m'
  };

  const statusTabs: { id: AlertStatus; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'verified', label: 'Verified and Escalated' },
    { id: 'dismissed', label: 'Dismissed' }
  ];

  const handleResolve = (id: string) => {
    setResolvedIds((prev) => new Set([...prev, id]));
  };

  const openModal = (
    type: 'verify' | 'dismiss',
    alertId: string,
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation();
    setPendingAction({ type, alertId });
    setModalOpen(true);
  };

  const handleModalConfirm = (comment: string) => {
    if (pendingAction) {
      handleResolve(pendingAction.alertId);
      console.log(
        `[${pendingAction.type.toUpperCase()}] ${pendingAction.alertId}: ${comment}`
      );
    }
    setModalOpen(false);
    setPendingAction(null);
  };

  const handleModalCancel = () => {
    setModalOpen(false);
    setPendingAction(null);
  };

  const pendingAlertForModal = pendingAction
    ? MOCK_ALERTS.find((a) => a.id === pendingAction.alertId)
    : null;

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: '#FAF9F5' }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 bg-white border-b border-gray-100">
        <h1
          className="text-2xl font-bold"
          style={{ color: '#1A202C' }}
        >
          Live Alerts
        </h1>
        <p
          className="text-sm mt-0.5"
          style={{ color: '#4A5568' }}
        >
          Real-time gender compliance monitoring feed
        </p>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3 mt-4">
          <div
            className="rounded-lg px-4 py-3"
            style={{ backgroundColor: '#FEF2F0' }}
          >
            <div className="text-2xl font-bold" style={{ color: '#D34026' }}>
              {stats.unverified}
            </div>
            <div className="text-xs font-medium" style={{ color: '#D34026' }}>
              Pending
            </div>
          </div>
          <div
            className="rounded-lg px-4 py-3"
            style={{ backgroundColor: '#F0FBF6' }}
          >
            <div className="text-2xl font-bold" style={{ color: '#2D7A5D' }}>
              {stats.verified}
            </div>
            <div className="text-xs font-medium" style={{ color: '#2D7A5D' }}>
              Verified and Escalated
            </div>
          </div>
          <div
            className="rounded-lg px-4 py-3"
            style={{ backgroundColor: '#EBF8FF' }}
          >
            <div className="text-2xl font-bold" style={{ color: '#2B6CB0' }}>
              12
            </div>
            <div className="text-xs font-medium" style={{ color: '#2B6CB0' }}>
              Resolved
            </div>
          </div>
          <div className="rounded-lg px-4 py-3 bg-gray-50">
            <div className="text-2xl font-bold" style={{ color: '#4A5568' }}>
              {stats.dismissed}
            </div>
            <div className="text-xs font-medium" style={{ color: '#4A5568' }}>
              Dismissed
            </div>
          </div>

        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          {/* Status Tabs */}
          <div className="flex gap-1">
            {statusTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 ${activeFilter === tab.id ? 'text-white shadow-sm' : 'hover:bg-gray-100'
                  }`}
                style={{
                  backgroundColor: activeFilter === tab.id ? '#0B4F6C' : 'transparent',
                  color: activeFilter === tab.id ? 'white' : '#4A5568'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-gray-200" />

          {/* Source Filter */}
          <div className="flex items-center gap-1.5">
            <FilterIcon size={13} className="text-gray-400" />
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as AlertSource)}
              className="text-xs bg-gray-50 border border-gray-200 text-gray-700 py-1.5 px-2.5 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/30"
            >
              <option value="all">All Sources</option>
              <option value="ai">AI Detected</option>
              <option value="passenger"> Passenger Reported</option>
            </select>
          </div>

          {/* Line Filter */}
          <select
            value={lineFilter}
            onChange={(e) => handleLineChange(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 text-gray-700 py-1.5 px-2.5 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/30"
          >
            <option value="all">All Lines</option>
            {LINES.map(line => (
              <option key={line} value={line}>{line}</option>
            ))}
          </select>

          {/* Station Filter */}
          <select
            value={stationFilter}
            onChange={(e) => setStationFilter(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 text-gray-700 py-1.5 px-2.5 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/30"
          >
            <option value="all">All Stations</option>
            {availableStations.map(station => (
              <option key={station} value={station}>{station}</option>
            ))}
          </select>

          {/* Active Filter Count */}
          {(sourceFilter !== 'all' || lineFilter !== 'all' || stationFilter !== 'all') && (
            <button
              onClick={() => { setSourceFilter('all'); setLineFilter('all'); setStationFilter('all'); }}
              className="text-xs text-black-500 font-medium hover:underline ml-1"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden gap-4 p-4">
        {/* Alert List */}
        <div
          className="flex-1 overflow-y-auto space-y-2 scrollbar-thin pr-1"
          style={{ maxWidth: '60%' }}
        >
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FilterIcon size={32} className="text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-400">No alerts match filters</p>
              <p className="text-xs text-gray-300 mt-1">Try adjusting your filter criteria</p>
            </div>
          )}

          {filtered.map((alert) => {
            const isResolved = resolvedIds.has(alert.id);
            const effectiveStatus = isResolved ? 'verified' : alert.status;
            return (
              <div
                key={alert.id}
                onClick={() => setSelectedAlert(alert)}
                className={`bg-white rounded-xl shadow-sm border cursor-pointer transition-all duration-150 overflow-hidden ${selectedAlert.id === alert.id
                  ? 'ring-2 ring-[#0B4F6C] border-transparent'
                  : 'border-gray-100 hover:border-gray-200'
                  }`}
              >
                <div className="flex">
                  <div
                    className="w-1 flex-shrink-0 rounded-l-xl"
                    style={{
                      backgroundColor:
                        effectiveStatus === 'pending'
                          ? '#D34026'
                          : effectiveStatus === 'verified'
                            ? '#2D7A5D'
                            : '#CBD5E0'
                    }}
                  />
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="font-semibold text-sm"
                            style={{ color: '#1A202C' }}
                          >
                            {alert.coachId}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: LINE_COLORS[alert.line] + '18',
                              color: LINE_COLORS[alert.line]
                            }}
                          >
                            {alert.line}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full bg-gray-100"
                            style={{ color: '#4A5568' }}
                          >
                            {alert.station}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className="text-xs" style={{ color: '#4A5568' }}>
                            <ClockIcon className="w-3 h-3 inline mr-1" />
                            {alert.time} · {alert.elapsed}
                          </span>

                          {/* Consolidated source & confidence label */}
                          {alert.source === 'ai' && alert.confidence !== null ? (
                            <span
                              className="text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
                              style={{ backgroundColor: '#FEF2F0', color: '#D34026' }}
                            >
                              AI detected, {alert.confidence}% confidence
                            </span>
                          ) : (
                            <span
                              className="text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
                              style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
                            >
                               Passenger reported
                            </span>
                          )}
                        </div>

                        {/* Confidence bar (For AI detection) */}
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
                            backgroundColor:
                              effectiveStatus === 'pending'
                                ? '#FEF2F0'
                                : effectiveStatus === 'verified'
                                  ? '#F0FBF6'
                                  : '#F7FAFC',
                            color:
                              effectiveStatus === 'pending'
                                ? '#D34026'
                                : effectiveStatus === 'verified'
                                  ? '#2D7A5D'
                                  : '#718096'
                          }}
                        >
                          {effectiveStatus.toUpperCase()}
                        </span>
                        <ChevronRightIcon className="w-4 h-4 text-gray-300" />
                      </div>
                    </div>

                    {effectiveStatus === 'pending' && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={(e) => openModal('verify', alert.id, e)}
                          className="flex-1 text-xs font-semibold py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
                          style={{ backgroundColor: '#0B4F6C' }}
                        >
                          Verify and Escalate
                        </button>
                        <button
                          onClick={(e) => openModal('dismiss', alert.id, e)}
                          className="flex-1 text-xs font-semibold py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
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
          })}
        </div>

        {/* Detail Panel */}
        <div className="w-[40%] flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 sticky top-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2
                  className="font-semibold text-sm"
                  style={{ color: '#1A202C' }}
                >
                  Alert Detail
                </h2>
              </div>
              <span
                className="text-xs font-mono"
                style={{ color: '#4A5568' }}
              >
                {selectedAlert.id}
              </span>
            </div>

            {/* Source & Confidence Banner (replacing absolute badges and metadata rows) */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: '#F8FAFC' }}>
              {selectedAlert.source === 'ai' && selectedAlert.confidence !== null ? (
                <div className="flex items-center justify-between w-full">
                  <span
                    className="text-sm font-semibold flex items-center gap-1.5"
                    style={{ color: '#D34026' }}
                  >
                    AI detected, {selectedAlert.confidence}% confidence
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <span
                    className="text-sm font-semibold flex items-center gap-1.5"
                    style={{ color: '#92400E' }}
                  >
                    Passenger reported
                  </span>
                  <span className="text-xs font-medium text-gray-500">
                    By: {selectedAlert.reportedBy || 'Anonymous'}
                  </span>
                </div>
              )}
            </div>

            {/* CCTV Placeholder / Photo Placeholder */}
            <div
              className="mx-4 mt-4 rounded-xl overflow-hidden"
              style={{
                backgroundColor: '#3f4756',
                aspectRatio: '16/9'
              }}
            >
              <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                {selectedAlert.source === 'ai' ? (
                  <>
                    <CameraIcon className="w-10 h-10 text-white/30" />
                    <span className="text-white/40 text-xs font-medium">
                      Snapshot
                    </span>
                    <span className="text-white/25 text-xs">
                      {selectedAlert.deviceId}
                    </span>
                  </>
                ) : (
                  <>
                    <UserIcon className="w-10 h-10 text-white/30" />
                    <span className="text-white/40 text-xs font-medium">
                      PASSENGER PHOTO
                    </span>
                    <span className="text-white/25 text-xs">
                      {selectedAlert.reportedBy || 'No photo attached'}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="px-5 py-4 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'Coach ID', value: selectedAlert.coachId },
                  { label: 'Line', value: selectedAlert.line },
                  { label: 'Station', value: selectedAlert.station },
                  { label: 'Time', value: selectedAlert.time },
                  ...(selectedAlert.source === 'ai'
                    ? [{ label: 'Device', value: selectedAlert.deviceId || '—' }]
                    : []
                  )
                ].map((item) => (
                  <div
                    key={item.label}
                    className="bg-gray-50 rounded-lg px-3 py-2"
                  >
                    <div className="text-gray-400 text-xs mb-0.5">
                      {item.label}
                    </div>
                    <div
                      className="font-medium text-xs"
                      style={{ color: '#1A202C' }}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Status Timeline */}
              <div className="pt-2">
                <div
                  className="text-xs font-medium mb-3"
                  style={{ color: '#4A5568' }}
                >
                  Status Timeline
                </div>
                <div className="flex items-center gap-0">
                  {['Detected', 'Under Review', 'Resolved'].map((step, i) => {
                    const isActive =
                      i <= (selectedAlert.status === 'pending' ? 1 : 2);
                    return (
                      <div key={step} className="flex items-center flex-1">
                        <div className="flex flex-col items-center">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{
                              backgroundColor: isActive ? '#0B4F6C' : '#E2E8F0',
                              color: isActive ? 'white' : '#A0AEC0'
                            }}
                          >
                            {i + 1}
                          </div>
                          <span
                            className="text-xs mt-1 text-center leading-tight"
                            style={{
                              color: isActive ? '#0B4F6C' : '#A0AEC0',
                              fontSize: '10px'
                            }}
                          >
                            {i === 0 && selectedAlert.source === 'passenger' ? 'Reported' : step}
                          </span>
                        </div>
                        {i < 2 && (
                          <div
                            className="flex-1 h-0.5 mx-1 mb-4"
                            style={{
                              backgroundColor:
                                i < (selectedAlert.status === 'pending' ? 1 : 2)
                                  ? '#0B4F6C'
                                  : '#E2E8F0'
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label
                  className="text-xs font-medium block mb-1.5"
                  style={{ color: '#4A5568' }}
                >
                  <MessageSquareIcon className="w-3 h-3 inline mr-1" />
                  Operator Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this alert..."
                  className="w-full text-xs rounded-lg border border-gray-200 p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/30"
                  style={{ color: '#1A202C' }}
                  rows={2}
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => openModal('verify', selectedAlert.id)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#0B4F6C' }}
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  Verify and Escalate
                </button>
                <button
                  onClick={() => openModal('dismiss', selectedAlert.id)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#D34026' }}
                >
                  <AlertTriangleIcon className="w-4 h-4" />
                  Dismiss Alert
                </button>
                <button
                  onClick={() => openModal('dismiss', selectedAlert.id)}
                  className="w-full py-2 text-sm font-medium transition-colors hover:underline"
                  style={{ color: '#4A5568' }}
                >
                  <XCircleIcon className="w-4 h-4 inline mr-1" />
                  Dismiss as False Alarm
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Justification Modal */}
      <JustificationModal
        isOpen={modalOpen}
        actionType={pendingAction?.type ?? 'verify'}
        alertId={pendingAction?.alertId ?? ''}
        alertCoach={pendingAlertForModal?.coachId ?? ''}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
      />
    </div>
  );
}