import { useState, useEffect } from 'react';
import { detectNearbyLines } from '../../utils/location';
import { UserSession } from '../../App';

import {
  AlertTriangleIcon,
  MapPinIcon,
  ChevronRightIcon,
  InfoIcon,
  Loader2,
  ClockIcon,
  FileTextIcon,
} from 'lucide-react';

const RECENT_STATUS_BADGE: Record<string, string> = {
  verified: 'bg-green-50 text-green-600',
  resolved: 'bg-green-50 text-green-600',
  pending: 'bg-yellow-50 text-yellow-600',
  en_route: 'bg-blue-50 text-blue-600',
  escalated: 'bg-red-50 text-red-600',
  dismissed: 'bg-gray-100 text-gray-400',
};

interface HomeProps {
  onNavigate: (tab: any) => void;
  session?: UserSession | null;
}

export function Home({ onNavigate, session }: HomeProps) {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedLine, setSelectedLine] = useState('All Lines');
  const [lines, setLines] = useState<string[]>(['All Lines']);
  const [recentReport, setRecentReport] = useState<any | null>(null);

  const [showLinePicker, setShowLinePicker] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

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
    fetch(`${import.meta.env.VITE_API_URL}/api/data/incident-near-me`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setIncidents(data || []))
      .catch(err => console.error('Failed to fetch incidents', err));

    fetch(`${import.meta.env.VITE_API_URL}/api/data/lines`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setLines(['All Lines', ...data.map((l: any) => l.lineName)]))
      .catch(console.error);

    if (session?.userId) {
      fetch(`${import.meta.env.VITE_API_URL}/api/data/my-history`, {
        credentials: 'include'
      })
        .then(res => res.json())
        .then(data => setRecentReport(Array.isArray(data) && data.length > 0 ? data[0] : null))
        .catch(console.error);
    }
  }, [session?.userId]);

  const todayDate = new Date().toISOString().split('T')[0];

  const filteredIncidents = incidents.filter(i => {
    // Only show if it happened today
    if (i.date !== todayDate) return false;

    // Filter by selected line
    if (selectedLine !== 'All Lines' && i.line !== selectedLine) return false;

    return true;
  });

  const activeIncident = filteredIncidents.find(i => i.status === 'Verified') || filteredIncidents[0];

  return (
    <div

      className="px-5 pt-0 pb-10 space-y-2"
    >
      {/* ── 1. DASHBOARD: Curved Header Container ── */}
      <div
        className={`relative -mx-5 px-5 pt-5 pb-12 rounded-b-[300px] ${activeIncident ? 'bg-red-100' : 'bg-[#0B4F6C]/10'
          } z-30 flex flex-col items-center shadow-sm mb-6`}
      >
        <div className="w-full max-w- flex flex-col items-center space-y-2">
          {/* 1.1 Integrated Control Row */}
          <div className={`relative w-full bg-[#FAF9F5]/100 backdrop-blur-md border border-[#FAF9F5]/40 transition-all  ${showLinePicker ? 'rounded-t-[8px] rounded-b-none' : 'rounded-[28px]'
            }`}>
            <div className="flex items-center gap-2 p-1">
              {/* Action 1: Detect Location (Clean Transparent Style) */}
              <button
                onClick={handleDetectLocation}
                disabled={isLocating}
                className={`relative w-16 h-20 rounded-[32px] flex-shrink-0 flex flex-col items-center justify-center transition-all duration-300 ${isLocating ? 'text-gray-400' : 'text-[#0B4F6C] active:scale-90'} border-r border-white/20`}
              >
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <div className="relative">
                    {isLocating ? (
                      <Loader2 className="animate-spin" size={22} />
                    ) : (
                      <MapPinIcon size={22} />
                    )}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-[0.1em] ${isLocating ? 'text-gray-400' : 'text-[#0B4F6C]'}`}>
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
              <div className="absolute top-[calc(100%-1px)] left-[-1px] right-[-1px] bg-[#FAF9F5]  rounded-b-[28px] border-x border-b border-white/20 shadow-2xl z-[100] overflow-hidden">
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

          {/* 1.2 Status Display */}
          <div className="flex flex-col items-center justify-center text-center py-1">
            <h2 className={`text-[100px] font-black  ${activeIncident ? 'text-red-600' : 'text-[#0B4F6C]'}`}>
              {filteredIncidents.length}
            </h2>
            <p className={`text-[15px] font-black uppercase tracking-[0.2em] ${activeIncident ? 'text-red-600' : 'text-[#0B4F6C]/40'}`}>
              {filteredIncidents.length === 1 ? 'Active Report' : 'Active Reports'}
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. ACTIONS: Main Content Area ── */}
      <div className="space-y-4">

        {/* Recent Report Card */}
        {recentReport && (
          <button
            onClick={() => onNavigate('report')}
            className="w-full text-left bg-white rounded-[24px] p-4 border border-gray-100 shadow-sm active:scale-[0.98] transition-transform"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-50 flex-shrink-0 flex items-center justify-center text-gray-400">
                <FileTextIcon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Your Recent Report</p>
                <p className="text-sm font-bold text-gray-900 truncate">{recentReport.id}</p>
                <p className="text-xs text-gray-500 mt-0.5">{recentReport.line} · Coach {recentReport.coach}</p>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                  <ClockIcon size={11} />
                  {recentReport.date} at {recentReport.time}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${RECENT_STATUS_BADGE[recentReport.status] ?? 'bg-gray-100 text-gray-400'}`}>
                  {recentReport.status.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                </span>
                <ChevronRightIcon size={14} className="text-gray-300" />
              </div>
            </div>
          </button>
        )}

        {/*
        <button
          onClick={() => onNavigate('incident')}
          className={`w-full py-5 px-8 rounded-3xl flex items-center justify-between transition-all group ${activeIncident ? 'bg-white border-red-100' : 'bg-white border-[#0B4F6C]/20'} border shadow-sm active:scale-[0.98]`}
        >
          <div className="flex flex-col items-start text-left">
            <span className={`text-[10px] font-black uppercase tracking-widest ${activeIncident ? 'text-red-600' : 'text-[#0B4F6C]'}`}>
              View Safety Details
            </span>
            <span className="text-[10px] font-medium text-gray-400">
              {activeIncident ? `Tracking at ${activeIncident.stationName}` : "Monitoring all local lines"}
            </span>
          </div>
          <div className={`p-1.5 rounded-lg transition-transform group-hover:translate-x-1 ${activeIncident ? 'bg-red-100 text-red-600' : 'bg-[#0B4F6C]/10 text-[#0B4F6C]'}`}>
            <ChevronRightIcon size={14} />
          </div>
        </button>
*/}
        {/* 2.2 Report Incident */}
        <button
          onClick={() => onNavigate('report')}
          className="w-full rounded-[24px] p-5 text-left active:scale-[0.98] transition-transform shadow-sm"
          style={{ backgroundColor: '#ad1a1a' }}
        >
          <div className="flex items-center gap-4 text-[#FAF9F5]">
            <AlertTriangleIcon size={32} strokeWidth={2.5} />
            <div>
              <p className="text-sm font-black leading-none">Report Misuse of WOCs</p>
              <p className="text-xs font-bold text-white/80 mt-1.5 tracking-widest">For immediate assistance</p>
            </div>
            <ChevronRightIcon size={24} className="text-white/60 ml-auto" />
          </div>
        </button>

        {/* 2.3 Safety Guidance */}
        <section
          onClick={() => window.location.href = "tel:999"}
          className="bg-[#0B4F6C]/5 rounded-[32px] p-6 border border-[#0B4F6C]/10 cursor-pointer active:scale-[0.98] transition-transform"
        >
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-2xl bg-[#0B4F6C]/10 flex items-center justify-center text-[#0B4F6C] flex-shrink-0">
              <InfoIcon size={20} />
            </div>

            <div className="text-left">
              <h4 className="text-sm font-black text-[#0B4F6C] mb-1">
                Emergency Assistance
              </h4>

              <p className="text-[12px] text-[#0B4F6C]/70 font-medium leading-relaxed">
                If you feel your life is in immediate risk, please call 999.
              </p>

              <p className="text-[12px] text-[#0B4F6C]/60 underline mt-1 uppercase tracking-wide">
                Tap to call emergency services
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
