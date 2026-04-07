import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircleIcon, FlagIcon, ClockIcon, TrainIcon } from 'lucide-react';
import { JustificationModal } from './JustificationModal';
export type Alert = {
  id: string;
  coachId: string;
  line: string;
  lineColor: string;
  timestamp: string;
  location: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
};
type ActiveAlertProps = {
  alert: Alert;
  onVerify?: (id: string, comment: string) => void;
  onDismiss?: (id: string, comment: string) => void;
  onResolve: (id: string) => void;
  onFlag: (id: string) => void;
  queueLength: number;
};
export function ActiveAlert({
  alert,
  onVerify,
  onDismiss,
  onResolve,
  onFlag,
  queueLength
}: ActiveAlertProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    'verify' | 'dismiss' | null>(
    null);
  const handleVerifyClick = () => {
    setPendingAction('verify');
    setModalOpen(true);
  };
  const handleDismissClick = () => {
    setPendingAction('dismiss');
    setModalOpen(true);
  };
  const handleModalConfirm = (comment: string) => {
    setModalOpen(false);
    if (pendingAction === 'verify') {
      onVerify?.(alert.id, comment);
    } else if (pendingAction === 'dismiss') {
      onDismiss?.(alert.id, comment);
    }
    setPendingAction(null);
  };
  const handleModalCancel = () => {
    setModalOpen(false);
    setPendingAction(null);
  };
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={alert.id}
        initial={{
          opacity: 0,
          y: 8
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
        exit={{
          opacity: 0,
          y: -8
        }}
        transition={{
          duration: 0.22,
          ease: 'easeOut'
        }}
        className="w-full"
        role="main"
        aria-label="Active alert requiring action">

        {/* Alert card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
          {/* Severity stripe */}
          <div
            className="h-1 w-full"
            style={{
              backgroundColor:
              alert.severity === 'high' ?
              '#D34026' :
              alert.severity === 'medium' ?
              '#D97706' :
              '#2D7A5D'
            }}
            aria-hidden="true" />


          <div className="p-8">
            {/* Header row */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded"
                    style={{
                      backgroundColor:
                      alert.severity === 'high' ?
                      '#FEF2F2' :
                      alert.severity === 'medium' ?
                      '#FFFBEB' :
                      '#F0FDF4',
                      color:
                      alert.severity === 'high' ?
                      '#D34026' :
                      alert.severity === 'medium' ?
                      '#D97706' :
                      '#2D7A5D'
                    }}>

                    {alert.severity} priority
                  </span>
                </div>
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                  Coach {alert.coachId}
                </h1>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex items-center gap-1.5">
                    <TrainIcon size={13} className="text-[#4A5568]" />
                    <span className="text-sm text-[#4A5568]">
                      Line{' '}
                      <span
                        className="font-semibold"
                        style={{
                          color: alert.lineColor
                        }}>

                        {alert.line}
                      </span>
                    </span>
                  </div>
                  <span className="text-[#CBD5E0]">·</span>
                  <span className="text-sm text-[#4A5568]">
                    {alert.location}
                  </span>
                </div>
              </div>

              {/* Timestamp */}
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-1.5 justify-end text-[#4A5568]">
                  <ClockIcon size={13} />
                  <span className="text-sm font-medium tabular-nums">
                    {alert.timestamp}
                  </span>
                </div>
                <div className="text-xs text-[#A0AEC0] mt-0.5">
                  Alert received
                </div>
              </div>
            </div>

            {/* Content area: thumbnail + description */}
            <div className="flex gap-6 mb-8">
              {/* Anonymized thumbnail placeholder */}
              <div
                className="flex-shrink-0 w-36 h-28 rounded-xl overflow-hidden border border-[#E2E8F0] flex flex-col items-center justify-center gap-2"
                style={{
                  backgroundColor: '#F7FAFC'
                }}
                role="img"
                aria-label="Anonymized camera feed thumbnail">

                {/* Silhouette placeholder */}
                <div className="relative">
                  <div
                    className="w-8 h-8 rounded-full"
                    style={{
                      backgroundColor: '#CBD5E0'
                    }} />

                  <div
                    className="w-12 h-7 rounded-t-full mt-1"
                    style={{
                      backgroundColor: '#CBD5E0'
                    }} />

                </div>
                <span className="text-[10px] font-medium text-[#A0AEC0] uppercase tracking-wider">
                  Anonymized
                </span>
              </div>

              {/* Description */}
              <div className="flex-1">
                <p className="text-[13px] font-medium text-[#4A5568] uppercase tracking-wider mb-2">
                  Incident Description
                </p>
                <p className="text-base text-gray-800 leading-relaxed">
                  {alert.description}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleVerifyClick}
                className="flex-1 flex items-center justify-center gap-2.5 py-4 rounded-xl text-white font-semibold text-base transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98]"
                style={{
                  backgroundColor: '#0B4F6C',
                  focusRingColor: '#0B4F6C'
                }}
                onMouseEnter={(e) => {
                  ;(
                  e.currentTarget as HTMLButtonElement).
                  style.backgroundColor = '#0a4460';
                }}
                onMouseLeave={(e) => {
                  ;(
                  e.currentTarget as HTMLButtonElement).
                  style.backgroundColor = '#0B4F6C';
                }}
                aria-label={`Verify and resolve alert for Coach ${alert.coachId}`}>

                <CheckCircleIcon size={20} />
                Verify &amp; Resolve
              </button>

              <button
                onClick={() => onFlag(alert.id)}
                className="flex-1 flex items-center justify-center gap-2.5 py-4 rounded-xl font-semibold text-base transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98]"
                style={{
                  backgroundColor: '#FEF2F2',
                  color: '#D34026',
                  border: '1.5px solid #FECACA'
                }}
                onMouseEnter={(e) => {
                  ;(
                  e.currentTarget as HTMLButtonElement).
                  style.backgroundColor = '#FEE2E2';
                }}
                onMouseLeave={(e) => {
                  ;(
                  e.currentTarget as HTMLButtonElement).
                  style.backgroundColor = '#FEF2F2';
                }}
                aria-label={`Flag violation for Coach ${alert.coachId}`}>

                <FlagIcon size={20} />
                Flag Violation
              </button>
            </div>
          </div>
        </div>

        {/* Queue context */}
        {queueLength > 0 &&
        <p className="text-center text-xs text-[#A0AEC0] mt-3">
            {queueLength} more alert{queueLength !== 1 ? 's' : ''} in queue
          </p>
        }
      </motion.div>

      <JustificationModal
        isOpen={modalOpen}
        actionType={pendingAction ?? 'verify'}
        alertId={alert.id}
        alertCoach={alert.coachId}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel} />

    </AnimatePresence>);

}