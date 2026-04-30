import React, { useState, useEffect } from 'react';
import { LogOutIcon, ShieldIcon, MailIcon, BadgeCheckIcon, LockIcon, ChevronRightIcon } from 'lucide-react';
import { UserSession } from '../../App';

const DARKBLUE = '#0B4F6C';

type ProfileSection = null | 'email' | 'phone';

interface AuxiliaryProfileProps {
  session: UserSession;
  onLogout: () => void;
  onChangePassword: () => void;
}

export function AuxiliaryProfile({ session, onLogout, onChangePassword }: AuxiliaryProfileProps) {
  const [email, setEmail] = useState('');
  const [stats, setStats] = useState({ avgReactionTime: 0, resolved: 0 });
  const [openSection, setOpenSection] = useState<ProfileSection>(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/data/profile?userId=${session.userId}`, {
      headers: session.token ? { Authorization: `Bearer ${session.token}` } : {},
    })
      .then(res => res.json())
      .then(data => {
        setEmail(data.email);
        setStats({
          avgReactionTime: data.avgReactionTime || 0,
          resolved: data.resolved || 0
        });
      })
      .catch(console.error);
  }, [session.userId]);
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
    <div className="h-full overflow-y-auto px-4 py-6 space-y-6">
      {/* Profile Header */}
      <div className="flex flex-col items-center">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-4"
          style={{ backgroundColor: '#0B4F6C' }}
        >
          {session.userName.charAt(0)}
        </div>
        <h2 className="text-xl font-bold text-gray-900">{session.userName}</h2>
        <p className="text-sm text-[#0B4F6C] font-semibold">{email || session.email}</p>
        <p className="text-sm text-gray-900 font-semibold">{session.employeeId || 'N/A'}</p>

      </div>

      {/* Stats Cards */}
      <div className="flex gap-4 mt-2 w-full">
        <div className="flex-1 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
          <p className="text-xl font-bold text-gray-900">
            {stats.avgReactionTime >= 60 
              ? <>{(stats.avgReactionTime / 60).toFixed(1)}<span className="text-xs ml-0.5">hr</span></>
              : <>{stats.avgReactionTime}<span className="text-xs ml-0.5">m</span></>
            }
          </p>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Avg Reaction</p>
        </div>
        <div className="flex-1 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
          <p className="text-xl font-bold text-gray-900">{stats.resolved}</p>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Resolved</p>
        </div>
      </div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 pt-1">Account Settings</p>

      {/* Info Cards */}
      <div className="space-y-3">
        {/* Password */}
        <div className="space-y-2">
          <SectionHeader
            icon={LockIcon}
            label="Security"
            value="Change your password"
            onClick={onChangePassword}
          />
        </div>
      </div>

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
