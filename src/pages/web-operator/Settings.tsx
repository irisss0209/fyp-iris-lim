import React, { useState, useEffect, useRef } from 'react';
import {
  GlobeIcon,
  BellIcon,
  UsersIcon,
  SlidersIcon,
  ToggleLeftIcon,
  ToggleRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  SearchIcon,
  DownloadIcon,
  UploadIcon,
  Loader2Icon,
  CalendarIcon,
  SunIcon,
  MoonIcon,
} from 'lucide-react';

const API = 'http://localhost:5293/api/data';
const mapToBackendStatus = (action: string) => {
  switch (action) {
    case 'Suspend': return 'Suspended';
    case 'Archive': return 'Archived';
    case 'Reactivate': return 'Active';
    default: return action;
  }
};
type SettingsSection =
  | 'general'
  | 'notifications'
  | 'users'
  | 'shift'
  | 'thresholds'
  | 'health';

// ── Toggle component ────────────────────────────────────────────────────────
interface ToggleProps {
  enabled: boolean;
  onToggle: () => void;
  label: string;
  description?: string;
}

function Toggle({ enabled, onToggle, label, description }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div>
        <div className="text-sm font-medium text-gray-900">{label}</div>
        {description && (
          <div className="text-xs mt-0.5 text-gray-500">{description}</div>
        )}
      </div>
      <button onClick={onToggle}>
        {enabled ? (
          <ToggleRightIcon className="w-8 h-8 text-[#0B4F6C]" />
        ) : (
          <ToggleLeftIcon className="w-8 h-8 text-gray-300" />
        )}
      </button>
    </div>
  );
}

// ── Status badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; text: string; label: string }> = {
    Active: { bg: '#DCFCE7', text: '#15803D', label: 'Active' },
    Suspended: { bg: '#FEF9C3', text: '#92400E', label: 'Suspend' },
    Archived: { bg: '#F3F4F6', text: '#6B7280', label: 'Archive' },
  };
  const c = cfg[status] ?? cfg['Archived'];
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {c.label}
    </span>
  );
}

// ── Shift type badge ────────────────────────────────────────────────────────
function ShiftTypeBadge({ shiftStart }: { shiftStart: string }) {
  const hour = new Date(shiftStart).getHours();
  const isMorning = hour >= 6 && hour < 15;
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={
        isMorning
          ? { backgroundColor: '#FEF9C3', color: '#92400E' }
          : { backgroundColor: '#EDE9FE', color: '#5B21B6' }
      }
    >
      {isMorning ? <SunIcon size={11} /> : <MoonIcon size={11} />}
      {isMorning ? 'Morning' : 'Afternoon'}
    </span>
  );
}

// ── User row type ───────────────────────────────────────────────────────────
interface UserRow {
  userId: string;
  userName: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

// ── Shift row type ──────────────────────────────────────────────────────────
interface ShiftRow {
  shiftId: number;
  userId: string;
  userName: string;
  stationId: string;
  stationName: string;
  lineName: string;
  shiftStart: string;
  shiftEnd: string;
}

// ════════════════════════════════════════════════════════════════════════════
export function Settings() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');

  const [toggles, setToggles] = useState({
    autoEscalate: true,
    soundAlerts: true,
    emailNotifications: false,
    smsAlerts: true,
    weeklyReport: true,
  });

  const [threshold, setThreshold] = useState(85);

  const toggle = (key: keyof typeof toggles) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const healthItems = [
    { name: 'Camera Network', status: 'operational', uptime: '98%', detail: 'All cameras active' },
    { name: 'AI Detection', status: 'operational', uptime: '95%', detail: 'Model running normally' },
    { name: 'Alert System', status: 'operational', uptime: '99%', detail: 'No delays detected' },
    { name: 'Database', status: 'operational', uptime: '97%', detail: 'Healthy' },
  ];

  const sections = [
    { id: 'general', label: 'General', icon: <GlobeIcon className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <BellIcon className="w-4 h-4" /> },
    { id: 'users', label: 'User Management', icon: <UsersIcon className="w-4 h-4" /> },
    { id: 'shift', label: 'Shift Management', icon: <CalendarIcon className="w-4 h-4" /> },
    { id: 'thresholds', label: 'Alert Thresholds', icon: <SlidersIcon className="w-4 h-4" /> },
    { id: 'health', label: 'System Health', icon: <SlidersIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-56 bg-white border-r border-gray-100 flex-shrink-0">
        <div className="px-4 py-5 border-b">
          <h1 className="text-lg font-bold text-gray-900">Settings</h1>
        </div>
        <nav className="p-2 space-y-1">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id as SettingsSection)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeSection === s.id
                ? 'bg-[#0B4F6C] text-white'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* GENERAL */}
        {activeSection === 'general' && (
          <div className="max-w-xl space-y-5">
            <h2 className="text-lg font-bold text-gray-900">General Settings</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5 text-gray-500">System Name</label>
                <input
                  defaultValue="Railly Command Center"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/30 text-gray-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5 text-gray-500">Timezone</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none text-gray-900">
                  <option>Asia/Kuala_Lumpur (UTC+8)</option>
                  <option>UTC</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5 text-gray-500">Language</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none text-gray-900">
                  <option>English</option>
                  <option>Bahasa Malaysia</option>
                </select>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-semibold mb-3 text-gray-900">System Behaviour</h3>
              <Toggle enabled={toggles.autoEscalate} onToggle={() => toggle('autoEscalate')} label="Auto-escalate to Police" description="Automatically notify police after 5 min of no operator action" />
              <Toggle enabled={toggles.soundAlerts} onToggle={() => toggle('soundAlerts')} label="Sound Alerts" description="Play audio notification for new alerts" />
              <Toggle enabled={toggles.emailNotifications} onToggle={() => toggle('emailNotifications')} label="Email Notifications" description="Send email digest of daily incidents" />
            </div>
            <button className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#0B4F6C]">Save Changes</button>
          </div>
        )}

        {/* NOTIFICATIONS */}
        {activeSection === 'notifications' && (
          <div className="max-w-xl space-y-5">
            <h2 className="text-lg font-bold text-gray-900">Notification Settings</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <Toggle enabled={toggles.soundAlerts} onToggle={() => toggle('soundAlerts')} label="In-App Sound Alerts" description="Audio notification for new alerts" />
              <Toggle enabled={toggles.emailNotifications} onToggle={() => toggle('emailNotifications')} label="Email Notifications" description="Daily incident summary emails" />
              <Toggle enabled={toggles.smsAlerts} onToggle={() => toggle('smsAlerts')} label="SMS Alerts" description="Critical alerts via SMS" />
              <Toggle enabled={toggles.weeklyReport} onToggle={() => toggle('weeklyReport')} label="Weekly Report" description="Automated weekly compliance report" />
            </div>
            <button className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#0B4F6C]">Save Changes</button>
          </div>
        )}

        {/* USER MANAGEMENT */}
        {activeSection === 'users' && <UserManagement />}

        {/* SHIFT MANAGEMENT */}
        {activeSection === 'shift' && <ShiftManagementPanel />}

        {/* THRESHOLDS */}
        {activeSection === 'thresholds' && (
          <div className="space-y-5 max-w-xl">
            <h2 className="text-lg font-bold text-gray-900">Alert Thresholds</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <label className="text-xs font-semibold uppercase tracking-wide block mb-3 text-gray-500">Confidence Threshold</label>
              <input
                type="range" min={50} max={99} value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full accent-[#0B4F6C]"
              />
              <div className="text-2xl font-bold text-[#0B4F6C] mt-2">{threshold}%</div>
              <p className="text-xs text-gray-400 mt-1">Detections below this confidence will be ignored.</p>
            </div>
          </div>
        )}

        {/* SYSTEM HEALTH */}
        {activeSection === 'health' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">System Health</h2>
            <div className="grid grid-cols-2 gap-4">
              {healthItems.map(item => (
                <div key={item.name} className="bg-white p-4 rounded-xl border border-gray-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-900">{item.name}</span>
                    {item.status === 'operational'
                      ? <CheckCircleIcon className="text-green-600 w-4 h-4" />
                      : <XCircleIcon className="text-red-500 w-4 h-4" />}
                  </div>
                  <div className="text-xs text-gray-500">{item.detail}</div>
                  <div className="text-sm font-bold text-[#0B4F6C] mt-1">{item.uptime} uptime</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// USER MANAGEMENT sub-panel
// ════════════════════════════════════════════════════════════════════════════
function UserManagement() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("session") || "{}");
    fetch(`${API}/operator/users`, {
      headers: {
        'Authorization': `Bearer ${session.token}`
      }
    })
      .then(async r => {
        const data = await r.json();
        console.log("USERS FROM BACKEND:", data);
        return data;
      })
      .then(setUsers)
      .catch(() => showToast('Failed to load users', false))
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (userId: string, newStatus: string) => {
    setUpdatingId(userId);
    try {
      const session = JSON.parse(localStorage.getItem("session") || "{}");
      const res = await fetch(`${API}/operator/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        },
        body: JSON.stringify({ status: mapToBackendStatus(newStatus) }),
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.error ?? 'Update failed', false);
        return;
      }
      const updated = await res.json();
      setUsers(prev =>
        prev.map(u => u.userId === userId ? { ...u, status: updated.status } : u)
      );
      showToast(`Status updated to ${newStatus}`);
    } catch {
      showToast('Server error', false);
    } finally {
      setUpdatingId(null);
    }
  };

  // Compute allowed next statuses per current status
  const allowedTransitions = (status: string): string[] => {
    if (status === 'Active') return ['Suspend', 'Archive'];
    if (status === 'Suspended') return ['Reactivate', 'Archive'];
    return []; // Archived → nothing
  };

  const filtered = users.filter(u => {
    const matchRole = roleFilter === 'All' || u.role === roleFilter;
    const matchSearch = u.userName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white"
          style={{ backgroundColor: toast.ok ? '#0B4F6C' : '#DC2626' }}
        >
          {toast.ok ? <CheckCircleIcon size={16} /> : <XCircleIcon size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">User Management</h2>
        <span className="text-xs text-gray-400">{filtered.length} of {users.length} users</span>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/30 text-gray-900"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none text-gray-700"
        >
          {['All', 'Customer', 'Operator', 'Auxiliary'].map(r => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2Icon size={24} className="animate-spin text-gray-300" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 text-sm">
            <UsersIcon size={32} className="mb-2 text-gray-200" />
            No users found
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Name', 'Role', 'Created At', 'Status', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(u => {
                const transitions = allowedTransitions(u.status);
                const isUpdating = updatingId === u.userId;
                return (
                  <tr key={u.userId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: '#0B4F6C' }}
                        >
                          {u.userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{u.userName}</div>
                          <div className="text-[10px] text-gray-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.role}</td>
                    <td className="px-4 py-3 text-gray-500">{u.createdAt}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="px-4 py-3">
                      {transitions.length === 0 ? (
                        <span className="text-xs text-gray-400 italic">Archived</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {isUpdating && <Loader2Icon size={12} className="animate-spin text-gray-400" />}
                          {transitions.map(t => (
                            <button
                              key={t}
                              disabled={isUpdating}
                              onClick={() => handleStatusChange(u.userId, t)}
                              className="text-xs px-2.5 py-1 rounded-lg font-medium border transition-colors disabled:opacity-50"
                              style={
                                t === 'Suspended'
                                  ? { borderColor: '#F59E0B', color: '#92400E', backgroundColor: '#FFFBEB' }
                                  : t === 'Archived'
                                    ? { borderColor: '#D1D5DB', color: '#6B7280', backgroundColor: '#F9FAFB' }
                                    : { borderColor: '#22C55E', color: '#15803D', backgroundColor: '#F0FDF4' }
                              }
                            >
                              → {t}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SHIFT MANAGEMENT sub-panel
// ════════════════════════════════════════════════════════════════════════════
function ShiftManagementPanel() {
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchShifts = () => {
    setLoading(true);
    const session = JSON.parse(localStorage.getItem("session") || "{}");
    fetch(`${API}/operator/shifts`, {
      headers: {
        'Authorization': `Bearer ${session.token}`
      }
    })
      .then(r => r.json())
      .then(setShifts)
      .catch(() => showToast('Failed to load shifts', false))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchShifts(); }, []);

  // ── Download template ──────────────────────────────────────────────────────
  const downloadTemplate = () => {
    // Build a CSV that Excel can open; instruction note in row 2
    const rows = [
      ['user_id', 'station_id', 'shift_start', 'shift_end'],
      ['AUX001', 'STN001', '2026-05-01T06:00:00', '2026-05-01T15:00:00'],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shift_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Upload Excel ───────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so same file can be re-selected
    e.target.value = '';

    setUploading(true);
    const form = new FormData();
    form.append('file', file);

    try {
      const session = JSON.parse(localStorage.getItem("session") || "{}");
      const res = await fetch(`${API}/operator/shifts/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.token}`
        },
        body: form,
      });
      if (!res.ok) {
        console.error(await res.text());
        showToast('Upload failed', false);
        return;
      }

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
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white"
          style={{ backgroundColor: toast.ok ? '#0B4F6C' : '#DC2626' }}
        >
          {toast.ok ? <CheckCircleIcon size={16} /> : <XCircleIcon size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Shift Management</h2>
          <p className="text-xs text-gray-400 mt-0.5">View and bulk-import auxiliary police shifts</p>
        </div>
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
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-[#0B4F6C] hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {uploading ? <Loader2Icon size={14} className="animate-spin" /> : <UploadIcon size={14} />}
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
      </div>

      {/* Hint */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 text-xs text-blue-700">
        <strong>Import format:</strong> Download the template, fill in <code>user_id</code>, <code>station_id</code>, <code>shift_start</code>, <code>shift_end</code> (ISO date format), then upload as <code>.xlsx</code> or <code>.csv</code>.
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2Icon size={24} className="animate-spin text-gray-300" />
          </div>
        ) : shifts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 text-sm">
            <CalendarIcon size={32} className="mb-2 text-gray-200" />
            No shifts found. Upload a template to get started.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Officer', 'Line', 'Station', 'Shift Type', 'Hours'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {shifts.map(s => (
                <tr key={s.shiftId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: '#0B4F6C' }}
                      >
                        {s.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{s.userName}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{s.userId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.lineName}</td>
                  <td className="px-4 py-3 text-gray-700">{s.stationName}</td>
                  <td className="px-4 py-3">
                    <ShiftTypeBadge shiftStart={s.shiftStart} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {new Date(s.shiftStart).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    {' – '}
                    {new Date(s.shiftEnd).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    <div className="text-[10px] text-gray-400 font-sans">
                      {new Date(s.shiftStart).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
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