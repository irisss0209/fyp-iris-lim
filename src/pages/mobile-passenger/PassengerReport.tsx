import { useState, useEffect, useRef, useCallback } from 'react';
import { useAlertHub } from '../../hooks/useAlertHub';
import { parseMYTDatetime } from '../../utils/myt';
import { UserSession } from '../../types/session';
import { STATUS_THEME } from '../../utils/reportUtils';
import { AnimatePresence } from 'framer-motion';
import {
  ClockIcon,
  XIcon,
  PlusIcon,
  ChevronDownIcon,
  InfoIcon,
} from 'lucide-react';
import { CreateReport } from './CreateReport';

const STATUS_BADGE: Record<string, string> = {
  verified:  'bg-green-50 text-green-600',
  resolved:  'bg-green-50 text-green-600',
  pending:   'bg-yellow-50 text-yellow-600',
  en_route:  'bg-blue-50 text-blue-600',
  escalated: 'bg-red-50 text-red-600',
  dismissed: 'bg-gray-50 text-gray-400',
};

interface ReportHistoryItem {
  id: string;
  incidentId: string;
  status: string;
  line: string;
  station: string;
  type: string;
  time: string;
  date: string;
  source: string;
  coach?: string | number;
  description?: string;
  createdAt?: string;
  verifiedBy?: string | null; verifiedAt?: string | null; verifiedComment?: string | null;
  escalatedBy?: string | null; escalatedAt?: string | null; escalatedComment?: string | null;
  enrouteBy?: string | null; enrouteAt?: string | null; enrouteComment?: string | null;
  resolvedBy?: string | null; resolvedAt?: string | null; resolvedComment?: string | null;
  dismissedBy?: string | null; dismissedAt?: string | null; dismissedComment?: string | null;
}

function fmtStatus(s: string) {
  return s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function Report({ session }: { session: UserSession }) {
  const [view, setView] = useState<'dashboard' | 'create'>('dashboard');
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedReport, setSelectedReport] = useState<ReportHistoryItem | null>(null);
  const [reportComment, setReportComment] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [, setTick] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval>>();

  const fetchHistory = useCallback(() => {
    fetch(`${import.meta.env.VITE_API_BASE}/api/data/my-history?userId=${session.userId}`, {
      headers: session.token ? { Authorization: `Bearer ${session.token}` } : {},
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        setHistory(Array.isArray(data) ? data : []);
      })
      .catch(console.error);
  }, [session.userId, session.token]);

  useEffect(() => {
    if (view === 'dashboard') fetchHistory();
  }, [view, fetchHistory]);

  useAlertHub(fetchHistory, view === 'dashboard');

  useEffect(() => {
    clearInterval(tickRef.current);
    if (!selectedReport) return;
    const isPending  = selectedReport.status === 'pending';
    const isVerified = selectedReport.status === 'verified';
    if (!isPending && !isVerified) return;
    tickRef.current = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(tickRef.current);
  }, [selectedReport?.id, selectedReport?.status]);

  const handleUpdateStatus = async (action: 'Cancel' | 'Escalate') => {
    if (!selectedReport) return;
    if (action === 'Cancel' && !reportComment.trim()) {
      alert('A comment is required to cancel this report.');
      return;
    }

    const newStatus = action === 'Cancel' ? 'dismissed' : 'escalated';
    const now = new Date().toISOString();
    const byName = session.userName ?? 'You';
    const comment = reportComment.trim();

    // Optimistic update — close modal feel + immediate list + audit trail
    const patch: Partial<ReportHistoryItem> = { status: newStatus };
    if (action === 'Escalate') {
      patch.escalatedAt = now; patch.escalatedBy = byName; patch.escalatedComment = comment || null;
    } else {
      patch.dismissedAt = now; patch.dismissedBy = byName; patch.dismissedComment = comment;
    }
    setHistory(prev => prev.map(r => r.id === selectedReport.id ? { ...r, ...patch } : r));
    setSelectedReport(prev => prev ? { ...prev, ...patch } : prev);
    setReportComment('');

    setIsUpdatingStatus(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}/api/data/incident/${selectedReport.incidentId}/status?userId=${session.userId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session.token && { Authorization: `Bearer ${session.token}` }),
          },
          body: JSON.stringify({ action: action === 'Cancel' ? 'Dismiss' : 'Escalate', comment }),
          credentials: 'include'
        }
      );
      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Failed to update status');
        fetchHistory(); // reconcile on error
      }
    } catch (err) {
      console.error(err);
      alert('Network error updating status.');
      fetchHistory();
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (view === 'create') {
    return <CreateReport session={session} onBack={() => setView('dashboard')} />;
  }

  // Computed synchronously on every render so the button is never briefly enabled.
  const escalateSecondsLeft = (() => {
    if (!selectedReport) return 0;
    const isPending  = selectedReport.status === 'pending';
    const isVerified = selectedReport.status === 'verified';
    if (!isPending && !isVerified) return 0;
    const base = isPending && selectedReport.createdAt
      ? new Date(selectedReport.createdAt).getTime()
      : isVerified && selectedReport.verifiedAt
      ? parseMYTDatetime(selectedReport.verifiedAt).getTime()
      : null;
    if (!base) return 0;
    return Math.max(0, Math.ceil((2 * 60 * 1000 - (Date.now() - base)) / 1000));
  })();

  const filteredHistory = history.filter(r => {
    if (statusFilter !== 'all' && r.status.toLowerCase() !== statusFilter) return false;
    if (dateFilter && r.date !== dateFilter) return false;
    return true;
  });


  const displayedHistory = isExpanded ? filteredHistory : filteredHistory.slice(0, 3);

  // Build audit trail steps for the currently selected report
  const auditSteps: { label: string; by?: string | null; at?: string | null; comment?: string | null; color: string; bg: string }[] = [];
  if (selectedReport) {
    if (selectedReport.verifiedAt || selectedReport.verifiedBy)
      auditSteps.push({ label: 'Verified',  by: selectedReport.verifiedBy,  at: selectedReport.verifiedAt,  comment: selectedReport.verifiedComment,  ...STATUS_THEME.verified });
    if (selectedReport.escalatedAt || selectedReport.escalatedBy)
      auditSteps.push({ label: 'Escalated', by: selectedReport.escalatedBy, at: selectedReport.escalatedAt, comment: selectedReport.escalatedComment, ...STATUS_THEME.escalated });
    if (selectedReport.enrouteAt || selectedReport.enrouteBy)
      auditSteps.push({ label: 'En Route',  by: selectedReport.enrouteBy,   at: selectedReport.enrouteAt,  comment: selectedReport.enrouteComment,   ...STATUS_THEME.en_route });
    if (selectedReport.resolvedAt || selectedReport.resolvedBy)
      auditSteps.push({ label: 'Resolved',  by: selectedReport.resolvedBy,  at: selectedReport.resolvedAt,  comment: selectedReport.resolvedComment,  ...STATUS_THEME.resolved });
    if (selectedReport.dismissedAt || selectedReport.dismissedBy)
      auditSteps.push({ label: 'Dismissed', by: selectedReport.dismissedBy, at: selectedReport.dismissedAt, comment: selectedReport.dismissedComment, ...STATUS_THEME.dismissed });
  }

  return (
    <div className="px-4 pt-5 pb-6 space-y-3">
      <div>
        <h2 className="text-xl font-black text-gray-900 mb-1">Incident Reports</h2>
        <p className="text-sm text-gray-500">Track and manage your submitted reports.</p>
      </div>

      {/* Reminder */}
      <div className="bg-white rounded-[32px] p-5 border border-gray-100 shadow-sm">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 flex-shrink-0 flex items-center justify-center text-blue-500">
            <InfoIcon size={20} />
          </div>
          <div>
            <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-1">Reminder</h4>
            <p className="text-xs text-gray-600 font-medium leading-relaxed">
              The Women's Coach is reserved for female passengers, boys aged 12 and below (with a female guardian), and persons with disabilities (PWD) with their caregivers. Please check that the situation falls outside these conditions before reporting.
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={() => setView('create')}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold text-white shadow-[0_8px_16px_rgba(11,79,108,0.2)] active:scale-[0.98] transition-all"
        style={{ backgroundColor: '#0B4F6C' }}
      >
        <PlusIcon size={18} />
        Create New Report
      </button>

      {/* My Report History */}
      <div className="pt-2">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">My Reports</p>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="flex-1 min-w-0 text-sm p-2 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/20"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="en_route">En Route</option>
              <option value="verified">Verified</option>
              <option value="resolved">Resolved</option>
              <option value="escalated">Escalated</option>
              <option value="dismissed">Dismissed</option>
            </select>
            {dateFilter ? (
              <div className="flex items-center gap-1 flex-shrink-0">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  className="text-sm p-2 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/20 w-36"
                />
                <button
                  onClick={() => setDateFilter('')}
                  className="p-1.5 rounded-lg bg-gray-100 text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors flex-shrink-0"
                >
                  <XIcon size={14} />
                </button>
              </div>
            ) : (
              <label className="relative flex-shrink-0 cursor-pointer">
                <span className="block text-sm p-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-400 w-36 select-none">
                  All time
                </span>
                <input
                  type="date"
                  onChange={e => setDateFilter(e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
              </label>
            )}
          </div>

          {filteredHistory.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              {history.length === 0 ? 'No reports submitted yet.' : 'No reports match the selected filters.'}
            </p>
          ) : (
            <div className="space-y-4">
              {displayedHistory.map(r => (
                <div
                  key={r.id}
                  onClick={() => { setSelectedReport(r); setReportComment(''); }}
                  className="flex items-start justify-between border-b border-gray-50 pb-3 last:border-0 last:pb-0 active:scale-[0.98] transition-transform cursor-pointer hover:bg-gray-50/50 rounded-lg -mx-2 px-2 pt-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{r.id}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{r.line} · Coach {r.coach}</p>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <ClockIcon size={12} /> {r.date} at {r.time}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_BADGE[r.status] ?? 'bg-gray-50 text-gray-400'}`}>
                    {fmtStatus(r.status)}
                  </span>
                </div>
              ))}

              {filteredHistory.length > 3 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="w-full flex items-center justify-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 py-2 border-t border-gray-50 mt-2"
                >
                  {isExpanded ? 'Show Less' : `View All ${filteredHistory.length} Reports`}
                  <ChevronDownIcon size={14} className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-0">
            <div className="bg-white w-full sm:max-w-sm rounded-[32px] shadow-2xl relative max-h-[85vh] flex flex-col">

              {/* Header */}
              <div className="px-5 pt-5 pb-3 flex-shrink-0 border-b border-gray-50">
                <button
                  onClick={() => setSelectedReport(null)}
                  className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                >
                  <XIcon size={16} />
                </button>
                <h3 className="text-lg font-bold text-gray-900 pr-10">
                  Report Detail <span className="text-xs font-mono text-gray-400 font-normal">({selectedReport.id})</span>
                </h3>
                <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[selectedReport.status] ?? 'bg-gray-50 text-gray-400'}`}>
                  {fmtStatus(selectedReport.status)}
                </span>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

                {/* Core details */}
                <div className="space-y-0">
                  <div className="flex justify-between text-sm py-2 border-b border-gray-50">
                    <span className="text-gray-500">Line & Coach</span>
                    <span className="font-semibold text-gray-800 text-right">
                      {selectedReport.line}<br />
                      <span className="text-xs text-gray-400">Coach {selectedReport.coach}</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-sm py-2 border-b border-gray-50">
                    <span className="text-gray-500">Time</span>
                    <span className="font-semibold text-gray-800">{selectedReport.date} {selectedReport.time}</span>
                  </div>
                  <div className="text-sm py-2">
                    <span className="text-gray-500 block mb-1">Description</span>
                    <p className="font-medium text-gray-800 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      {selectedReport.description || selectedReport.type}
                    </p>
                  </div>
                </div>

                {/* Audit trail */}
                {auditSteps.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Audit Trail</div>
                    <div className="space-y-2">
                      {auditSteps.map(s => (
                        <div key={s.label} className="rounded-xl px-4 py-3" style={{ backgroundColor: s.bg }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold" style={{ color: s.color }}>
                              {s.label} By: {s.by ?? 'N/A'}
                            </span>
                            {s.at && (
                              <span className="text-[10px] font-medium opacity-60" style={{ color: s.color }}>{s.at}</span>
                            )}
                          </div>
                          <div className="text-[11px] italic text-gray-700 border-l-2 pl-3" style={{ borderColor: s.color + '50' }}>
                            {s.comment ? `"${s.comment}"` : 'No comment'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions — pending (cancel + escalate) or verified (escalate only) */}
                {(selectedReport.status === 'pending' || selectedReport.status === 'verified') && (
                  <div className="pt-2 border-t border-gray-100 space-y-3">
                    <textarea
                      value={reportComment}
                      onChange={e => setReportComment(e.target.value)}
                      placeholder={
                        selectedReport.status === 'pending'
                          ? 'Add a comment… (optional for escalate, required for cancel)'
                          : 'Add a comment explaining why you\'re escalating… (optional)'
                      }
                      className="w-full text-sm p-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/20"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      {selectedReport.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateStatus('Cancel')}
                          disabled={isUpdatingStatus || !reportComment.trim()}
                          className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold disabled:opacity-50"
                        >
                          Cancel Report
                        </button>
                      )}
                      <button
                        onClick={() => handleUpdateStatus('Escalate')}
                        disabled={isUpdatingStatus || escalateSecondsLeft > 0}
                        className="flex-1 py-3 text-white rounded-xl text-sm font-bold disabled:opacity-60 tracking-wide"
                        style={{ backgroundColor: '#D34026' }}
                      >
                        {escalateSecondsLeft > 0
                          ? `Escalate in ${Math.floor(escalateSecondsLeft / 60)}:${String(escalateSecondsLeft % 60).padStart(2, '0')}`
                          : 'Escalate'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
