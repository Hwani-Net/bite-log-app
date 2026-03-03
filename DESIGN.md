# FishLog Design System — DESIGN.md

> **Last updated**: 2026-03-01 (Stitch 1:1 aligned)
> **Source of truth**: Stitch Project `15640016612442748184` + [`globals.css`](file:///e:/AI_Programing/Fishing/fish-log/src/app/globals.css)
> **Tech stack**: Next.js 16 · Tailwind CSS v4 · Zustand · Recharts · Lucide Icons

---

## 1. Color Palette (Stitch-aligned)

### Primary
- **`#1392ec`** — Brand primary (Stitch token)

### Surface & Text

| Token | Light Mode | Dark Mode |
|-------|-----------|-----------|
| `--color-surface` | `#f6f7f8` | `#101a22` |
| `--color-surface-card` | `#ffffff` | `#1e293b` (slate-800) |
| `--color-surface-elevated` | `#f0f1f2` | `#334155` (slate-700) |
| `--color-surface-glass` | `rgba(255,255,255,0.7)` | `rgba(30,41,59,0.8)` |
| `--color-border` | `#e2e8f0` (slate-200) | `#334155` (slate-700) |
| `--color-text-primary` | `#0f172a` (slate-900) | `#f1f5f9` (slate-100) |
| `--color-text-secondary` | `#64748b` (slate-500) | `#94a3b8` (slate-400) |
| `--color-text-muted` | `#94a3b8` (slate-400) | `#64748b` (slate-500) |

### Chart Colors
| Token | Value |
|-------|-------|
| `chart-1` | `#1392ec` |
| `chart-2` | `oklch(0.62 0.15 185)` teal |
| `chart-3` | `oklch(0.65 0.15 155)` green |
| `chart-4` | `oklch(0.7 0.12 280)` purple |
| `chart-5` | `oklch(0.72 0.14 40)` amber |
| `chart-6` | `oklch(0.65 0.13 330)` pink |

---

## 2. Typography (Stitch-aligned)

| Property | Value |
|----------|-------|
| **Primary font** | `Inter` → `Noto Sans KR` → `Pretendard` → system |
| **Loaded from** | Google Fonts (Inter + Noto Sans KR), CDN (Pretendard) |
| **Rendering** | `antialiased` |
| **Stat label** | `text-[11px] uppercase tracking-wider` |

---

## 3. Key Components (Stitch source)

### Glass Card
```css
background: rgba(255, 255, 255, 0.7);
backdrop-filter: blur(10px);
border: 1px solid rgba(19, 146, 236, 0.1);
```

### Stat Card
- `glass` + `border-l-4 border-l-[color]`
- Colors: primary, teal-400, blue-400

### Catch Card
- `size-20` (80px) thumbnail, `rounded-xl`
- `border border-[var(--color-border)]`
- Species badge: `text-[10px] font-bold rounded-full`

### Wave Background (Stitch dot pattern)
```css
background-image: radial-gradient(circle at 2px 2px, rgba(19,146,236,0.05) 1px, transparent 0);
background-size: 24px 24px;
```

### FAB
```css
background: linear-gradient(to top right, #1392ec, #22d3ee);
shadow: 0 6px 20px rgba(19,146,236,0.4);
```

---

## 4. Theming

| Aspect | Implementation |
|--------|---------------|
| **Toggle** | `data-theme` on `<html>` |
| **CSS** | `@custom-variant dark` → `[data-theme="dark"]` |
| **Default** | Light mode |
| **Storage** | `localStorage.fishlog_theme` |

---

## 5. File Map

```
src/
├── app/
│   ├── globals.css          ← Stitch design tokens
│   ├── layout.tsx           ← Shell + fonts
│   ├── page.tsx             ← Home (Stitch-aligned)
│   ├── record/page.tsx      ← Catch form
│   ├── records/page.tsx     ← All catches list
│   ├── concierge/page.tsx   ← AI Concierge (Stitch-derived)
│   ├── ranking/page.tsx     ← Ranking (Stitch-derived)
│   ├── stats/page.tsx       ← Stats + charts
│   └── settings/page.tsx    ← Settings + theme
├── components/
│   ├── AppInitializer.tsx
│   └── BottomNav.tsx
├── lib/i18n.ts
├── services/
│   ├── localStorage.ts
│   └── rankingService.ts
├── store/appStore.ts
└── types/
    ├── index.ts
    └── ranking.ts
```
