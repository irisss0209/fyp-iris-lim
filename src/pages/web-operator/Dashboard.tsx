import React, { useState } from 'react';
import {
  BellIcon,
  CameraIcon,
  CheckCircleIcon,
  ClockIcon,
  CalendarIcon,
  CpuIcon,
  UserIcon
} from 'lucide-react';
import type { NavPage } from './OperatorInterface';

interface DashboardProps {
  onNavigate?: (page: NavPage) => void;
}

type DateRange = 'today' | 'yesterday' | '7days' | '30days' | 'custom';

const ALL_ALERTS = [
  {
    id: 'ALT-001',
    coach: 'KJ-07 Coach 3',
    line: 'LRT Kelana Jaya',
    station: 'Masjid Jamek',
    time: '2 min ago',
    status: 'pending',
    confidence: 94,
    source: 'ai',
    range: ['today', '7days', '30days', 'custom']
  },
  {
    id: 'ALT-002',
    coach: 'KTM-12 Coach 1',
    line: 'KTM Komuter',
    station: 'KL Sentral',
    time: '8 min ago',
    status: 'verified',
    confidence: 88,
    source: 'ai',
    range: ['today', 'yesterday', '7days', '30days', 'custom']
  },
  {
    id: 'RPT-001',
    coach: 'MRT-05 Coach 2',
    line: 'MRT Putrajaya',
    station: 'Cyberjaya Utama',
    time: '15 min ago',
    status: 'pending',
    confidence: null,
    source: 'passenger',
    range: ['today', '7days', '30days', 'custom']
  },
  {
    id: 'ALT-004',
    coach: 'KJ-03 Coach 3',
    line: 'LRT Kelana Jaya',
    station: 'Bangsar',
    time: '22 min ago',
    status: 'dismissed',
    confidence: 87,
    source: 'ai',
    range: ['today', 'yesterday', '7days', '30days', 'custom']
  }
];

const RANGE_LABELS: Record<DateRange, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  '7days': '7 Days',
  '30days': '30 Days',
  custom: 'Custom'
};

export function Dashboard({ onNavigate }: DashboardProps) {
  const [selectedRange, setSelectedRange] = useState<DateRange>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const filteredAlerts = ALL_ALERTS.filter((a) =>
    a.range.includes(selectedRange)
  );

  const getSubtitle = () => {
    switch (selectedRange) {
      case 'today':
        return (
          <>
            Real-time overview —{' '}
            <span className="text-gray-500">Sunday, 1 March 2026</span>
          </>
        );
      case 'yesterday':
        return (
          <>
            Showing data for{' '}
            <span className="text-gray-500">Saturday, 28 February 2026</span>
          </>
        );
      case '7days':
        return <span className="text-gray-500">Showing last 7 days</span>;
      case '30days':
        return <span className="text-gray-500">Showing last 30 days</span>;
      case 'custom':
        if (customFrom && customTo) {
          return (
            <span className="text-gray-500">
              Custom range: {customFrom} → {customTo}
            </span>
          );
        }
        return <span className="text-gray-400 italic">Select a date range</span>;
    }
  };

  return (
    <div
      className="p-8 min-h-full"
      style={{ backgroundColor: '#FAF9F5' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-7 gap-6">
        <div>
          <h1 className="text-[28px] font-bold text-gray-900 leading-tight">
            Dashboard
          </h1>
          <p className="text-sm text-gray-400 mt-1">{getSubtitle()}</p>
        </div>

        {/* Date Filter */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <CalendarIcon size={13} className="text-gray-400" aria-hidden="true" />
            <span className="text-xs text-gray-400 font-medium">Filter by date</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {(Object.keys(RANGE_LABELS) as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setSelectedRange(range)}
                className={`
                  text-xs px-3 py-1.5 rounded-full border font-medium transition-colors duration-150
                  ${selectedRange === range ? 'bg-[#0B4F6C] text-white border-[#0B4F6C]' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}
                `}
                aria-pressed={selectedRange === range}
              >
                {RANGE_LABELS[range]}
              </button>
            ))}

            {selectedRange === 'custom' && (
              <div className="flex items-center gap-1.5 ml-1">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#0B4F6C] bg-white"
                  aria-label="From date"
                />
                <span className="text-xs text-gray-400">→</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#0B4F6C] bg-white"
                  aria-label="To date"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Unverified Alerts</span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
              <BellIcon size={16} className="text-orange-400" aria-hidden="true" />
            </div>
          </div>
          <div className="text-4xl font-bold text-gray-900 mb-1">7</div>
          <div className="text-xs text-gray-400">3 high priority</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Verified Today</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <CheckCircleIcon size={16} style={{ color: '#0B4F6C' }} aria-hidden="true" />
            </div>
          </div>
          <div className="text-4xl font-bold text-gray-900 mb-1">24</div>
          <div className="text-xs text-green-500 font-medium">+6 from yesterday</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Cameras Online</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <CameraIcon size={16} style={{ color: '#0B4F6C' }} aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-4xl font-bold text-gray-900">47</span>
            <span className="text-lg text-gray-400 font-medium">/50</span>
          </div>
          <div className="text-xs text-gray-400">3 offline</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Avg Response</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <ClockIcon size={16} style={{ color: '#0B4F6C' }} aria-hidden="true" />
            </div>
          </div>
          <div className="text-4xl font-bold text-gray-900 mb-1">2.4</div>
          <div className="text-xs text-green-500 font-medium">↓ 0.3m faster</div>
        </div>
      </div>

      {/* Recent Alerts (Full Width) */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 min-w-0">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900">Recent Alerts</h2>
            {filteredAlerts.length !== ALL_ALERTS.length && (
              <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                {filteredAlerts.length} result{filteredAlerts.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button
            className="text-sm font-medium flex items-center gap-1 transition-colors hover:opacity-80"
            style={{ color: '#0B4F6C' }}
            onClick={() => onNavigate?.('live-alerts')}
            aria-label="View all alerts"
          >
            View All <span aria-hidden="true">→</span>
          </button>
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarIcon size={32} className="text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-400">No alerts for this period</p>
            <p className="text-xs text-gray-300 mt-1">Try selecting a different date range</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center gap-4 py-5">
                <div
                  className="w-1.5 h-14 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor:
                      alert.status === 'pending' ? '#f87171' :
                        alert.status === 'verified' ? '#4ade80' : '#d1d5db'
                  }}
                  aria-hidden="true"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-4 mb-2 flex-wrap">
                    <span className="text-lg font-bold text-gray-800">{alert.coach}</span>
                    <span
                      className="text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: alert.line === 'LRT Kelana Jaya' ? 'rgba(241, 123, 39, 0.34)' : alert.line === 'KTM Komuter' ? '#0B4F6C18' : '#2D7A5D18',
                        color: alert.line === 'LRT Kelana Jaya' ? 'rgb(241, 123, 39)' : alert.line === 'KTM Komuter' ? '#0B4F6C' : '#2D7A5D'
                      }}
                    >
                      {alert.line}
                    </span>
                    <span className="text-sm px-3 py-1 rounded-full bg-gray-50 font-semibold text-gray-500 border border-gray-100">
                      {alert.station}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-1.5">
                    {alert.source === 'ai' && alert.confidence !== null ? (
                      <span
                        className="text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2"
                        style={{ backgroundColor: '#FEF2F0', color: '#D34026' }}
                      >
                        AI detected, {alert.confidence}% confidence
                      </span>
                    ) : (
                      <span
                        className="text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2"
                        style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
                      >
                        Passenger reported
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2.5 flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-400">{alert.time}</span>
                  <span
                    className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-extrabold"
                    style={{
                      backgroundColor: alert.status === 'pending' ? '#FFF7ED' : alert.status === 'verified' ? '#F0FDF4' : '#F9FAFB',
                      color: alert.status === 'pending' ? '#C2410C' : alert.status === 'verified' ? '#15803D' : '#6B7280'
                    }}
                  >
                    {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}