import { useState, useEffect } from 'react';
import { ClockIcon, MapPinIcon } from 'lucide-react';

const ACCENT = '#0B4F6C';

interface ShiftData {
  active: boolean;
  onDuty?: boolean;
  station?: string;
  stationId?: string;
  shiftStart?: string;
  shiftEnd?: string;
}

export interface AuxiliaryShiftProps {
  userId: string;
  onStationDetected?: (stationId: string | undefined) => void;
}

export function AuxiliaryShift({ userId, onStationDetected }: AuxiliaryShiftProps) {
  const [shift, setShift] = useState<ShiftData | null>(null);

  useEffect(() => {
    if (!userId) {
      onStationDetected?.(undefined);
      return;
    }
    fetch(`http://localhost:5293/api/data/auxiliary/shift?userId=${userId}`)
      .then(res => res.json())
      .then(data => {
        setShift(data);
        if (data.active && data.onDuty) {
          onStationDetected?.(data.stationId);
        } else {
          onStationDetected?.(undefined);
        }
      })
      .catch(() => {
        setShift(null);
        onStationDetected?.(undefined);
      });
  }, [userId, onStationDetected]);

  // No shift data or no active shift → show a subtle "off duty" banner
  if (!shift || !shift.active) {
    return (
      <div className="mx-4 mb-2">
        <div
          className="rounded-xl px-4 py-2.5 flex items-center gap-2.5"
          style={{ backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB' }}
        >
          <ClockIcon size={14} className="text-gray-400 flex-shrink-0" />
          <span className="text-xs font-medium text-gray-400">No active shift assigned</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 mb-2">
      <div
        className="rounded-xl px-4 py-2.5 flex items-center justify-between"
        style={{
          background: shift.onDuty
            ? `linear-gradient(135deg, ${ACCENT}, #0d6b8f)`
            : '#EBF4F8',
          border: shift.onDuty ? 'none' : '1px solid #D0E8F2',
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {shift.onDuty && (
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
          )}
          <ClockIcon
            size={14}
            className="flex-shrink-0"
            style={{ color: shift.onDuty ? 'rgba(255,255,255,0.7)' : ACCENT }}
          />
          <span
            className="text-xs font-semibold truncate"
            style={{ color: shift.onDuty ? 'white' : '#1A202C' }}
          >
            {shift.shiftStart} – {shift.shiftEnd}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          <MapPinIcon
            size={11}
            style={{ color: shift.onDuty ? 'rgba(255,255,255,0.6)' : '#4A5568' }}
          />
          <span
            className="text-[10px] font-medium"
            style={{ color: shift.onDuty ? 'rgba(255,255,255,0.8)' : '#4A5568' }}
          >
            {shift.station}
          </span>
        </div>
      </div>
    </div>
  );
}