import React from 'react';
import { motion } from 'framer-motion';
import { ClockIcon, TrainIcon } from 'lucide-react';
import type { Alert } from './ActiveAlert';
type AlertQueueProps = {
  alerts: Alert[];
  onSelect: (id: string) => void;
};
export function AlertQueue({ alerts, onSelect }: AlertQueueProps) {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-8">
        <div
          className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-3"
          style={{
            backgroundColor: '#F0FDF4'
          }}>

          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M3 9l4.5 4.5L15 5"
              stroke="#2D7A5D"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round" />

          </svg>
        </div>
        <p className="text-sm text-[#4A5568]">Queue clear</p>
        <p className="text-xs text-[#A0AEC0] mt-0.5">No pending alerts</p>
      </div>);

  }
  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#A0AEC0]">
          Upcoming Queue
        </h2>
        <span className="text-[11px] font-medium text-[#4A5568]">
          {alerts.length} pending
        </span>
      </div>

      <div className="space-y-1.5" role="list" aria-label="Alert queue">
        {alerts.map((alert, index) =>
        <motion.button
          key={alert.id}
          initial={{
            opacity: 0,
            x: -4
          }}
          animate={{
            opacity: 1,
            x: 0
          }}
          transition={{
            delay: index * 0.04,
            duration: 0.18
          }}
          onClick={() => onSelect(alert.id)}
          role="listitem"
          className="w-full text-left flex items-center gap-4 px-4 py-3 rounded-xl border border-transparent transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#0B4F6C] focus:ring-offset-1 group"
          style={{
            backgroundColor: '#FFFFFF'
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.borderColor =
            '#E2E8F0';
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.borderColor =
            'transparent';
          }}
          aria-label={`Alert for Coach ${alert.coachId}, Line ${alert.line}`}>

            {/* Queue position */}
            <span className="text-xs font-medium text-[#CBD5E0] w-4 flex-shrink-0 tabular-nums">
              {index + 1}
            </span>

            {/* Severity dot */}
            <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              backgroundColor:
              alert.severity === 'high' ?
              '#D34026' :
              alert.severity === 'medium' ?
              '#D97706' :
              '#2D7A5D'
            }}
            aria-hidden="true" />


            {/* Coach + line */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-800">
                  Coach {alert.coachId}
                </span>
                <div className="flex items-center gap-1 text-[#4A5568]">
                  <TrainIcon size={11} />
                  <span
                  className="text-xs font-semibold"
                  style={{
                    color: alert.lineColor
                  }}>

                    {alert.line}
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#A0AEC0] truncate mt-0.5">
                {alert.description}
              </p>
            </div>

            {/* Timestamp */}
            <div className="flex items-center gap-1 text-[#A0AEC0] flex-shrink-0">
              <ClockIcon size={11} />
              <span className="text-xs tabular-nums">{alert.timestamp}</span>
            </div>
          </motion.button>
        )}
      </div>
    </div>);

}