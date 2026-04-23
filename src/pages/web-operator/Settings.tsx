import { useState, useEffect } from 'react';
import { Clock, Bell, Lock, ShieldCheck } from 'lucide-react';
import { useTime } from '../../context/TimeContext';

const API = 'http://localhost:5293/api/data';

export function Settings() {
  const [soundAlerts, setSoundAlerts] = useState('on');
  const { format, setFormat } = useTime();
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>(() => {
    const saved = localStorage.getItem("timeFormat");
    return saved === '12h' ? '12h' : '24h';
  });
  const [isSaving, setIsSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    setTimeFormat(format);
  }, [format]);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("user_session") || "{}");
    if (!session?.token) return;

    fetch(`${API}/operator/settings`, {
      headers: {
        'Authorization': `Bearer ${session.token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data) {
          if (data.soundAlerts) setSoundAlerts(data.soundAlerts);
          if (data.timeFormat) setTimeFormat(data.timeFormat);
        }
      })
      .catch(() => { });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);

    // Apply locally first so format updates immediately across the app.
    setFormat(timeFormat);
    localStorage.setItem("soundAlerts", soundAlerts);
    localStorage.setItem("timeFormat", timeFormat);

    try {
      const session = JSON.parse(localStorage.getItem("user_session") || "{}");
      if (!session?.token) {
        alert("Settings saved locally.");
        return;
      }

      const res = await fetch(`${API}/operator/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        },
        body: JSON.stringify({
          soundAlerts,
          timeFormat
        })
      });

      if (!res.ok) {
        alert("Settings applied locally. Could not sync to server.");
        return;
      }

      alert("Settings saved successfully.");
    } catch {
      alert("Settings applied locally. Could not sync to server.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    const missingRequirements = [];
    if (newPassword.length < 8) missingRequirements.push('at least 8 characters');
    if (!/[A-Z]/.test(newPassword)) missingRequirements.push('one uppercase letter');
    if (!/[a-z]/.test(newPassword)) missingRequirements.push('one lowercase letter');
    if (!/[0-9]/.test(newPassword)) missingRequirements.push('one number');
    if (!/[!@#$%^&*(),.?":{}|<>_~-]/.test(newPassword)) missingRequirements.push('one special character');

    if (missingRequirements.length > 0) {
      setPasswordError(`Password must contain: ${missingRequirements.join(', ')}.`);
      return;
    }

    setIsChangingPassword(true);
    try {
      const session = JSON.parse(localStorage.getItem("user_session") || "{}");
      const res = await fetch(`http://localhost:5293/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        },
        body: JSON.stringify({
          email: session.email,
          currentPassword,
          newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || "Failed to change password.");
        return;
      }

      alert("Password updated successfully.");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPasswordError("Unable to connect to server.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="p-8 min-h-full" style={{ backgroundColor: '#FAF9F5' }}>

      {/* PAGE TITLE */}
      <div className="mb-8">
        <h1 className="text-[28px] font-bold text-gray-900 leading-tight">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">Manage system configuration and preferences</p>
      </div>

      <div className="w-full space-y-4">

        {/* SOUND ALERTS - DROPDOWN */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-12 h-12 rounded-xl bg-[#0B4F6C]/10 flex items-center justify-center text-[#0B4F6C] flex-shrink-0">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Notification Sounds</h2>
              <p className="text-sm text-gray-500">Choose how and when you want to be alerted about incoming incidents.</p>
            </div>
          </div>
          <div className="relative w-full md:w-72">
            <select
              value={soundAlerts}
              onChange={(e) => setSoundAlerts(e.target.value)}
              className="appearance-none bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-[#0B4F6C] focus:border-[#0B4F6C] block w-full p-3 outline-none transition-all cursor-pointer"
            >
              <option value="on">Turn On (Always Alert)</option>
              <option value="off">Turn Off (Mute All)</option>
              <option value="peak">Peak Hours Only</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
            </div>
          </div>
        </div>

        {/* TIME FORMAT - TOGGLE */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-12 h-12 rounded-xl bg-[#0B4F6C]/10 flex items-center justify-center text-[#0B4F6C] flex-shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Time Format</h2>
              <p className="text-sm text-gray-500">Choose your preferred time display format for timestamps across the platform.</p>
            </div>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-72">
            <button
              onClick={() => setTimeFormat('12h')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${timeFormat === '12h'
                ? 'bg-white text-[#0B4F6C] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              12-Hour Format
            </button>
            <button
              onClick={() => setTimeFormat('24h')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${timeFormat === '24h'
                ? 'bg-white text-[#0B4F6C] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              24-Hour Format
            </button>
          </div>
        </div>

        {/* SECURITY - PASSWORD CHANGE */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Security & Password</h2>
              <p className="text-sm text-gray-500">Update your account password and security preferences.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-[#0B4F6C] focus:border-[#0B4F6C] outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-[#0B4F6C] focus:border-[#0B4F6C] outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-[#0B4F6C] focus:border-[#0B4F6C] outline-none transition-all"
              />
            </div>
          </div>

          {passwordError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-center gap-2 text-red-600 text-xs font-medium">
              <ShieldCheck className="w-4 h-4" />
              {passwordError}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handlePasswordChange}
              disabled={isChangingPassword}
              className={`px-8 py-2.5 rounded-xl text-xs font-bold text-white transition-all duration-200 ${isChangingPassword
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-amber-600 hover:bg-amber-700 hover:shadow-md'
                }`}
            >
              {isChangingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>

        {/* SAVE BUTTON */}
        <div className="pt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-12 py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-200 ${isSaving
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-[#0B4F6C] hover:bg-[#094057] hover:shadow-lg hover:-translate-y-0.5'
              }`}
          >
            {isSaving ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </div>
      </div>

    </div>
  );
}
