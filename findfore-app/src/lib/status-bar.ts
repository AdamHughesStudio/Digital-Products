import { Platform } from 'react-native';

/**
 * Colours the area behind the iPhone clock and battery. On the installed web app iPhones paint the
 * status bar from the page background, so setting it to black lets a black header run right up
 * to the top of the screen with the clock turning white. Does nothing on native builds.
 */
let override: string | null = null;

function apply(colour: string) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', colour));
  document.documentElement.style.backgroundColor = colour;
  document.body.style.backgroundColor = colour;
}

/** The default colour. Ignored while a screen has taken over with `setStatusBarOverride`, so the
 *  launch animation finishing can't repaint the bar white under a black header */
export function setStatusBarColour(colour: string) {
  apply(override ?? colour);
}

/** A screen takes over the bar while it is showing (pass null to hand it back) */
export function setStatusBarOverride(colour: string | null, fallback: string) {
  override = colour;
  apply(colour ?? fallback);
}
