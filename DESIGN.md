# BiteLog Design System v2.0

> **Last updated**: 2026-04-06 (Redesign for Production Release)
> **Previous version**: v1.0 (2026-03-01, Stitch 1:1 aligned)
> **Tech stack**: Next.js 16 - Tailwind CSS v4 - Zustand - Recharts - Lucide Icons
> **Design philosophy**: Premium outdoor dark-first - Card-based - Bottom sheet pattern

---

## 1. Color Palette

### Brand Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#1392ec` | Primary actions, links, active states |
| `--color-primary-light` | `#4fb3f5` | Hover states, light accents |
| `--color-primary-dark` | `#0a6fbd` | Pressed states |
| `--color-accent` | `#22d3ee` | Secondary accent (cyan) |
| `--color-accent-warm` | `#f59e0b` | Alerts, CTA, warm highlights |

### Surface (Light Mode)
| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#f5f7f8` | Page background |
| `--color-surface` | `#ffffff` | Card background |
| `--color-surface-elevated` | `#f0f1f2` | Elevated cards, modals |
| `--color-surface-glass` | `rgba(255,255,255,0.72)` | Glass morphism cards |
| `--color-border` | `rgba(0,0,0,0.06)` | Card borders |
| `--color-border-strong` | `rgba(0,0,0,0.12)` | Dividers |

### Surface (Dark Mode)
| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg-dark` | `#0f1720` | Page background (not pure black) |
| `--color-surface-dark` | `#1a2332` | Card background |
| `--color-surface-elevated-dark` | `#243044` | Elevated surfaces |
| `--color-surface-glass-dark` | `rgba(26,35,50,0.8)` | Glass morphism |
| `--color-border-dark` | `rgba(255,255,255,0.06)` | Card borders |
| `--color-border-strong-dark` | `rgba(255,255,255,0.12)` | Dividers |

### Text
| Token | Light | Dark |
|-------|-------|------|
| `--color-text-primary` | `#0f172a` | `#f1f5f9` |
| `--color-text-secondary` | `#64748b` | `#94a3b8` |
| `--color-text-muted` | `#94a3b8` | `#475569` |
| `--color-text-inverse` | `#ffffff` | `#0f172a` |

### Semantic
| Token | Value | Usage |
|-------|-------|-------|
| `--color-success` | `#22c55e` | Positive states, confirmed |
| `--color-warning` | `#f59e0b` | Attention, caution |
| `--color-error` | `#ef4444` | Error, destructive |
| `--color-info` | `#3b82f6` | Informational |

### Chart Colors (6-color palette)
| Token | Value | Usage |
|-------|-------|-------|
| `--chart-1` | `#1392ec` | Primary series |
| `--chart-2` | `#22d3ee` | Teal series |
| `--chart-3` | `#22c55e` | Green series |
| `--chart-4` | `#a855f7` | Purple series |
| `--chart-5` | `#f59e0b` | Amber series |
| `--chart-6` | `#ec4899` | Pink series |

### Fleet Radar (Specialized)
| Token | Value | Usage |
|-------|-------|-------|
| `--fleet-bg` | `#0a1118` | Radar dark background |
| `--fleet-small` | `#39ff14` | Small vessel marker |
| `--fleet-large` | `#ff073a` | Large vessel marker |
| `--fleet-user` | `#00d4ff` | User position |

---

## 2. Typography

| Property | Value |
|----------|-------|
| **Primary** | `'Inter', 'Pretendard', 'Noto Sans KR', system-ui, sans-serif` |
| **Mono** | `'JetBrains Mono', 'Fira Code', monospace` (for data numbers) |
| **Rendering** | `antialiased` |
| **Icons** | Lucide React (tree-shakeable, consistent) |

### Scale
| Name | Size | Weight | Line-height | Usage |
|------|------|--------|-------------|-------|
| `display` | 28px | 800 | 1.2 | Page hero titles |
| `title` | 20px | 700 | 1.3 | Section headers |
| `subtitle` | 16px | 600 | 1.4 | Card headers |
| `body` | 14px | 400 | 1.5 | Body text |
| `caption` | 12px | 500 | 1.4 | Labels, badges |
| `micro` | 10px | 600 | 1.3 | Stats, tiny labels |

---

## 3. Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tight gaps |
| `--space-2` | 8px | Icon gaps, small padding |
| `--space-3` | 12px | Card internal padding |
| `--space-4` | 16px | Page horizontal padding, card padding |
| `--space-5` | 20px | Section spacing |
| `--space-6` | 24px | Section gaps |
| `--space-8` | 32px | Large section gaps |

**Page layout**: `px-4` (16px) horizontal padding, `max-w-md` (448px) container

---

## 4. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 8px | Small elements (badges, chips) |
| `--radius-md` | 12px | Buttons, inputs |
| `--radius-lg` | 16px | Cards |
| `--radius-xl` | 24px | Bottom sheets, modals |
| `--radius-full` | 9999px | Circular elements, pills |

---

## 5. Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.04)` | Subtle card elevation |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.08)` | Cards, buttons |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.12)` | Modals, bottom sheets |
| `--shadow-glow` | `0 0 20px rgba(19,146,236,0.3)` | Primary glow effect |

---

## 6. Component Patterns

### Glass Card
```css
background: var(--color-surface-glass);
backdrop-filter: blur(12px);
border: 1px solid var(--color-border);
border-radius: var(--radius-lg);
```

### Bottom Sheet (3-snap)
- **Collapsed**: 10% height (peek strip + handle)
- **Half**: 50% height (summary content)
- **Expanded**: 90% height (full content)
- Handle: 40px wide, 4px tall, centered, `--color-border-strong`

### Skeleton Loading
- Background: `--color-surface-elevated` / `--color-surface-elevated-dark`
- Animation: shimmer (left-to-right gradient sweep, 1.5s infinite)
- No spinners anywhere in the app

### Bottom Navigation
- 5 items max: Home, Fleet, AI, Ranking, Settings
- Height: 64px + safe area
- Icons: Lucide React, 22px default, 24px active
- Active: primary color + 1px dot indicator below
- Background: `surface-glass` with `backdrop-blur-xl`

### FAB (Floating Action Button)
```css
background: linear-gradient(135deg, #1392ec, #22d3ee);
box-shadow: 0 6px 20px rgba(19,146,236,0.4);
border-radius: var(--radius-full);
width: 56px; height: 56px;
```

### Stat Card
- Glass background + `border-l-4` colored accent
- `micro` font for label, `title` font for value
- 3-column grid on home page

---

## 7. Interaction

### Touch Targets
- Minimum: 44x44px (WCAG), recommended: 48x48px
- Button padding: min `py-3 px-4`

### Transitions
- Default: `150ms ease-out`
- Page transitions: `300ms cubic-bezier(0.16, 1, 0.3, 1)`
- Bottom sheet: `500ms cubic-bezier(0.32, 0.72, 0, 1)`

### Active States
- Buttons: `active:scale-95` transform
- Cards: `active:scale-[0.98]` transform
- Links: color shift to `--color-primary-dark`

---

## 8. Dark Mode

| Aspect | Implementation |
|--------|---------------|
| **Toggle** | `.dark` class on `<html>` |
| **CSS** | `@custom-variant dark (&:is(.dark *))` |
| **Default** | Light mode (follow system preference option) |
| **Storage** | `localStorage.fishlog_theme` |
| **Meta** | Dynamic `theme-color` meta tag update |

---

## 9. Responsive

- **Mobile-first**: `max-w-md` (448px) — primary target
- **Safe areas**: `viewport-fit=cover` + `env(safe-area-inset-*)` for Capacitor
- **No desktop layout** in V1

---

## 10. Icon Migration Plan

**From**: Material Symbols (Google Fonts CDN, weight-variable)
**To**: Lucide React (tree-shakeable, import-only)

| Material Symbol | Lucide Equivalent |
|----------------|-------------------|
| `home` | `Home` |
| `radar` | `Radar` |
| `auto_awesome` | `Sparkles` |
| `emoji_events` | `Trophy` |
| `settings` | `Settings` |
| `notifications` | `Bell` |
| `add` | `Plus` |
| `chevron_right` | `ChevronRight` |
| `arrow_back` | `ArrowLeft` |
| `search` | `Search` |
| `filter_list` | `Filter` |
| `favorite` | `Heart` |
| `share` | `Share2` |
| `camera_alt` | `Camera` |
| `mic` | `Mic` |
| `location_on` | `MapPin` |
| `calendar_today` | `Calendar` |
| `timer` | `Timer` |
| `thermostat` | `Thermometer` |
| `air` | `Wind` |
| `water_drop` | `Droplets` |
| `set_meal` | `Fish` |

---

## 11. File Map (Target)

```
src/
├── app/
│   ├── globals.css              <- Design tokens (v2.0)
│   ├── layout.tsx               <- Shell + Lucide icons
│   └── [22 route directories]
├── components/
│   ├── ui/                      <- NEW: Shared UI primitives
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── Skeleton.tsx
│   │   ├── BottomSheet.tsx
│   │   ├── StatCard.tsx
│   │   ├── Header.tsx
│   │   ├── EmptyState.tsx
│   │   ├── Input.tsx
│   │   └── Toast.tsx
│   ├── AppInitializer.tsx
│   ├── BottomNav.tsx
│   ├── SplashScreen.tsx
│   └── SplashWrapper.tsx
├── lib/
│   ├── firebase.ts
│   ├── i18n.ts
│   ├── apiError.ts              <- NEW: Error types
│   └── apiClient.ts             <- NEW: API wrapper
├── services/                    <- 31 service files
├── store/
│   ├── appStore.ts
│   └── subscriptionStore.ts
└── hooks/
```
