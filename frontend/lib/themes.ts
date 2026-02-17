// ── Theme color tokens ──────────────────────────────
export interface ThemeColors {
  'bg-void': string
  'bg-surface': string
  'bg-raised': string
  'border-dim': string
  'border-bright': string
  'text-primary': string
  'text-secondary': string
  'text-dim': string
  'accent-primary': string
  'accent-secondary': string
  'accent-hot': string
  'accent-success': string
  'accent-warning': string
  'accent-error': string
}

export interface ThemePreset {
  id: string
  name: string
  colors: ThemeColors
  /** Small swatch colors for the preview pill */
  preview: [string, string, string]
}

// ── Preset themes ──────────────────────────────────

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'obsidian',
    name: 'Obsidian',
    preview: ['#06060A', '#FF5A1F', '#3B82F6'],
    colors: {
      'bg-void': '#06060A',
      'bg-surface': '#0F0F14',
      'bg-raised': '#16161D',
      'border-dim': '#1E1E28',
      'border-bright': '#2A2A3A',
      'text-primary': '#E8E8ED',
      'text-secondary': '#7A7A8A',
      'text-dim': '#4A4A58',
      'accent-primary': '#FF5A1F',
      'accent-secondary': '#3B82F6',
      'accent-hot': '#E040FB',
      'accent-success': '#22D37A',
      'accent-warning': '#F59E0B',
      'accent-error': '#EF4444',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    preview: ['#080B14', '#6366F1', '#38BDF8'],
    colors: {
      'bg-void': '#080B14',
      'bg-surface': '#0E1221',
      'bg-raised': '#151A2E',
      'border-dim': '#1E2540',
      'border-bright': '#2A3455',
      'text-primary': '#E2E8F0',
      'text-secondary': '#7086A8',
      'text-dim': '#465672',
      'accent-primary': '#6366F1',
      'accent-secondary': '#38BDF8',
      'accent-hot': '#C084FC',
      'accent-success': '#34D399',
      'accent-warning': '#FBBF24',
      'accent-error': '#F87171',
    },
  },
  {
    id: 'crimson',
    name: 'Crimson',
    preview: ['#0A0608', '#DC2626', '#FB923C'],
    colors: {
      'bg-void': '#0A0608',
      'bg-surface': '#140D10',
      'bg-raised': '#1D1318',
      'border-dim': '#2A1A22',
      'border-bright': '#3D2430',
      'text-primary': '#F0E4E8',
      'text-secondary': '#8A6B78',
      'text-dim': '#5A4450',
      'accent-primary': '#DC2626',
      'accent-secondary': '#FB923C',
      'accent-hot': '#F472B6',
      'accent-success': '#4ADE80',
      'accent-warning': '#FACC15',
      'accent-error': '#EF4444',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    preview: ['#060A08', '#10B981', '#06B6D4'],
    colors: {
      'bg-void': '#060A08',
      'bg-surface': '#0C140F',
      'bg-raised': '#131D17',
      'border-dim': '#1A2A22',
      'border-bright': '#253D32',
      'text-primary': '#E4F0EA',
      'text-secondary': '#6B8A78',
      'text-dim': '#445A4F',
      'accent-primary': '#10B981',
      'accent-secondary': '#06B6D4',
      'accent-hot': '#A78BFA',
      'accent-success': '#22D37A',
      'accent-warning': '#F59E0B',
      'accent-error': '#EF4444',
    },
  },
  {
    id: 'arctic',
    name: 'Arctic',
    preview: ['#F4F6F8', '#0F172A', '#3B82F6'],
    colors: {
      'bg-void': '#F4F6F8',
      'bg-surface': '#FFFFFF',
      'bg-raised': '#E8ECF0',
      'border-dim': '#D1D5DB',
      'border-bright': '#9CA3AF',
      'text-primary': '#0F172A',
      'text-secondary': '#475569',
      'text-dim': '#94A3B8',
      'accent-primary': '#3B82F6',
      'accent-secondary': '#8B5CF6',
      'accent-hot': '#EC4899',
      'accent-success': '#059669',
      'accent-warning': '#D97706',
      'accent-error': '#DC2626',
    },
  },
]

// ── Glow derivation helper ─────────────────────────

export function deriveGlow(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

// ── Apply theme to DOM ─────────────────────────────

export function applyThemeColors(colors: ThemeColors) {
  const root = document.documentElement
  for (const [key, value] of Object.entries(colors)) {
    root.style.setProperty(`--color-${key}`, value)
  }
  // Derived glows from accent-primary
  root.style.setProperty('--accent-primary-glow', deriveGlow(colors['accent-primary'], 0.15))
  root.style.setProperty('--accent-primary-glow-03', deriveGlow(colors['accent-primary'], 0.03))
  root.style.setProperty('--accent-primary-glow-08', deriveGlow(colors['accent-primary'], 0.08))
  root.style.setProperty('--accent-primary-glow-10', deriveGlow(colors['accent-primary'], 0.10))
  root.style.setProperty('--accent-primary-glow-12', deriveGlow(colors['accent-primary'], 0.12))
  root.style.setProperty('--accent-primary-glow-04', deriveGlow(colors['accent-primary'], 0.04))
  root.style.setProperty('--accent-primary-glow-06', deriveGlow(colors['accent-primary'], 0.06))
  root.style.setProperty('--accent-primary-glow-25', deriveGlow(colors['accent-primary'], 0.25))
  root.style.setProperty('--accent-primary-glow-30', deriveGlow(colors['accent-primary'], 0.30))
  root.style.setProperty('--accent-primary-glow-50', deriveGlow(colors['accent-primary'], 0.50))
  root.style.setProperty('--accent-primary-glow-70', deriveGlow(colors['accent-primary'], 0.70))
  // Derived glows from accent-secondary
  root.style.setProperty('--accent-secondary-glow', deriveGlow(colors['accent-secondary'], 0.12))
  // Derived alpha backgrounds from bg-void
  root.style.setProperty('--bg-void-50', deriveGlow(colors['bg-void'], 0.50))
  root.style.setProperty('--bg-void-70', deriveGlow(colors['bg-void'], 0.70))
  root.style.setProperty('--bg-void-75', deriveGlow(colors['bg-void'], 0.75))
  root.style.setProperty('--bg-void-80', deriveGlow(colors['bg-void'], 0.80))
  root.style.setProperty('--bg-void-85', deriveGlow(colors['bg-void'], 0.85))
  root.style.setProperty('--bg-void-90', deriveGlow(colors['bg-void'], 0.90))
  root.style.setProperty('--bg-void-92', deriveGlow(colors['bg-void'], 0.92))
  root.style.setProperty('--bg-void-95', deriveGlow(colors['bg-void'], 0.95))
  // Derived success glow
  root.style.setProperty('--accent-success-glow-08', deriveGlow(colors['accent-success'], 0.08))
  // Derived error glows
  root.style.setProperty('--accent-error-glow-06', deriveGlow(colors['accent-error'], 0.06))
  root.style.setProperty('--accent-error-glow-08', deriveGlow(colors['accent-error'], 0.08))
  root.style.setProperty('--accent-error-glow-12', deriveGlow(colors['accent-error'], 0.12))
  root.style.setProperty('--accent-error-glow-15', deriveGlow(colors['accent-error'], 0.15))
  root.style.setProperty('--accent-error-glow-30', deriveGlow(colors['accent-error'], 0.30))
  // Glass surfaces — theme-aware transparent bg-surface / bg-raised
  root.style.setProperty('--bg-surface-glass', deriveGlow(colors['bg-surface'], 0.55))
  root.style.setProperty('--bg-raised-glass', deriveGlow(colors['bg-raised'], 0.50))
  // Dither invert — flip dither dots to dark on light themes
  const voidR = parseInt(colors['bg-void'].slice(1, 3), 16)
  const voidG = parseInt(colors['bg-void'].slice(3, 5), 16)
  const voidB = parseInt(colors['bg-void'].slice(5, 7), 16)
  const lum = (voidR * 0.299 + voidG * 0.587 + voidB * 0.114) / 255
  root.style.setProperty('--dither-invert', lum > 0.5 ? '1' : '0')
}

// ── Storage key ────────────────────────────────────

export const THEME_STORAGE_KEY = 'volleyclip-theme'

export interface StoredTheme {
  presetId: string
  customColors?: Partial<ThemeColors>
}

export function getDefaultTheme(): StoredTheme {
  return { presetId: 'obsidian' }
}

export function resolveColors(stored: StoredTheme): ThemeColors {
  const preset = THEME_PRESETS.find((p) => p.id === stored.presetId) ?? THEME_PRESETS[0]
  if (stored.customColors) {
    return { ...preset.colors, ...stored.customColors }
  }
  return { ...preset.colors }
}
