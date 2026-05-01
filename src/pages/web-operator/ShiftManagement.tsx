import { useState, useEffect, useRef } from 'react';
import ExcelJS from 'exceljs';
import {
  CalendarIcon, CheckCircleIcon, Loader2Icon,
  DownloadIcon, UploadIcon, XCircleIcon, SearchIcon, XIcon
} from 'lucide-react';
import { useTime } from '../../context/TimeContext';
import { formatClockTime } from '../../utils/Time';

const ACCENT = '#0B4F6C';
const API = `${import.meta.env.VITE_API_BASE}/api/data`;

interface ShiftRow {
  shiftId: number;
  userId: string;
  userName: string;
  stationId: string;
  stationName: string;
  lineName?: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
}

function getShiftStatus(shift: ShiftRow): 'upcoming' | 'in_progress' | 'completed' {
  const now = new Date();
  const dateStr = shift.shiftDate.split('T')[0];
  const shiftStart = new Date(`${dateStr}T${shift.startTime}`);
  const shiftEnd = new Date(`${dateStr}T${shift.endTime}`);

  if (shiftEnd < shiftStart) {
    shiftEnd.setDate(shiftEnd.getDate() + 1); // Handle overnight shifts
  }

  if (now < shiftStart) return 'upcoming';
  if (now >= shiftStart && now <= shiftEnd) return 'in_progress';
  return 'completed';
}


export function ShiftManagementPanel() {
  const { format } = useTime();
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── filter state ──
  const [search, setSearch] = useState('');
  const [filterLine, setFilterLine] = useState('');
  const [filterStation, setFilterStation] = useState('');
  const [filterShift, setFilterShift] = useState<'all' | 'morning' | 'afternoon'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'in_progress' | 'completed'>('all');

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchShifts = () => {
    setLoading(true);
    const session = JSON.parse(localStorage.getItem('user_session') || '{}');
    fetch(`${API}/operator/shifts`, {
      headers: { Authorization: `Bearer ${session.token}` },
      credentials: 'include'
    })
      .then(r => r.json())
      .then(setShifts)
      .catch(() => showToast('Failed to load shifts', false))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchShifts(); }, []);

  // ── derived filter options ──
  const uniqueLines = [...new Set(shifts.map(s => s.lineName).filter(Boolean))] as string[];
  const uniqueStations = [...new Set(
    shifts
      .filter(s => !filterLine || s.lineName === filterLine)
      .map(s => s.stationName)
  )];

  // ── filtering logic ──
  const filtered = shifts.filter(s => {
    const q = search.toLowerCase();
    const displayDate = new Date(s.shiftDate).toLocaleDateString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).toLowerCase()
    const matchesSearch =
      !q ||
      s.userId.toLowerCase().includes(q) ||
      s.userName.toLowerCase().includes(q) ||
      s.stationName.toLowerCase().includes(q) ||
      s.shiftDate.toLowerCase().includes(q) ||
      displayDate.includes(q) ||
      s.startTime.toLowerCase().includes(q) ||
      s.endTime.toLowerCase().includes(q) ||
      (s.lineName ?? '').toLowerCase().includes(q);

    const matchesLine = !filterLine || s.lineName === filterLine;
    const matchesStation = !filterStation || s.stationName === filterStation;

    const hour = parseInt(s.startTime.split(':')[0], 10);
    const isMorning = hour >= 6 && hour < 15;
    const matchesShift =
      filterShift === 'all' ||
      (filterShift === 'morning' && isMorning) ||
      (filterShift === 'afternoon' && !isMorning);

    const matchesStatus =
      filterStatus === 'all' ||
      getShiftStatus(s) === filterStatus;

    return matchesSearch && matchesLine && matchesStation && matchesShift && matchesStatus;
  });

  const hasActiveFilters =
    !!search || !!filterLine || !!filterStation ||
    filterShift !== 'all' || filterStatus !== 'all';



  const handleLineChange = (line: string) => {
    setFilterLine(line);
    setFilterStation('');
  };

  // ── download template ──
  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Shifts');

    ws.columns = [
      { header: 'user_id', key: 'user_id', width: 16 },
      { header: 'station_id', key: 'station_id', width: 16 },
      { header: 'shift_date', key: 'shift_date', width: 16 },
      { header: 'start_time', key: 'start_time', width: 16 },
      { header: 'end_time', key: 'end_time', width: 16 },
    ];

    // Style header row
    ws.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B4F6C' } };
    });

    // Sample data row
    ws.addRow(['AUX001', 'STN001', '2026-05-01', '06:00:00', '15:00:00']);

    // Dropdowns for rows 2–100
    for (let row = 2; row <= 100; row++) {
      ws.getCell(`D${row}`).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"06:00:00,15:00:00"'],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Invalid start time',
        error: 'Please select 06:00:00 or 15:00:00',
      };
      ws.getCell(`E${row}`).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"15:00:00,23:59:00"'],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Invalid end time',
        error: 'Please select 15:00:00 or 23:59:00',
      };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shift_import_template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── upload ──
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);

    const form = new FormData();
    form.append('file', file);

    try {
      const session = JSON.parse(localStorage.getItem('user_session') || '{}');
      const res = await fetch(`${API}/operator/shifts/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
        body: form,
        credentials: 'include'
      });

      if (!res.ok) { showToast('Upload failed', false); return; }

      const data = await res.json();
      const errSummary = data.errors?.length ? ` (${data.errors.length} skipped)` : '';
      showToast(`✓ Imported ${data.inserted} shift${data.inserted !== 1 ? 's' : ''}${errSummary}`);
      if (data.inserted > 0) fetchShifts();
    } catch {
      showToast('Server error during upload', false);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 min-h-full" style={{ backgroundColor: '#FAF9F5' }}>

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white"
          style={{ backgroundColor: toast.ok ? ACCENT : '#DC2626' }}
        >
          {toast.ok ? <CheckCircleIcon size={16} /> : <XCircleIcon size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-bold text-gray-900 leading-tight">Shift Management</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            View and bulk-import auxiliary police shifts
          </p>
        </div>

        {/* Buttons — right side */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex gap-2">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <DownloadIcon size={14} />
              Download Template
            </button>
            <button
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
              style={{ backgroundColor: ACCENT }}
            >
              {uploading
                ? <Loader2Icon size={14} className="animate-spin" />
                : <UploadIcon size={14} />}
              {uploading ? 'Importing…' : 'Upload Shifts'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
          <p className="text-xs text-gray-400">
            Import format (.xlsx/.csv):{' '}
            <code className="text-gray-500">user_id</code>,{' '}
            <code className="text-gray-500">station_id</code>,{' '}
            <code className="text-gray-500">shift_date</code>,{' '}
            <code className="text-gray-500">start_time</code>,{' '}
            <code className="text-gray-500">end_time</code>
          </p>
        </div>
      </div>

      {/* ── Search + Filters ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex items-end gap-3">

          {/* Search */}
          <div className="flex flex-col gap-1 flex-[1.3]">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Search
            </label>
            <div className="relative">
              <SearchIcon
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search by officer or station name"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 bg-white text-gray-700"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XIcon size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Line */}
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Line
            </label>
            <select
              value={filterLine}
              onChange={e => handleLineChange(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 bg-white text-gray-700"
            >
              <option value="">All Lines</option>
              {uniqueLines.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* Station */}
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Station
            </label>
            <select
              value={filterStation}
              onChange={e => setFilterStation(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 bg-white text-gray-700"
            >
              <option value="">All Stations</option>
              {uniqueStations.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Shift type */}
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Shift
            </label>
            <select
              value={filterShift}
              onChange={e => setFilterShift(e.target.value as 'all' | 'morning' | 'afternoon')}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 bg-white text-gray-700"
            >
              <option value="all">All Shifts</option>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
            </select>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as 'all' | 'upcoming' | 'in_progress' | 'completed')}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 bg-white text-gray-700"
            >
              <option value="all">All</option>
              <option value="upcoming">Upcoming</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>



        </div>

        {/* Result count */}
        <p className="text-xs text-gray-400 mt-3 text-right">
          Showing{' '}
          <span className="font-semibold text-gray-700">{filtered.length}</span>
          {' '}of{' '}
          <span className="font-semibold text-gray-700">{shifts.length}</span>
          {' '}shifts
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2Icon size={24} className="animate-spin text-gray-300" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarIcon size={32} className="mb-2 text-gray-200" />
            <p className="text-sm font-semibold text-gray-500">
              {hasActiveFilters ? 'No shifts match your filters' : 'No shifts found'}
            </p>

          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Officer', 'Line', 'Station', 'Date', 'Shift Type', 'Hours', 'Status'].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(s => (
                <tr key={s.shiftId} className="hover:bg-gray-50 transition-colors">

                  {/* Officer */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">

                      <div>
                        <div className="font-medium text-gray-900">{s.userName}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{s.userId}</div>
                      </div>
                    </div>
                  </td>

                  {/* Line */}
                  <td className="px-4 py-3 text-gray-700 text-sm">{s.lineName || '—'}</td>

                  {/* Station */}
                  <td className="px-4 py-3 text-gray-700 text-sm">{s.stationName}</td>

                  {/* Date */}
                  <td className="px-4 py-3 text-gray-700 text-sm">
                    {new Date(s.shiftDate).toLocaleDateString('en-MY', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </td>

                  {/* Shift type */}
                  <td className="px-4 py-3 text-gray-700 text-sm">
                    {parseInt(s.startTime.split(':')[0], 10) >= 6 &&
                      parseInt(s.startTime.split(':')[0], 10) < 15
                      ? 'Morning'
                      : 'Afternoon'}
                  </td>

                  {/* Hours */}
                  <td className="px-4 py-3 text-gray-700 text-sm">
                    {formatClockTime(s.startTime, format)} - {formatClockTime(s.endTime, format)}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-gray-700 text-sm">
                    {(() => {
                      const status = getShiftStatus(s);
                      if (status === 'in_progress') return 'In Progress';
                      if (status === 'upcoming') return 'Upcoming';
                      return 'Completed';
                    })()}                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
