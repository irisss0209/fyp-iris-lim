import React, { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { BellIcon, ClockIcon, UserIcon, SmartphoneIcon } from 'lucide-react';
import { RecentAlerts } from './RecentAlerts';
import { AlertsHistory } from './AlertsHistory';
import { AuxiliaryProfile } from './AuxiliaryProfile';
import { AuxiliaryShift } from './AuxiliaryShift';
import { ChangePasswordPage } from '../auth/ChangePasswordPage';
import { UserSession } from '../../types/session';

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

  // Stable reference — prevents AuxiliaryShift's useEffect from re-running on every render
  const handleStationDetected = useCallback((id: string | undefined) => {
    setAssignedStationId(id);
  }, []);

  return (
    <div
      className="flex flex-col h-screen relative w-full sm:max-w-md mx-auto overflow-hidden sm:shadow-2xl sm:rounded-[40px] sm:border-[8px] sm:border-white sm:ring-1 sm:ring-gray-100"
      style={{
        backgroundColor: '#FAF9F5',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        height: '100dvh'
      }}
    >
      <div className="hidden sm:flex fixed inset-0 z-[100] flex-col items-center justify-center gap-6 bg-[#FAF9F5] p-8 text-center">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#0B4F6C1A' }}>
          <SmartphoneIcon size={40} style={{ color: '#0B4F6C' }} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Mobile Required</h1>
          <p className="text-sm text-gray-500 max-w-[300px] leading-relaxed">
            The Railly auxiliary officer app is designed for mobile use. Please open it on your smartphone.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 text-xs text-gray-400 font-medium">
          <SmartphoneIcon size={13} />
          Please use a mobile device
        </div>
      </div>



      <div className="pt-6">
        <AuxiliaryShift userId={session.userId} token={session.token} onStationDetected={handleStationDetected} />
      </div>


      <div className="flex-1 relative overflow-y-auto" style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}>
        <AnimatePresence mode="wait">
          {activeTab === 'alerts' && (
            <RecentAlerts
              key="alerts"
              assignedStationId={assignedStationId}
              userName={session.userName}
              token={session.token}
            />
          )}
          {activeTab === 'history' && <AlertsHistory key="history" userId={session.userId} token={session.token} />}
          {activeTab === 'profile' && (
            showChangePassword ? (
              <ChangePasswordPage
                key="change-password"
                session={session}
                onBack={() => setShowChangePassword(false)}
                onLogout={onLogout}
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

      <div
        className="fixed bottom-0 left-0 right-0 sm:absolute w-full bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)] border-t border-gray-100 flex p-1.5 z-20 flex-shrink-0"
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
