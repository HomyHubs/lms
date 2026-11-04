/** Colour roles from tailwind.config.js; every tinted surface picks one of these. */
export const TONE_TILE = {
  primary: 'bg-primary-50 text-primary-600',
  success: 'bg-success-50 text-success-600',
  accent: 'bg-accent-50 text-accent-600',
  warning: 'bg-warning-50 text-warning-600',
  danger: 'bg-danger-50 text-danger-600',
  neutral: 'bg-slate-100 text-slate-600',
} as const

export type Tone = keyof typeof TONE_TILE
