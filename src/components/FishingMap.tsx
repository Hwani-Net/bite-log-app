'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CatchRecord } from '@/types';

interface FishingMapProps {
  records: CatchRecord[];
  locale: string;
  height?: string;
}

// Custom fish marker icon
function createFishIcon() {
  return L.divIcon({
    className: 'fish-marker',
    html: `<div style="
      width: 32px; height: 32px;
      background: linear-gradient(135deg, #1392ec, #2dd4bf);
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(19,146,236,0.4);
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
    ">🐟</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

export default function FishingMap({ records, locale, height = '300px' }: FishingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Filter records that have GPS coordinates
  const geoRecords = records.filter((r) => r.location.lat && r.location.lng);

  useEffect(() => {
    if (!mapRef.current || geoRecords.length === 0) return;

    // Cleanup previous map instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Default center: Korea
    const defaultCenter: [number, number] = [35.9, 128.0];
    const center: [number, number] = geoRecords.length > 0
      ? [geoRecords[0].location.lat!, geoRecords[0].location.lng!]
      : defaultCenter;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(center, 8);

    // OpenStreetMap tiles (free, no API key)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(map);

    // Add zoom control to bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Add attribution
    L.control.attribution({ position: 'bottomleft', prefix: '' })
      .addAttribution('© <a href="https://openstreetmap.org">OSM</a>')
      .addTo(map);

    const icon = createFishIcon();

    // Group records by location (same lat/lng)
    const locationGroups = new Map<string, CatchRecord[]>();
    geoRecords.forEach((r) => {
      const key = `${r.location.lat!.toFixed(4)},${r.location.lng!.toFixed(4)}`;
      if (!locationGroups.has(key)) locationGroups.set(key, []);
      locationGroups.get(key)!.push(r);
    });

    const markers: L.Marker[] = [];

    locationGroups.forEach((recs) => {
      const first = recs[0];
      const totalCatch = recs.reduce((sum, r) => sum + r.count, 0);
      const speciesList = [...new Set(recs.map((r) => r.species))];

      const popupContent = `
        <div style="font-family: sans-serif; min-width: 140px;">
          <div style="font-weight: 700; font-size: 13px; margin-bottom: 4px;">
            📍 ${first.location.name}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
            ${locale === 'ko' ? '방문' : 'Visits'}: ${recs.length}${locale === 'ko' ? '회' : ''} · 
            ${locale === 'ko' ? '총' : 'Total'}: ${totalCatch}${locale === 'ko' ? '마리' : ' fish'}
          </div>
          <div style="font-size: 11px; color: #1392ec;">
            ${speciesList.join(', ')}
          </div>
          ${recs[0].weather ? `
            <div style="font-size: 10px; color: #94a3b8; margin-top: 4px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
              ${recs[0].weather.condition} ${recs[0].weather.tempC}°C
            </div>
          ` : ''}
        </div>
      `;

      const marker = L.marker([first.location.lat!, first.location.lng!], { icon })
        .bindPopup(popupContent, {
          closeButton: false,
          className: 'fish-popup',
        })
        .addTo(map);
      markers.push(marker);
    });

    // Fit bounds to show all markers
    if (markers.length > 1) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.2));
    } else if (markers.length === 1) {
      map.setView(markers[0].getLatLng(), 12);
    }

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoRecords.length, locale]);

  if (geoRecords.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6 text-center" style={{ height }}>
        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">map</span>
        <p className="text-sm text-slate-400">
          {locale === 'ko'
            ? 'GPS가 포함된 기록이 없습니다.\n기록 시 위치 감지를 허용하면 지도에 표시됩니다.'
            : 'No GPS records yet.\nAllow location detection when recording to see your spots on the map.'}
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden border border-primary/10">
      <div ref={mapRef} style={{ height, width: '100%' }} />
      <div className="px-3 py-2 flex items-center justify-between bg-white/80 dark:bg-slate-900/80">
        <span className="text-[10px] text-slate-400">
          {locale === 'ko' ? `📍 ${geoRecords.length}개 포인트` : `📍 ${geoRecords.length} spots`}
        </span>
        <span className="text-[10px] text-slate-400">
          {locale === 'ko' ? `🐟 ${geoRecords.reduce((s, r) => s + r.count, 0)}마리` : `🐟 ${geoRecords.reduce((s, r) => s + r.count, 0)} fish`}
        </span>
      </div>
    </div>
  );
}
