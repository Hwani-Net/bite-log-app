'use client';

import dynamic from 'next/dynamic';

// Leaflet uses window — must be loaded client-side only
const FleetRadar = dynamic(
  () => import('@/components/fleet-radar/FleetRadar'),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: '100dvh',
          background: '#0a1118',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '2px solid #00d4ff',
            borderTopColor: 'transparent',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ color: '#00d4ff', fontSize: '14px', fontFamily: 'sans-serif' }}>
          Fleet Radar 로딩 중...
        </p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    ),
  },
);

export default function FleetRadarPage() {
  return <FleetRadar />;
}
