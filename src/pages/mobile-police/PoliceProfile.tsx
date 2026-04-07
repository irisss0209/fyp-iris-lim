import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MailIcon,
  PhoneIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  ChevronRightIcon,
  ShieldIcon,
  LogOutIcon,
} from 'lucide-react';

const ACCENT = '#0B4F6C';
const RED = '#D34026';

type ProfileSection = null | 'email' | 'phone' | 'password';

export function PoliceProfile({ onLogout }: { onLogout: () => void }) {
  const [openSection, setOpenSection] = useState<ProfileSection>(null);
  const [email, setEmail] = useState('ahmad.razif@police.gov.my');
  const [tempEmail, setTempEmail] = useState('');
  const [phone, setPhone] = useState('12-345 6789');
  const [tempPhone, setTempPhone] = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState('');

  const doSave = (section: string, fn: () => void) => {
    fn();
    setSaved(section);
    setTimeout(() => { setSaved(''); setOpenSection(null); }, 1500);
  };

  const toggle = (p: ProfileSection) =>
    setOpenSection(prev => (prev === p ? null : p));

  const inputBase =
    'w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/20 focus:border-[#0B4F6C] text-gray-800 font-medium transition-all';

  function SectionHeader({
    id,
    icon: Icon,
    label,
    value,
  }: {
    id: ProfileSection;
    icon: React.ElementType;
    label: string;
    value?: string;
  }) {
    return (
      <button
        onClick={() => toggle(id)}
        className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm active:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#EBF4F8' }}
          >
            <Icon size={15} style={{ color: ACCENT }} />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-800">{label}</p>
            {value && <p className="text-xs text-gray-400">{value}</p>}
          </div>
        </div>
        <ChevronRightIcon
          size={16}
          className={`text-gray-300 transition-transform ${openSection === id ? 'rotate-90' : ''}`}
        />
      </button>
    );
  }

  return (
    <motion.div
      key="police-profile"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="px-4 pt-5 pb-6 space-y-3"
    >
      {/* Officer card */}
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        {/* Blue gradient banner */}
        <div
          className="h-20 w-full"
          style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #0D6E6E 100%)` }}
        />
        {/* Avatar overlapping banner */}
        <div className="px-5 pb-5 -mt-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-md mb-3"
            style={{ backgroundColor: '#1D4ED8' }}
          >
            A
          </div>
          <p className="text-base font-bold text-gray-900">Cpl. Ahmad Razif</p>
          <p className="text-xs text-gray-400 mt-0.5">APM-2024-0847 · KL Sentral Zone</p>

          {/* Stats */}
          <div className="flex gap-3 mt-4">
            <div className="flex-1 bg-gray-50 rounded-2xl p-3 border border-gray-100 text-center">
              <p className="text-xl font-bold" style={{ color: ACCENT }}>12</p>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mt-0.5">Alerts</p>
            </div>
            <div className="flex-1 bg-gray-50 rounded-2xl p-3 border border-gray-100 text-center">
              <p className="text-xl font-bold text-green-600">9</p>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mt-0.5">Resolved</p>
            </div>
            <div className="flex-1 bg-gray-50 rounded-2xl p-3 border border-gray-100 text-center">
              <p className="text-xl font-bold text-amber-500">4.2m</p>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mt-0.5">Avg Time</p>
            </div>
          </div>
        </div>
      </div>

      {/* Shift info */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#EBF4F8' }}>
            <ShieldIcon size={14} style={{ color: ACCENT }} />
          </div>
          <span className="text-sm font-semibold text-gray-800">Current Shift</span>
          <span className="ml-auto flex items-center gap-1 bg-green-50 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            ON DUTY
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 text-sm">
          {[
            { label: 'Shift', value: '14:00 – 22:00' },
            { label: 'Zone', value: 'KL Sentral' },
            { label: 'Partner', value: 'Cpl. Siti' },
            { label: 'Supervisor', value: 'DSP Hafizuddin' },
          ].map(item => (
            <div key={item.label}>
              <p className="text-xs text-gray-400">{item.label}</p>
              <p className="text-sm font-semibold text-gray-800">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 pt-1">Account Settings</p>

      {/* Email */}
      <div className="space-y-2">
        <SectionHeader id="email" icon={MailIcon} label="Email Address" value={email} />
        <AnimatePresence>
          {openSection === 'email' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 space-y-3 overflow-hidden"
            >
              <input
                className={inputBase}
                type="email"
                placeholder="New email address"
                value={tempEmail}
                onChange={e => setTempEmail(e.target.value)}
              />
              <button
                onClick={() =>
                  doSave('email', () => {
                    if (tempEmail) { setEmail(tempEmail); setTempEmail(''); }
                  })
                }
                disabled={!tempEmail}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ backgroundColor: ACCENT }}
              >
                {saved === 'email' ? '✓ Saved' : 'Update Email'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <SectionHeader id="phone" icon={PhoneIcon} label="Phone Number" value={`+60 ${phone}`} />
        <AnimatePresence>
          {openSection === 'phone' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 space-y-3 overflow-hidden"
            >
              <div className="flex gap-2">
                <div className="px-3.5 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 flex-shrink-0">
                  +60
                </div>
                <input
                  className={inputBase}
                  type="tel"
                  placeholder="New phone number"
                  value={tempPhone}
                  onChange={e => setTempPhone(e.target.value)}
                />
              </div>
              <button
                onClick={() =>
                  doSave('phone', () => {
                    if (tempPhone) { setPhone(tempPhone); setTempPhone(''); }
                  })
                }
                disabled={!tempPhone}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ backgroundColor: ACCENT }}
              >
                {saved === 'phone' ? 'Saved' : 'Update Phone'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <SectionHeader id="password" icon={LockIcon} label="Password" value="Last changed recently" />
        <AnimatePresence>
          {openSection === 'password' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 space-y-3 overflow-hidden"
            >
              {(['current', 'new', 'confirm'] as const).map(field => (
                <div key={field} className="relative">
                  <input
                    type={showPw[field] ? 'text' : 'password'}
                    placeholder={
                      field === 'current'
                        ? 'Current password'
                        : field === 'new'
                          ? 'New password (min 8 chars)'
                          : 'Confirm new password'
                    }
                    value={field === 'current' ? currentPw : field === 'new' ? newPw : confirmPw}
                    onChange={e =>
                      field === 'current'
                        ? setCurrentPw(e.target.value)
                        : field === 'new'
                          ? setNewPw(e.target.value)
                          : setConfirmPw(e.target.value)
                    }
                    className={`${inputBase} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => ({ ...p, [field]: !p[field] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPw[field] ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
                  </button>
                </div>
              ))}
              {newPw && confirmPw && newPw !== confirmPw && (
                <p className="text-xs text-red-500">Passwords do not match.</p>
              )}
              <button
                onClick={() =>
                  doSave('password', () => {
                    setCurrentPw(''); setNewPw(''); setConfirmPw('');
                  })
                }
                disabled={!currentPw || !newPw || newPw !== confirmPw || newPw.length < 8}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ backgroundColor: ACCENT }}
              >
                {saved === 'password' ? 'Saved' : 'Update Password'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sign Out */}
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white shadow-lg active:scale-[0.98] transition-all"
        style={{ background: `linear-gradient(135deg, ${RED} 0%, #E05A3A 100%)` }}
      >
        <LogOutIcon size={15} />
        Sign Out
      </button>
    </motion.div>
  );
}
