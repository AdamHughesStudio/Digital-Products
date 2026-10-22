// PlusFore design tokens, from the brand guidelines: forest green chrome, sage accents,
// ivory screens with lighter cards, charcoal text, set in Plus Jakarta Sans.

// Brand colours from the PlusFore guidelines
export const brand = {
  forest: '#0F1A14', // primary: backgrounds, headers, app chrome
  sage: '#6B8F7B', // secondary: accents, icons, highlights, active states
  ivory: '#E7E1DB', // background: main background, cards, surfaces
  charcoal: '#1F2937', // text: primary text, icons, UI elements
} as const;

export const colors = {
  // Light sage, as on the guideline's chips and add buttons. Fills behind forest coloured content,
  // and the accent for text and icons on forest
  accent: '#ADC8A2',
  accentSoft: 'rgba(107, 143, 123, 0.18)',
  accentBorder: 'rgba(87, 122, 103, 0.35)',
  sage: brand.sage,
  // a touch deeper than brand sage, so ivory text on sage buttons and sage text on ivory pass contrast
  sageDeep: '#577A67',

  // light surfaces: screens are a light ivory, cards sit on them a shade lighter
  page: '#F2EEE8',
  surface: '#FBF9F6',
  bg: brand.ivory,
  surfaceRaised: brand.ivory,
  surfaceHigh: '#DCD5CC',
  border: '#E3DCD3',
  borderStrong: '#CFC6BA',
  text: brand.charcoal,
  // body text colours meet 4.5:1 contrast on cards and on the page
  textMuted: '#555C69',
  textFaint: '#646B77',

  // forest containers: headers, app chrome and the moments that should stand out
  ink: brand.forest,
  inkRaised: '#1A2820',
  inkHigh: '#24352B',
  inkBorder: 'rgba(231, 225, 219, 0.12)',
  onInk: '#F4F0EA',
  onInkMuted: '#A9B5AD',
  onInkFaint: '#8E9A92',

  green: brand.sage,
  greenDeep: brand.forest,
  slate: '#6B7280',
  mist: '#ECE7E1',
  white: '#FBF9F6',
  danger: '#C2412D',
  dangerSoft: 'rgba(194, 65, 45, 0.10)',
  warning: '#A86B12',
} as const;

export const fonts = {
  display: 'PlusJakartaSans_800ExtraBold',
  displayBold: 'PlusJakartaSans_700Bold',
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

export const radius = { sm: 10, md: 14, lg: 20, xl: 26, panel: 28, pill: 999 } as const;

// Soft elevation for cards on the ivory page
export const shadow = {
  shadowColor: '#0F1A14',
  shadowOpacity: 0.06,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
} as const;

// Lighter lift for rows and small tiles
export const shadowSoft = {
  shadowColor: '#0F1A14',
  shadowOpacity: 0.05,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

// A barely-there edge that keeps cards crisp against the page without reading as a border
export const hairline = 'rgba(15, 26, 20, 0.06)';

// Keeps content a comfortable width if the app is opened on a tablet or desktop browser
export const maxContentWidth = 560;
