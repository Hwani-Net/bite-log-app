'use client';

import { useState, useCallback } from 'react';

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

export interface GeolocationState {
  position: GeoPosition | null;
  loading: boolean;
  error: string | null;
  locationName: string;
}

/**
 * Reverse-geocode lat/lng → human-readable place name
 * Uses Open-Meteo Geocoding API (free, no API key required)
 * Falls back to coordinate string if API fails
 */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    // Use Nominatim (OpenStreetMap) for reverse geocoding — free, no key
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ko&zoom=14`,
      { headers: { 'User-Agent': 'BITELog/1.0' } }
    );
    if (!res.ok) throw new Error('Geocoding failed');
    const data = await res.json();

    // Build a concise location name from address components
    const addr = data.address || {};
    const parts: string[] = [];
    // Priority: village/town > city > county > state
    if (addr.village) parts.push(addr.village);
    else if (addr.town) parts.push(addr.town);
    else if (addr.city) parts.push(addr.city);
    else if (addr.county) parts.push(addr.county);

    if (addr.suburb && !parts.includes(addr.suburb)) parts.push(addr.suburb);

    // If we have a state/province and it's different from what we already have
    if (addr.state && parts.length === 0) parts.push(addr.state);

    // Fallback to display_name trimmed
    if (parts.length === 0 && data.display_name) {
      const display = data.display_name.split(',').slice(0, 2).join(',').trim();
      return display;
    }

    return parts.join(' ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    loading: false,
    error: null,
    locationName: '',
  });

  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setState((prev) => ({ ...prev, error: 'GPS_NOT_SUPPORTED', loading: false }));
      return null;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000, // Cache for 1 minute
        });
      });

      const geoPos: GeoPosition = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };

      // Reverse geocode in parallel
      const name = await reverseGeocode(geoPos.lat, geoPos.lng);

      setState({
        position: geoPos,
        loading: false,
        error: null,
        locationName: name,
      });

      return { position: geoPos, locationName: name };
    } catch (err) {
      const error = err as GeolocationPositionError;
      let errorMsg = 'UNKNOWN_ERROR';
      if (error.code === 1) errorMsg = 'PERMISSION_DENIED';
      else if (error.code === 2) errorMsg = 'POSITION_UNAVAILABLE';
      else if (error.code === 3) errorMsg = 'TIMEOUT';

      setState((prev) => ({ ...prev, loading: false, error: errorMsg }));
      return null;
    }
  }, []);

  return { ...state, requestLocation };
}
