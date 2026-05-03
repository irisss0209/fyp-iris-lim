import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, X, WifiOff } from 'lucide-react';

type ToastType = 'update' | 'offline-ready';

export function UpdatePrompt() {
  const [type, setType] = useState<ToastType | null>(null);
  const [updateSW, setUpdateSW] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const { updateSW } = (e as CustomEvent).detail;
      setUpdateSW(() => updateSW);
      setType('update');
    };
    const handleOfflineReady = () => {
      setType('offline-ready');
      // Auto-dismiss the offline-ready toast after 4 seconds
      setTimeout(() => setType(t => t === 'offline-ready' ? null : t), 4000);
    };

    window.addEventListener('pwa:update-available', handleUpdate);
    window.addEventListener('pwa:offline-ready', handleOfflineReady);
    return () => {
      window.removeEventListener('pwa:update-available', handleUpdate);
      window.removeEventListener('pwa:offline-ready', handleOfflineReady);
    };
  }, []);

  const handleUpdate = useCallback(async () => {
    if (updateSW) await updateSW(true);
    setType(null);
  }, [updateSW]);

  const handleDismiss = useCallback(() => setType(null), []);

  if (!type) return null;

  const isOfflineReady = type === 'offline-ready';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        minWidth: '18rem',
        maxWidth: '22rem',
        background: isOfflineReady
          ? 'linear-gradient(135deg, #065f46 0%, #047857 100%)'
          : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        borderRadius: '1rem',
        padding: '1rem 1.25rem',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        color: '#fff',
      }}
    >
      <div style={{
        width: '2.25rem', height: '2.25rem',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {isOfflineReady ? <WifiOff size={16} /> : <RefreshCw size={16} />}
      </div>

      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>
          {isOfflineReady ? 'Ready to work offline' : 'Update Available'}
        </p>
        <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', opacity: 0.75 }}>
          {isOfflineReady ? 'Railly is installed and works without internet' : 'Reload to get the latest version'}
        </p>
      </div>

      {!isOfflineReady && (
        <button
          onClick={handleUpdate}
          style={{
            background: '#fff',
            color: '#1e1b4b',
            border: 'none',
            borderRadius: '0.5rem',
            padding: '0.4rem 0.85rem',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Reload
        </button>
      )}

      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.6)',
          cursor: 'pointer',
          padding: '0.25rem',
          flexShrink: 0,
          display: 'flex',
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
