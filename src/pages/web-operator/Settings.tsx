import { useState, useEffect } from 'react';
import {
  ToggleLeftIcon,
  ToggleRightIcon
} from 'lucide-react';

const API = 'http://localhost:5293/api/data';

// ── Toggle component ────────────────────────────────────────────────────────
interface ToggleProps {
  enabled: boolean;
  onToggle: () => void;
  label: string;
  description?: string;
}

function Toggle({ enabled, onToggle, label, description }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div>
        <div className="text-sm font-medium text-gray-900">{label}</div>
        {description && (
          <div className="text-xs mt-0.5 text-gray-500">{description}</div>
        )}
      </div>
      <button onClick={onToggle}>
        {enabled ? (
          <ToggleRightIcon className="w-8 h-8 text-[#0B4F6C]" />
        ) : (
          <ToggleLeftIcon className="w-8 h-8 text-gray-300" />
        )}
      </button>
    </div>
  );
}

export function Settings() {
  const [systemName, setSystemName] = useState('Railly Command Center');
  const [timezone, setTimezone] = useState('Asia/Kuala_Lumpur');
  const [language, setLanguage] = useState('English');
  const [toggles, setToggles] = useState({
    autoEscalate: true,
    soundAlerts: true,
    emailNotifications: false,
    smsAlerts: true,
    weeklyReport: true,
  });

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("session") || "{}");

    fetch(`${API}/operator/settings`, {
      headers: {
        'Authorization': `Bearer ${session.token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data) {
          if (data.systemName) setSystemName(data.systemName);
          if (data.timezone) setTimezone(data.timezone);
          if (data.language) setLanguage(data.language);
          if (data.toggles) setToggles(data.toggles);
        }
      })
      .catch(() => { });
  }, []);

  const toggle = (key: keyof typeof toggles) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    try {
      const session = JSON.parse(localStorage.getItem("session") || "{}");

      const res = await fetch(`${API}/operator/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        },
        body: JSON.stringify({
          systemName,
          timezone,
          language,
          toggles
        })
      });

      if (!res.ok) throw new Error();

      alert("Settings saved successfully");
    } catch {
      alert("Failed to save settings");
    }
  };

  return (
    <div className="p-8 min-h-full" style={{ backgroundColor: '#FAF9F5' }}>

      {/* PAGE TITLE */}
      <div>
        <h1 className="text-[28px] font-bold text-gray-900 leading-tight">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">Manage system configuration</p>
      </div>

      {/* GENERAL SETTINGS */}
      <div className="space-y-5">
        <h2 className="text-lg font-semibold text-gray-900">General</h2>

        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">System Name</label>
            <input
              value={systemName}
              onChange={(e) => setSystemName(e.target.value)}
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="Asia/Kuala_Lumpur">Asia/Kuala_Lumpur (UTC+8)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="English">English</option>
              <option value="Bahasa Malaysia">Bahasa Malaysia</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold mb-3 text-gray-900">System Behaviour</h3>

          <Toggle
            enabled={toggles.autoEscalate}
            onToggle={() => toggle('autoEscalate')}
            label="Auto-escalate to Police"
          />

          <Toggle
            enabled={toggles.soundAlerts}
            onToggle={() => toggle('soundAlerts')}
            label="Sound Alerts"
          />

          <Toggle
            enabled={toggles.emailNotifications}
            onToggle={() => toggle('emailNotifications')}
            label="Email Notifications"
          />
        </div>
      </div>

      {/* NOTIFICATIONS */}
      <div className="space-y-5">
        <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <Toggle
            enabled={toggles.soundAlerts}
            onToggle={() => toggle('soundAlerts')}
            label="In-App Sound Alerts"
          />

          <Toggle
            enabled={toggles.emailNotifications}
            onToggle={() => toggle('emailNotifications')}
            label="Email Notifications"
          />

          <Toggle
            enabled={toggles.smsAlerts}
            onToggle={() => toggle('smsAlerts')}
            label="SMS Alerts"
          />

          <Toggle
            enabled={toggles.weeklyReport}
            onToggle={() => toggle('weeklyReport')}
            label="Weekly Report"
          />
        </div>
      </div>

      {/* SAVE BUTTON */}
      <div>
        <button
          onClick={handleSave}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#0B4F6C]"
        >
          Save Changes
        </button>
      </div>

    </div>
  );
}