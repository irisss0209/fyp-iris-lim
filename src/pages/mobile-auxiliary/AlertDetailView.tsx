import { motion } from 'framer-motion';
import {
  CameraIcon,
  UserIcon,
  ChevronLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  MapPinIcon,
  ClockIcon,
  AlertTriangleIcon,
} from 'lucide-react';

const ACCENT = '#0B4F6C';

export interface DetailAlert {
  id: string;
  coach: string;
  coachId: string;
  door: string;
  deviceId?: string;
  line: string;
  lineId: string;
  station: string;
  platform: string;
  time: string;
  date: string;
  elapsed: number;
  severity: 'high' | 'medium';
  status: 'pending' | 'resolved' | 'dismissed' | 'escalated' | 'en_route';
  type: string;
  snapshotUrl?: string;
  source: 'ai' | 'passenger';
  confidence?: number;
  passengerComment?: string;
  // Audit trail
  verifiedBy?: string;
  verifiedAt?: string;
  verifiedComment?: string;
  escalatedBy?: string;
  escalatedAt?: string;
  escalatedComment?: string;
  enrouteBy?: string;
  enrouteAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolvedComment?: string;
  dismissedBy?: string;
  dismissedAt?: string;
  dismissedComment?: string;
}

interface AlertDetailViewProps {
  alert: DetailAlert;
  onBack: () => void;
  onAction: (id: string, action: 'resolved' | 'dismissed' | 'escalated' | 'en_route') => void;
}

export function AlertDetailView({ alert, onBack, onAction }: AlertDetailViewProps) {
  const steps: { label: string, by?: string, at?: string, comment?: string, color: string, bg: string }[] = [];

  if (alert.verifiedAt || alert.verifiedBy)
    steps.push({ label: 'Verified', by: alert.verifiedBy, at: alert.verifiedAt, comment: alert.verifiedComment, color: '#2D7A5D', bg: '#F0FBF6' });
  if (alert.escalatedAt || alert.escalatedBy)
    steps.push({ label: 'Escalated', by: alert.escalatedBy, at: alert.escalatedAt, comment: alert.escalatedComment, color: '#7B5EA7', bg: '#F5F0FF' });
  if (alert.enrouteAt || alert.enrouteBy)
    steps.push({ label: 'En Route', by: alert.enrouteBy, at: alert.enrouteAt, color: '#0B4F6C', bg: '#EFF6FF' });
  if (alert.resolvedAt || alert.resolvedBy)
    steps.push({ label: 'Resolved', by: alert.resolvedBy, at: alert.resolvedAt, comment: alert.resolvedComment, color: '#1D4ED8', bg: '#EBF8FF' });
  if (alert.dismissedAt || alert.dismissedBy)
    steps.push({ label: 'Dismissed', by: alert.dismissedBy, at: alert.dismissedAt, comment: alert.dismissedComment, color: '#718096', bg: '#F7FAFC' });

  return (
    <motion.div
      key="detail-view"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex flex-col h-full bg-white relative z-10"
    >
      {/* ── Top Header ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-shrink-0 bg-white">
        <button
          onClick={onBack}
          className="p-1.5 hover:bg-gray-100 rounded-lg -ml-1 transition-colors"
        >
          <ChevronLeftIcon className="w-5 h-5 text-gray-700" />
        </button>
        <div>
          <h2 className="font-bold text-sm text-gray-900 leading-tight">
            Case Detail <span className="text-xs font-mono text-gray-400 font-normal">({alert.id})</span>
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            {alert.source === 'ai' ? (
              <span className="text-[11px] font-bold text-[#D34026]">
                AI Detected {alert.confidence !== undefined ? `· ${alert.confidence}%` : ''}
              </span>
            ) : (
              <span className="text-[11px] font-bold text-[#92400E]">Passenger Report</span>
            )}
            <span className="text-gray-300">·</span>
            <span className="text-[11px] uppercase tracking-wide font-bold" style={{ color: ACCENT }}>{alert.status}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 custom-scrollbar">
        {/* ── Snapshot / Image ── */}
        <div className="bg-gray-900 w-full" style={{ aspectRatio: '16/9' }}>
          {alert.snapshotUrl ? (
            <img src={alert.snapshotUrl} alt="Snapshot" className="w-full h-full object-cover opacity-85" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              {alert.source === 'ai' ? (
                <>
                  <CameraIcon className="w-10 h-10 text-white/30" />
                  <span className="text-white/40 text-xs font-medium">CCTV Snapshot</span>
                  <span className="text-white/25 text-[10px]">{alert.deviceId ?? '—'}</span>
                </>
              ) : (
                <>
                  <UserIcon className="w-10 h-10 text-white/30" />
                  <span className="text-white/40 text-xs font-medium">Passenger Image</span>
                  <span className="text-white/25 text-[10px]">No photo attached</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Details Body ── */}
        <div className="p-4 space-y-4">
          
          <h3 className="font-bold text-gray-900 text-lg leading-tight">{alert.type}</h3>

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Location', value: `${alert.station} · ${alert.line}`, icon: <MapPinIcon size={12} className="text-gray-400" /> },
              { label: 'Time & Date', value: `${alert.time} · ${alert.date}`, icon: <ClockIcon size={12} className="text-gray-400" /> },
              { label: 'Coach ID', value: alert.coachId, icon: null },
              ...(alert.source === 'ai'
                ? [{ label: 'Device ID', value: alert.deviceId ?? alert.door, icon: null }]
                : []),
            ].map(item => (
              <div key={item.label} className="bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                <div className="flex items-center gap-1 text-gray-400 text-[10px] mb-1 font-semibold uppercase tracking-wide">
                  {item.icon} {item.label}
                </div>
                <div className="font-bold text-xs text-gray-900 leading-tight">{item.value}</div>
              </div>
            ))}
          </div>

          {/* Passenger Review */}
          {alert.source === 'passenger' && alert.passengerComment && (
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 shadow-sm">
              <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Passenger Remarks</div>
              <p className="text-xs text-amber-900 leading-relaxed bg-white/50 p-2 rounded-lg mt-1 border border-amber-100/50">
                "{alert.passengerComment}"
              </p>
            </div>
          )}

          {/* Audit trail */}
          {steps.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 pl-1">Audit Trail</div>
              <div className="space-y-2">
                {steps.map(s => (
                  <div key={s.label} className="rounded-xl px-3 py-3 border border-white/50 shadow-sm" style={{ backgroundColor: s.bg }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold" style={{ color: s.color }}>{s.label} By: {s.by ? s.by : 'Network'}</span>
                      {s.at && <span className="text-[10px] font-medium opacity-70" style={{ color: s.color }}>{s.at}</span>}
                    </div>
                    <div className="mt-1.5 text-[11px] italic bg-white/40 p-2 rounded-lg border-l-2" style={{ borderColor: s.color, color: s.color }}>
                      {s.comment ? `"${s.comment}"` : 'No additional remarks.'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Actions Fixed Bottom ── */}
      {alert.status === 'pending' || alert.status === 'escalated' || alert.status === 'en_route' ? (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          {(alert.status === 'pending' || alert.status === 'escalated') && (
             <button
             onClick={() => onAction(alert.id, 'en_route')}
             className="w-full mb-2 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
             style={{ backgroundColor: '#DBEAFE', color: '#1E3A8A', border: `1px solid #BFDBFE` }}
           >
             <AlertTriangleIcon className="w-4 h-4" /> En Route
           </button>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => onAction(alert.id, 'resolved')}
              className="flex-[2] py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm shadow-[#0B4F6C]/20"
              style={{ backgroundColor: '#0B4F6C' }}
            >
              <CheckCircleIcon className="w-5 h-5" /> Resolve
            </button>
            <button
              onClick={() => onAction(alert.id, 'dismissed')}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 border border-gray-200 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
            >
              <XCircleIcon className="w-4 h-4 text-gray-400" /> Dismiss
            </button>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
