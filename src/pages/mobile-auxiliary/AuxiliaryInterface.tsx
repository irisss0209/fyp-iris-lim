import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { BellIcon, ClockIcon, UserIcon, ShieldIcon } from 'lucide-react';
import { RecentAlerts } from './RecentAlerts';
import { AlertsHistory } from './AlertsHistory';
import { AuxiliaryProfile } from './AuxiliaryProfile';
import { AuxiliaryShift } from './AuxiliaryShift';
import { UserSession } from '../../App';

type Tab = 'alerts' | 'history' | 'profile';

const TABS: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: 'alerts', icon: BellIcon, label: 'Alerts' },
  { id: 'history', icon: ClockIcon, label: 'History' },
  { id: 'profile', icon: UserIcon, label: 'Profile' },
];

export interface AuxiliaryInterface {
  session: UserSession;
  onLogout: () => void;
}

export function AuxiliaryInterface({ session, onLogout }: AuxiliaryInterface) {
  const [activeTab, setActiveTab] = useState<Tab>('alerts');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [assignedStationId, setAssignedStationId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString('en-MY', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

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
            <p className="text-gray-400 text-xs mt-0.5">Police Hub</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-mono font-medium text-gray-600">{formattedTime}</span>
        </div>
      </div>

      {/* ── Officer info strip ── */}
      <div className="px-4 pb-3 flex-shrink-0" style={{ background: '#FAF9F5' }}>
        <div
          className="rounded-2xl px-4 py-3 flex items-center justify-between border border-[#D0E8F2] bg-[#EBF4F8]"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 bg-theme-auxiliary"
            >
              {session.userName.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{session.userName}</p>
              <p className="text-xs text-gray-400">{session.employeeId || 'APM-GENERAL'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 rounded-xl px-2.5 py-1">
            <ShieldIcon size={11} className="text-green-600" />
            <span className="text-[10px] font-bold text-green-700">ON DUTY</span>
          </div>
        </div>
      </div>

      {/* ── Shift Banner ── */}
      <AuxiliaryShift userId={session.userId} onStationDetected={(id) => setAssignedStationId(id)} />

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'alerts' && <RecentAlerts key="alerts" assignedStationId={assignedStationId} />}
          {activeTab === 'history' && <AlertsHistory key="history" userId={session.userId} />}
          {activeTab === 'profile' && <AuxiliaryProfile key="profile" session={session} onLogout={onLogout} />}
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
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl transition-all duration-200 ${
                active ? 'text-theme-auxiliary' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon size={24} />
              <span className="text-[10px] font-bold">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}