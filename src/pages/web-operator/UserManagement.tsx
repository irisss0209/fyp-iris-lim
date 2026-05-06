interface UserRow {
  userId: string;
  userName: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}
import { useState, useEffect, useRef } from 'react';
import ExcelJS from 'exceljs';

import {
  Loader2Icon,
  UsersIcon,
  SearchIcon,
  XCircleIcon,
  CheckCircleIcon,
  UploadIcon,
  DownloadIcon,
  XIcon
} from 'lucide-react';
const ACCENT = '#0B4F6C';
const API = `${import.meta.env.VITE_API_BASE}/api/data`;
const mapToBackendStatus = (action: string) => {
  switch (action) {
    case 'Suspend': return 'Suspended';
    case 'Archive': return 'Archived';
    case 'Reactivate': return 'Active';
    default: return action;
  }
};

// ── Status badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase();

  const cfg: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: '#DCFCE7', text: '#15803D', label: 'Active' },
    suspended: { bg: '#FEF9C3', text: '#92400E', label: 'Suspended' },
    archived: { bg: '#F3F4F6', text: '#6B7280', label: 'Archived' },
  };

  const c = cfg[normalized] ?? cfg['archived'];

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {c.label}
    </span>
  );
}

export function UserManagement() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // ── filter state ──
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const session = JSON.parse(localStorage.getItem('user_session') || '{}');
  const loggedInUserId = session.userId;

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = () => {
    setLoading(true);
    const session = JSON.parse(localStorage.getItem("user_session") || "{}");
    fetch(`${API}/operator/users`, {
      headers: { 'Authorization': `Bearer ${session.token}` },
      credentials: 'include'
    })
      .then(r => r.json())
      .then(data => setUsers(data.users || []))
      .catch(() => showToast('Failed to load users', false))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleStatusChange = async (userId: string, newStatus: string) => {
    if (newStatus === 'Suspend') {
      if (!window.confirm("Once suspended, this user cannot login, but you can still reactivate them later. Proceed?")) return;
    } else if (newStatus === 'Archive') {
      if (!window.confirm("This user will no longer be able to get into the system, but their information will retain in the database for compliance purpose. Proceed?")) return;
    }

    setUpdatingId(userId);
    try {
      const session = JSON.parse(localStorage.getItem("user_session") || "{}");
      const res = await fetch(`${API}/operator/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        },
        body: JSON.stringify({ status: mapToBackendStatus(newStatus) }),
        credentials: 'include'
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
    const q = search.toLowerCase();
    const matchSearch = !q ||
      u.userName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.userId.toLowerCase().includes(q);

    const matchRole = roleFilter === 'All' || u.role === roleFilter;
    const matchStatus = statusFilter === 'All' || u.status === statusFilter;

    return matchSearch && matchRole && matchStatus;
  });

  const hasActiveFilters = !!search || roleFilter !== 'All' || statusFilter !== 'All';
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleUserUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const valid = file.name.match(/\.(csv|xlsx|xls)$/i);
    if (!valid) {
      showToast('Only CSV or Excel files allowed', false);
      return;
    }

    e.target.value = '';
    setUploading(true);

    const form = new FormData();
    form.append('file', file);

    try {
      const session = JSON.parse(localStorage.getItem("user_session") || "{}");

      const res = await fetch(`${API}/operator/users/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.token}`
        },
        body: form,
        credentials: 'include'
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        showToast(err?.error || 'Upload failed', false);
        return;
      }

      const data = await res.json();

      const errSummary = data.errors?.length
        ? ` (${data.errors.length} skipped)`
        : '';

      showToast(`✓ Imported ${data.inserted} user${data.inserted !== 1 ? 's' : ''}${errSummary}`);

      if (data.inserted > 0) fetchUsers();

    } catch {
      showToast('Server error during upload', false);
    } finally {
      setUploading(false);
    }
  };
  const downloadUserTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Users');

    ws.columns = [
      { header: 'user_name', key: 'user_name', width: 22 },
      { header: 'email', key: 'email', width: 28 },
      { header: 'role', key: 'role', width: 16 },
    ];

    // Style header row
    ws.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B4F6C' } };
    });

    // Sample data row
    ws.addRow(['John Doe', 'john@example.com', 'Auxiliary']);

    // Dropdown for role column rows 2–100
    for (let row = 2; row <= 100; row++) {
      ws.getCell(`C${row}`).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"Operator,Auxiliary"'],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Invalid role',
        error: 'Please select Operator or Auxiliary',
      };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user_import_template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
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
          <h1 className="text-[28px] font-bold text-gray-900 leading-tight">
            User Management
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Manage system users, roles, and account statuses
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <div className="flex gap-2">

            <button
              onClick={downloadUserTemplate}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              <DownloadIcon size={14} />
              Download Template
            </button>

            <button
              disabled={uploading}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: ACCENT }}
            >
              {uploading ? <Loader2Icon size={14} className="animate-spin" /> : <UploadIcon size={14} />}
              {uploading ? 'Importing…' : 'Upload Users'}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleUserUpload}
            />
          </div>

          <p className="text-xs text-gray-400">
            Format (.xlsx/.csv): user_name, email, role
          </p>
        </div>
      </div>

      {/* Search + Filters Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex items-end gap-3">

          {/* Search */}
          <div className="flex flex-col gap-1 flex-[1.5]">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Search
            </label>
            <div className="relative">
              <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                placeholder="Search by name, email or ID…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 bg-white text-gray-900"
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

          {/* Role Filter */}
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Role
            </label>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 bg-white text-gray-700"
            >
              <option value="All">All Roles</option>
              {['Passenger', 'Operator', 'Auxiliary'].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 bg-white text-gray-700"
            >
              <option value="All">All Statuses</option>
              {['Active', 'Suspended', 'Archived'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Result count */}
        <p className="text-xs text-gray-400 mt-3 text-right">
          Showing <span className="font-semibold text-gray-700">{filtered.length}</span> of <span className="font-semibold text-gray-700">{users.length}</span> users
        </p>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2Icon size={24} className="animate-spin text-gray-300" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <UsersIcon size={32} className="mb-2 text-gray-200" />
            <p className="text-sm font-semibold text-gray-500">
              {hasActiveFilters ? 'No users match your filters' : 'No users found'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['User Details', 'Role', 'Joined', 'Status', 'Actions'].map(h => (
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

                        <div>
                          <div className="font-medium text-gray-900">
                            {u.userName}
                            {u.userId === loggedInUserId && (
                              <span className="text-xs text-gray-400 font-normal ml-1.5">(You)</span>
                            )}
                          </div>
                          <div className="text-[12px] text-gray-400 font-mono">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-sm">{u.role}</td>
                    <td className="px-4 py-3 text-gray-700 text-sm">
                      {new Date(u.createdAt).toLocaleDateString('en-MY', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {isUpdating && <Loader2Icon size={12} className="animate-spin text-gray-400" />}
                        {transitions.map(t => (
                          <button
                            key={t}
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(u.userId, t)}
                            className="text-[11px] px-2.5 py-1 rounded-lg font-semibold border transition-all disabled:opacity-50 hover:shadow-sm active:scale-95"
                            style={
                              t === 'Suspend'
                                ? { borderColor: '#F59E0B', color: '#92400E', backgroundColor: '#FFFBEB' }
                                : t === 'Archive'
                                  ? { borderColor: '#D1D5DB', color: '#6B7280', backgroundColor: '#F9FAFB' }
                                  : { borderColor: '#22C55E', color: '#15803D', backgroundColor: '#F0FDF4' }
                            }
                          >
                            {t}
                          </button>
                        ))}
                        {transitions.length === 0 && (
                          <span className="text-[11px] text-gray-400 italic">No actions available</span>
                        )}
                      </div>
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
