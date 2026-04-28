import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { BellIcon, ClockIcon, UserIcon } from 'lucide-react';
import { RecentAlerts } from './RecentAlerts';
import { AlertsHistory } from './AlertsHistory';
import { AuxiliaryProfile } from './AuxiliaryProfile';
import { AuxiliaryShift } from './AuxiliaryShift';
import { ChangePasswordPage } from '../auth/ChangePasswordPage';
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
  const [assignedStationId, setAssignedStationId] = useState<string | undefined>(undefined);
  const [showChangePassword, setShowChangePassword] = useState(false);

  return (
    <div className="flex flex-col h-full relative w-full sm:max-w-md mx-auto overflow-hidden sm:shadow-2xl sm:rounded-[40px] sm:border-[8px] sm:border-white sm:ring-1 sm:ring-gray-100 min-h-screen sm:min-h-[850px] sm:max-h-[900px]" style={{ backgroundColor: '#FAF9F5' }}>

      {/* ── Top Header (Inactive) ── */}
      {/* 
      <div className="flex items-center justify-between px-5 pt-12 pb-4 flex-shrink-0">
         ... logo and time ...
      </div>
      */}

      <div className="pt-6">
        <AuxiliaryShift userId={session.userId} onStationDetected={(id) => setAssignedStationId(id)} />
      </div>

      {/* ── Shift Banner ── */}

      {/* ── Scrollable Content ── */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'alerts' && (
            <RecentAlerts
              key="alerts"
              assignedStationId={assignedStationId}
              userId={session.userId}
              userName={session.userName}
            />
          )}
          {activeTab === 'history' && <AlertsHistory key="history" userId={session.userId} />}
          {activeTab === 'profile' && (
            showChangePassword ? (
              <ChangePasswordPage
                key="change-password"
                session={session}
                onBack={() => setShowChangePassword(false)}
              />
            ) : (
              <AuxiliaryProfile
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
        className="w-full bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)] border-t border-gray-100 flex p-1.5 z-20"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {TABS.map(({ id, icon: Icon, label }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl transition-all duration-200 ${active ? 'text-[#0B4F6C]' : 'text-gray-400 hover:text-gray-600'
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