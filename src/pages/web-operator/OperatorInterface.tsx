import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LayoutDashboardIcon,
  BellIcon,
  FileTextIcon,
  SettingsIcon,
  LogOutIcon,
  UserCircleIcon,
  PanelLeftCloseIcon,
  UsersIcon,
  CalendarIcon,
  PanelLeftOpenIcon,
  MonitorIcon,
} from 'lucide-react';
import { Dashboard } from './Dashboard';
import { LiveAlerts } from './LiveAlerts';
import { Reports } from './Reports';
import { Settings } from './Settings';
import { UserManagement } from './UserManagement';
import { ShiftManagementPanel } from './ShiftManagement';
import { UserSession } from '../../types/session';
import type { NavPage } from '../../types/operator';
import { ChangePasswordPage } from '../auth/ChangePasswordPage';
import { useAlertHub } from '../../hooks/useAlertHub';

export type { NavPage };

interface SidebarProps {
  activePage: NavPage;
  onNavigate: (page: NavPage) => void;
  onLogout?: () => void;
  alertCount?: number;
  user?: UserSession | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const navItems = [
  { id: 'dashboard' as NavPage, label: 'Dashboard', icon: LayoutDashboardIcon },
  { id: 'live-alerts' as NavPage, label: 'Live Alerts', icon: BellIcon, badge: true },
  { id: 'reports' as NavPage, label: 'Reports', icon: FileTextIcon },

  { id: 'users' as NavPage, label: 'User Management', icon: UsersIcon },
  { id: 'shifts' as NavPage, label: 'Shift Management', icon: CalendarIcon },
  { id: 'settings' as NavPage, label: 'Settings', icon: SettingsIcon }
];

function Sidebar({ activePage, onNavigate, onLogout, alertCount = 0, user, collapsed, onToggleCollapse }: SidebarProps) {
  return (
    <aside
      className="flex flex-col h-full bg-[#FAF9F5] border-r border-gray-200 transition-all duration-300"
      style={{ width: collapsed ? '64px' : '260px', minWidth: collapsed ? '64px' : '260px' }}
    >
      <div className="flex items-center border-b border-gray-100 px-3 py-4" style={{ minHeight: '72px' }}>
        {!collapsed && (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex-shrink-0"
              style={{
                backgroundImage: 'url(/Railly_logo.png)',
                backgroundSize: '100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
              aria-label="Railly"
            />
            <div>
              <div className="text-gray-900 font-bold text-base leading-tight">Railly</div>
              <div className="text-gray-400 text-xs mt-0.5">Command Center</div>
            </div>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0 ml-auto"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpenIcon size={18} /> : <PanelLeftCloseIcon size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5" role="navigation" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-lg text-sm font-medium transition-colors duration-150 relative group
                ${collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'}
                ${isActive ? 'bg-teal-50 text-teal-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-teal-600" aria-hidden="true" />
              )}
              <div className="relative flex-shrink-0">
                <Icon size={18} className={isActive ? 'text-teal-600' : 'text-gray-400 group-hover:text-gray-500'} aria-hidden="true" />
                {/* Badge on icon when collapsed */}
                {item.badge && alertCount > 0 && collapsed && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full flex items-center justify-center">
                    {alertCount}
                  </span>
                )}
              </div>
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && alertCount > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                      {alertCount}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-2 pb-3 border-t border-gray-100 pt-3">
        <div className={`flex items-center gap-3 ${collapsed ? 'flex-col' : ''}`}>
          {!collapsed && (
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <UserCircleIcon size={22} className="text-gray-400" />
            </div>
          )}
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-800 truncate">{user?.userName || 'Loading...'}</div>
                <div className="text-xs text-gray-400 truncate capitalize">{user?.role || 'Operator'}</div>
              </div>
              <button onClick={onLogout} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Log out">
                <LogOutIcon size={16} aria-hidden="true" />
              </button>
            </>
          )}
          {collapsed && (
            <button onClick={onLogout} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Log out">
              <LogOutIcon size={14} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

const INACTIVE_MS = 60 * 60 * 1000;  // 1 hour
const WARN_MS     = 55 * 60 * 1000;  // warn at 55 min

function useInactivityLogout(onLogout?: () => void) {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(300);
  const logoutTimer   = useRef<ReturnType<typeof setTimeout>>();
  const warnTimer     = useRef<ReturnType<typeof setTimeout>>();
  const countdownRef  = useRef<ReturnType<typeof setInterval>>();

  const reset = useCallback(() => {
    setShowWarning(false);
    setSecondsLeft(300);
    clearTimeout(logoutTimer.current);
    clearTimeout(warnTimer.current);
    clearInterval(countdownRef.current);

    warnTimer.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsLeft(300);
      countdownRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) { clearInterval(countdownRef.current); return 0; }
          return s - 1;
        });
      }, 1000);
    }, WARN_MS);

    logoutTimer.current = setTimeout(() => onLogout?.(), INACTIVE_MS);
  }, [onLogout]);

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'wheel'] as const;
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach(e => window.removeEventListener(e, reset));
      clearTimeout(logoutTimer.current);
      clearTimeout(warnTimer.current);
      clearInterval(countdownRef.current);
    };
  }, [reset]);

  return { showWarning, secondsLeft, extendSession: reset };
}

export function OperatorInterface({
  onLogout,
  session
}: {
  onLogout?: () => void;
  session: UserSession | null;
}) {
  const [activePage, setActivePage] = useState<NavPage>('dashboard');
  const [initialAlertId, setInitialAlertId] = useState<string | number | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [unreadAlertIds, setUnreadAlertIds] = useState<Set<string>>(new Set());
  const { showWarning, secondsLeft, extendSession } = useInactivityLogout(onLogout);

  const activePageRef = useRef(activePage);
  useEffect(() => { activePageRef.current = activePage; }, [activePage]);

  const handleAlertEvent = useCallback((data?: any) => {
    if (activePageRef.current !== 'live-alerts') {
      const id = String(data?.id ?? data?.incidentId ?? data?.alertId ?? '');
      if (!id) return;
      setUnreadAlertIds(prev => prev.has(id) ? prev : new Set([...prev, id]));
    }
  }, []);

  useAlertHub(handleAlertEvent);

  const handleNavigate = (page: NavPage, id?: string | number) => {
    setActivePage(page);
    if (page === 'live-alerts') setUnreadAlertIds(new Set());
    if (id) setInitialAlertId(id);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard onNavigate={handleNavigate} session={session} />;
      case 'live-alerts': return (
        <LiveAlerts
          initialAlertId={initialAlertId}
          onClearInitial={() => setInitialAlertId(null)}
          session={session}
        />
      );
      case 'reports': return <Reports session={session} />;
      case 'users': return <UserManagement session={session} />;
      case 'shifts': return <ShiftManagementPanel session={session} />;
      case 'settings': return <Settings onNavigate={handleNavigate} />;
      case 'change-password':
        return <ChangePasswordPage session={session!} onBack={() => setActivePage('settings')} onLogout={onLogout} />;
      default: return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#FAF9F5]">

      {/* Desktop-only restrictions shown on any viewport narrower than 1024 px */}
      <div className="lg:hidden fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-[#FAF9F5] p-8 text-center">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#0B4F6C1A' }}>
          <MonitorIcon size={40} style={{ color: '#0B4F6C' }} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Desktop Required</h1>
          <p className="text-sm text-gray-500 max-w-[300px] leading-relaxed">
            The Railly operator dashboard is built for desktop use. Please open it on a laptop or desktop computer.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 text-xs text-gray-400 font-medium">
          <MonitorIcon size={13} />
          Minimum screen width: 1024 px
        </div>
      </div>

      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        alertCount={unreadAlertIds.size}
        user={session}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
      />
      <main className="flex-1 overflow-y-auto min-w-0" role="main">
        {renderPage()}
      </main>

      {showWarning && (
        <div className="fixed bottom-6 right-6 z-[200] w-80 bg-white border border-amber-200 rounded-2xl shadow-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
              <LogOutIcon size={16} className="text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">Session expiring soon</p>
              <p className="text-xs text-gray-500 mt-0.5">
                You'll be logged out in{' '}
                <span className="font-semibold text-amber-600">
                  {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
                </span>{' '}
                due to inactivity.
              </p>
            </div>
          </div>
          <button
            onClick={extendSession}
            className="mt-4 w-full py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors"
          >
            Stay logged in
          </button>
        </div>
      )}
    </div>
  );
}
