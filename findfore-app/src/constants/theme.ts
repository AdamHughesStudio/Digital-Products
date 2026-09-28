// FindFore design tokens. Light screens with white cards, and dark rounded containers
// (like the website's ink panels) for the moments that should stand out.
// Lime is for fills and highlights; lime text only ever sits on a dark container.

export const colors = {
  lime: '#C7FF00',
  limeSoft: 'rgba(199, 255, 0, 0.28)',
  limeBorder: 'rgba(120, 160, 0, 0.35)',

  // light surfaces
  bg: '#F3F4F6',
  surface: '#FFFFFF',
  surfaceRaised: '#ECEEF1',
  surfaceHigh: '#DFE2E6',
  border: '#E5E7EB',
  borderStrong: '#D1D5DB',
  text: '#0B0B0B',
  // all body text colours meet 4.5:1 contrast on white and on the grey background
  textMuted: '#5B616B',
  textFaint: '#6B7079',

  // dark containers
  ink: '#0B0B0B',
  inkRaised: '#1C1C1C',
  inkHigh: '#2A2A2A',
  inkBorder: 'rgba(255, 255, 255, 0.10)',
  onInk: '#FFFFFF',
  onInkMuted: '#A1A1AA',
  onInkFaint: '#8A8A93',

  green: '#1F3D1F',
  greenDeep: '#132813',
  slate: '#6B7280',
  mist: '#F3F4F6',
  white: '#FFFFFF',
  danger: '#D93F2E',
  dangerSoft: 'rgba(217, 63, 46, 0.10)',
  warning: '#B7791F',
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

export const radius = { sm: 10, md: 14, lg: 20, xl: 26, panel: 28, pill: 999 } as const;

// Soft elevation for white cards on the grey background
export const shadow = {
  shadowColor: '#0B0B0B',
  shadowOpacity: 0.06,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

// Keeps content a comfortable width if the app is opened on a tablet or desktop browser
export const maxContentWidth = 560;
