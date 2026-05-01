import { useState, useEffect } from 'react';
import { Clock, Bell, Lock } from 'lucide-react';
import { useTime } from '../../context/TimeContext';
import { requestAndSubscribe, unsubscribeFromPush } from '../../utils/pushNotifications';

const API = `${import.meta.env.VITE_API_URL}/api/data`;
type Page = 'settings' | 'change-password';

export function Settings({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [soundAlerts, setSoundAlerts] = useState('on');
  const { format, setFormat } = useTime();
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>(() => {
    const saved = localStorage.getItem("timeFormat");
    return saved === '12h' ? '12h' : '24h';
  });
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    setTimeFormat(format);
  }, [format]);

  useEffect(() => {
    // We no longer need to check for a token here because the global fetch patch
    // handles credentials (cookies) automatically.
    fetch(`${API}/operator/settings`)
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
      const res = await fetch(`${API}/operator/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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

      // Sync browser push subscription with the saved preference
      if (soundAlerts === 'off') {
        await unsubscribeFromPush();
      } else {
        await requestAndSubscribe();
      }

      alert("Settings saved successfully.");
    } catch {
      alert("Settings applied locally. Could not sync to server.");
    } finally {
      setIsSaving(false);
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
          <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-[400px]">
            {[
              { id: 'on', label: 'Always On' },
              { id: 'off', label: 'Muted' },
              { id: 'peak', label: 'Peak Only' }
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSoundAlerts(opt.id)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                  soundAlerts === opt.id
                    ? 'bg-white text-[#0B4F6C] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
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
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between gap-4">

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#0B4F6C]/10 flex items-center justify-center text-[#0B4F6C] flex-shrink-0">
              <Lock className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-base font-bold text-gray-900">Security & Password</h2>
              <p className="text-sm text-gray-500">
                Update your account password and security settings.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('change-password')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#9e1523] hover:bg-[#6c0b15] transition-all"
          >
            Change Password
          </button>
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
