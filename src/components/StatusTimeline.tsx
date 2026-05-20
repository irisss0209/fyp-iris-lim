export interface TimelineStep {
  label: string;
  by?: string | null;
  at?: string | null;
  comment?: string | null;
  color: string;
}

export interface TimelineSource {
  source: string;
  datetime: string;
  reportedBy?: string | null;
  passengerComment?: string | null;
  confidence?: number | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  verifiedComment?: string | null;
  enrouteBy?: string | null;
  enrouteAt?: string | null;
  enrouteComment?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  resolvedComment?: string | null;
  escalatedBy?: string | null;
  escalatedAt?: string | null;
  escalatedComment?: string | null;
  dismissedBy?: string | null;
  dismissedAt?: string | null;
  dismissedComment?: string | null;
}

export function buildTimelineSteps(inc: TimelineSource): TimelineStep[] {
  const isAI = inc.source === 'ai' || inc.source === 'AI Detection';
  const steps: TimelineStep[] = [
    {
      label: isAI ? 'Detected' : 'Reported',
      by: isAI ? 'AI System' : inc.reportedBy,
      at: inc.datetime,
      comment: !isAI && inc.passengerComment ? inc.passengerComment : undefined,
      color: isAI ? '#0B4F6C' : '#4A5568',
    },
  ];
  if (inc.verifiedBy || inc.verifiedAt)
    steps.push({ label: 'Verified', by: inc.verifiedBy, at: inc.verifiedAt, comment: inc.verifiedComment, color: '#1D4ED8' });
  if (inc.enrouteBy || inc.enrouteAt)
    steps.push({ label: 'En Route', by: inc.enrouteBy, at: inc.enrouteAt, comment: inc.enrouteComment, color: '#0B4F6C' });
  if (inc.escalatedBy || inc.escalatedAt)
    steps.push({ label: 'Escalated', by: inc.escalatedBy, at: inc.escalatedAt, comment: inc.escalatedComment, color: '#D34026' });
  if (inc.resolvedBy || inc.resolvedAt)
    steps.push({ label: 'Resolved', by: inc.resolvedBy, at: inc.resolvedAt, comment: inc.resolvedComment, color: '#2D7A5D' });
  if (inc.dismissedBy || inc.dismissedAt)
    steps.push({ label: 'Dismissed', by: inc.dismissedBy, at: inc.dismissedAt, comment: inc.dismissedComment, color: '#4A5568' });
  return steps;
}

import { formatTime } from '../utils/Time';
import { useTime } from '../context/TimeContext';

export function StatusTimeline({ steps }: { steps: TimelineStep[] }) {
  const { format } = useTime();
  return (
    <div className="flex gap-0 flex-wrap">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start flex-1 min-w-0">
          <div className="flex flex-col items-center mr-2 mt-1 flex-shrink-0">
            <div
              className="w-3 h-3 rounded-full border-2 border-white flex-shrink-0"
              style={{ backgroundColor: step.color, boxShadow: `0 0 0 2px ${step.color}40` }}
            />
            {i < steps.length - 1 && (
              <div className="flex-1 w-px mt-1" style={{ backgroundColor: '#E2E8F0', minHeight: 16 }} />
            )}
          </div>
          <div className="min-w-0 pr-4 pb-2">
            <div className="text-[11px] font-bold" style={{ color: step.color }}>{step.label}</div>
            {step.at && <div className="text-[10px] text-gray-400 mt-0.5">{formatTime(step.at, format)}</div>}
            {step.by && <div className="text-[10px] text-gray-600 font-medium mt-0.5">by {step.by}</div>}
            {step.comment != null && (
              <div className="text-[10px] text-gray-500 mt-1 italic bg-white rounded px-2 py-1 border border-gray-100">
                "{step.comment}"
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
