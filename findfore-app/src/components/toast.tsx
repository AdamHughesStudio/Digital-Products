import { Ionicons } from '@expo/vector-icons';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { IconName } from './ui';
import { colors, fonts, maxContentWidth, radius, space } from '@/constants/theme';

interface ToastOptions {
  icon?: IconName;
  action?: { label: string; onPress: () => void };
}

interface ToastState extends ToastOptions {
  id: number;
  message: string;
}

// only opacity and position move, so the phone can run the animation off the main thread
const useNativeDriver = Platform.OS !== 'web';

const ToastContext = createContext<(message: string, options?: ToastOptions) => void>(() => {});

/** Show a short confirmation, optionally with an Undo style action */
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const hide = useCallback(() => {
    // a new toast interrupts this fade, and must not be cleared by it
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver }).start(({ finished }) => {
      if (finished) setToast(null);
    });
  }, [anim]);

  const show = useCallback(
    (message: string, options?: ToastOptions) => {
      if (timer.current) clearTimeout(timer.current);
      seq.current += 1;
      setToast({ id: seq.current, message, ...options });
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver, speed: 20, bounciness: 0 }).start();
      timer.current = setTimeout(hide, options?.action ? 5000 : 3000);
    },
    [anim, hide],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, s.layer, { paddingBottom: insets.bottom + 96 }]}>
          <Animated.View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={[
              s.toast,
              { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] },
            ]}>
            <Ionicons name={toast.icon ?? 'checkmark-circle'} size={20} color={colors.accent} />
            <Text maxFontSizeMultiplier={1.3} style={s.text} numberOfLines={2}>{toast.message}</Text>
            {toast.action ? (
              <Pressable
                hitSlop={14}
                onPress={() => {
                  toast.action?.onPress();
                  hide();
                }}
                accessibilityRole="button">
                <Text maxFontSizeMultiplier={1.3} style={s.action}>{toast.action.label}</Text>
              </Pressable>
            ) : null}
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

const s = StyleSheet.create({
  // the same side margins as the bottom bar, so the two line up
  layer: { justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: space.md },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    width: '100%',
    maxWidth: maxContentWidth - 24,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: space.lg,
    shadowColor: colors.ink,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  text: { flex: 1, color: colors.onInk, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19 },
  // sage, so the action reads as something to tap and not as more of the message
  action: { color: colors.accent, fontFamily: fonts.bold, fontSize: 14, lineHeight: 19 },
});
