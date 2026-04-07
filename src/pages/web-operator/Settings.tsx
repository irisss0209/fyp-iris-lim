import React, { useState } from 'react';
import {
  GlobeIcon,
  BellIcon,
  CameraIcon,
  UsersIcon,
  SlidersIcon,
  ActivityIcon,
  ToggleLeftIcon,
  ToggleRightIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon
} from
  'lucide-react';
type SettingsSection =
  'general' |
  'notifications' |
  'cameras' |
  'users' |
  'thresholds' |
  'health';
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
        <div
          className="text-sm font-medium"
          style={{
            color: '#1A202C'
          }}>

          {label}
        </div>
        {description &&
          <div
            className="text-xs mt-0.5"
            style={{
              color: '#4A5568'
            }}>

            {description}
          </div>
        }
      </div>
      <button onClick={onToggle} className="transition-colors">
        {enabled ?
          <ToggleRightIcon
            className="w-8 h-8"
            style={{
              color: '#0B4F6C'
            }} /> :


          <ToggleLeftIcon className="w-8 h-8 text-gray-300" />
        }
      </button>
    </div>);

}
export function Settings() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [toggles, setToggles] = useState({
    autoEscalate: true,
    soundAlerts: true,
    emailNotifications: false,
    smsAlerts: true,
    weeklyReport: true,
    genderDetection: true,
    occupancyTracking: true,
    motionDetection: false
  });
  const [threshold, setThreshold] = useState(85);
  const [escalationTimeout, setEscalationTimeout] = useState(5);
  const toggle = (key: keyof typeof toggles) => {
    setToggles((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  const sections: {
    id: SettingsSection;
    label: string;
    icon: React.ReactNode;
  }[] = [
      {
        id: 'general',
        label: 'General',
        icon: <GlobeIcon className="w-4 h-4" />
      },
      {
        id: 'notifications',
        label: 'Notifications',
        icon: <BellIcon className="w-4 h-4" />
      },
      {
        id: 'cameras',
        label: 'Camera Management',
        icon: <CameraIcon className="w-4 h-4" />
      },
      {
        id: 'users',
        label: 'User Management',
        icon: <UsersIcon className="w-4 h-4" />
      },
      {
        id: 'thresholds',
        label: 'Alert Thresholds',
        icon: <SlidersIcon className="w-4 h-4" />
      },
      {
        id: 'health',
        label: 'System Health',
        icon: <ActivityIcon className="w-4 h-4" />
      }];

  const cameras = [
    {
      id: 'EDGE-KJ-07-C3',
      coach: 'KJ-07 Coach 3',
      line: 'LRT Kelana Jaya',
      status: 'online',
      lastPing: '5s ago'
    },
    {
      id: 'EDGE-KTM-12-C1',
      coach: 'KTM-12 Coach 1',
      line: 'KTM Komuter',
      status: 'online',
      lastPing: '3s ago'
    },
    {
      id: 'EDGE-MRT-05-C2',
      coach: 'MRT-05 Coach 2',
      line: 'MRT Putrajaya',
      status: 'online',
      lastPing: '8s ago'
    },
    {
      id: 'EDGE-KTM-03-C1',
      coach: 'KTM-03 Coach 1',
      line: 'KTM Komuter',
      status: 'offline',
      lastPing: '2h ago'
    },
    {
      id: 'EDGE-MRT-10-C2',
      coach: 'MRT-10 Coach 2',
      line: 'MRT Putrajaya',
      status: 'offline',
      lastPing: '45m ago'
    }];

  const users = [
    {
      name: 'Ahmad Fadzil',
      role: 'Technical Operator',
      lastLogin: '2 min ago',
      status: 'active'
    },
    {
      name: 'Siti Nurhaliza',
      role: 'Technical Operator',
      lastLogin: '1 hour ago',
      status: 'active'
    },
    {
      name: 'Razif Hamdan',
      role: 'Auxiliary Police',
      lastLogin: 'Yesterday',
      status: 'active'
    },
    {
      name: 'Nurul Ain',
      role: 'Technical Operator',
      lastLogin: '3 days ago',
      status: 'inactive'
    }];

  const healthItems = [
    {
      name: 'Edge Devices',
      status: 'operational',
      detail: '47/50 Online',
      uptime: '99.2%'
    },
    {
      name: 'Cloud Sync',
      status: 'operational',
      detail: 'Active',
      uptime: '99.9%'
    },
    {
      name: 'Database',
      status: 'operational',
      detail: 'PostgreSQL v15',
      uptime: '100%'
    },
    {
      name: 'API Gateway',
      status: 'operational',
      detail: 'Response 42ms',
      uptime: '99.8%'
    },
    {
      name: 'AI Inference Engine',
      status: 'operational',
      detail: '96.2% accuracy',
      uptime: '98.7%'
    },
    {
      name: 'Alert Queue',
      status: 'degraded',
      detail: '7 pending',
      uptime: '95.1%'
    }];

  return (
    <div
      className="flex h-full"
      style={{
        backgroundColor: '#FAF9F5'
      }}>

      {/* Settings Nav */}
      <div className="w-56 bg-white border-r border-gray-100 flex-shrink-0">
        <div className="px-4 py-5 border-b border-gray-100">
          <h1
            className="text-lg font-bold"
            style={{
              color: '#1A202C'
            }}>

            Settings
          </h1>
        </div>
        <nav className="p-2 space-y-0.5">
          {sections.map((s) =>
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${activeSection === s.id ? 'text-white' : 'hover:bg-gray-50'}`}
              style={{
                backgroundColor:
                  activeSection === s.id ? '#0B4F6C' : 'transparent',
                color: activeSection === s.id ? 'white' : '#4A5568'
              }}>

              {s.icon}
              {s.label}
            </button>
          )}
        </nav>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* General */}
        {activeSection === 'general' &&
          <div className="max-w-xl space-y-5">
            <h2
              className="text-lg font-bold"
              style={{
                color: '#1A202C'
              }}>

              General Settings
            </h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
              <div>
                <label
                  className="text-xs font-semibold uppercase tracking-wide block mb-1.5"
                  style={{
                    color: '#4A5568'
                  }}>

                  System Name
                </label>
                <input
                  defaultValue="SafeCoach Command Center"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/30"
                  style={{
                    color: '#1A202C'
                  }} />

              </div>
              <div>
                <label
                  className="text-xs font-semibold uppercase tracking-wide block mb-1.5"
                  style={{
                    color: '#4A5568'
                  }}>

                  Timezone
                </label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{
                    color: '#1A202C'
                  }}>

                  <option>Asia/Kuala_Lumpur (UTC+8)</option>
                  <option>UTC</option>
                </select>
              </div>
              <div>
                <label
                  className="text-xs font-semibold uppercase tracking-wide block mb-1.5"
                  style={{
                    color: '#4A5568'
                  }}>

                  Language
                </label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{
                    color: '#1A202C'
                  }}>

                  <option>English</option>
                  <option>Bahasa Malaysia</option>
                </select>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3
                className="text-sm font-semibold mb-3"
                style={{
                  color: '#1A202C'
                }}>

                System Behaviour
              </h3>
              <Toggle
                enabled={toggles.autoEscalate}
                onToggle={() => toggle('autoEscalate')}
                label="Auto-escalate to Police"
                description="Automatically notify police after 5 min of no operator action" />

              <Toggle
                enabled={toggles.soundAlerts}
                onToggle={() => toggle('soundAlerts')}
                label="Sound Alerts"
                description="Play audio notification for new alerts" />

              <Toggle
                enabled={toggles.emailNotifications}
                onToggle={() => toggle('emailNotifications')}
                label="Email Notifications"
                description="Send email digest of daily incidents" />

            </div>
            <button
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{
                backgroundColor: '#0B4F6C'
              }}>

              Save Changes
            </button>
          </div>
        }

        {/* Notifications */}
        {activeSection === 'notifications' &&
          <div className="max-w-xl space-y-5">
            <h2
              className="text-lg font-bold"
              style={{
                color: '#1A202C'
              }}>

              Notification Settings
            </h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <Toggle
                enabled={toggles.soundAlerts}
                onToggle={() => toggle('soundAlerts')}
                label="In-App Sound Alerts"
                description="Audio notification for new alerts" />

              <Toggle
                enabled={toggles.emailNotifications}
                onToggle={() => toggle('emailNotifications')}
                label="Email Notifications"
                description="Daily incident summary emails" />

              <Toggle
                enabled={toggles.smsAlerts}
                onToggle={() => toggle('smsAlerts')}
                label="SMS Alerts"
                description="Critical alerts via SMS" />

              <Toggle
                enabled={toggles.weeklyReport}
                onToggle={() => toggle('weeklyReport')}
                label="Weekly Report"
                description="Automated weekly compliance report" />

            </div>
            <button
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{
                backgroundColor: '#0B4F6C'
              }}>

              Save Changes
            </button>
          </div>
        }

        {/* Cameras */}
        {activeSection === 'cameras' &&
          <div className="space-y-4">
            <h2
              className="text-lg font-bold"
              style={{
                color: '#1A202C'
              }}>

              Camera Management
            </h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {[
                      'Device ID',
                      'Coach',
                      'Line',
                      'Status',
                      'Last Ping',
                      'Actions'].
                      map((h) =>
                        <th
                          key={h}
                          className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                          style={{
                            color: '#4A5568'
                          }}>

                          {h}
                        </th>
                      )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cameras.map((cam) =>
                    <tr key={cam.id} className="hover:bg-gray-50">
                      <td
                        className="px-4 py-3 font-mono text-xs"
                        style={{
                          color: '#0B4F6C'
                        }}>

                        {cam.id}
                      </td>
                      <td
                        className="px-4 py-3 text-xs font-medium"
                        style={{
                          color: '#1A202C'
                        }}>

                        {cam.coach}
                      </td>
                      <td
                        className="px-4 py-3 text-xs"
                        style={{
                          color: '#4A5568'
                        }}>

                        {cam.line}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="flex items-center gap-1.5 text-xs font-medium"
                          style={{
                            color:
                              cam.status === 'online' ? '#2D7A5D' : '#D34026'
                          }}>

                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              backgroundColor:
                                cam.status === 'online' ? '#2D7A5D' : '#D34026'
                            }} />

                          {cam.status}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-xs"
                        style={{
                          color: '#4A5568'
                        }}>

                        {cam.lastPing}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="text-xs font-medium hover:underline"
                          style={{
                            color: '#0B4F6C'
                          }}>

                          Configure
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        }

        {/* Users */}
        {activeSection === 'users' &&
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2
                className="text-lg font-bold"
                style={{
                  color: '#1A202C'
                }}>

                User Management
              </h2>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                style={{
                  backgroundColor: '#0B4F6C'
                }}>

                <PlusIcon className="w-4 h-4" /> Add User
              </button>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Name', 'Role', 'Last Login', 'Status', 'Actions'].map(
                      (h) =>
                        <th
                          key={h}
                          className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                          style={{
                            color: '#4A5568'
                          }}>

                          {h}
                        </th>

                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) =>
                    <tr key={u.name} className="hover:bg-gray-50">
                      <td
                        className="px-4 py-3 font-medium text-sm"
                        style={{
                          color: '#1A202C'
                        }}>

                        {u.name}
                      </td>
                      <td
                        className="px-4 py-3 text-xs"
                        style={{
                          color: '#4A5568'
                        }}>

                        {u.role}
                      </td>
                      <td
                        className="px-4 py-3 text-xs"
                        style={{
                          color: '#4A5568'
                        }}>

                        {u.lastLogin}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor:
                              u.status === 'active' ? '#F0FBF6' : '#F7FAFC',
                            color:
                              u.status === 'active' ? '#2D7A5D' : '#718096'
                          }}>

                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="text-xs font-medium hover:underline"
                          style={{
                            color: '#0B4F6C'
                          }}>

                          Edit
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        }

        {/* Thresholds */}
        {activeSection === 'thresholds' &&
          <div className="max-w-xl space-y-5">
            <h2
              className="text-lg font-bold"
              style={{
                color: '#1A202C'
              }}>

              Alert Thresholds
            </h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-5">
              <div>
                <div className="flex justify-between mb-2">
                  <label
                    className="text-sm font-medium"
                    style={{
                      color: '#1A202C'
                    }}>

                    Confidence Threshold
                  </label>
                  <span
                    className="text-sm font-bold"
                    style={{
                      color: '#0B4F6C'
                    }}>

                    {threshold}%
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={99}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full accent-[#0B4F6C]" />

                <div
                  className="flex justify-between text-xs mt-1"
                  style={{
                    color: '#4A5568'
                  }}>

                  <span>50% (Low Accuracy, More alerts)</span>
                  <span>99% (Higher Accuracy, Fewer alerts)</span>
                </div>
              </div>

            </div>
            <button
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{
                backgroundColor: '#0B4F6C'
              }}>

              Save Changes
            </button>
          </div>
        }

        {/* Health */}
        {activeSection === 'health' &&
          <div className="space-y-4">
            <h2
              className="text-lg font-bold"
              style={{
                color: '#1A202C'
              }}>

              System Health
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {healthItems.map((item) =>
                <div
                  key={item.name}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">

                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="font-semibold text-sm"
                      style={{
                        color: '#1A202C'
                      }}>

                      {item.name}
                    </span>
                    {item.status === 'operational' ?
                      <CheckCircleIcon
                        className="w-5 h-5"
                        style={{
                          color: '#2D7A5D'
                        }} /> :


                      <XCircleIcon
                        className="w-5 h-5"
                        style={{
                          color: '#D34026'
                        }} />

                    }
                  </div>
                  <div
                    className="text-xs mb-1"
                    style={{
                      color: '#4A5568'
                    }}>

                    {item.detail}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: item.uptime,
                          backgroundColor:
                            item.status === 'operational' ?
                              '#2D7A5D' :
                              '#D34026'
                        }} />

                    </div>
                    <span
                      className="text-xs font-medium"
                      style={{
                        color:
                          item.status === 'operational' ? '#2D7A5D' : '#D34026'
                      }}>

                      {item.uptime}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        }
      </div>
    </div>);

}