import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export interface VisibleArea {
  /** Top of the visible area, in page pixels (Safari slides the page up when the keyboard opens) */
  top: number;
  /** Height of the visible area above the keyboard */
  height: number;
  /** Whether the on-screen keyboard looks to be open */
  keyboard: boolean;
}

/**
 * The part of the screen you can actually see on the web app, above the keyboard. On iPhone, Safari
 * pushes the whole page up when the keyboard opens, which shoves a screen's header off the top. A
 * screen sized and placed to this area keeps its header where it is and its message box just above
 * the keyboard, the way a native chat app behaves. Undefined on native and where it isn't supported.
 */
export function useVisibleArea(): VisibleArea | undefined {
  const [area, setArea] = useState<VisibleArea | undefined>(() => read());
  useEffect(() => {
    const vv = Platform.OS === 'web' && typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return;
    const update = () => setArea(read());
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
  return area;
}

function read(): VisibleArea | undefined {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.visualViewport) return undefined;
  const vv = window.visualViewport;
  // the keyboard takes well over a hundred pixels; smaller changes are the browser's own bars
  return { top: vv.offsetTop, height: vv.height, keyboard: window.innerHeight - vv.height > 120 };
}
