import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { BarChart2Icon, AlertTriangleIcon, UserIcon } from 'lucide-react';
import { Home } from './Home';
import { Report } from './PassengerReport';
import { Profile } from './PassengerProfile';
import { UserSession } from '../../App';

export interface PassengerInterface {
  session: UserSession;
  onLogout: () => void;
}

type Tab = 'home' | 'report' | 'profile';

const ACCENT = '#0B4F6C';

const TABS: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: 'home', icon: BarChart2Icon, label: 'Trends' },
  { id: 'report', icon: AlertTriangleIcon, label: 'Report' },
  { id: 'profile', icon: UserIcon, label: 'Profile' },
];

export function PassengerInterface({ session, onLogout }: PassengerInterface) {
  const [activeTab, setActiveTab] = useState<Tab>('home');

  return (
    <div className="flex flex-col h-full relative w-full sm:max-w-md mx-auto overflow-hidden sm:shadow-2xl sm:rounded-[40px] sm:border-[8px] sm:border-white sm:ring-1 sm:ring-gray-100 min-h-screen sm:min-h-[850px] sm:max-h-[850px]" style={{ backgroundColor: '#FAF9F5' }}>

      {/* ── Top Header ── */}
      <div
        className="flex items-center justify-between px-5 pt-12 pb-4 flex-shrink-0"
        style={{ background: '#FAF9F5' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-lg flex-shrink-0"
            style={{
              backgroundImage: 'url(/Railly_logo.png)',
              backgroundSize: '100%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />
          <div>
            <p className="text-black font-bold text-sm leading-none">Railly</p>
            <p className="text-gray-400 text-xs mt-0.5">Passenger Gateway</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Active</span>
        </div>
      </div>

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && <Home key="home" />}
          {activeTab === 'report' && <Report key="report" />}
          {activeTab === 'profile' && <Profile key="profile" session={session} onLogout={onLogout} />}
        </AnimatePresence>
      </div>

      {/* ── Bottom Nav ── */}
      <div className="absolute bottom-0 left-0 right-0 w-full bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)] border-t border-gray-100 flex p-1.5 pb-4 sm:pb-1.5 z-20">
        {TABS.map(({ id, icon: Icon, label }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl transition-all duration-200 ${active ? 'text-[#0B4F6C]' : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              <Icon size={24} style={{ color: active ? ACCENT : 'currentColor' }} />
              <span
                className="text-[10px] font-bold"
                style={{ color: active ? ACCENT : 'currentColor' }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
