import { useState } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Dashboard } from './Dashboard';
import { LiveAlerts } from './LiveAlerts';
import { Reports } from './Reports';
import { Settings } from './Settings';
export type NavPage = 'dashboard' | 'live-alerts' | 'reports' | 'settings';
export function CommandCenterApp({ onLogout }: { onLogout?: () => void }) {
  const [activePage, setActivePage] = useState<NavPage>('dashboard');
  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard onNavigate={setActivePage} />;
      case 'live-alerts':
        return <LiveAlerts />;

      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#FAF9F5]">
      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        onNavigate={(page) => setActivePage(page)}
        onLogout={onLogout}
        alertCount={7} />


      {/* Main Content */}
      <main className="flex-1 overflow-y-auto min-w-0" role="main">
        {renderPage()}
      </main>
    </div>);

}