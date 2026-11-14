import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  PanResponder,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavSpace } from '@/components/bottom-nav';
import { colors, fonts, hair, hairline, maxContentWidth, radius, shadowSoft, space, tabularNums } from '@/constants/theme';
import type { Golfer } from '@/data/types';
import { initials } from '@/lib/format';
import { haptic } from '@/lib/haptics';

export type IconName = ComponentProps<typeof Ionicons>['name'];

// ---------- text ----------

type Variant = 'display' | 'title' | 'heading' | 'subheading' | 'body' | 'bodyStrong' | 'small' | 'smallStrong' | 'caption' | 'label';

// Hierarchy comes from size, weight and colour. Nothing is set in capitals or letter-spaced
const variantStyles: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 34, letterSpacing: -0.8 },
  title: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 29, letterSpacing: -0.5 },
  heading: { fontFamily: fonts.bold, fontSize: 19, lineHeight: 24, letterSpacing: -0.3 },
  subheading: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21 },
  small: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  smallStrong: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  // a quiet name for a group of rows; callers colour it textMuted
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
};

// How far each style may grow with the phone's text size setting before layouts would break
const maxScale: Record<Variant, number> = { display: 1.15, title: 1.3, heading: 1.3, subheading: 1.4, body: 1.5, bodyStrong: 1.5, small: 1.5, smallStrong: 1.5, caption: 1.4, label: 1.3 };

/** Text in one of the app's styles. `tabular` sets figures at equal width, for times, prices, dates and counts */
export function T({ variant = 'body', color = colors.text, tabular, style, ...rest }: TextProps & { variant?: Variant; color?: string; tabular?: boolean }) {
  return <Text maxFontSizeMultiplier={maxScale[variant]} {...rest} style={[variantStyles[variant], { color }, tabular && tabularNums, style]} />;
}

// ---------- layout ----------

export function Screen({ children, scroll = true, padded = true, footer, style }: { children: ReactNode; scroll?: boolean; padded?: boolean; footer?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  // pages that keep the bottom bar leave room for it, and their footer sits just above it
  const nav = useNavSpace();
  const inner = <View style={[styles.contentWidth, padded && styles.padded, style]}>{children}</View>;
  return (
    <View style={styles.screen}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ paddingBottom: (footer ? 120 : 40 + (nav ? 0 : insets.bottom)) + nav }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
      {footer ? <View style={[styles.footer, nav ? { bottom: nav, paddingBottom: space.md } : { paddingBottom: Math.max(insets.bottom, 16) }]}><View style={styles.contentWidth}>{footer}</View></View> : null}
    </View>
  );
}

/** Top bar for pushed screens: back chevron, title and optional right action */
export function TopBar({ title, right, onBack }: { title?: string; right?: ReactNode; onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
      <View style={[styles.contentWidth, styles.topBarInner]}>
        {/* the title is centred on the screen whatever sits either side of it */}
        <View pointerEvents="none" style={styles.topBarTitle}>
          <T variant="subheading" accessibilityRole="header" numberOfLines={1} style={{ textAlign: 'center' }}>
            {title ?? ''}
          </T>
        </View>
        <IconButton icon="chevron-back" size={26} label="Back" onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))} style={styles.backButton} />
        <View style={styles.topBarRight}>{right}</View>
      </View>
    </View>
  );
}

export function Row({ children, gap = space.sm, style, align = 'center' }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle>; align?: ViewStyle['alignItems'] }) {
  return <View style={[{ flexDirection: 'row', alignItems: align, gap }, style]}>{children}</View>;
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <Row gap={space.md} align="baseline" style={styles.sectionHeader}>
      <T variant="heading" accessibilityRole="header" style={{ flexShrink: 1 }}>{title}</T>
      {action ? (
        <Pressable onPress={onAction} hitSlop={14} accessibilityRole="button" style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}>
          <T variant="smallStrong" color={colors.sageDeep}>{action}</T>
          <Ionicons name="chevron-forward" size={12} color={colors.sageDeep} />
        </Pressable>
      ) : null}
    </Row>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  // drawn as a border so the line lands on a whole device pixel
  return <View style={[{ borderTopWidth: hair, borderTopColor: colors.borderStrong }, style]} />;
}

// ---------- controls ----------

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Buttons, chips and icon buttons give slightly under the thumb and settle straight back, without a
 * bounce. `dim` is how far the control fades while held.
 */
function usePressSpring(dim: number) {
  const [held] = useState(() => new Animated.Value(0));
  const to = (toValue: number) => Animated.spring(held, { toValue, speed: toValue ? 40 : 20, bounciness: 0, useNativeDriver: Platform.OS !== 'web' }).start();
  return {
    onPressIn: () => to(1),
    onPressOut: () => to(0),
    style: {
      opacity: held.interpolate({ inputRange: [0, 1], outputRange: [1, dim] }),
      transform: [{ scale: held.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] }) }],
    },
  };
}

type ButtonKind = 'primary' | 'dark' | 'secondary' | 'ghost' | 'danger';

export function Button({ title, onPress, kind = 'primary', icon, disabled, loading, style, size = 'lg' }: { title: string; onPress?: () => void; kind?: ButtonKind; icon?: IconName; disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; size?: 'lg' | 'md' | 'sm' }) {
  const press = usePressSpring(0.9);
  const filled = kind === 'primary' || kind === 'dark';
  // a filled button that can't be used turns grey; the lighter kinds fade instead
  const greyed = disabled && filled;
  const fg = greyed ? colors.textFaint : filled ? colors.onInk : kind === 'danger' ? colors.danger : colors.text;
  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled || loading}
      // the smaller sizes are still a 44 pt target
      hitSlop={size === 'sm' ? 6 : size === 'md' ? 2 : undefined}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={onPress ? () => {
        haptic.tap();
        onPress();
      } : undefined}
      style={[
        styles.button,
        size === 'md' && styles.buttonMd,
        size === 'sm' && styles.buttonSm,
        // the guideline's three buttons: sage primary, ivory secondary, outlined tertiary
        kind === 'primary' && { backgroundColor: colors.sageDeep },
        kind === 'dark' && { backgroundColor: colors.ink },
        kind === 'secondary' && { backgroundColor: colors.bg },
        kind === 'ghost' && { backgroundColor: colors.surface, borderColor: colors.borderStrong },
        kind === 'danger' && { backgroundColor: colors.dangerSoft },
        greyed && { backgroundColor: colors.surfaceHigh },
        press.style,
        (disabled || loading) && !filled && { opacity: 0.45 },
        style,
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={fg} /> : null}
      <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={[styles.buttonText, size === 'md' && { fontSize: 15 }, size === 'sm' && { fontSize: 14 }, { color: fg }]}>{title}</Text>
    </AnimatedPressable>
  );
}

/**
 * A bare icon with a full size tap target. Pass a `style` with a background where the icon needs
 * a disc behind it, such as over a photo.
 */
export function IconButton({ icon, onPress, label, badge, color = colors.text, size = 24, style, onDark, disabled }: { icon: IconName; onPress?: () => void; label: string; badge?: boolean | number; color?: string; size?: number; style?: StyleProp<ViewStyle>; onDark?: boolean; disabled?: boolean }) {
  const press = usePressSpring(0.5);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      hitSlop={8}
      style={[styles.iconButton, press.style, disabled && { opacity: 0.4 }, style]}>
      <Ionicons name={icon} size={size} color={color} />
      {badge ? <View style={[styles.dot, onDark && styles.dotOnDark]} /> : null}
    </AnimatedPressable>
  );
}

export function Chip({ label, selected, onPress, icon, style }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName; style?: StyleProp<ViewStyle> }) {
  const press = usePressSpring(0.9);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      // 36 pt to look at, 44 pt to tap
      hitSlop={{ top: 4, bottom: 4 }}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={onPress ? () => {
        haptic.select();
        onPress();
      } : undefined}
      style={[styles.chip, selected && styles.chipSelected, press.style, style]}>
      {icon ? <Ionicons name={icon} size={15} color={selected ? colors.onInk : colors.textMuted} /> : null}
      <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </AnimatedPressable>
  );
}

export function ChipRow({ children, scroll = false }: { children: ReactNode; scroll?: boolean }) {
  if (scroll) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingRight: space.lg }}>
        {children}
      </ScrollView>
    );
  }
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>{children}</View>;
}

/** A small tag beside a name or title, such as Host. Set in sentence case */
export function Pill({ label, icon, tone = 'dark', style }: { label: string; icon?: IconName; tone?: 'dark' | 'accent' | 'muted' | 'danger' | 'light'; style?: StyleProp<ViewStyle> }) {
  const bg = tone === 'accent' ? colors.accentSoft : tone === 'muted' ? 'rgba(255,255,255,0.16)' : tone === 'danger' ? colors.dangerSoft : tone === 'light' ? colors.surfaceRaised : 'rgba(15,26,20,0.82)';
  const fg = tone === 'accent' ? colors.sageInk : tone === 'danger' ? colors.danger : tone === 'muted' ? colors.onInk : tone === 'light' ? colors.text : colors.white;
  return (
    <View style={[styles.pill, { backgroundColor: bg }, style]}>
      {icon ? <Ionicons name={icon} size={12} color={fg} /> : null}
      <Text maxFontSizeMultiplier={1.2} style={[styles.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

// The web build has no outline on a focused input, so the field draws its own ring there
const focusRing = Platform.OS === 'web' ? ({ boxShadow: '0 0 0 3px rgba(78, 113, 96, 0.18)' } as object) : null;

export function Field({ label, hint, error, style, onFocus, onBlur, ...props }: TextInputProps & { label?: string; hint?: string; error?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label ? <T variant="smallStrong" color={colors.textMuted}>{label}</T> : null}
      <TextInput
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.sageDeep}
        maxFontSizeMultiplier={1.4}
        accessibilityLabel={props.accessibilityLabel ?? label}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.input, props.multiline ? styles.inputMultiline : styles.inputSingle, focused && styles.inputFocused, focused && focusRing, error && { borderColor: colors.danger }, style]}
      />
      {hint ? <T variant="caption" color={error ? colors.danger : colors.textFaint}>{hint}</T> : null}
    </View>
  );
}

export function FormLabel({ children, optional }: { children: string; optional?: boolean }) {
  return (
    <Row gap={space.sm} align="baseline" style={{ marginTop: space.xl, marginBottom: space.sm }}>
      <T variant="subheading">{children}</T>
      {optional ? <T variant="small" color={colors.textFaint}>Optional</T> : null}
    </Row>
  );
}

export function Stepper({ value, min, max, onChange, suffix }: { value: number; min: number; max: number; onChange: (v: number) => void; suffix?: string }) {
  const step = (by: number) => {
    haptic.select();
    onChange(Math.min(max, Math.max(min, value + by)));
  };
  return (
    <Row gap={space.md}>
      <IconButton icon="remove" size={22} label="Decrease" onPress={() => step(-1)} disabled={value <= min} style={styles.stepBtn} />
      <T variant="heading" tabular style={{ minWidth: 32, textAlign: 'center' }}>{value}</T>
      <IconButton icon="add" size={22} label="Increase" onPress={() => step(1)} disabled={value >= max} style={styles.stepBtn} />
      {suffix ? <T variant="body" color={colors.textMuted}>{suffix}</T> : null}
    </Row>
  );
}

// ---------- people ----------

const avatarImages: Record<string, number> = {
  adam: require('@/assets/images/avatars/adam.jpg'),
  ryan: require('@/assets/images/avatars/ryan.jpg'),
  jamie: require('@/assets/images/avatars/jamie.jpg'),
  tom: require('@/assets/images/avatars/tom.jpg'),
  james: require('@/assets/images/avatars/james.jpg'),
};

const avatarTints = ['#2C4A3A', '#3B5547', '#24352B', '#4A5A50', '#5B6E62'];

export function Avatar({ golfer, size = 44, ring, online }: { golfer?: Golfer; size?: number; ring?: boolean; online?: boolean }) {
  const src = golfer?.photoUri ? { uri: golfer.photoUri } : golfer?.avatar ? avatarImages[golfer.avatar] : undefined;
  const tint = golfer ? avatarTints[(golfer.firstName.charCodeAt(0) + golfer.lastName.length) % avatarTints.length] : colors.surfaceHigh;
  return (
    <View style={{ width: size, height: size }} accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {/* a faint edge keeps a pale photo from melting into the card behind it */}
      <View style={[{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }, ring ? { borderWidth: 3, borderColor: colors.accent } : { borderWidth: hair, borderColor: hairline }]}>
        {src ? (
          <Image source={src} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <Text maxFontSizeMultiplier={1} style={{ fontFamily: fonts.bold, color: colors.white, fontSize: size * 0.36, letterSpacing: 0.2 }}>{golfer ? initials(golfer) : '?'}</Text>
        )}
      </View>
      {online ? <View style={[styles.online, { right: size * 0.02, top: size * 0.02 }]} /> : null}
    </View>
  );
}

export function AvatarStack({ golfers, size = 30, extra = 0, ring }: { golfers: Golfer[]; size?: number; extra?: number; ring?: string }) {
  return (
    <Row gap={0}>
      {golfers.map((g, i) => (
        <View key={g.id} style={{ marginLeft: i === 0 ? 0 : -size * 0.3, borderRadius: size, borderWidth: 2, borderColor: ring ?? colors.surface }}>
          <Avatar golfer={g} size={size} />
        </View>
      ))}
      {extra > 0 ? (
        <View style={[styles.extra, { width: size + 4, height: size + 4, borderRadius: size, marginLeft: -size * 0.3 }]}>
          <Text maxFontSizeMultiplier={1} style={[{ color: colors.text, fontFamily: fonts.bold, fontSize: 12 }, tabularNums]}>+{extra}</Text>
        </View>
      ) : null}
    </Row>
  );
}

// ---------- empty state ----------

export function EmptyState({ icon, title, body, action, onAction }: { icon: IconName; title: string; body: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={28} color={colors.textFaint} style={styles.emptyIcon} />
      <T variant="subheading" style={{ textAlign: 'center' }}>{title}</T>
      <T variant="small" color={colors.textMuted} style={{ textAlign: 'center', maxWidth: 280 }}>{body}</T>
      {action ? <Button title={action} onPress={onAction} size="md" style={{ marginTop: space.md, alignSelf: 'center', paddingHorizontal: 20 }} /> : null}
    </View>
  );
}

// ---------- bottom sheet ----------

const SHEET_CLOSE_DISTANCE = 110; // drag further than this and the sheet is dismissed
const SHEET_CLOSE_VELOCITY = 0.9;

// In a browser the handle shows it can be dragged, and dragging it does not select text or scroll the page
const grabCursor = Platform.OS === 'web' ? ({ cursor: 'grab', touchAction: 'none', userSelect: 'none' } as object) : null;

/**
 * Bottom sheet. The dim layer sits under the whole sheet (so the rounded corners are dimmed too),
 * the sheet slides in and out on its own, and the handle area can be dragged down to dismiss.
 */
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const windowH = Dimensions.get('window').height;
  const native = Platform.OS !== 'web';
  const [mounted, setMounted] = useState(visible);
  const y = useRef(new Animated.Value(windowH)).current; // how far the sheet is pushed down
  const heightRef = useRef(windowH * 0.6);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      y.setValue(heightRef.current + 40);
      Animated.spring(y, { toValue: 0, useNativeDriver: native, damping: 24, stiffness: 240, mass: 0.9, overshootClamping: true }).start();
    } else if (mounted) {
      Animated.timing(y, { toValue: heightRef.current + 40, duration: 220, useNativeDriver: native }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderMove: (_, g) => y.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > SHEET_CLOSE_DISTANCE || g.vy > SHEET_CLOSE_VELOCITY) {
          onCloseRef.current();
        } else {
          Animated.spring(y, { toValue: 0, useNativeDriver: native, damping: 22, stiffness: 260, overshootClamping: true }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(y, { toValue: 0, useNativeDriver: native, overshootClamping: true }).start();
      },
    }),
  ).current;

  const dim = y.interpolate({ inputRange: [0, 320], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: dim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View
          onLayout={(e) => {
            heightRef.current = e.nativeEvent.layout.height;
          }}
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20), transform: [{ translateY: y }] }]}>
          <View style={styles.contentWidth}>
            {/* the handle and title are the drag zone */}
            <View {...pan.panHandlers} style={[styles.sheetHeader, grabCursor]} accessibilityRole="adjustable" accessibilityLabel="Drag down to close">
              <View style={styles.grabber} />
              {title ? <T variant="heading" style={{ marginTop: 14 }}>{title}</T> : null}
            </View>
            {children}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function SheetOption({ icon, label, detail, onPress, destructive }: { icon: IconName; label: string; detail?: string; onPress: () => void; destructive?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.sheetOption, pressed && styles.pressed]}>
      <View style={styles.sheetIcon}>
        <Ionicons name={icon} size={22} color={destructive ? colors.danger : colors.text} />
      </View>
      <View style={{ flex: 1 }}>
        <T variant="bodyStrong" color={destructive ? colors.danger : colors.text}>{label}</T>
        {detail ? <T variant="small" color={colors.textMuted}>{detail}</T> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  contentWidth: { width: '100%', maxWidth: maxContentWidth, alignSelf: 'center' },
  padded: { paddingHorizontal: space.xl },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.xl, paddingTop: space.md, backgroundColor: 'rgba(242,238,232,0.97)', borderTopWidth: hair, borderTopColor: colors.borderStrong },
  // 12 at the sides so the back chevron, drawn at the left of its 44 pt target, sits on the 20 pt page margin
  topBar: { backgroundColor: colors.page, paddingHorizontal: space.md, paddingBottom: space.xs },
  topBarInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  topBarTitle: { position: 'absolute', left: 56, right: 56, top: 0, bottom: 0, justifyContent: 'center' },
  topBarRight: { minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  backButton: { alignItems: 'flex-start' },
  sectionHeader: { justifyContent: 'space-between', marginTop: 28, marginBottom: space.md },
  /** A self-contained object on the page: flat, with a hairline edge and a contact shadow */
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: hair, borderColor: hairline, padding: space.lg, ...shadowSoft },
  /** Card panel that holds a list of rows separated by hairlines */
  panel: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: hair, borderColor: hairline, paddingHorizontal: space.lg, ...shadowSoft },
  panelRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  panelDivider: { borderTopWidth: hair, borderTopColor: colors.borderStrong },
  headerAction: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 3 },
  /** Rows, cards and links dim while held; buttons, chips and icon buttons have their own spring */
  pressed: { opacity: 0.7 },
  // every kind has a border, see-through unless outlined, so buttons side by side are the same height
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: 'transparent', paddingHorizontal: 18, minWidth: 0 },
  buttonMd: { height: 40, paddingHorizontal: 16 },
  buttonSm: { height: 32, paddingHorizontal: 12, gap: 6, borderRadius: radius.sm },
  buttonText: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20, letterSpacing: -0.2 },
  // the radius only shows where a caller gives the button a background
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 9, right: 9, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.sageDeep, borderWidth: 1.5, borderColor: colors.page },
  dotOnDark: { backgroundColor: colors.accent, borderColor: colors.ink },
  chip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 36, paddingHorizontal: space.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipSelected: { backgroundColor: colors.sageDeep, borderColor: colors.sageDeep },
  chipText: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 18, color: colors.text },
  // weight as well as colour, so the choice is not shown by colour alone
  chipTextSelected: { fontFamily: fonts.semibold, color: colors.onInk },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 7, borderRadius: radius.xs, alignSelf: 'flex-start' },
  pillText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 },
  // 16 pt text, or iOS zooms the page when the field is tapped
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, paddingHorizontal: space.lg, color: colors.text, fontFamily: fonts.medium, fontSize: 16 },
  // one line is as tall as a button, so a field and a button side by side line up
  inputSingle: { height: 48, paddingVertical: 0 },
  inputMultiline: { minHeight: 96, paddingVertical: space.md, textAlignVertical: 'top' },
  inputFocused: { borderColor: colors.sageDeep },
  stepBtn: { borderRadius: radius.md, backgroundColor: colors.mist },
  online: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.surface },
  extra: { backgroundColor: colors.surfaceRaised, borderWidth: 2, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 6, paddingVertical: 28, paddingHorizontal: space.lg },
  emptyIcon: { marginBottom: space.xs },
  backdrop: { backgroundColor: 'rgba(15,26,20,0.45)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.panel, borderTopRightRadius: radius.panel, paddingHorizontal: space.xl, paddingTop: space.sm },
  sheetHeader: { paddingBottom: space.md },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong },
  sheetOption: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, minHeight: 52 },
  // a slot the width of the widest glyph, so labels line up down the sheet
  sheetIcon: { width: 28, alignItems: 'center' },
});
