import { Platform } from 'react-native';

/**
 * Colours the area behind the iPhone clock and battery. On the installed web app iPhones paint the
 * status bar from the page background, so setting it to black lets a black header run right up
 * to the top of the screen with the clock turning white. Does nothing on native builds.
 */
export function setStatusBarColour(colour: string) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', colour));
  document.documentElement.style.backgroundColor = colour;
  document.body.style.backgroundColor = colour;
}
