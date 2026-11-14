// PlusFore design tokens, from the brand guidelines: forest green chrome, sage accents,
// ivory screens with lighter cards, charcoal text, set in Plus Jakarta Sans.

import { Platform, StyleSheet, type TextStyle } from 'react-native';

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
  accentBorder: 'rgba(78, 113, 96, 0.35)',
  sage: brand.sage,
  // deeper than brand sage, so ivory text on sage buttons and sage text on ivory pass 4.5:1
  sageDeep: '#4E7160',
  // deeper again, for small sage text on a sage tint (accentSoft), where sageDeep falls short
  sageInk: '#456655',

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
  // both deep enough to pass 4.5:1 as text on a card and on the page, danger on its own tint too
  danger: '#B03826',
  dangerSoft: 'rgba(176, 56, 38, 0.10)',
  warning: '#946010',
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

// One scale for every corner. xs tags; sm chips, small buttons and thumbnails, date tiles;
// md buttons, inputs, list thumbnails; lg media inside a card, tiles; xl cards, panels, feed photos;
// panel sheets; pill only for avatars, the switch, count badges and the bottom bar.
// Where shapes nest, the inner radius is the outer radius minus the gap between them.
export const radius = { xs: 6, sm: 10, md: 14, lg: 16, xl: 20, panel: 28, pill: 999 } as const;

// Lift for the few things that float above the page
export const shadow = {
  shadowColor: '#0F1A14',
  shadowOpacity: 0.05,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
} as const;

// A contact shadow under cards and panels: the hairline edge does the separating
export const shadowSoft = {
  shadowColor: '#0F1A14',
  shadowOpacity: 0.04,
  shadowRadius: 3,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
} as const;

// Edge colour for cards and panels
export const hairline = 'rgba(15, 26, 20, 0.10)';

// Width of every hairline. The web counts in whole points, so half a point there draws as one
// device pixel on an iPhone, the same as a native separator
export const hair = Platform.OS === 'web' ? 0.5 : StyleSheet.hairlineWidth;

// Figures of equal width, so times, prices, dates and counts line up and do not shift as they change
export const tabularNums: Pick<TextStyle, 'fontVariant'> = { fontVariant: ['tabular-nums'] };

// Keeps content a comfortable width if the app is opened on a tablet or desktop browser
export const maxContentWidth = 560;
