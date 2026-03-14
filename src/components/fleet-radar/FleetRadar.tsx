'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Anchor,
  Navigation,
  Star,
  Compass,
  Ruler,
  Info,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Activity,
  History,
  Map as MapIcon,
  X,
} from 'lucide-react';
import {
  FleetEntry,
  SafeHarborZone,
  fetchFleetData,
  computeSafeHarbors,
  checkProximityAlert,
} from '@/services/fleetRadarService';

// ─── Types ───────────────────────────────────────────────────────────────────

type SizeFilter = 'all' | 'small' | 'large';

interface UserPosition {
  lat: number;
  lon: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REFRESH_INTERVAL_MS = 30_000;
const DEFAULT_CENTER: [number, number] = [34.89, 128.62]; // 남해 중심부
const DEFAULT_ZOOM = 10;

const KOREA_SEA_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAge(isoTimestamp: string): string {
  const diffSec = Math.floor((Date.now() - new Date(isoTimestamp).getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}초 전`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
  return `${Math.floor(diffSec / 3600)}시간 전`;
}

function shipTypeLabel(type: string): string {
  const map: Record<string, string> = {
    fishing: '어선', cargo: '화물선', leisure: '레저선', passenger: '여객선',
  };
  return map[type] ?? type;
}

function shipTypeEmoji(type: string): string {
  const map: Record<string, string> = {
    fishing: '🎣', cargo: '🚢', leisure: '⛵', passenger: '🛳️',
  };
  return map[type] ?? '🚤';
}

function courseDirection(deg: number): string {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function speedCategory(kt: number): { label: string; color: string } {
  if (kt <= 1) return { label: '정박/대기', color: '#10b981' }; // Emerald
  if (kt <= 5) return { label: '저속 운항', color: '#fbbf24' }; // Amber
  if (kt <= 12) return { label: '정상 운항', color: '#00d4ff' }; // Cyan
  return { label: '고속 운항', color: '#ef4444' }; // Red
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function FleetRadar() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [fleet, setFleet] = useState<FleetEntry[]>([]);
  const [safeHarbors, setSafeHarbors] = useState<SafeHarborZone[]>([]);
  const [alerts, setAlerts] = useState<FleetEntry[]>([]);
  const [isMock, setIsMock] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>('all');
  const [userPos, setUserPos] = useState<UserPosition | null>(null);
  const [selectedShip, setSelectedShip] = useState<FleetEntry | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Leaflet refs
  const mapRef = useRef<any>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);

  // ── Geolocation ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => {},
    );
  }, []);

  // ── Data Fetching ──────────────────────────────────────────────────────────
  const fetchAndProcess = useCallback(async () => {
    try {
      const options = sizeFilter !== 'all' ? { size: sizeFilter as 'small' | 'large' } : undefined;
      const res = await fetchFleetData(options);
      if (!res.ok) { setError(res.error ?? '로드 실패'); return; }

      setFleet(res.data);
      setSafeHarbors(computeSafeHarbors(res.data));
      setIsMock(res.mock);
      setIsFallback(res.fallback ?? false);
      setLastUpdate(new Date().toLocaleTimeString('ko-KR'));
      setError(null);

      if (userPos) {
        setAlerts(checkProximityAlert(res.data, userPos.lat, userPos.lon));
      }
    } catch {
      setError('네트워크 오류');
    } finally {
      setLoading(false);
    }
  }, [sizeFilter, userPos]);

  useEffect(() => {
    fetchAndProcess();
    const id = setInterval(fetchAndProcess, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchAndProcess]);

  // ── Leaflet initialization ───────────────────────────────────────────────
  useEffect(() => {
    let mapInstance: any;

    import('leaflet').then((L) => {
      leafletRef.current = L;

      // Fix icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/leaflet/marker-icon-2x.png',
        iconUrl: '/leaflet/marker-icon.png',
        shadowUrl: '/leaflet/marker-shadow.png',
      });

      const container = document.getElementById('fleet-map');
      if (!container) return;

      mapInstance = L.map(container, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: false,
      });

      L.tileLayer(KOREA_SEA_TILES, {
        attribution: '© OSM',
        className: 'map-tiles-dark',
      }).addTo(mapInstance);

      L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);

      mapRef.current = mapInstance;
      setMapReady(true);
      setTimeout(() => mapInstance.invalidateSize(), 200);
    });

    return () => {
      if (mapInstance) mapInstance.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // ── Global window helper for popup buttons ──
  useEffect(() => {
    (window as any).openShipDetail = (mmsi: string) => {
      const ship = fleet.find(s => s.mmsi === mmsi);
      if (ship) setSelectedShip(ship);
    };
  }, [fleet]);

  // ── Markers update ────────────────────────────────────────────────────────
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !mapReady) return;

    map.eachLayer((layer: any) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) map.removeLayer(layer);
    });

    // Safe Harbors
    for (const zone of safeHarbors) {
      L.circle([zone.centerLat, zone.centerLon], {
        radius: 500, color: '#39ff14', fillOpacity: 0.1, weight: 1,
      }).addTo(map);
    }

    // Ships
    for (const ship of fleet) {
      const isLarge = ship.sizeClass === 'large';
      const color = isLarge ? '#ff073a' : '#39ff14';
      const size = isLarge ? 12 : 9;

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;background:${color};border:1.5px solid white;border-radius:50%;box-shadow:0 0 8px ${color}"></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const popupHtml = `
        <div style="font-family:sans-serif;min-width:140px;padding:2px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <b style="font-size:13px">${ship.shipName}</b>
            <span style="color:${color};font-size:10px;font-weight:bold">${isLarge ? '대형' : '소형'}</span>
          </div>
          <div style="font-size:11px;color:#666;margin-bottom:8px">
            ${shipTypeLabel(ship.shipType)} · ${ship.tonnage}GT · ${ship.speed}kt
          </div>
          <button 
            onclick="window.openShipDetail('${ship.mmsi}')"
            style="width:100%;padding:6px;background:#00d4ff;color:white;border:none;border-radius:6px;font-size:11px;font-weight:bold;cursor:pointer"
          >
            상세 정보 보기
          </button>
        </div>
      `;

      L.marker([ship.lat, ship.lon], { icon })
        .bindPopup(popupHtml)
        .on('click', () => setSelectedShip(ship))
        .addTo(map);
    }

    // User
    if (userPos) {
      const userIcon = L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;background:#00d4ff;border:2px solid white;border-radius:50%;box-shadow:0 0 12px #00d4ff"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker([userPos.lat, userPos.lon], { icon: userIcon }).addTo(map);
    }
  }, [fleet, safeHarbors, userPos, mapReady]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const smallCount = fleet.filter((s) => s.sizeClass === 'small').length;
  const largeCount = fleet.filter((s) => s.sizeClass === 'large').length;
  const fishingCount = fleet.filter((s) => s.shipType === 'fishing').length;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: '#0a1118',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-slate-900/90 backdrop-blur-md border-b border-white/5 z-20">
        <button onClick={() => window.location.href = '/'} className="p-2 text-slate-400 hover:text-white">
          <X size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-base font-bold text-slate-100 flex items-center gap-1.5 justify-center">
            Fleet Radar <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400">PRO</span>
          </h1>
          <div className="flex items-center gap-1.5 justify-center mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isMock ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <span className="text-[10px] text-slate-400">{isMock ? 'DEMO' : 'LIVE'} · {lastUpdate || '--:--:--'}</span>
          </div>
        </div>
        <button onClick={() => { setLoading(true); fetchAndProcess(); }} className="p-2 text-cyan-400">
          <Activity size={18} />
        </button>
      </div>

      {/* Map Content */}
      <div className="flex-1 relative">
        <div id="fleet-map" className="absolute inset-0" style={{ zIndex: 0 }} />
        
        {/* Filters */}
        <div className="absolute top-4 left-0 right-0 z-10 px-4 flex gap-2 overflow-x-auto scrollbar-hide">
          {(['all', 'small', 'large'] as SizeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setSizeFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                sizeFilter === f 
                  ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20' 
                  : 'bg-slate-900/80 border-white/10 text-slate-400 backdrop-blur-md'
              }`}
            >
              {f === 'all' ? '전체' : f === 'small' ? '소형선' : '대형선'}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="absolute top-16 left-4 z-10 p-2.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/10 shadow-xl">
          <div className="flex flex-col gap-1.5">
            <LegendItem color="#39ff14" label="소형 어선" />
            <LegendItem color="#ff073a" label="대형 선박" />
            <LegendItem color="#00d4ff" label="내 위치" />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px]">
            <div className="w-8 h-8 border-2 border-t-transparent border-cyan-500 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Stats Panel (Clipped bottom) */}
      <div className="shrink-0 p-4 bg-slate-900/95 backdrop-blur-xl border-t border-white/5 z-20">
        <div className="grid grid-cols-4 gap-2 mb-3">
          <SimpleStat label="전체" value={fleet.length} />
          <SimpleStat label="소형" value={smallCount} color="text-emerald-400" />
          <SimpleStat label="대형" value={largeCount} color="text-red-400" />
          <SimpleStat label="어선" value={fishingCount} color="text-cyan-400" />
        </div>
        {safeHarbors.length > 0 ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span className="text-[11px] text-slate-300 font-medium">안전 밀집지 {safeHarbors.length}곳 발견</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/30 border border-white/5">
            <Info size={14} className="text-slate-500" />
            <span className="text-[11px] text-slate-500">주변 밀집 정보 없음</span>
          </div>
        )}
      </div>

      {/* Premium Bottom Sheet */}
      <ShipDetailOverlay ship={selectedShip} onClose={() => setSelectedShip(null)} />

      <style jsx global>{`
        .map-tiles-dark { filter: invert(1) hue-rotate(180deg) brightness(0.7) contrast(1.2); }
        .leaflet-popup-content-wrapper { background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(8px); color: white; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); }
        .leaflet-popup-tip { background: rgba(15, 23, 42, 0.95); }
      `}</style>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ background: color, color }} />
      <span className="text-[10px] font-medium text-slate-300">{label}</span>
    </div>
  );
}

function SimpleStat({ label, value, color = 'text-slate-200' }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center p-2 rounded-lg bg-white/5">
      <div className={`text-sm font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function ShipDetailOverlay({ ship, onClose }: { ship: FleetEntry | null; onClose: () => void }) {
  const isVisible = !!ship;
  const isLarge = ship?.sizeClass === 'large';
  const color = isLarge ? '#ff073a' : '#10b981';

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[9998] transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div 
        className={`fixed left-0 right-0 bottom-0 z-[9999] bg-slate-900/98 backdrop-blur-2xl rounded-t-[32px] border-t border-white/10 shadow-2xl transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '85vh' }}
      >
        {ship && (
          <div className="px-6 pt-2 pb-10">
            {/* Handle */}
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-2 mb-6" onClick={onClose} />
            
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                  {shipTypeEmoji(ship.shipType)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white tracking-tight">{ship.shipName}</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500 text-slate-950">PRO</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-semibold" style={{ color }}>{isLarge ? '대형 선박' : '소형 어선'}</span>
                    <span className="text-xs text-slate-500">· {shipTypeLabel(ship.shipType)}</span>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-full bg-white/5 text-slate-400"><X size={24} /></button>
            </div>

            {/* MMSI Stripe */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 mb-6">
               <div className="flex items-center gap-2">
                 <span className="text-[10px] font-bold text-slate-500 tracking-wider">MMSI</span>
                 <span className="text-xs font-mono text-slate-300">{ship.mmsi}</span>
               </div>
               <div className="flex items-center gap-1.5">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                 <span className="text-[10px] text-slate-500 font-medium">{formatAge(ship.timestamp)} 수신</span>
               </div>
            </div>

            {/* Speed Gauge */}
            <div className="mb-6">
              <div className="flex justify-between items-end mb-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">{ship.speed}</span>
                  <span className="text-sm font-bold text-slate-500">kt</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 text-[10px] font-bold text-slate-300">
                  <Compass size={12} className="text-cyan-400" />
                  {ship.course}° {courseDirection(ship.course)}
                </div>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ 
                    width: `${Math.min((ship.speed / 20) * 100, 100)}%`, 
                    background: `linear-gradient(90deg, ${color}cc, ${color})`,
                    boxShadow: `0 0 10px ${color}40`
                  }}
                />
              </div>
              <div className="flex justify-between mt-1 px-0.5">
                <span className="text-[9px] font-bold text-slate-600">0kt</span>
                <span className="text-[9px] font-bold text-slate-600">STATIC</span>
                <span className="text-[9px] font-bold text-slate-600">10kt</span>
                <span className="text-[9px] font-bold text-slate-600">CRUISE</span>
                <span className="text-[9px] font-bold text-slate-600">20kt+</span>
              </div>
            </div>

            {/* Grid Stats */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              <DetailCell icon={<Anchor size={16} />} label="톤수" value={`${ship.tonnage} GT`} />
              <DetailCell icon={<Ruler size={16} />} label="선체 전장" value={`${ship.length} m`} />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button className="flex-1 h-14 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl shadow-cyan-500/20">
                <Navigation size={18} />
                길찾기 시작
              </button>
              <button className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-95">
                <Star size={20} />
              </button>
            </div>

            {/* Map Link */}
            <button 
              onClick={() => window.open(`https://www.google.com/maps?q=${ship.lat},${ship.lon}`, '_blank')}
              className="w-full mt-4 py-3 rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <ExternalLink size={14} />
              <span className="text-xs font-medium underline underline-offset-4">구글 지도로 위치 보기</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function DetailCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
      <div className="text-cyan-400/60">{icon}</div>
      <div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{label}</div>
        <div className="text-sm font-black text-slate-200">{value}</div>
      </div>
    </div>
  );
}
