/**
 * Centralized Location Utility for Railly
 * Handles geolocation and nearby station detection
 */

interface LocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

/**
 * Common logic to get current geolocation
 */
const getCurrentPosition = (options: LocationOptions = {}): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
      ...options
    });
  });
};

/**
 * Fetch nearby station data from the API
 */
export const fetchNearbyStations = async (lat: number, lng: number, count: number = 5) => {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/stations/nearby?lat=${lat}&lng=${lng}&count=${count}`);
  if (!res.ok) throw new Error('Failed to connect to the station service.');
  return await res.json();
};

/**
 * HIGH-LEVEL UTILITY: Detect nearby lines (unique names only)
 * Used by Home and IncidentNearMe
 */
export const detectNearbyLines = async (
  setIsLocating: (loading: boolean) => void,
  onSuccess: (lines: string[]) => void,
  onError: (message: string) => void
) => {
  setIsLocating(true);
  try {
    const pos = await getCurrentPosition();
    const data = await fetchNearbyStations(pos.coords.latitude, pos.coords.longitude);
    
    const lines = Array.from(
      new Set(data.flatMap((s: any) => s.lines.map((l: any) => l.name)))
    ) as string[];
    
    if (lines.length > 0) {
      onSuccess(lines);
    } else {
      onError("No nearby lines detected at your location.");
    }
  } catch (err: any) {
    console.error('Location detection failed:', err);
    let message = err.message || 'Unable to retrieve your location.';
    if (err.code === 1) message = 'Location permission denied. Please enable it in settings.';
    onError(message);
  } finally {
    setIsLocating(false);
  }
};

/**
 * HIGH-LEVEL UTILITY: Detect nearby stations (full objects)
 * Used by CreateReport
 */
export const detectNearbyStations = async (
  setIsLocating: (loading: boolean) => void,
  onSuccess: (stations: any[]) => void,
  onError: (message: string) => void
) => {
  setIsLocating(true);
  try {
    const pos = await getCurrentPosition();
    const data = await fetchNearbyStations(pos.coords.latitude, pos.coords.longitude);
    
    if (data && data.length > 0) {
      onSuccess(data);
    } else {
      onError("No nearby stations detected.");
    }
  } catch (err: any) {
    console.error('Station detection failed:', err);
    let message = err.message || 'Unable to retrieve your location.';
    if (err.code === 1) message = 'Location permission denied. Please enable it in settings.';
    onError(message);
  } finally {
    setIsLocating(false);
  }
};
