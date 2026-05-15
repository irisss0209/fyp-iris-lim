import { useState } from 'react';
import {
  CameraIcon,
  ChevronLeftIcon,
  XIcon,
} from 'lucide-react';
import { Alert, AlertStatus } from '../../type/Alert';

const ACCENT = '#0B4F6C';
const RED = '#D34026';

interface AlertDetailViewProps {
  alert: Alert;
  onBack: () => void;
  onAction: (id: string, action: AlertStatus) => void;
}

export function AlertDetailView({ alert, onBack, onAction }: AlertDetailViewProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const steps: { label: string, by?: string | null, at?: string | null, comment?: string | null, color: string, bg: string }[] = [];

  // ── 1. Initial Report ──
  if (alert.source === 'ai') {
    steps.push({
      label: 'Detected',
      by: 'System (AI Analytics)',
      at: `${alert.date} ${alert.time}`,
      comment: alert.confidence ? `Confidence Level: ${(alert.confidence * 100).toFixed(1)}%` : 'Confidence data unavailable',
      color: '#92400E',
      bg: '#FEF3C7'
    });
  } else {
    steps.push({
      label: 'Reported',
      by: alert.reportedBy || 'Passenger',
      at: `${alert.date} ${alert.time}`,
      comment: alert.passengerComment || 'No additional remarks provided.',
      color: '#92400E',
      bg: '#FEF3C7'
    });
  }

  // ── 2. Handling Steps ──
  if (alert.verifiedAt || alert.verifiedBy)
    steps.push({ label: 'Verified', by: alert.verifiedBy, at: alert.verifiedAt, comment: alert.verifiedComment, color: '#2D7A5D', bg: '#F0FBF6' });
  if (alert.escalatedAt || alert.escalatedBy)
    steps.push({ label: 'Escalated', by: alert.escalatedBy, at: alert.escalatedAt, comment: alert.escalatedComment, color: '#7B5EA7', bg: '#F5F0FF' });
  if (alert.enrouteAt || alert.enrouteBy)
    steps.push({ label: 'En Route', by: alert.enrouteBy, at: alert.enrouteAt, comment: alert.enrouteComment, color: '#0B4F6C', bg: '#EFF6FF' });
  if (alert.resolvedAt || alert.resolvedBy)
    steps.push({ label: 'Resolved', by: alert.resolvedBy, at: alert.resolvedAt, comment: alert.resolvedComment, color: '#1D4ED8', bg: '#EBF8FF' });
  if (alert.dismissedAt || alert.dismissedBy)
    steps.push({ label: 'Dismissed', by: alert.dismissedBy, at: alert.dismissedAt, comment: alert.dismissedComment, color: '#718096', bg: '#F7FAFC' });

  return (
    <div className="flex flex-col h-full  relative z-10">
      {/* ── Header ── */}
      <div className="bg-white flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0 ">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
          >
            <ChevronLeftIcon className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <h2 className="font-semibold text-sm text-gray-900 leading-tight">
              Alert Detail <span className="text-xs font-mono text-gray-400 font-normal">({alert.id})</span>
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                style={{
                  backgroundColor: alert.status === 'pending' ? '#FEF3C7' : alert.status === 'verified' ? '#F0FBF6' : '#F7FAFC',
                  color: alert.status === 'pending' ? '#92400E' : alert.status === 'verified' ? '#2D7A5D' : '#718096',
                }}
              >
                {alert.status}
              </span>
              <span className="text-gray-300">·</span>
              <span className="text-[10px] text-gray-400 font-medium">{alert.type}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar p-5 space-y-5 bg-[#faf9f5]">
        {/* ── Snapshot ── */}
        <div className="rounded-xl overflow-hidden bg-gray-900 shadow-sm border border-gray-100" style={{ aspectRatio: '21/9' }}>
          {alert.snapshotUrl || alert.imageUrl ? (
            <img
              src={alert.snapshotUrl || alert.imageUrl}
              alt="Snapshot"
              className="w-full h-full object-cover opacity-85 cursor-zoom-in active:opacity-100 transition-opacity"
              onClick={() => setLightboxUrl(alert.snapshotUrl || alert.imageUrl || null)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-6 text-center">
              <CameraIcon className="w-10 h-10 text-white/20" />
              <span className="text-white/40 text-xs font-medium">Snapshot unavailable</span>
              <span className="text-white/20 text-[10px]">Images are hidden for historical records</span>
            </div>
          )}
        </div>

        {/* ── Violation Details Grid ── */}
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Train ID', value: alert.trainId },
              { label: 'Coach ID', value: alert.coachId },
              { label: 'Line', value: alert.line },
              { label: 'Station', value: alert.station },
              { label: 'Date', value: alert.date },
              { label: 'Time', value: alert.time },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
                <div className="text-gray-400 text-[10px] mb-1 font-medium uppercase tracking-wide">{item.label}</div>
                <div className="font-bold text-xs text-gray-900 leading-tight">{item.value || '—'}</div>
              </div>
            ))}
          </div>


          {/* Audit Trail */}
          {steps.length > 0 && (
            <div className="space-y-3">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Audit Trail</div>
              <div className="space-y-2">
                {steps.map(s => (
                  <div key={s.label} className="rounded-xl px-4 py-3.5" style={{ backgroundColor: s.bg }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold" style={{ color: s.color }}>{s.label} By: {s.by || 'System'}</span>
                      {s.at && <span className="text-[10px] font-medium opacity-60" style={{ color: s.color }}>{s.at}</span>}
                    </div>
                    <div className="text-[11px] leading-relaxed italic text-gray-700 border-l-2 pl-3" style={{ borderColor: s.color + '40' }}>
                      {s.comment ? `"${s.comment}"` : 'No additional notes provided.'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Action Buttons (Scrollable) ── */}
          {(alert.status === 'pending' || alert.status === 'verified' || alert.status === 'escalated' || alert.status === 'en_route') && (
            <div className="pt-2 space-y-2">
              {alert.status !== 'en_route' && (
                <button
                  onClick={() => onAction(alert.id, 'en_route')}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
                  style={{ backgroundColor: ACCENT }}
                >
                  En Route
                </button>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => onAction(alert.id, 'resolved')}
                  className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
                  style={{ backgroundColor: '#2D7A5D' }}
                >
                  Resolve
                </button>
                <button
                  onClick={() => onAction(alert.id, 'dismissed')}
                  className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
                  style={{ backgroundColor: RED }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            <XIcon size={26} />
          </button>
          <img
            src={lightboxUrl}
            alt="Snapshot fullscreen"
            className="max-w-[95vw] max-h-[90vh] rounded-xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
