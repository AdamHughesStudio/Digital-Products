import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { T } from './ui';
import { colors } from '@/constants/theme';

// Same size and position as the web boot splash in public/index.html, so the hand over is seamless
const F_W = 76;
const F_H = 97.5;

const native = Platform.OS !== 'web';

/**
 * On the web the phone's status bar takes its colour from the page: the theme colour on older
 * browsers, the page background on newer iPhones. Both stay charcoal during the splash and
 * switch to the app's light grey once it has dissolved.
 */
function setThemeColour(colour: string) {
  if (native || typeof document === 'undefined') return;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', colour));
  document.documentElement.style.backgroundColor = colour;
  document.body.style.backgroundColor = colour;
}
const useDriver = native;

/**
 * Launch animation. The flag F builds (on the web the page has already drawn this),
 * nudges forward while the app loads, then the wordmark appears and the triangle
 * shoots forward as the screen dissolves into the app.
 */
export function LaunchSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const [reduced, setReduced] = useState<boolean | null>(null);
  const mountedAt = useRef(Date.now());

  // on the web the boot splash has already played the entrance
  const stem = useRef(new Animated.Value(native ? 0 : 1)).current;
  const tri = useRef(new Animated.Value(native ? 0 : 1)).current;
  const nudge = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;
  const shoot = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const loop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduced)
      .catch(() => setReduced(false));
  }, []);

  // entrance on native, then a gentle forward nudge while loading
  useEffect(() => {
    if (reduced === null) return;
    if (reduced) {
      stem.setValue(1);
      tri.setValue(1);
      return;
    }
    const entrance = native
      ? Animated.sequence([
          Animated.timing(stem, { toValue: 1, duration: 960, easing: Easing.out(Easing.cubic), useNativeDriver: useDriver }),
          Animated.timing(tri, { toValue: 1, duration: 960, easing: Easing.out(Easing.back(1.6)), useNativeDriver: useDriver }),
        ])
      : Animated.delay(0);
    entrance.start(() => {
      loop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(nudge, { toValue: 1, duration: 840, easing: Easing.inOut(Easing.quad), useNativeDriver: useDriver }),
          Animated.timing(nudge, { toValue: 0, duration: 840, easing: Easing.inOut(Easing.quad), useNativeDriver: useDriver }),
          Animated.delay(1120),
        ]),
      );
      loop.current.start();
    });
    return () => loop.current?.stop();
  }, [reduced, stem, tri, nudge]);

  // once the app is ready: wordmark in, hold, triangle shoots forward, dissolve
  useEffect(() => {
    if (!ready || reduced === null) return;
    // let the entrance finish first (on the web, time since the page started loading)
    const elapsed = native ? Date.now() - mountedAt.current : typeof performance !== 'undefined' ? performance.now() : 1000;
    // plus a short beat so freshly loaded fonts are applied before the wordmark appears
    const wait = Math.max(180, (native ? 1800 : 1600) - elapsed);
    const t = setTimeout(() => {
      loop.current?.stop();
      if (reduced) {
        Animated.sequence([Animated.delay(500), Animated.timing(fade, { toValue: 0, duration: 500, useNativeDriver: useDriver })]).start(() => {
          setThemeColour(colors.bg);
          onDone();
        });
        return;
      }
      Animated.sequence([
        Animated.parallel([
          Animated.timing(nudge, { toValue: 0, duration: 300, useNativeDriver: useDriver }),
          Animated.timing(word, { toValue: 1, duration: 640, easing: Easing.out(Easing.cubic), useNativeDriver: useDriver }),
        ]),
        // hold on the finished logo (840ms at the new pace, plus a half second pause) before leaving
        Animated.delay(840 + 500),
        Animated.parallel([
          Animated.timing(shoot, { toValue: 1, duration: 640, easing: Easing.in(Easing.cubic), useNativeDriver: useDriver }),
          Animated.sequence([
            Animated.delay(240),
            Animated.timing(fade, { toValue: 0, duration: 680, easing: Easing.out(Easing.quad), useNativeDriver: useDriver }),
          ]),
        ]),
      ]).start(() => {
        setThemeColour(colors.bg);
        onDone();
      });
    }, wait);
    return () => clearTimeout(t);
  }, [ready, reduced, nudge, word, shoot, fade, onDone]);

  const scale = shoot.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, s.root, { opacity: fade }]} accessibilityLabel="FindFore is loading" accessibilityRole="progressbar">
      <StatusBar style="light" />
      <Animated.View style={[s.mark, { transform: [{ scale }] }]}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { opacity: stem, transform: [{ translateY: stem.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] },
          ]}>
          <Svg width={F_W} height={F_H} viewBox="0 0 230 295">
            <Path fill={colors.lime} d="M0 14Q0 0 14 0H230V100L58 57V295H0Z" />
          </Svg>
        </Animated.View>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: Animated.multiply(tri, shoot.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] })),
              transform: [
                {
                  translateX: Animated.add(
                    Animated.add(tri.interpolate({ inputRange: [0, 1], outputRange: [-28, 0] }), nudge.interpolate({ inputRange: [0, 1], outputRange: [0, 7] })),
                    shoot.interpolate({ inputRange: [0, 1], outputRange: [0, 90] }),
                  ),
                },
              ],
            },
          ]}>
          <Svg width={F_W} height={F_H} viewBox="0 0 230 295">
            <Path fill={colors.lime} d="M82 92L230 141L82 190Z" />
          </Svg>
        </Animated.View>
      </Animated.View>

      <Animated.View
        style={[
          s.words,
          { opacity: word, transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] },
        ]}>
        <Image source={require('@/assets/images/logo-light.png')} style={s.logo} contentFit="contain" accessible={false} />
        <T variant="small" color={colors.onInkMuted} style={{ marginTop: 10 }}>Find your next game of golf.</T>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  mark: { width: F_W, height: F_H },
  words: { position: 'absolute', top: '50%', marginTop: F_H / 2 + 34, left: 0, right: 0, alignItems: 'center' },
  logo: { width: 150, height: 28 },
});
