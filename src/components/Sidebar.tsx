import {
  LayoutDashboardIcon,
  BellIcon,
  FileTextIcon,
  SettingsIcon,
  LogOutIcon,
  UserCircleIcon
} from 'lucide-react';

type Page = 'dashboard' | 'live-alerts' | 'reports' | 'settings';
interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  onLogout?: () => void;
  alertCount?: number;
}
const navItems = [
  {
    id: 'dashboard' as Page,
    label: 'Dashboard',
    icon: LayoutDashboardIcon
  },
  {
    id: 'live-alerts' as Page,
    label: 'Live Alerts',
    icon: BellIcon,
    badge: 7
  },

  {
    id: 'reports' as Page,
    label: 'Reports',
    icon: FileTextIcon
  },
  {
    id: 'settings' as Page,
    label: 'Settings',
    icon: SettingsIcon
  }];

export function Sidebar({
  activePage,
  onNavigate,
  onLogout,
  alertCount = 7
}: SidebarProps) {
  return (
    <aside
      className="flex flex-col h-full bg-white border-r border-gray-200"
      style={{
        width: '260px',
        minWidth: '260px'
      }}>

      {/* Brand */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex-shrink-0"
            style={{
              backgroundImage: 'url(/Railly_logo.png)',
              backgroundSize: '100%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
            aria-label="Railly"
          />

          <div>
            <div className="text-gray-900 font-bold text-base leading-tight">
              Railly
            </div>
            <div className="text-gray-400 text-xs mt-0.5">Command Center</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 px-3 py-4 space-y-0.5"
        role="navigation"
        aria-label="Main navigation">

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-colors duration-150 relative group
                ${isActive ? 'bg-teal-50 text-teal-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}
              `}
              aria-current={isActive ? 'page' : undefined}>

              {/* Active left border accent */}
              {isActive &&
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-teal-600"
                  aria-hidden="true" />

              }
              <Icon
                className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'text-teal-600' : 'text-gray-400 group-hover:text-gray-500'}`}
                size={18}
                aria-hidden="true" />

              <span className="flex-1 text-left">{item.label}</span>
              {item.badge !== undefined &&
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                  {item.id === 'live-alerts' ? alertCount : item.badge}
                </span>
              }
            </button>);

        })}
      </nav>

      {/* User section */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <UserCircleIcon
              size={22}
              className="text-gray-400"
              aria-hidden="true" />

          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-800 truncate">
              Operator Ahmad
            </div>
            <div className="text-xs text-gray-400 truncate">
              Technical Operator
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Log out">

            <LogOutIcon size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>);

}