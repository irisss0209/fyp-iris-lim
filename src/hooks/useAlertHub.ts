import { useEffect } from 'react';
import { HubConnectionBuilder } from '@microsoft/signalr';

export function useAlertHub(onSignalR: (data?: any) => void, onVisible?: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const connection = new HubConnectionBuilder()
      .withUrl(`${import.meta.env.VITE_API_BASE}/hubs/alerts`, { withCredentials: true })
      .withAutomaticReconnect()
      .build();

    connection.on('IncidentStatusChanged', onSignalR);
    connection.on('NewIncident', onSignalR);
    connection.start().catch(console.error);

    if (onVisible) {
      const handleVisible = () => { if (document.visibilityState === 'visible') onVisible(); };
      document.addEventListener('visibilitychange', handleVisible);
      return () => {
        connection.stop();
        document.removeEventListener('visibilitychange', handleVisible);
      };
    }

    return () => { connection.stop(); };
  }, [onSignalR, onVisible, enabled]);
}
