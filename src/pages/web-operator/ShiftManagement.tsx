import { useState, useEffect } from 'react';
import {
  PlusIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
  CalendarIcon,
  CheckCircleIcon,
  Trash2Icon,
  LoaderIcon,
} from 'lucide-react';

const ACCENT = '#0B4F6C';
const API = 'http://localhost:5293/api/data';

interface AuxUser {
  userId: string;
  userName: string;
}

interface Station {
  stationId: string;
  stationName: string;
}

interface ShiftRow {
  shiftId: number;
  userId: string;
  userName: string;
  stationId: string;
  stationName: string;
  shiftStart: string;
  shiftEnd: string;
}

export function ShiftManagement() {
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [auxUsers, setAuxUsers] = useState<AuxUser[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Form state
  const [formUserId, setFormUserId] = useState('');
  const [formStationId, setFormStationId] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('16:00');

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/auxiliary/shifts`).then(r => r.json()),
      fetch(`${API}/auxiliary/users`).then(r => r.json()),
      fetch(`${API}/auxiliary/stations`).then(r => r.json()),
    ])
      .then(([shiftsData, usersData, stationsData]) => {
        setShifts(shiftsData);
        setAuxUsers(usersData);
        setStations(stationsData);
      })
      .catch(err => console.error('Failed to fetch shift data', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUserId || !formStationId || !formDate || !formStartTime || !formEndTime) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/auxiliary/shifts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: formUserId,
          stationId: formStationId,
          shiftStart: `${formDate}T${formStartTime}:00`,
          shiftEnd: `${formDate}T${formEndTime}:00`,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || 'Failed to create shift');
        return;
      }

      showToast('Shift assigned successfully');
      setShowForm(false);
      setFormUserId('');
      setFormStationId('');
      setFormDate('');
      setFormStartTime('08:00');
      setFormEndTime('16:00');
      fetchAll();
    } catch {
      showToast('Server error. Is the backend running?');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (shiftId: number) => {
    try {
      await fetch(`${API}/auxiliary/shifts/${shiftId}`, { method: 'DELETE' });
      setShifts(prev => prev.filter(s => s.shiftId !== shiftId));
      showToast('Shift removed');
    } catch {
      showToast('Failed to delete shift');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="p-6" style={{ backgroundColor: '#FAF9F5', minHeight: '100%' }}>
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white"
          style={{ backgroundColor: ACCENT }}
        >
          <CheckCircleIcon size={16} />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1A202C' }}>Shift Management</h1>
          <p className="text-sm mt-0.5" style={{ color: '#4A5568' }}>Assign and manage auxiliary police shifts</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ backgroundColor: ACCENT }}
        >
          <PlusIcon size={16} />
          Assign Shift
        </button>
      </div>

      {/* Create shift form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <h3 className="text-sm font-bold mb-4" style={{ color: '#1A202C' }}>New Shift Assignment</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            {/* Officer */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#4A5568' }}>
                <UserIcon size={12} className="inline mr-1" />Officer
              </label>
              <select
                value={formUserId}
                onChange={e => setFormUserId(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/30 focus:border-[#0B4F6C]"
                style={{ color: '#1A202C' }}
              >
                <option value="">Select officer</option>
                {auxUsers.map(u => (
                  <option key={u.userId} value={u.userId}>{u.userName}</option>
                ))}
              </select>
            </div>

            {/* Station */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#4A5568' }}>
                <MapPinIcon size={12} className="inline mr-1" />Station
              </label>
              <select
                value={formStationId}
                onChange={e => setFormStationId(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/30 focus:border-[#0B4F6C]"
                style={{ color: '#1A202C' }}
              >
                <option value="">Select station</option>
                {stations.map(s => (
                  <option key={s.stationId} value={s.stationId}>{s.stationName}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#4A5568' }}>
                <CalendarIcon size={12} className="inline mr-1" />Date
              </label>
              <input
                type="date"
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
                min={todayStr}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/30 focus:border-[#0B4F6C]"
                style={{ color: '#1A202C' }}
              />
            </div>

            {/* Time range */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#4A5568' }}>
                <ClockIcon size={12} className="inline mr-1" />Time
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={formStartTime}
                  onChange={e => setFormStartTime(e.target.value)}
                  required
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/30"
                  style={{ color: '#1A202C' }}
                />
                <span className="text-xs text-gray-400 font-medium">to</span>
                <input
                  type="time"
                  value={formEndTime}
                  onChange={e => setFormEndTime(e.target.value)}
                  required
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/30"
                  style={{ color: '#1A202C' }}
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
                style={{ backgroundColor: ACCENT }}
              >
                {submitting ? <LoaderIcon size={14} className="animate-spin" /> : <PlusIcon size={14} />}
                {submitting ? 'Saving…' : 'Assign'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 border border-gray-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Shifts table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoaderIcon size={24} className="animate-spin text-gray-300" />
          </div>
        ) : shifts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: '#EBF4F8' }}>
              <CalendarIcon size={24} style={{ color: ACCENT }} />
            </div>
            <p className="text-sm font-semibold text-gray-700">No shifts assigned yet</p>
            <p className="text-xs text-gray-400 mt-1">Click "Assign Shift" to get started</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Officer', 'Station', 'Date', 'Shift Time', 'Actions'].map(h => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: '#4A5568' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {shifts.map(shift => (
                <tr key={shift.shiftId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: ACCENT }}
                      >
                        {shift.userName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium" style={{ color: '#1A202C' }}>{shift.userName}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{shift.userId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <MapPinIcon size={12} style={{ color: ACCENT }} />
                      <span className="text-sm" style={{ color: '#1A202C' }}>{shift.stationName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#4A5568' }}>
                    {new Date(shift.shiftStart).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono" style={{ color: '#1A202C' }}>
                      {new Date(shift.shiftStart).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      {' – '}
                      {new Date(shift.shiftEnd).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(shift.shiftId)}
                      className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 hover:underline transition-colors"
                    >
                      <Trash2Icon size={12} />
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
