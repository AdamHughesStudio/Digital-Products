// FindFore design tokens. Lime and charcoal are the core pairing; golf green is supporting only.

export const colors = {
  lime: '#C7FF00',
  limeSoft: 'rgba(199, 255, 0, 0.14)',
  limeBorder: 'rgba(199, 255, 0, 0.35)',
  ink: '#0B0B0B',
  surface: '#141414',
  surfaceRaised: '#1C1C1C',
  surfaceHigh: '#252525',
  border: '#262626',
  borderStrong: '#343434',
  green: '#1F3D1F',
  greenDeep: '#132813',
  slate: '#6B7280',
  mist: '#F3F4F6',
  white: '#FFFFFF',
  text: '#FFFFFF',
  textMuted: '#A1A1AA',
  textFaint: '#71717A',
  danger: '#FF6B5B',
  dangerSoft: 'rgba(255, 107, 91, 0.14)',
  warning: '#FFC53D',
} as const;

export const fonts = {
  display: 'Archivo_900Black',
  displayBold: 'Archivo_800ExtraBold',
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

export const radius = { sm: 10, md: 14, lg: 20, xl: 26, pill: 999 } as const;

// Keeps content a comfortable width if the app is opened on a tablet or desktop browser
export const maxContentWidth = 560;
