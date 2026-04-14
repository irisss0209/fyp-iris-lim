import React, { useState } from 'react';
import { LogOutIcon, UserIcon, ShieldIcon, MailIcon, BadgeCheckIcon } from 'lucide-react';
import { UserSession } from '../../App';

interface AuxiliaryProfileProps {
  session: UserSession;
  onLogout: () => void;
}

export function AuxiliaryProfile({ session, onLogout }: AuxiliaryProfileProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    setIsLoggingOut(true);
    setTimeout(onLogout, 1000);
  };

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Profile Header */}
      <div className="flex flex-col items-center">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-4"
          style={{ backgroundColor: '#0B4F6C' }}
        >
          {session.userName.charAt(0)}
        </div>
        <h2 className="text-xl font-bold text-gray-900">{session.userName}</h2>
        <p className="text-sm text-[#0B4F6C] font-semibold">{session.description || 'Auxiliary Police Officer'}</p>
      </div>

      {/* Info Cards */}
      <div className="space-y-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#0B4F6C]">
            <BadgeCheckIcon size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Employee ID</p>
            <p className="text-sm font-bold text-gray-800">{session.employeeId || 'N/A'}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <MailIcon size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Email Address</p>
            <p className="text-sm font-bold text-gray-800">{session.email}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
            <ShieldIcon size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Assigned Unit</p>
            <p className="text-sm font-bold text-gray-800">Auxiliary Police Malaysia (APM)</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-4">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {isLoggingOut ? (
            <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <LogOutIcon size={18} />
              Sign Out
            </>
          )}
        </button>
      </div>

      <p className="text-center text-[10px] text-gray-400">
        Railly Police Hub v1.2.4<br />
        Connected to Secure Backend Gateway
      </p>
    </div>
  );
}
