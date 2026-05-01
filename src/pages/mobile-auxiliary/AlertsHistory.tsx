import { useState, useEffect } from 'react';
import { SearchIcon, ChevronRightIcon, HistoryIcon } from 'lucide-react';
import { Alert } from '../../type/Alert';
import { AlertDetailView } from './AlertDetailView';

const ACCENT = '#0B4F6C';

interface Case {
  id: string;
  station: string;
  line: string;
  date: string;
  time: string;
  status: string;
  elapsed: number;
  trainId: number;
  coachId: number;
  source: string;
  imageUrl?: string;
  snapshotUrl?: string;
  passengerComment?: string;
  reportedBy?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  verifiedComment?: string;
  enrouteBy?: string;
  enrouteAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolvedComment?: string;
  escalatedBy?: string;
  escalatedAt?: string;
  escalatedComment?: string;
  dismissedBy?: string;
  dismissedAt?: string;
  dismissedComment?: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  resolved: { bg: '#F0FBF6', text: '#2D7A5D' },
  escalated: { bg: '#FEF2F0', text: '#D34026' },
  dismissed: { bg: '#F7FAFC', text: '#4A5568' },
  en_route: { bg: '#EFF6FF', text: '#1E3A8A' },
  pending: { bg: '#FEF3C7', text: '#92400E' },
  verified: { bg: '#F0FBF6', text: '#2D7A5D' },
};

const LABELS: Record<string, string> = { resolved: 'Resolved', escalated: 'Escalated', dismissed: 'Dismissed', en_route: 'En Route', pending: 'Pending', verified: 'Verified' };

const getOutcomeConfig = (status: string) => {
  const s = STATUS_COLORS[status?.toLowerCase()];
  return s
    ? { color: s.text, bg: s.bg, label: LABELS[status?.toLowerCase()] ?? status }
    : { color: '#4A5568', bg: '#F7FAFC', label: status };
};

function caseToAlert(c: Case): Alert {
  return {
    id: c.id, trainId: c.trainId, coachId: c.coachId, line: c.line, lineId: '',
    station: c.station, time: c.time, date: c.date, elapsed: c.elapsed,
    status: c.status as Alert['status'], source: c.source as Alert['source'],
    type: c.source === 'ai' ? 'AI Detection' : 'Passenger Report',
    imageUrl: c.imageUrl, snapshotUrl: c.snapshotUrl,
    reportedBy: c.reportedBy, passengerComment: c.passengerComment,
    verifiedBy: c.verifiedBy, verifiedAt: c.verifiedAt, verifiedComment: c.verifiedComment,
    enrouteBy: c.enrouteBy, enrouteAt: c.enrouteAt,
    escalatedBy: c.escalatedBy, escalatedAt: c.escalatedAt, escalatedComment: c.escalatedComment,
    resolvedBy: c.resolvedBy, resolvedAt: c.resolvedAt, resolvedComment: c.resolvedComment,
    dismissedBy: c.dismissedBy, dismissedAt: c.dismissedAt, dismissedComment: c.dismissedComment,
  };
}

export function AlertsHistory({ userId, token }: { userId: string; token?: string }) {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    fetch(`${import.meta.env.VITE_API_BASE}/api/data/auxiliary/history?userId=${userId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(res => res.json())
      .then(data => { setCases(data); setLoading(false); })
      .catch(err => { console.error('Failed to fetch history', err); setLoading(false); });
  }, [userId]);

  const filtered = cases.filter(c => {
    const matchesSearch =
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      (c.station && c.station.toLowerCase().includes(search.toLowerCase()));
    const caseDate = new Date(c.date);
    const now = new Date();
    let matchesDate = true;
    if (dateFilter === 'today') matchesDate = caseDate.toDateString() === now.toDateString();
    else if (dateFilter === 'week') { const w = new Date(now); w.setDate(now.getDate() - 7); matchesDate = caseDate >= w; }
    else if (dateFilter === 'month') { const m = new Date(now); m.setMonth(now.getMonth() - 1); matchesDate = caseDate >= m; }
    return matchesSearch && matchesDate;
  });

  if (selectedAlert) {
    return (
      <div className="absolute inset-0 bg-white z-50 overflow-hidden flex flex-col h-[calc(100vh-145px)] sm:h-[710px]">
        <AlertDetailView alert={selectedAlert} onBack={() => setSelectedAlert(null)} onAction={() => { }} readOnly />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin ">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-lg font-bold text-gray-900">Case History</h2>
      </div>

      <div className="px-4 mb-3">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <SearchIcon className="w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search cases, stations..."
            className="flex-1 text-sm bg-transparent focus:outline-none text-gray-900"
          />
        </div>
      </div>

      <div className="flex gap-2 px-4 mb-3 overflow-x-auto scrollbar-thin pb-1">
        {(['today', 'week', 'month', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setDateFilter(f)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              backgroundColor: dateFilter === f ? ACCENT : 'white',
              color: dateFilter === f ? 'white' : '#4A5568',
              border: `1px solid ${dateFilter === f ? ACCENT : '#E2E8F0'}`,
            }}
          >
            {{ today: 'Today', week: 'This Week', month: 'This Month', all: 'All Time' }[f]}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-2 pb-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-[#0B4F6C] rounded-full animate-spin mb-3" />
            <p className="text-xs text-gray-400">Loading history…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <HistoryIcon size={24} className="text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-600">No cases found</p>
            <p className="text-xs text-gray-400 mt-1">
              {search ? 'Try a different search term.' : 'You have no handled cases for this period.'}
            </p>
          </div>
        ) : filtered.map(c => {
          const oc = getOutcomeConfig(c.status);
          return (
            <button
              key={c.id}
              onClick={() => setSelectedAlert(caseToAlert(c))}
              className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-left flex items-center gap-3 active:scale-[0.98] transition-transform"
            >
              <div className="w-2 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: oc.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-mono font-bold" style={{ color: ACCENT }}>{c.id}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: oc.bg, color: oc.color }}>{oc.label}</span>
                </div>
                <div className="text-sm font-semibold text-gray-900">{c.station}</div>
                <div className="text-xs text-gray-400">{c.date} {c.time} · {Number(c.elapsed) >= 60 ? `${(Number(c.elapsed) / 60).toFixed(1)}hr` : `${c.elapsed}m`}</div>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
