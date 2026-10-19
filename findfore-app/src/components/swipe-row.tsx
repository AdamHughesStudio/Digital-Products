import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts } from '@/constants/theme';
import { haptic } from '@/lib/haptics';

const ACTION_W = 88;
const native = Platform.OS !== 'web';

/**
 * A list row that slides left to show a Delete button, like Messages on iPhone. Only one row is
 * open at a time: the list passes in which one with open and onOpenChange.
 */
export function SwipeRow({
  children,
  open,
  onOpenChange,
  onDelete,
  deleteLabel = 'Delete',
  style,
}: {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  deleteLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const x = useRef(new Animated.Value(0)).current;
  const startX = useRef(0);
  const openRef = useRef(open);
  openRef.current = open;
  const change = useRef(onOpenChange);
  change.current = onOpenChange;

  const settle = (toOpen: boolean) => {
    Animated.spring(x, { toValue: toOpen ? -ACTION_W : 0, useNativeDriver: native, speed: 22, bounciness: 2 }).start();
  };

  // another row opened, or the list closed this one
  useEffect(() => settle(open), [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const pan = useMemo(
    () =>
      PanResponder.create({
        // only take over for a clearly sideways drag, so the list still scrolls and rows still tap
        onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          x.stopAnimation();
          startX.current = openRef.current ? -ACTION_W : 0;
        },
        onPanResponderMove: (_e, g) => {
          const next = startX.current + g.dx;
          // a little give past the button, none to the right
          x.setValue(next < -ACTION_W ? -ACTION_W + (next + ACTION_W) * 0.3 : Math.min(0, next));
        },
        onPanResponderRelease: (_e, g) => {
          const end = startX.current + g.dx;
          const toOpen = g.vx < -0.3 || (g.vx <= 0.3 && end < -ACTION_W / 2);
          if (toOpen && !openRef.current) haptic.select();
          settle(toOpen);
          if (toOpen !== openRef.current) change.current(toOpen);
        },
        onPanResponderTerminate: () => settle(openRef.current),
      }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <View style={[s.wrap, style, Platform.OS === 'web' && ({ touchAction: 'pan-y' } as object)]} {...pan.panHandlers}>
      <Pressable
        onPress={() => {
          haptic.warn();
          onDelete();
        }}
        accessibilityRole="button"
        accessibilityLabel={deleteLabel}
        style={s.action}
      >
        {/* hidden until the row moves, so no red shows at the rounded corners */}
        <Animated.View style={[s.actionFill, { opacity: x.interpolate({ inputRange: [-12, -2], outputRange: [1, 0], extrapolate: 'clamp' }) }]}>
          <Ionicons name="trash-outline" size={22} color={colors.white} />
          <Text style={s.actionText}>{deleteLabel}</Text>
        </Animated.View>
      </Pressable>
      <Animated.View style={[s.front, { transform: [{ translateX: x }] }]}>{children}</Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  action: { position: 'absolute', top: 0, bottom: 0, right: 0, width: ACTION_W },
  actionFill: { flex: 1, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', gap: 4 },
  actionText: { color: colors.white, fontFamily: fonts.bold, fontSize: 13 },
  front: { backgroundColor: colors.surface },
});
