'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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

// 남해/서해 주요 낚시 포인트 바운드 (mock 데이터 기준)
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

// ─── Inner Leaflet component (only rendered client-side via dynamic import) ───

export default function FleetRadar() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [fleet, setFleet] = useState<FleetEntry[]>([]);
  const [safeHarbors, setSafeHarbors] = useState<SafeHarborZone[]>([]);
  const [alerts, setAlerts] = useState<FleetEntry[]>([]);
  const [isMock, setIsMock] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>('all');
  const [userPos, setUserPos] = useState<UserPosition | null>(null);
  const [selectedShip, setSelectedShip] = useState<FleetEntry | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Leaflet refs (populated after dynamic import)
  const mapRef = useRef<unknown>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);

  // ── Geolocation ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => { /* 권한 거부 시 무시 */ },
    );
  }, []);

  // ── Data Fetching ──────────────────────────────────────────────────────────
  const fetchAndProcess = useCallback(async () => {
    try {
      const options = sizeFilter !== 'all' ? { size: sizeFilter as 'small' | 'large' } : undefined;
      const res = await fetchFleetData(options);
      if (!res.ok) { setError(res.error ?? '데이터 로드 실패'); return; }

      setFleet(res.data);
      setSafeHarbors(computeSafeHarbors(res.data));
      setIsMock(res.mock);
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

  // ── Leaflet dynamic initialization ────────────────────────────────────────
  useEffect(() => {
    let map: import('leaflet').Map;

    import('leaflet').then((L) => {
      leafletRef.current = L;

      // Fix default icon path broken by webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/leaflet/marker-icon-2x.png',
        iconUrl: '/leaflet/marker-icon.png',
        shadowUrl: '/leaflet/marker-shadow.png',
      });

      const container = document.getElementById('fleet-map');
      if (!container) return;

      map = L.map(container, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: false,
      });

      L.tileLayer(KOREA_SEA_TILES, {
        attribution: '© OpenStreetMap contributors',
        className: 'map-tiles-dark',
      }).addTo(map);

      // Custom zoom control bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      if (map) map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // ── Markers update ────────────────────────────────────────────────────────
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current as import('leaflet').Map | null;
    if (!L || !map || !mapReady) return;

    // Remove all existing layers except tile layer
    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) map.removeLayer(layer);
    });

    // Safe Harbor zones (green circles)
    for (const zone of safeHarbors) {
      L.circle([zone.centerLat, zone.centerLon], {
        radius: 500,
        color: '#39ff14',
        fillColor: '#39ff14',
        fillOpacity: 0.12,
        weight: 1.5,
      })
        .bindPopup(
          `<div style="font-family:sans-serif;font-size:12px">
            <b style="color:#39ff14">🟢 안전 밀집지</b><br/>
            ${zone.label}
          </div>`,
        )
        .addTo(map);
    }

    // Ship markers
    for (const ship of fleet) {
      const isLarge = ship.sizeClass === 'large';
      const color = isLarge ? '#ff073a' : '#39ff14';
      const size = isLarge ? 14 : 10;

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:${size}px;height:${size}px;
          background:${color};
          border:2px solid white;
          border-radius:50%;
          box-shadow:0 0 8px ${color};
          cursor:pointer;
        "></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([ship.lat, ship.lon], { icon });
      marker.bindPopup(
        `<div style="font-family:sans-serif;font-size:12px;min-width:160px">
          <b>${ship.shipName}</b>
          <span style="float:right;color:${color};font-size:10px">${isLarge ? '대형' : '소형'}</span><br/>
          <span style="color:#666">${shipTypeLabel(ship.shipType)} · ${ship.tonnage}GT · ${ship.length}m</span><br/>
          속력: <b>${ship.speed}kt</b> &nbsp; 침로: ${ship.course}°<br/>
          <span style="color:#999;font-size:10px">${formatAge(ship.timestamp)}</span>
        </div>`,
      );
      marker.on('click', () => setSelectedShip(ship));
      marker.addTo(map);
    }

    // User position marker
    if (userPos) {
      const userIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:14px;height:14px;
          background:#00d4ff;
          border:3px solid white;
          border-radius:50%;
          box-shadow:0 0 12px #00d4ff,0 0 0 8px rgba(0,212,255,0.2);
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker([userPos.lat, userPos.lon], { icon: userIcon })
        .bindPopup('<b style="color:#00d4ff">내 위치</b>')
        .addTo(map);
    }
  }, [fleet, safeHarbors, userPos, mapReady]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const smallCount = fleet.filter((s) => s.sizeClass === 'small').length;
  const largeCount = fleet.filter((s) => s.sizeClass === 'large').length;
  const fishingCount = fleet.filter((s) => s.shipType === 'fishing').length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col h-screen w-full overflow-hidden relative"
      style={{ background: '#0a1118', fontFamily: "'Space Grotesk', 'Noto Sans KR', sans-serif" }}
    >
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />

      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 pt-4 pb-2 z-20 shrink-0"
        style={{ background: 'rgba(10,17,24,0.9)', backdropFilter: 'blur(10px)' }}
      >
        <a
          href="/"
          className="flex items-center justify-center w-10 h-10 rounded-full transition-colors"
          style={{ color: '#e2e8f0' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          ←
        </a>

        <div className="flex flex-col items-center flex-1">
          <h1 className="text-lg font-bold" style={{ color: '#e2e8f0', letterSpacing: '-0.015em' }}>
            Fleet Radar <span style={{ color: '#00d4ff' }}>PRO</span>
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{
                background: '#39ff14',
                boxShadow: '0 0 6px #39ff14',
                animation: 'pulse 2s infinite',
              }}
            />
            <span className="text-xs font-medium" style={{ color: '#39ff14' }}>
              {isMock ? 'DEMO 데이터' : 'Live AIS/V-PASS'}
            </span>
            {lastUpdate && (
              <span className="text-xs" style={{ color: '#64748b' }}>
                · {lastUpdate} 갱신
              </span>
            )}
          </div>
        </div>

        {/* Refresh button */}
        <button
          onClick={() => { setLoading(true); fetchAndProcess(); }}
          className="flex items-center justify-center w-10 h-10 rounded-full transition-colors"
          style={{ color: '#00d4ff', background: 'rgba(0,212,255,0.1)' }}
          title="새로고침"
        >
          ↻
        </button>
      </div>

      {/* ── Alert Banner ──────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div
          className="mx-4 mt-2 px-4 py-2 rounded-xl flex items-center gap-3 z-20 shrink-0"
          style={{
            background: 'rgba(255,7,58,0.85)',
            border: '1px solid rgba(255,7,58,0.5)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span className="text-lg">⚠️</span>
          <div>
            <p className="text-sm font-bold text-white">대형 선박 접근 경보</p>
            <p className="text-xs text-white/80">
              {alerts[0].shipName} — {alerts[0].speed}kt, 1km 이내 접근 중
            </p>
          </div>
          <button
            onClick={() => setAlerts([])}
            className="ml-auto text-white/60 hover:text-white text-lg"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Mock / Error Notice ──────────────────────────────────────────── */}
      {isMock && !loading && (
        <div
          className="mx-4 mt-2 px-3 py-1.5 rounded-lg flex items-center gap-2 shrink-0"
          style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)' }}
        >
          <span className="text-xs" style={{ color: '#00d4ff' }}>
            ℹ️ DEMO 모드 — FLEET_API_KEY 미설정. 실제 AIS 데이터를 보려면 API 키를 설정하세요.
          </span>
        </div>
      )}
      {error && (
        <div className="mx-4 mt-2 px-3 py-1.5 rounded-lg bg-red-900/40 border border-red-700/50 shrink-0">
          <span className="text-xs text-red-300">⚠️ {error}</span>
        </div>
      )}

      {/* ── Filter Bar ───────────────────────────────────────────────────── */}
      <div className="flex gap-2 px-4 py-2 shrink-0 overflow-x-auto">
        {(['all', 'small', 'large'] as SizeFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setSizeFilter(f)}
            className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all"
            style={
              sizeFilter === f
                ? { background: '#00d4ff', color: '#0a1118' }
                : { background: 'rgba(255,255,255,0.08)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }
            }
          >
            {f === 'all' ? '전체' : f === 'small' ? '소형선 (<3GT)' : '대형선 (≥3GT)'}
          </button>
        ))}
      </div>

      {/* ── Map ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 relative">
        {/* Leaflet map container */}
        <div id="fleet-map" className="absolute inset-0" style={{ zIndex: 0 }} />

        {/* Dark overlay for non-map elements */}
        <style>{`
          .map-tiles-dark { filter: invert(1) hue-rotate(200deg) brightness(0.7) saturate(0.8); }
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        `}</style>

        {/* Legend overlay */}
        <div
          className="absolute top-2 left-2 z-10 rounded-xl p-3 text-xs"
          style={{
            background: 'rgba(30,41,59,0.75)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <p className="font-bold mb-1.5" style={{ color: '#e2e8f0' }}>범례</p>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: '#39ff14', boxShadow: '0 0 5px #39ff14' }} />
            <span style={{ color: '#94a3b8' }}>소형 어선</span>
          </div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: '#ff073a', boxShadow: '0 0 5px #ff073a' }} />
            <span style={{ color: '#94a3b8' }}>대형 선박</span>
          </div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: '#00d4ff', boxShadow: '0 0 5px #00d4ff' }} />
            <span style={{ color: '#94a3b8' }}>내 위치</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full opacity-50" style={{ background: '#39ff14', border: '1px solid #39ff14' }} />
            <span style={{ color: '#94a3b8' }}>안전 밀집지</span>
          </div>
        </div>

        {/* Loading overlay */}
        {loading && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center"
            style={{ background: 'rgba(10,17,24,0.7)', backdropFilter: 'blur(4px)' }}
          >
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-10 h-10 rounded-full border-2 border-t-transparent"
                style={{ borderColor: '#00d4ff', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }}
              />
              <span className="text-sm font-medium" style={{ color: '#00d4ff' }}>AIS 데이터 로딩 중...</span>
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}
      </div>

      {/* ── Bottom Info Card ─────────────────────────────────────────────── */}
      <div className="shrink-0 p-4 pb-6" style={{ zIndex: 30 }}>
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'rgba(30,41,59,0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 -4px 30px rgba(0,0,0,0.4)',
          }}
        >
          {/* Stats row */}
          <div className="flex gap-3 mb-3">
            <Stat label="전체" value={fleet.length} color="#e2e8f0" />
            <Stat label="소형선" value={smallCount} color="#39ff14" />
            <Stat label="대형선" value={largeCount} color="#ff073a" />
            <Stat label="어선" value={fishingCount} color="#00d4ff" />
          </div>

          {/* Safe harbor summary */}
          {safeHarbors.length > 0 ? (
            <div
              className="rounded-xl p-3 mb-3 flex gap-2.5 items-start"
              style={{ background: 'rgba(57,255,20,0.08)', border: '1px solid rgba(57,255,20,0.2)' }}
            >
              <span className="text-base mt-0.5">🎣</span>
              <p className="text-sm leading-snug" style={{ color: '#e2e8f0' }}>
                <span style={{ color: '#39ff14', fontWeight: 600 }}>{safeHarbors.length}개 안전 밀집지</span>{' '}
                발견 — 소형선 3척 이상, 대형선 500m 이상 이격.{' '}
                {safeHarbors[0].label}
              </p>
            </div>
          ) : (
            <div
              className="rounded-xl p-3 mb-3 flex gap-2.5 items-start"
              style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)' }}
            >
              <span className="text-base mt-0.5">ℹ️</span>
              <p className="text-sm leading-snug" style={{ color: '#94a3b8' }}>
                현재 권역에 안전 밀집지가 없습니다. 30초마다 자동 갱신됩니다.
              </p>
            </div>
          )}

          {/* Selected ship detail */}
          {selectedShip && (
            <div
              className="rounded-xl p-3 flex items-center justify-between"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div>
                <p className="text-sm font-bold" style={{ color: '#e2e8f0' }}>{selectedShip.shipName}</p>
                <p className="text-xs" style={{ color: '#64748b' }}>
                  {shipTypeLabel(selectedShip.shipType)} · {selectedShip.tonnage}GT · {selectedShip.speed}kt
                </p>
              </div>
              <button
                onClick={() => setSelectedShip(null)}
                className="text-slate-500 hover:text-slate-300 text-lg"
              >
                ×
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-component ─────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex-1 text-center">
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
      <p className="text-xs" style={{ color: '#64748b' }}>{label}</p>
    </div>
  );
}
