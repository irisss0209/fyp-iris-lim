import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  HomeIcon,
  AlertTriangleIcon,
  MapPinIcon,
  BarChart2Icon,
  UserIcon
} from 'lucide-react';
import { Home } from './Home';
import { Report } from './PassengerReport';
import { Profile } from './PassengerProfile';
import { IncidentNearMe } from './IncidentNearMe';
import { Insights } from './Insights';
import { ChangePasswordPage } from '../auth/ChangePasswordPage';
import { UserSession } from '../../types/session';
import { flushPendingReports } from '../../utils/offlineQueue';

export interface PassengerInterface {
  session: UserSession;
  onLogout: () => void;
}

type Tab = 'home' | 'report' | 'incident' | 'insights' | 'profile';

const TABS: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: 'incident', icon: MapPinIcon, label: 'Nearby' },
  { id: 'report', icon: AlertTriangleIcon, label: 'Reports' },
  { id: 'home', icon: HomeIcon, label: 'Home' },
  { id: 'insights', icon: BarChart2Icon, label: 'Insights' },
  { id: 'profile', icon: UserIcon, label: 'Profile' },
];

export function PassengerInterface({ session, onLogout }: PassengerInterface) {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    const handleOnline = async () => {
      await flushPendingReports(import.meta.env.VITE_API_BASE);
    };
    window.addEventListener('online', handleOnline);
    // Also try on mount in case they were offline and came back
    if (navigator.onLine) handleOnline();
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return (
    <div 
      className="flex flex-col relative w-full sm:max-w-md mx-auto overflow-hidden sm:shadow-2xl sm:rounded-[40px] sm:border-[8px] sm:border-white sm:ring-1 sm:ring-gray-100" 
      style={{ 
        backgroundColor: '#FAF9F5',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        height: '100dvh' 
      }}
    >

      {/* ── Top Header (Commented Out) ── */}
      {/* 
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
            <p className="text-gray-400 text-xs mt-0.5">For Safer Transit</p>
          </div>
        </div>
      </div> 
      */}

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}>
        <AnimatePresence mode="wait">
          {activeTab === 'home' && <Home key="home" onNavigate={(tab) => setActiveTab(tab as Tab)} session={session} />}
          {activeTab === 'incident' && <IncidentNearMe key="incident" />}
          {activeTab === 'report' && <Report key="report" session={session} />}
          {activeTab === 'insights' && <Insights key="insights" session={session} />}
          {activeTab === 'profile' && (
            showChangePassword ? (
              <ChangePasswordPage
                key="change-password"
                session={session}
                onBack={() => setShowChangePassword(false)}
                onLogout={onLogout}
              />
            ) : (
              <Profile 
                key="profile" 
                session={session} 
                onLogout={onLogout} 
                onChangePassword={() => setShowChangePassword(true)}
              />
            )
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom Nav ── */}
      <div
        className="fixed bottom-0 left-0 right-0 sm:absolute w-full bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)] border-t border-gray-100 flex p-1.5 z-20 flex-shrink-0"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {TABS.map(({ id, icon: Icon, label }) => {
          const active = activeTab === id;
          const isHome = id === 'home';

          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`relative flex-1 flex flex-col items-center justify-center transition-all duration-300 ${isHome ? '-mt-10' : 'py-3'
                } ${active && !isHome ? 'text-[#0B4F6C]' : 'text-gray-400'}`}
            >
              {isHome ? (
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg ${active
                    ? 'bg-[#0B4F6C] text-white scale-110 shadow-[#0B4F6C]/30'
                    : 'bg-white text-gray-400 border border-gray-100'
                    }`}>
                    <Icon size={24} strokeWidth={active ? 2.5 : 2} />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-tighter ${active ? 'text-[#0B4F6C]' : 'text-gray-400'}`}>
                    {label}
                  </span>
                </div>
              ) : (
                <>
                  <Icon size={20} />
                  <span className="text-[10px] font-bold">
                    {label}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
