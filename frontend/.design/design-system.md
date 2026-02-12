# VolleyClip — Design System

## Direction

SPIKE x RALLY hybrid: brutalist athletic structure with neon-techno energy. Dark, nearly black backgrounds. Color used sparingly but precisely — glow, not paint. Typography that yells but glows while doing it. A sports broadcast from a cyberpunk future where volleyball is the only thing that matters.

## Color Tokens

### Core

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-void` | `#06060A` | Deepest background, behind the dither layer |
| `--bg-surface` | `#0F0F14` | Cards, panels, elevated surfaces |
| `--bg-raised` | `#16161D` | Hover states, active surfaces |
| `--border-dim` | `#1E1E28` | Default borders (barely visible) |
| `--border-bright` | `#2A2A3A` | Focused/active borders |
| `--text-primary` | `#E8E8ED` | Main content (slightly warm white) |
| `--text-secondary` | `#7A7A8A` | Metadata, labels, supporting text |
| `--text-dim` | `#4A4A58` | Disabled, placeholders, timestamps |

### Accents

| Token | Hex | Usage |
|-------|-----|-------|
| `--accent-primary` | `#FF5A1F` | Primary actions — Volt Orange |
| `--accent-primary-glow` | `rgba(255,90,31,0.15)` | Glow behind primary elements |
| `--accent-secondary` | `#3B82F6` | Links, secondary actions — Signal Blue |
| `--accent-hot` | `#E040FB` | Rare emphasis, notifications — Ace Magenta |
| `--accent-success` | `#22D37A` | Success states — Clean Green |
| `--accent-warning` | `#F59E0B` | Warnings — Whistle Amber |
| `--accent-error` | `#EF4444` | Errors — Fault Red |

### Dither Layer

| Token | Hex | Usage |
|-------|-----|-------|
| `--dither-base` | `#12121A` | Dither dot color at rest |
| `--dither-bright` | `#1E1E2E` | Flash/pulse moments |

## Typography

```css
--font-display: 'Space Grotesk', system-ui, sans-serif;
--font-body: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

- **Space Grotesk** — headings, display text (geometric, wide, confident)
- **Inter** — body copy (invisible workhorse)
- **JetBrains Mono** — timestamps, status badges, metadata (ligatures off, tabular nums on)

### Type Scale

```
--text-xs:   0.75rem    /* 12px */
--text-sm:   0.875rem   /* 14px */
--text-base: 1rem       /* 16px */
--text-lg:   1.125rem   /* 18px */
--text-xl:   1.25rem    /* 20px */
--text-2xl:  1.5rem     /* 24px */
--text-3xl:  2rem       /* 32px */
--text-4xl:  2.5rem     /* 40px — landing page only */
```

## Design Principles

1. **Glow, Don't Shout** — Color as soft light sources, not flat fills. Primary actions get `box-shadow: 0 0 20px rgba(accent, 0.15)`. Hover = 1px bright border "turns on" like a circuit activating. Dark backgrounds absorb everything; color only escapes through intention.

2. **Data Is Beautiful** — Every number and timestamp rendered proudly in monospace. Clip duration: `00:04.32`. Progress: `FRAME 1,847 / 12,402` not "15%". Status: `[INDEXING]` `[SLICING]` `[COMPLETE]`.

3. **Sharp Geometry, Soft Light** — `border-radius: 2px` max. Pixel-perfect edges. But lighting is diffused — glows and gradients, not drop shadows. Circuit board illuminated by neon.

4. **Motion Has Weight** — Nothing floats or bounces. Animations decelerate hard. Like a spike hitting the floor.
   ```css
   --ease-slam: cubic-bezier(0.22, 1, 0.36, 1);    /* aggressive decelerate */
   --ease-snap: cubic-bezier(0, 0, 0.2, 1);          /* sharp snap-in */
   ```
   Card appearances: scale 0.95→1.0 over 200ms with `--ease-slam`. Hover: instant on, 150ms ease off.

5. **The Net Divider** — Section dividers use a net-hash pattern instead of plain `<hr>`:
   ```
   ───┼───┼───┼───┼───┼───┼───┼───┼───
   ```

6. **Terminal Confidence** — Status badges in monospace. Expandable processing logs as terminal-style feeds. Error states feel like system alerts, not apologies.
