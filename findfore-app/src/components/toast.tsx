import { Ionicons } from '@expo/vector-icons';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
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
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: false }).start(() => setToast(null));
  }, [anim]);

  const show = useCallback(
    (message: string, options?: ToastOptions) => {
      if (timer.current) clearTimeout(timer.current);
      seq.current += 1;
      setToast({ id: seq.current, message, ...options });
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver: false, speed: 18, bounciness: 6 }).start();
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
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', paddingBottom: insets.bottom + 96 }]}>
          <Animated.View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={[
              s.toast,
              { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] },
            ]}>
            <Ionicons name={toast.icon ?? 'checkmark-circle'} size={20} color={colors.lime} />
            <Text style={s.text} numberOfLines={2}>{toast.message}</Text>
            {toast.action ? (
              <Pressable
                hitSlop={10}
                onPress={() => {
                  toast.action?.onPress();
                  hide();
                }}
                accessibilityRole="button">
                <Text style={s.action}>{toast.action.label}</Text>
              </Pressable>
            ) : null}
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

const s = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    alignSelf: 'center',
    width: '92%',
    maxWidth: maxContentWidth - 32,
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: space.lg,
    shadowColor: '#0B0B0B',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  text: { flex: 1, color: colors.onInk, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19 },
  action: { color: colors.lime, fontFamily: fonts.extrabold, fontSize: 14 },
});
