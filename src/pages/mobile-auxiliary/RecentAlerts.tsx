import { useState, useEffect } from 'react';
import { HubConnectionBuilder } from '@microsoft/signalr';
import {
  BellIcon,
  ClockIcon,
} from 'lucide-react';
import { JustificationModal } from '../../components/JustificationModal';
import { Alert, AlertStatus, fetchAuxiliaryAlerts, updateAlertStatus } from '../../type/Alert';
import { AlertDetailView } from './AlertDetailView';

const ACCENT = '#0B4F6C';
const RED = '#D34026';

const SUB_TABS: { id: AlertStatus; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'verified', label: 'Verified' },
  { id: 'en_route', label: 'En Route' },
  { id: 'escalated', label: 'Escalated' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'dismissed', label: 'Dismissed' },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  dismissed: { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' },
  resolved: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  escalated: { bg: '#FEE2E2', text: '#7F1D1D', dot: '#EF4444' },
  en_route: { bg: '#EFF6FF', text: '#1E3A8A', dot: '#3B82F6' },
  verified: { bg: '#F0FBF6', text: '#2D7A5D', dot: '#4ADE80' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' };
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
      {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
    </span>
  );
}

function AlertCard({
  alert,
  onAction,
  onClick,
}: {
  alert: Alert;
  onAction: (id: string, action: AlertStatus) => void;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden active:bg-gray-50 transition-colors"
    >
      <div className="flex">
        {/* Left status indicator */}
        <div className="w-1.5 self-stretch" style={{ backgroundColor: STATUS_STYLES[alert.status]?.dot || '#E5E7EB' }} />

        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-gray-900">
                  T.{alert.trainId} · C.{alert.coachId}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-gray-100 text-gray-500 uppercase">
                  {alert.station}
                </span>
              </div>

              <div className="mt-2">
                <p className="text-sm font-bold text-gray-800 leading-tight">{alert.type}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px] font-medium text-gray-400 flex items-center gap-1">
                    <ClockIcon size={10} />
                    {alert.time} ({alert.elapsed}m ago)
                  </span>
                  {alert.source === 'ai' ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF2F0] text-[#D34026]">
                      AI Detected
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]">
                      Passenger Reported
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <StatusBadge status={alert.status} />
            </div>
          </div>

          {/* Dynamic Actions based on status */}
          {(() => {
            if (alert.status === 'pending' || alert.status === 'verified' || alert.status === 'escalated') {
              return (
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-50">
                  <button
                    onClick={(e) => { e.stopPropagation(); onAction(alert.id, 'en_route'); }}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: ACCENT }}
                  >
                    En Route
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAction(alert.id, 'resolved'); }}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#2D7A5D' }}
                  >
                    Resolve
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAction(alert.id, 'dismissed'); }}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: RED }}
                  >
                    Dismiss
                  </button>
                </div>
              );
            }
            if (alert.status === 'en_route') {
              return (
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-50">
                  <button
                    onClick={(e) => { e.stopPropagation(); onAction(alert.id, 'resolved'); }}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#2D7A5D' }}
                  >
                    Resolve
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAction(alert.id, 'dismissed'); }}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: RED }}
                  >
                    Dismiss
                  </button>
                </div>
              );
            }
            return null;
          })()}
        </div>
      </div>
    </div>
  );
}


export function RecentAlerts({ assignedStationId, userName, token }: { assignedStationId?: string, userName: string, token?: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeStatus, setActiveStatus] = useState<AlertStatus>('pending');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    action: AlertStatus | null;
    alertId: string | null;
    alertCoach: number | string;
  }>({ isOpen: false, action: null, alertId: null, alertCoach: '' });

  useEffect(() => {
    if (!assignedStationId) {
      setAlerts([]);
      return;
    }

    const load = () => {
      fetchAuxiliaryAlerts(assignedStationId, token)
        .then(data => { setAlerts(data); })
        .catch(err => { console.error('Failed to fetch alerts', err); });
    };

    load();

    const connection = new HubConnectionBuilder()
      .withUrl(`${import.meta.env.VITE_API_BASE}/hubs/alerts`, { withCredentials: true })
      .withAutomaticReconnect()
      .build();

    connection.on('IncidentStatusChanged', load);
    connection.on('NewIncident', load);
    connection.start().catch(console.error);

    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      connection.stop();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [assignedStationId, token]);

  const handleAction = async (id: string, action: AlertStatus) => {
    const alert = alerts.find(a => a.id === id);
    if (!alert) return;
    setModalConfig({
      isOpen: true,
      action,
      alertId: id,
      alertCoach: alert.coachId,
    });
  };

  const confirmAction = async (comment: string) => {
    const { action, alertId } = modalConfig;
    if (!action || !alertId) return;

    setModalConfig(prev => ({ ...prev, isOpen: false }));

    const localNow = new Date();
    const datePart = localNow.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const timePart = localNow.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); // HH:mm
    const now = `${datePart} ${timePart}`;

    // Optimistic update
    setAlerts(prev => prev.map(a => {
      if (a.id === alertId) {
        const update: Partial<Alert> = { status: action };
        if (action === 'en_route') {
          update.enrouteBy = userName;
          update.enrouteAt = now;
        } else if (action === 'resolved') {
          update.resolvedBy = userName;
          update.resolvedAt = now;
          update.resolvedComment = comment;
        } else if (action === 'dismissed') {
          update.dismissedBy = userName;
          update.dismissedAt = now;
          update.dismissedComment = comment;
        } else if (action === 'escalated') {
          update.escalatedBy = userName;
          update.escalatedAt = now;
          update.escalatedComment = comment;
        }
        return { ...a, ...update };
      }
      return a;
    }));

    if (selectedAlert?.id === alertId) {
      const update: Partial<Alert> = { status: action };
      if (action === 'en_route') {
        update.enrouteBy = userName;
        update.enrouteAt = now;
      } else if (action === 'resolved') {
        update.resolvedBy = userName;
        update.resolvedAt = now;
        update.resolvedComment = comment;
      } else if (action === 'dismissed') {
        update.dismissedBy = userName;
        update.dismissedAt = now;
        update.dismissedComment = comment;
      } else if (action === 'escalated') {
        update.escalatedBy = userName;
        update.escalatedAt = now;
        update.escalatedComment = comment;
      }
      setSelectedAlert({
        ...selectedAlert,
        ...update
      });
    }

    try {
      await updateAlertStatus(alertId, action, comment, token, 'auxiliary');
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const counts: Record<string, number> = {
    pending: alerts.filter(a => a.status === 'pending').length,
    escalated: alerts.filter(a => a.status === 'escalated').length,
    en_route: alerts.filter(a => a.status === 'en_route').length,
    resolved: alerts.filter(a => a.status === 'resolved').length,
    dismissed: alerts.filter(a => a.status === 'dismissed').length,
    verified: alerts.filter(a => a.status === 'verified').length,
  };

  const filtered = alerts.filter(a => a.status === activeStatus);

  const renderModal = () => (
    <JustificationModal
      isOpen={modalConfig.isOpen}
      actionType={
        modalConfig.action === 'resolved' ? 'resolve' :
          modalConfig.action === 'dismissed' ? 'dismiss' :
            modalConfig.action === 'en_route' ? 'en_route' :
              modalConfig.action === 'escalated' ? 'escalate' : 'verify'
      }
      alertId={modalConfig.alertId || ''}
      alertCoach={modalConfig.alertCoach}
      isOptional={true}
      onConfirm={confirmAction}
      onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
    />
  );

  if (selectedAlert) {
    return (
      <div className="absolute inset-0 bg-[#FAF9F5] z-10 overflow-hidden flex flex-col h-full">
        <AlertDetailView
          alert={selectedAlert}
          onBack={() => setSelectedAlert(null)}
          onAction={handleAction}
        />
        {renderModal()}
      </div>
    );
  }

  return (
    <div
      className="h-full overflow-y-auto pb-6"
    >
      {/* Section header */}
      <div className="px-4 pt-5 pb-3">

        <h2 className="text-xl font-black text-gray-900 mb-1">Alerts</h2>
        <p className="text-sm text-gray-500">Incoming violation alerts</p>
      </div>

      {/* Sub-tab pills */}
      <div className="flex flex-wrap gap-2 px-4 pb-3">
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
                          : tab.id === 'en_route'
                            ? '#DBEAFE'
                            : '#E5E7EB',
                    color: active
                      ? 'white'
                      : tab.id === 'pending'
                        ? '#92400E'
                        : tab.id === 'escalated'
                          ? RED
                          : tab.id === 'en_route'
                            ? '#1E3A8A'
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
        {!assignedStationId ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: '#F3F4F6' }}>
              <BellIcon size={24} className="text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-600">No active shift</p>
            <p className="text-xs text-gray-400 mt-1">Alerts will appear here once you are on duty at a station.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div
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
          </div>
        ) : (
          <div
            key="alert-list"
            className="space-y-3"
          >
            {filtered.map(alert => (
              <AlertCard key={alert.id} alert={alert} onAction={handleAction} onClick={() => setSelectedAlert(alert)} />
            ))}
          </div>
        )}
      </div>

      {renderModal()}
    </div>
  );
}
