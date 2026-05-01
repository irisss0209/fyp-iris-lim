import React, { useState, useEffect } from 'react';
import {
  LockIcon,
  ChevronRightIcon,
} from 'lucide-react';

const DARKBLUE = '#0B4F6C';

type ProfileSection = null | 'email' | 'phone';

import { UserSession } from '../../App';

export function Profile({ session, onLogout, onChangePassword }: { session: UserSession, onLogout: () => void, onChangePassword: () => void }) {
  const [openSection, setOpenSection] = useState<ProfileSection>(null);

  const [email, setEmail] = useState('');

  const [stats, setStats] = useState({ reports: 0, verified: 0 });
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/data/profile`, {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        setEmail(data.email);
        setStats({ reports: data.reports || 0, verified: data.verified || 0 });
      })
      .catch(console.error);
  }, []);


  function SectionHeader({
    id,
    icon: Icon,
    label,
    value,
    onClick,
  }: {
    id?: ProfileSection;
    icon: React.ElementType;
    label: string;
    value?: string;
    onClick?: () => void;
  }) {
    return (
      <button
        onClick={onClick || (() => id && setOpenSection(prev => prev === id ? null : id))}
        className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm active:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#EBF4F8' }}
          >
            <Icon size={15} style={{ color: DARKBLUE }} />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-800">{label}</p>
            {value && <p className="text-xs text-gray-400">{value}</p>}
          </div>
        </div>
        <ChevronRightIcon
          size={16}
          className={`text-gray-300 transition-transform ${id && openSection === id ? 'rotate-90' : ''}`}
        />
      </button>
    );
  }

  return (
    <div
      className="px-4 pt-5 pb-6 space-y-3"
    >
      {/* Avatar card */}
      <div className="flex flex-col items-center">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-4"
          style={{ backgroundColor: '#0B4F6C' }}
        >
          {session.userName.charAt(0)}
        </div>
        <h2 className="text-xl font-bold text-gray-900">{session.userName}</h2>
        <p className="text-sm text-[#0B4F6C] font-semibold">{email}</p>
      </div>
      <div className="flex gap-4 mt-4 w-full">
        <div className="flex-1 bg-gray-50 rounded-2xl p-3 border border-gray-100 text-center">
          <p className="text-xl font-bold text-gray-900">{stats.reports}</p>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mt-0.5">Reports</p>
        </div>
        <div className="flex-1 bg-gray-50 rounded-2xl p-3 border border-gray-100 text-center">
          <p className="text-xl font-bold text-gray-900">{stats.verified}</p>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mt-0.5">Verified</p>
        </div>
      </div>

      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 pt-1">Account Settings</p>




      {/* Password */}
      <div className="space-y-2">
        <SectionHeader 
          icon={LockIcon} 
          label="Security" 
          value="Change your password" 
          onClick={onChangePassword}
        />
      </div>


      {/* Sign out */}

      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white shadow-lg active:scale-[0.98] transition-all"
        style={{ background: ` #ad1a1a` }}
      >
        Sign Out
      </button>
    </div>
  );
}
