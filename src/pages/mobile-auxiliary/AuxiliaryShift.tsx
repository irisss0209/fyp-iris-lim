import { useState, useEffect } from 'react';
import { ClockIcon, MapPinIcon } from 'lucide-react';
import { getMYTDateStr } from '../../utils/myt';
import { formatClockTime } from '../../utils/Time';
import { useTime } from '../../context/TimeContext';

const ACCENT = '#0B4F6C';

interface ShiftData {
  active: boolean;
  onDuty?: boolean;
  station?: string;
  stationId?: string;
  shiftStart?: string;
  shiftEnd?: string;
  shiftDate?: string;
}

export interface AuxiliaryShiftProps {
  userId: string;
  token?: string;
  onStationDetected?: (stationId: string | undefined) => void;
}

export function AuxiliaryShift({ userId, token, onStationDetected }: AuxiliaryShiftProps) {
  const { format } = useTime();
  const [shift, setShift] = useState<ShiftData | null>(null);

  useEffect(() => {
    if (!userId) {
      onStationDetected?.(undefined);
      return;
    }
    fetch(`${import.meta.env.VITE_API_BASE}/api/data/auxiliary/shift?userId=${userId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include'
    })
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

  if (!shift || !shift.active) {
    return (
      <div className="mx-4 mb-2">
        <div
          className="rounded-xl px-4 py-2.5 flex items-center gap-2.5"
          style={{ backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB' }}
        >
          <ClockIcon size={14} className="text-gray-400 flex-shrink-0" />
          <span className="text-xs font-medium text-gray-400">No shifts assigned</span>
        </div>
      </div>
    );
  }

  const todayStr = getMYTDateStr();
  let statusLabel = "Upcoming Shift";
  if (shift.onDuty) {
    statusLabel = "Active Shift";
  } else if (shift.shiftDate && shift.shiftDate < todayStr) {
    statusLabel = "Previous Shift";
  } else if (shift.shiftDate && shift.shiftDate === todayStr) {
    const [h, m] = (shift.shiftEnd || "00:00").split(':').map(Number);
    const nowMYT = new Date(Date.now() + 8 * 3600_000);
    if (nowMYT.getUTCHours() * 60 + nowMYT.getUTCMinutes() > h * 60 + m) statusLabel = "Completed Shift";
  }

  const formattedDate = shift.shiftDate
    ? new Date(shift.shiftDate + 'T00:00+08:00').toLocaleDateString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', weekday: 'short', day: 'numeric', month: 'short' })
    : '';

  return (
    <div className="mx-4 mb-2">
      <div
        className="rounded-2xl p-4 flex flex-col gap-3"
        style={{
          background: shift.onDuty
            ? ` #0B4F6C`
            : '#FFFFFF',
          border: shift.onDuty ? 'none' : '1px solid #E5E7EB',
        }}
      >
        {/* Top row: Label and Date */}
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-black uppercase tracking-widest"
            style={{ color: shift.onDuty ? 'rgba(255,255,255,0.7)' : '#94A3B8' }}
          >
            {statusLabel}
          </span>
          <span
            className="text-xs font-bold"
            style={{ color: shift.onDuty ? 'white' : ACCENT }}
          >
            {formattedDate}
          </span>
        </div>

        {/* Content row: Times and Station */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: shift.onDuty ? 'rgba(255,255,255,0.1)' : '#F1F5F9' }}
            >
              <ClockIcon
                size={14}
                style={{ color: shift.onDuty ? 'white' : ACCENT }}
              />
            </div>
            <span
              className="text-sm font-black"
              style={{ color: shift.onDuty ? 'white' : '#1E293B' }}
            >
              {formatClockTime(shift.shiftStart ?? '', format)} – {formatClockTime(shift.shiftEnd ?? '', format)}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-black/5 rounded-lg px-2.5 py-1.5">
            <MapPinIcon
              size={12}
              style={{ color: shift.onDuty ? 'white' : '#64748B' }}
            />
            <span
              className="text-xs font-bold"
              style={{ color: shift.onDuty ? 'white' : '#64748B' }}
            >
              {shift.station}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
