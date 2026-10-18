// Dark manor palette: candle glow on near-black, parchment for the plan.
export const colors = {
  background: '#0b0809',
  surface: '#211814',
  surfaceGlass: 'rgba(16,12,22,0.62)',
  overlay: 'rgba(4,3,9,0.86)',
  text: '#f3ecdd',
  muted: 'rgba(243,236,221,0.62)',
  accent: '#ffd9a8',
  accentText: '#1a120c',
  border: 'rgba(255,217,168,0.3)',
  danger: '#e88a76',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 } as const;

export const font = { title: 34, heading: 24, body: 17, small: 14 } as const;
