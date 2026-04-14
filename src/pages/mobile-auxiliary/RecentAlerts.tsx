import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BellIcon,
  CameraIcon,
  MapPinIcon,
  TrainIcon,
  DoorOpenIcon,
  ClockIcon,
  ArrowUpCircleIcon,
  ShieldAlertIcon,
} from 'lucide-react';

const ACCENT = '#0B4F6C';
const RED = '#D34026';

type AlertStatus = 'pending' | 'dismissed' | 'resolved' | 'escalated';

interface RecentAlerts {
  id: string;
  coach: string;
  door: string;
  line: string;
  station: string;
  platform: string;
  time: string;
  elapsed: number;
  severity: 'high' | 'medium';
  status: AlertStatus;
  type: string;
  snapshotUrl?: string;
}



const SUB_TABS: { id: AlertStatus; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'escalated', label: 'Escalated' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'dismissed', label: 'Dismissed' },

];

const STATUS_STYLES: Record<AlertStatus, { bg: string; text: string; dot: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  dismissed: { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' },
  resolved: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  escalated: { bg: '#FEE2E2', text: '#7F1D1D', dot: '#EF4444' },
};

function StatusBadge({ status }: { status: AlertStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function PendingAlertCard({
  alert,
  onAction,
}: {
  alert: RecentAlerts;
  onAction: (id: string, action: 'resolved' | 'dismissed' | 'escalated') => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
    >
      {/* Alert header strip */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ backgroundColor: alert.severity === 'high' ? '#FFF1F0' : '#FFFBEA' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: alert.severity === 'high' ? RED : '#F59E0B' }}
          />
          <span
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color: alert.severity === 'high' ? RED : '#92400E' }}
          >
            {alert.elapsed}m ago · {alert.severity.toUpperCase()}
          </span>
        </div>
        <span className="text-xs font-mono text-gray-400">{alert.id}</span>
      </div>

      {/* Snapshot */}
      <div className="relative h-40 bg-gray-900">
        {alert.snapshotUrl ? (
          <img
            src={alert.snapshotUrl}
            alt="CCTV snapshot"
            className="w-full h-full object-cover opacity-80"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <CameraIcon size={32} className="text-gray-500" />
          </div>
        )}
        {/* Overlay labels */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
          <div>
            <p className="text-white text-xs font-bold drop-shadow">{alert.type}</p>
            <p className="text-white/70 text-[10px] mt-0.5">{alert.station} · {alert.time}</p>
          </div>
          <div className="flex items-center gap-1 bg-black/50 backdrop-blur rounded-lg px-2 py-1">
            <CameraIcon size={10} className="text-white/60" />
            <span className="text-white/60 text-[10px] font-medium">LIVE</span>
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse ml-0.5" />
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-gray-50 rounded-xl p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <TrainIcon size={11} style={{ color: ACCENT }} />
              <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-400">Coach</span>
            </div>
            <p className="text-xs font-bold text-gray-800">{alert.coach}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <DoorOpenIcon size={11} style={{ color: ACCENT }} />
              <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-400">Door</span>
            </div>
            <p className="text-xs font-bold text-gray-800">{alert.door}</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-2.5 mb-3 flex items-center gap-2">
          <MapPinIcon size={13} style={{ color: ACCENT }} />
          <div>
            <p className="text-xs font-bold text-gray-800">{alert.station}</p>
            <p className="text-[10px] text-gray-400">{alert.line} · {alert.platform}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onAction(alert.id, 'resolved')}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all active:scale-[0.97]"
            style={{ backgroundColor: '#0B4F6C' }}
          >
            Acknowledged
          </button>
          <button
            onClick={() => onAction(alert.id, 'dismissed')}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 border border-gray-200 flex items-center justify-center gap-1.5 transition-all active:scale-[0.97]"
          >
            Dismiss
          </button>
          <button
            onClick={() => onAction(alert.id, 'escalated')}
            className="px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center transition-all active:scale-[0.97]"
            style={{ backgroundColor: '#FEE2E2', color: RED }}
          >
            <ArrowUpCircleIcon size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function CompactAlertCard({ alert }: { alert: RecentAlerts }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <div
        className="w-1.5 self-stretch rounded-full flex-shrink-0"
        style={{ backgroundColor: STATUS_STYLES[alert.status].dot }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-mono font-bold" style={{ color: ACCENT }}>{alert.id}</span>
          <StatusBadge status={alert.status} />
        </div>
        <p className="text-sm font-semibold text-gray-800 truncate">{alert.type}</p>
        <p className="text-xs text-gray-400">{alert.station} · {alert.line}</p>
        <div className="flex items-center gap-1 mt-1">
          <ClockIcon size={10} className="text-gray-300" />
          <span className="text-[10px] text-gray-400">{alert.time} · {alert.elapsed}m ago</span>
        </div>
      </div>
    </div>
  );
}

export function RecentAlerts({ assignedStationId }: { assignedStationId?: string }) {
  const [alerts, setAlerts] = useState<RecentAlerts[]>([]);
  const [activeStatus, setActiveStatus] = useState<AlertStatus>('pending');

  useEffect(() => {
    const url = assignedStationId 
      ? `http://localhost:5293/api/data/police-alerts?assignedStationId=${assignedStationId}`
      : 'http://localhost:5293/api/data/police-alerts';

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setAlerts(data);
      })
      .catch(err => {
        console.error('Failed to fetch police alerts', err);
      });
  }, [assignedStationId]);

  const handleAction = async (id: string, action: 'resolved' | 'dismissed' | 'escalated') => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: action } : a));

    // Update server
    try {
      await fetch(`http://localhost:5293/api/data/police-alerts/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action })
      });
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const filtered = alerts.filter(a => a.status === activeStatus);

  const counts = {
    pending: alerts.filter(a => a.status === 'pending').length,
    dismissed: alerts.filter(a => a.status === 'dismissed').length,
    resolved: alerts.filter(a => a.status === 'resolved').length,
    escalated: alerts.filter(a => a.status === 'escalated').length,
  };

  return (
    <motion.div
      key="alerts"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="pb-6"
    >
      {/* Section header */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-0.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#EBF4F8' }}>
            <ShieldAlertIcon size={14} style={{ color: ACCENT }} />
          </div>
          <h2 className="text-base font-bold text-gray-900">Alerts</h2>
        </div>
        <p className="text-xs text-gray-400 pl-9">Incoming violation alerts</p>
      </div>

      {/* Sub-tab pills */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
        {SUB_TABS.map(tab => {
          const active = activeStatus === tab.id;
          const count = counts[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => setActiveStatus(tab.id)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                backgroundColor: active ? ACCENT : '#F3F4F6',
                color: active ? 'white' : '#6B7280',
                border: active ? `1px solid ${ACCENT}` : '1px solid #E5E7EB',
              }}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                  style={{
                    backgroundColor: active
                      ? 'rgba(255,255,255,0.25)'
                      : tab.id === 'pending'
                        ? '#FEF3C7'
                        : tab.id === 'escalated'
                          ? '#FEE2E2'
                          : '#E5E7EB',
                    color: active
                      ? 'white'
                      : tab.id === 'pending'
                        ? '#92400E'
                        : tab.id === 'escalated'
                          ? RED
                          : '#6B7280',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="px-4 space-y-3">
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
                style={{ backgroundColor: '#EBF4F8' }}
              >
                <BellIcon size={24} style={{ color: ACCENT }} />
              </div>
              <p className="text-sm font-semibold text-gray-700">No {activeStatus} alerts</p>
              <p className="text-xs text-gray-400 mt-1">
                {activeStatus === 'pending'
                  ? 'You\'re all caught up!'
                  : `No alerts have been ${activeStatus} yet.`}
              </p>
            </motion.div>
          ) : activeStatus === 'pending' ? (
            <motion.div
              key="pending-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {filtered.map(alert => (
                <PendingAlertCard key={alert.id} alert={alert} onAction={handleAction} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="compact-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {filtered.map(alert => (
                <CompactAlertCard key={alert.id} alert={alert} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
