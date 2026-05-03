import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { getPendingReports } from '../utils/offlineQueue';

export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const refresh = async () => {
      setOffline(!navigator.onLine);
      const reports = await getPendingReports();
      setPendingCount(reports.length);
    };

    refresh();
    window.addEventListener('online', refresh);
    window.addEventListener('offline', refresh);
    return () => {
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', refresh);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[9998] bg-amber-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 py-2 px-4">
      <WifiOff size={13} />
      <span>
        You're offline
        {pendingCount > 0 && ` · ${pendingCount} report${pendingCount > 1 ? 's' : ''} queued`}
      </span>
    </div>
  );
}
