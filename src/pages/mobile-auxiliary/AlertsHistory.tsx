import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  SearchIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  MinusCircleIcon,
  ClockIcon,
  MapPinIcon,
  HistoryIcon,
} from 'lucide-react';

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
}

const getOutcomeConfig = (status: string) => {
  const map: Record<string, { color: string; bg: string; icon: JSX.Element; label: string }> = {
    resolved: { color: '#2D7A5D', bg: '#F0FBF6', icon: <CheckCircleIcon className="w-4 h-4" />, label: 'Resolved' },
    escalated: { color: '#D34026', bg: '#FEF2F0', icon: <AlertTriangleIcon className="w-4 h-4" />, label: 'Escalated' },
    dismissed: { color: '#4A5568', bg: '#F7FAFC', icon: <MinusCircleIcon className="w-4 h-4" />, label: 'Dismissed' },
  };
  return map[status?.toLowerCase()] || { color: '#4A5568', bg: '#F7FAFC', icon: <MinusCircleIcon className="w-4 h-4" />, label: status };
};

export function AlertsHistory({ userId }: { userId: string }) {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`http://localhost:5293/api/data/auxiliary/history?userId=${userId}`)
      .then(res => res.json())
      .then(data => { setCases(data); setLoading(false); })
      .catch(err => { console.error('Failed to fetch history', err); setLoading(false); });
  }, [userId]);

  // Client-side date filtering
  const filtered = cases.filter(c => {
    const matchesSearch =
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      (c.station && c.station.toLowerCase().includes(search.toLowerCase()));

    const caseDate = new Date(c.date);
    const now = new Date();
    let matchesDate = true;
    if (dateFilter === 'today') {
      matchesDate = caseDate.toDateString() === now.toDateString();
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
      matchesDate = caseDate >= weekAgo;
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now); monthAgo.setMonth(now.getMonth() - 1);
      matchesDate = caseDate >= monthAgo;
    }
    return matchesSearch && matchesDate;
  });

  // ── Case Detail View ──────────────────────────────────────────────────────────
  if (selectedCase) {
    const oc = getOutcomeConfig(selectedCase.status);
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2 border-b border-gray-100 bg-white">
          <button
            onClick={() => setSelectedCase(null)}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeftIcon className="w-5 h-5" style={{ color: ACCENT }} />
          </button>
          <span className="text-sm font-semibold text-gray-900">Case Detail</span>
        </div>

        <div className="px-4 py-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1" style={{ backgroundColor: oc.bg, color: oc.color }}>
              {oc.icon} {oc.label}
            </span>
            <span className="text-xs font-mono font-bold" style={{ color: ACCENT }}>
              {selectedCase.id}
            </span>
          </div>

          <h2 className="text-base font-bold text-gray-900">{selectedCase.source === 'ai' ? 'AI Detection' : 'Passenger Report'}</h2>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2.5">
            <div className="flex items-center gap-2 text-sm">
              <MapPinIcon className="w-4 h-4 flex-shrink-0 text-gray-400" />
              <span className="text-gray-900">{selectedCase.station} · {selectedCase.line}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <ClockIcon className="w-4 h-4 flex-shrink-0 text-gray-400" />
              <span className="text-gray-900">{selectedCase.date} {selectedCase.time}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xs font-medium text-gray-400">Train:</span>
              <span className="text-sm font-medium text-gray-900">{selectedCase.trainId || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xs font-medium text-gray-400">Coach:</span>
              <span className="text-sm font-medium text-gray-900">{selectedCase.coachId || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xs font-medium text-gray-400">Duration:</span>
              <span className="text-sm font-medium text-gray-900">{selectedCase.elapsed}m</span>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-gray-900">Case Timeline</h3>
            <div className="space-y-3">
              {[
                { label: 'Alert Triggered', detail: 'System alert created' },
                { label: 'Operator Verified', detail: 'Command Center confirmed alert' },
                { label: 'Officer Dispatched', detail: 'Notification sent to officer' },
                { label: 'Officer On Scene', detail: `Arrived within ${selectedCase.elapsed}m` },
                { label: 'Case Closed', detail: oc.label },
              ].map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#2D7A5D' }}>
                      <CheckCircleIcon className="w-3 h-3 text-white" />
                    </div>
                    {i < 4 && <div className="w-0.5 h-5 mt-1 bg-gray-200" />}
                  </div>
                  <div className="pb-1">
                    <div className="text-sm font-semibold text-gray-900">{step.label}</div>
                    <div className="text-xs text-gray-500">{step.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xs font-semibold mb-1 text-gray-400">Officer Notes</div>
            <p className="text-sm text-gray-900">No additional notes available for this case.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── List View ─────────────────────────────────────────────────────────────────
  return (
    <motion.div
      key="history"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="flex-1 overflow-y-auto scrollbar-thin"
    >
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-lg font-bold text-gray-900">Case History</h2>
      </div>

      {/* Search */}
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

      {/* Date Filter */}
      <div className="flex gap-2 px-4 mb-3 overflow-x-auto scrollbar-thin pb-1">
        {[{ id: 'today', label: 'Today' }, { id: 'week', label: 'This Week' }, { id: 'month', label: 'This Month' }, { id: 'all', label: 'All Time' }].map(f => (
          <button
            key={f.id}
            onClick={() => setDateFilter(f.id as typeof dateFilter)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              backgroundColor: dateFilter === f.id ? ACCENT : 'white',
              color: dateFilter === f.id ? 'white' : '#4A5568',
              border: `1px solid ${dateFilter === f.id ? ACCENT : '#E2E8F0'}`
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Cases */}
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
        ) : (
          filtered.map(c => {
            const oc = getOutcomeConfig(c.status);
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCase(c)}
                className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-left flex items-center gap-3 active:scale-[0.98] transition-transform"
              >
                <div className="w-2 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: oc.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono font-bold" style={{ color: ACCENT }}>{c.id}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: oc.bg, color: oc.color }}>
                      {oc.label}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">{c.station}</div>
                  <div className="text-xs text-gray-400">{c.date} {c.time} · {c.elapsed}m</div>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </button>
            );
          })
        )}
      </div>
    </motion.div>
  );
}