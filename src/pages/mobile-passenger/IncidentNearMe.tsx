import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClockIcon, MapPinIcon, ChevronRightIcon, Loader2, XCircleIcon, SearchIcon, AlertTriangleIcon } from 'lucide-react';
import { detectNearbyLines } from '../../utils/location';

export function IncidentNearMe() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedLine, setSelectedLine] = useState('All Lines');
  const [lines, setLines] = useState<string[]>(['All Lines']);
  const [showLinePicker, setShowLinePicker] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const handleDetectLocation = () => {
    if (selectedLine !== 'All Lines') {
      setSelectedLine('All Lines');
      return;
    }

    detectNearbyLines(
      setIsLocating,
      (foundLines) => {
        if (foundLines.length > 0) {
          setSelectedLine(foundLines[0]);
        }
      },
      (msg) => alert(msg)
    );
  };

  useEffect(() => {
    fetch('http://localhost:5293/api/data/incident-near-me')
      .then(res => res.json())
      .then(data => {
        setIncidents(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch incidents near me', err);
        setLoading(false);
      });

    fetch('http://localhost:5293/api/data/lines')
      .then(res => res.json())
      .then(data => {
        const names = data.map((l: any) => l.lineName);
        setLines(['All Lines', ...names]);
      })
      .catch(console.error);
  }, []);

  const filteredIncidents = incidents.filter(inc => {
    // Location filter
    if (selectedLine !== 'All Lines' && inc.line !== selectedLine) return false;

    // Status filter
    if (statusFilter !== 'All' && inc.status !== statusFilter) return false;

    // Search query filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        inc.type.toLowerCase().includes(q) ||
        inc.line.toLowerCase().includes(q) ||
        inc.station.toLowerCase().includes(q)
      );
    }

    return true;
  });

  const statuses = ['All', ...Array.from(new Set(incidents.map(i => i.status)))];

  return (
    <div
      key="incident-near-me"
      className="px-4 pt-5 pb-6 space-y-4"
    >
      {/* Integrated Control Row */}
      <div className={`relative w-full bg-white/30 backdrop-blur-md border border-white/20 transition-all duration-300 ${showLinePicker ? 'rounded-t-[28px] rounded-b-none z-50' : 'rounded-[28px] z-30'}`}>
        <div className="flex items-center gap-2 p-2">
          {/* Action 1: Detect Location (Simplified Grey-out state) */}
          <button
            onClick={handleDetectLocation}
            disabled={isLocating}
            className={`relative w-16 h-20 rounded-[32px] flex-shrink-0 flex flex-col items-center justify-center transition-all duration-300 ${isLocating ? 'text-gray-400' : 'text-[#0B4F6C] active:scale-90'} border-r border-white/20`}
          >
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="relative">
                <MapPinIcon size={22} />
              </div>
              <span className={`text-[9px] font-black uppercase tracking-[0.1em] ${isLocating ? 'text-gray-400' : 'text-[#0B4F6C]'}`}>
                {selectedLine === 'All Lines' ? 'All' : 'Near Me'}
              </span>
            </div>
          </button>

          {/* Action 2: Line Trigger */}
          <button
            onClick={() => setShowLinePicker(!showLinePicker)}
            className="flex-grow flex flex-col items-start text-left pl-3 pr-4 py-2 rounded-2xl hover:bg-white/10 active:scale-[0.98] transition-all"
          >
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1.5">Showing results for</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-gray-900 leading-none">{selectedLine}</span>
              <ChevronRightIcon size={14} className={`text-gray-400 transition-transform duration-300 ${showLinePicker ? 'rotate-90' : ''}`} />
            </div>
          </button>
        </div>

        {/* Floating Dropdown (Full-Width, Connected Style) */}
        {showLinePicker && (
          <div className="absolute top-[calc(100%-1px)] left-[-1px] right-[-1px] bg-[#FAF9F5] rounded-b-[28px] border-x border-b border-white/20 shadow-2xl z-[100] overflow-hidden">
            <div className="p-2 max-h-[280px] overflow-y-auto">
              {lines.map(l => (
                <button
                  key={l}
                  onClick={() => { setSelectedLine(l); setShowLinePicker(false); }}
                  className={`w-full px-5 py-3.5 text-left text-sm font-bold transition-all flex items-center justify-between rounded-xl mb-1 last:mb-0 ${selectedLine === l ? 'text-[#0B4F6C] bg-[#0B4F6C]/10' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  {l}
                  {selectedLine === l && <div className="w-1.5 h-1.5 rounded-full bg-[#0B4F6C]" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search and Filter Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search station..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-xl py-2.5 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/10 shadow-sm transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-white border border-gray-100 rounded-xl py-2.5 px-3 text-xs focus:outline-none shadow-sm font-bold text-gray-600"
        >
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-10 space-y-3">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-[#0B4F6C] rounded-full animate-spin" />
          <p className="text-xs text-gray-400 font-medium">Scanning for active incidents...</p>
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <p className="text-sm font-bold text-gray-900">No Incidents Found</p>
          <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
            {searchQuery || statusFilter !== 'All'
              ? 'Try adjusting your filters or search terms.'
              : selectedLine !== 'All Lines'
                ? `No incidents on the ${selectedLine}.`
                : 'There are currently no active violations reported.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.values(filteredIncidents.reduce((acc: any, inc) => {
            const stationKey = `${inc.line}-${inc.station}`;
            if (!acc[stationKey]) {
              acc[stationKey] = {
                station: inc.station,
                line: inc.line,
                statuses: {}
              };
            }
            acc[stationKey].statuses[inc.status] = (acc[stationKey].statuses[inc.status] || 0) + 1;
            return acc;
          }, {})).map((group: any) => (
            <div key={`${group.line}-${group.station}`} className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 p-5 active:scale-[0.99] transition-transform">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-black text-base text-gray-900 leading-none">{group.station}</h3>
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <MapPinIcon size={12} className="text-[#0B4F6C]" />
                    {group.line}
                  </div>
                </div>

              </div>

              <div className="flex flex-wrap gap-2">
                {Object.entries(group.statuses).map(([status, count]: [any, any]) => {
                  let displayStatus = status;
                  if (status === 'Verified') displayStatus = 'En Route';

                  return (
                    <div
                      key={status}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-100 bg-gray-50/50 text-gray-500"
                    >
                      <span className="text-[9px] font-black uppercase tracking-widest">{displayStatus}</span>
                      <span className="w-5 h-5 rounded-lg flex items-center justify-center bg-[#0B4F6C]/10 text-[#0B4F6C] text-[11px] font-black">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
