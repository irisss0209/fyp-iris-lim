import React, { useState } from 'react';
import {
  SearchIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  MinusCircleIcon,
  ClockIcon,
  MapPinIcon } from
'lucide-react';
interface Case {
  id: string;
  caseId: string;
  station: string;
  line: string;
  datetime: string;
  outcome: 'Resolved' | 'Escalated' | 'No Action';
  duration: string;
  coachId: string;
  description: string;
  notes: string;
}
const CASES: Case[] = [
{
  id: 'C1',
  caseId: 'GC-2025-0142',
  station: 'Masjid Jamek',
  line: 'LRT Kelana Jaya',
  datetime: '28 Feb 2025, 14:32',
  outcome: 'Resolved',
  duration: '12 min',
  coachId: 'KJ-07 Coach 3',
  description: 'Male detected in women-only coach',
  notes:
  'Individual voluntarily relocated to correct coach after being informed.'
},
{
  id: 'C2',
  caseId: 'GC-2025-0141',
  station: 'KL Sentral',
  line: 'KTM Komuter',
  datetime: '28 Feb 2025, 13:45',
  outcome: 'Resolved',
  duration: '8 min',
  coachId: 'KTM-12 Coach 1',
  description: 'Male detected in women-only coach',
  notes:
  'Passenger was unaware of the women-only policy. Educated and relocated.'
},
{
  id: 'C3',
  caseId: 'GC-2025-0140',
  station: 'Bangsar',
  line: 'LRT Kelana Jaya',
  datetime: '28 Feb 2025, 12:30',
  outcome: 'Escalated',
  duration: '25 min',
  coachId: 'KJ-03 Coach 3',
  description: 'Repeated non-compliance',
  notes:
  'Individual refused to relocate. Escalated to supervisor and formal report filed.'
},
{
  id: 'C4',
  caseId: 'GC-2025-0139',
  station: 'Cyberjaya Utama',
  line: 'MRT Putrajaya',
  datetime: '27 Feb 2025, 16:15',
  outcome: 'No Action',
  duration: '5 min',
  coachId: 'MRT-05 Coach 2',
  description: 'False alarm — female passenger',
  notes:
  'AI detection was incorrect. Passenger confirmed female. False alarm logged.'
},
{
  id: 'C5',
  caseId: 'GC-2025-0138',
  station: 'Subang Jaya',
  line: 'KTM Komuter',
  datetime: '27 Feb 2025, 14:00',
  outcome: 'Resolved',
  duration: '10 min',
  coachId: 'KTM-07 Coach 1',
  description: 'Male detected in women-only coach',
  notes: 'Resolved without incident.'
},
{
  id: 'C6',
  caseId: 'GC-2025-0137',
  station: 'Asia Jaya',
  line: 'LRT Kelana Jaya',
  datetime: '26 Feb 2025, 11:30',
  outcome: 'Resolved',
  duration: '7 min',
  coachId: 'KJ-05 Coach 3',
  description: 'Male detected in women-only coach',
  notes: 'Quick resolution. Individual cooperative.'
}];

export function PoliceHistory() {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<
    'today' | 'week' | 'month' | 'custom'>(
    'week');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const filtered = CASES.filter(
    (c) =>
    c.caseId.toLowerCase().includes(search.toLowerCase()) ||
    c.station.toLowerCase().includes(search.toLowerCase()) ||
    c.line.toLowerCase().includes(search.toLowerCase())
  );
  const outcomeConfig = {
    Resolved: {
      color: '#2D7A5D',
      bg: '#F0FBF6',
      icon: <CheckCircleIcon className="w-4 h-4" />
    },
    Escalated: {
      color: '#D34026',
      bg: '#FEF2F0',
      icon: <AlertTriangleIcon className="w-4 h-4" />
    },
    'No Action': {
      color: '#4A5568',
      bg: '#F7FAFC',
      icon: <MinusCircleIcon className="w-4 h-4" />
    }
  };
  if (selectedCase) {
    const oc = outcomeConfig[selectedCase.outcome];
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2 border-b border-gray-100 bg-white">
          <button
            onClick={() => setSelectedCase(null)}
            className="p-1.5 hover:bg-gray-100 rounded-lg">

            <ChevronLeftIcon
              className="w-5 h-5"
              style={{
                color: '#0B4F6C'
              }} />

          </button>
          <span
            className="text-sm font-semibold"
            style={{
              color: '#1A202C'
            }}>

            Case Detail
          </span>
        </div>
        <div className="px-4 py-5 space-y-4">
          <div className="flex items-center gap-2">
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
              style={{
                backgroundColor: oc.bg,
                color: oc.color
              }}>

              {oc.icon}
              {selectedCase.outcome}
            </span>
            <span
              className="text-xs font-mono font-bold"
              style={{
                color: '#0B4F6C'
              }}>

              {selectedCase.caseId}
            </span>
          </div>

          <h2
            className="text-base font-bold"
            style={{
              color: '#1A202C'
            }}>

            {selectedCase.description}
          </h2>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2.5">
            <div className="flex items-center gap-2 text-sm">
              <MapPinIcon
                className="w-4 h-4 flex-shrink-0"
                style={{
                  color: '#4A5568'
                }} />

              <span
                style={{
                  color: '#1A202C'
                }}>

                {selectedCase.station} · {selectedCase.line}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <ClockIcon
                className="w-4 h-4 flex-shrink-0"
                style={{
                  color: '#4A5568'
                }} />

              <span
                style={{
                  color: '#1A202C'
                }}>

                {selectedCase.datetime}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span
                className="text-xs font-medium"
                style={{
                  color: '#4A5568'
                }}>

                Coach:
              </span>
              <span
                className="text-sm font-medium"
                style={{
                  color: '#1A202C'
                }}>

                {selectedCase.coachId}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span
                className="text-xs font-medium"
                style={{
                  color: '#4A5568'
                }}>

                Duration:
              </span>
              <span
                className="text-sm font-medium"
                style={{
                  color: '#1A202C'
                }}>

                {selectedCase.duration}
              </span>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3
              className="text-sm font-semibold mb-3"
              style={{
                color: '#1A202C'
              }}>

              Case Timeline
            </h3>
            <div className="space-y-3">
              {[
              {
                label: 'Alert Triggered',
                detail: 'AI detection on edge device',
                done: true
              },
              {
                label: 'Operator Verified',
                detail: 'Command Center confirmed alert',
                done: true
              },
              {
                label: 'Officer Dispatched',
                detail: 'PoliceHub notification sent',
                done: true
              },
              {
                label: 'Officer On Scene',
                detail: `Arrived within ${selectedCase.duration}`,
                done: true
              },
              {
                label: 'Case Closed',
                detail: selectedCase.outcome,
                done: true
              }].
              map((step, i) =>
              <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: '#2D7A5D'
                    }}>

                      <CheckCircleIcon className="w-3 h-3 text-white" />
                    </div>
                    {i < 4 &&
                  <div
                    className="w-0.5 h-5 mt-1"
                    style={{
                      backgroundColor: '#E2E8F0'
                    }} />

                  }
                  </div>
                  <div className="pb-1">
                    <div
                    className="text-sm font-semibold"
                    style={{
                      color: '#1A202C'
                    }}>

                      {step.label}
                    </div>
                    <div
                    className="text-xs"
                    style={{
                      color: '#4A5568'
                    }}>

                      {step.detail}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Evidence & Notes */}
          <div className="bg-gray-50 rounded-xl p-3">
            <div
              className="text-xs font-semibold mb-1"
              style={{
                color: '#4A5568'
              }}>

              Officer Notes
            </div>
            <p
              className="text-sm"
              style={{
                color: '#1A202C'
              }}>

              {selectedCase.notes}
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-3">
            <div
              className="text-xs font-semibold mb-2"
              style={{
                color: '#4A5568'
              }}>

              Evidence Log
            </div>
            <div
              className="text-xs"
              style={{
                color: '#4A5568'
              }}>

              <div>📹 CCTV Clip — Anonymized (2.3MB)</div>
              <div className="mt-1">
                📋 Incident Report — {selectedCase.caseId}.pdf
              </div>
            </div>
          </div>
        </div>
      </div>);

  }
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 pt-4 pb-2">
        <h2
          className="text-lg font-bold"
          style={{
            color: '#1A202C'
          }}>

          Case History
        </h2>
      </div>

      {/* Search */}
      <div className="px-4 mb-3">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <SearchIcon className="w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cases, stations..."
            className="flex-1 text-sm bg-transparent focus:outline-none"
            style={{
              color: '#1A202C'
            }} />

        </div>
      </div>

      {/* Date Filter */}
      <div className="flex gap-2 px-4 mb-3 overflow-x-auto scrollbar-thin pb-1">
        {[
        {
          id: 'today',
          label: 'Today'
        },
        {
          id: 'week',
          label: 'This Week'
        },
        {
          id: 'month',
          label: 'This Month'
        },
        {
          id: 'custom',
          label: 'Custom'
        }].
        map((f) =>
        <button
          key={f.id}
          onClick={() => setDateFilter(f.id as typeof dateFilter)}
          className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
          style={{
            backgroundColor: dateFilter === f.id ? '#0B4F6C' : 'white',
            color: dateFilter === f.id ? 'white' : '#4A5568',
            border: `1px solid ${dateFilter === f.id ? '#0B4F6C' : '#E2E8F0'}`
          }}>

            {f.label}
          </button>
        )}
      </div>

      {/* Cases List */}
      <div className="px-4 space-y-2 pb-4">
        {filtered.map((c) => {
          const oc = outcomeConfig[c.outcome];
          return (
            <button
              key={c.id}
              onClick={() => setSelectedCase(c)}
              className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-left flex items-center gap-3 active:scale-[0.98] transition-transform">

              <div
                className="w-2 self-stretch rounded-full flex-shrink-0"
                style={{
                  backgroundColor: oc.color
                }} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className="text-xs font-mono font-bold"
                    style={{
                      color: '#0B4F6C'
                    }}>

                    {c.caseId}
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: oc.bg,
                      color: oc.color
                    }}>

                    {c.outcome}
                  </span>
                </div>
                <div
                  className="text-sm font-semibold"
                  style={{
                    color: '#1A202C'
                  }}>

                  {c.station}
                </div>
                <div
                  className="text-xs"
                  style={{
                    color: '#4A5568'
                  }}>

                  {c.datetime} · {c.duration}
                </div>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </button>);

        })}
      </div>
    </div>);

}