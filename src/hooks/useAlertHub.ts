import { useEffect } from 'react';
import { HubConnectionBuilder } from '@microsoft/signalr';

export function useAlertHub(onUpdate: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const connection = new HubConnectionBuilder()
      .withUrl(`${import.meta.env.VITE_API_BASE}/hubs/alerts`, { withCredentials: true })
      .withAutomaticReconnect()
      .build();

    connection.on('IncidentStatusChanged', onUpdate);
    connection.on('NewIncident', onUpdate);
    connection.start().catch(console.error);

    const onVisible = () => { if (document.visibilityState === 'visible') onUpdate(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      connection.stop();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [onUpdate, enabled]);
}
