import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
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

import { colors, fonts, maxContentWidth, radius, shadow, space } from '@/constants/theme';
import type { Golfer } from '@/data/types';
import { initials } from '@/lib/format';

export type IconName = ComponentProps<typeof Ionicons>['name'];

// ---------- text ----------

type Variant = 'display' | 'title' | 'heading' | 'subheading' | 'body' | 'bodyStrong' | 'small' | 'smallStrong' | 'caption' | 'label';

const variantStyles: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 36, letterSpacing: -0.5, textTransform: 'uppercase' },
  title: { fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.extrabold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  subheading: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  smallStrong: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 11.5, lineHeight: 15 },
  label: { fontFamily: fonts.extrabold, fontSize: 11, lineHeight: 14, letterSpacing: 1.1, textTransform: 'uppercase' },
};

export function T({ variant = 'body', color = colors.text, style, ...rest }: TextProps & { variant?: Variant; color?: string }) {
  return <Text {...rest} style={[variantStyles[variant], { color }, style]} />;
}

// ---------- layout ----------

export function Screen({ children, scroll = true, padded = true, footer, style }: { children: ReactNode; scroll?: boolean; padded?: boolean; footer?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  const inner = <View style={[styles.contentWidth, padded && styles.padded, style]}>{children}</View>;
  return (
    <View style={styles.screen}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ paddingBottom: footer ? 120 : 40 + insets.bottom }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
      {footer ? <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}><View style={styles.contentWidth}>{footer}</View></View> : null}
    </View>
  );
}

/** Top bar for pushed screens: back button, title and optional right action */
export function TopBar({ title, right, onBack }: { title?: string; right?: ReactNode; onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
      <View style={[styles.contentWidth, styles.topBarInner]}>
        <IconButton icon="chevron-back" label="Back" onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))} />
        <T variant="subheading" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
          {title ?? ''}
        </T>
        <View style={{ minWidth: 40, alignItems: 'flex-end' }}>{right}</View>
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
    <Row style={{ justifyContent: 'space-between', marginTop: space.xxl, marginBottom: space.md }}>
      <T variant="heading">{title}</T>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10}>
          <Row gap={2}>
            <T variant="smallStrong" color={colors.lime}>{action}</T>
            <Ionicons name="chevron-forward" size={15} color={colors.lime} />
          </Row>
        </Pressable>
      ) : null}
    </Row>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong }, style]} />;
}

// ---------- controls ----------

type ButtonKind = 'primary' | 'dark' | 'secondary' | 'ghost' | 'danger';

export function Button({ title, onPress, kind = 'primary', icon, disabled, loading, style, size = 'lg' }: { title: string; onPress?: () => void; kind?: ButtonKind; icon?: IconName; disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; size?: 'lg' | 'md' | 'sm' }) {
  const fg = kind === 'primary' ? colors.ink : kind === 'dark' ? colors.lime : kind === 'danger' ? colors.danger : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        size === 'md' && { paddingVertical: 12 },
        size === 'sm' && { paddingVertical: 8, paddingHorizontal: 14 },
        kind === 'primary' && { backgroundColor: colors.lime },
        kind === 'dark' && { backgroundColor: colors.ink },
        kind === 'secondary' && { borderWidth: 1.5, borderColor: colors.ink, backgroundColor: colors.surface },
        kind === 'ghost' && { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
        kind === 'danger' && { backgroundColor: colors.dangerSoft },
        disabled && (kind === 'primary' || kind === 'dark') && { backgroundColor: colors.surfaceHigh },
        (disabled || loading) && kind !== 'primary' && kind !== 'dark' && { opacity: 0.45 },
        pressed && styles.pressed,
        style,
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 19} color={disabled && (kind === 'primary' || kind === 'dark') ? colors.textFaint : fg} /> : null}
      <Text style={[styles.buttonText, size === 'sm' && { fontSize: 14 }, { color: disabled && (kind === 'primary' || kind === 'dark') ? colors.textFaint : fg }]}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, badge, color = colors.text, size = 22, style }: { icon: IconName; onPress?: () => void; label: string; badge?: boolean | number; color?: string; size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed, style]}>
      <Ionicons name={icon} size={size} color={color} />
      {badge ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, icon, style }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed, style]}>
      {icon ? <Ionicons name={icon} size={15} color={selected ? colors.lime : colors.textMuted} /> : null}
      <Text style={[styles.chipText, selected && { color: colors.onInk }]}>{label}</Text>
    </Pressable>
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

export function Pill({ label, icon, tone = 'dark', style }: { label: string; icon?: IconName; tone?: 'dark' | 'lime' | 'muted' | 'danger' | 'light'; style?: StyleProp<ViewStyle> }) {
  const bg = tone === 'lime' ? colors.lime : tone === 'muted' ? 'rgba(255,255,255,0.16)' : tone === 'danger' ? colors.dangerSoft : tone === 'light' ? colors.surfaceRaised : 'rgba(11,11,11,0.82)';
  const fg = tone === 'lime' ? colors.ink : tone === 'danger' ? colors.danger : tone === 'muted' ? colors.onInk : tone === 'light' ? colors.text : colors.lime;
  return (
    <View style={[styles.pill, { backgroundColor: bg }, style]}>
      {icon ? <Ionicons name={icon} size={13} color={fg} /> : null}
      <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Field({ label, hint, style, ...props }: TextInputProps & { label?: string; hint?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <T variant="smallStrong" color={colors.textMuted}>{label}</T> : null}
      <TextInput
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.ink}
        {...props}
        style={[styles.input, props.multiline && { minHeight: 96, textAlignVertical: 'top', paddingTop: 14 }, style]}
      />
      {hint ? <T variant="caption" color={colors.textFaint}>{hint}</T> : null}
    </View>
  );
}

export function FormLabel({ children, optional }: { children: string; optional?: boolean }) {
  return (
    <Row gap={6} style={{ marginTop: space.xxl, marginBottom: space.sm }}>
      <T variant="subheading">{children}</T>
      {optional ? <T variant="caption" color={colors.textFaint}>Optional</T> : null}
    </Row>
  );
}

export function Stepper({ value, min, max, onChange, suffix }: { value: number; min: number; max: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <Row gap={space.lg}>
      <IconButton icon="remove" label="Decrease" onPress={() => onChange(Math.max(min, value - 1))} style={styles.stepBtn} color={value <= min ? colors.textFaint : colors.text} />
      <T variant="title" style={{ minWidth: 28, textAlign: 'center' }}>{value}</T>
      <IconButton icon="add" label="Increase" onPress={() => onChange(Math.min(max, value + 1))} style={styles.stepBtn} color={value >= max ? colors.textFaint : colors.text} />
      {suffix ? <T variant="body" color={colors.textMuted}>{suffix}</T> : null}
    </Row>
  );
}

// ---------- people ----------

const avatarImages: Record<string, number> = {
  ryan: require('@/assets/images/avatars/ryan.jpg'),
  jamie: require('@/assets/images/avatars/jamie.jpg'),
  tom: require('@/assets/images/avatars/tom.jpg'),
  james: require('@/assets/images/avatars/james.jpg'),
};

const avatarTints = ['#1F3D1F', '#2B2B2B', '#3A3F1A', '#233040', '#402B23'];

export function Avatar({ golfer, size = 44, ring, online }: { golfer?: Golfer; size?: number; ring?: boolean; online?: boolean }) {
  const src = golfer?.avatar ? avatarImages[golfer.avatar] : undefined;
  const tint = golfer ? avatarTints[(golfer.firstName.charCodeAt(0) + golfer.lastName.length) % avatarTints.length] : colors.surfaceHigh;
  return (
    <View style={{ width: size, height: size }}>
      <View style={[{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }, ring && { borderWidth: 3, borderColor: colors.lime }]}>
        {src ? (
          <Image source={src} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <Text style={{ fontFamily: fonts.extrabold, color: golfer?.id === 'me' ? colors.lime : colors.white, fontSize: size * 0.36 }}>{golfer ? initials(golfer) : '?'}</Text>
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
          <Text style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 12 }}>+{extra}</Text>
        </View>
      ) : null}
    </Row>
  );
}

// ---------- empty state ----------

export function EmptyState({ icon, title, body, action, onAction }: { icon: IconName; title: string; body: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.lime} />
      </View>
      <T variant="subheading" style={{ textAlign: 'center' }}>{title}</T>
      <T variant="body" color={colors.textMuted} style={{ textAlign: 'center', maxWidth: 300 }}>{body}</T>
      {action ? <Button title={action} onPress={onAction} size="md" style={{ marginTop: space.sm, alignSelf: 'center', paddingHorizontal: 24 }} /> : null}
    </View>
  );
}

// ---------- bottom sheet ----------

export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.contentWidth}>
            <View style={styles.grabber} />
            {title ? <T variant="heading" style={{ marginBottom: space.lg }}>{title}</T> : null}
            {children}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function SheetOption({ icon, label, detail, onPress, destructive }: { icon: IconName; label: string; detail?: string; onPress: () => void; destructive?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.sheetOption, pressed && styles.pressed]}>
      <View style={[styles.sheetIcon, destructive && { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name={icon} size={20} color={destructive ? colors.danger : colors.lime} />
      </View>
      <View style={{ flex: 1 }}>
        <T variant="bodyStrong" color={destructive ? colors.danger : colors.text}>{label}</T>
        {detail ? <T variant="small" color={colors.textMuted}>{detail}</T> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  contentWidth: { width: '100%', maxWidth: maxContentWidth, alignSelf: 'center' },
  padded: { paddingHorizontal: space.lg },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: 'rgba(243,244,246,0.97)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderStrong },
  topBar: { backgroundColor: colors.bg, paddingHorizontal: space.md, paddingBottom: space.sm },
  topBarInner: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.lg, ...shadow },
  pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.pill, paddingVertical: 16, paddingHorizontal: 20 },
  buttonText: { fontFamily: fonts.extrabold, fontSize: 16 },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 7, right: 8, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.lime, borderWidth: 1.5, borderColor: colors.ink },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 10, borderRadius: radius.pill, alignSelf: 'flex-start' },
  pillText: { fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 14, color: colors.text, fontFamily: fonts.medium, fontSize: 16 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  online: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: colors.lime, borderWidth: 2, borderColor: colors.surface },
  extra: { backgroundColor: colors.surfaceRaised, borderWidth: 2, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxxl, paddingHorizontal: space.lg },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  backdrop: { flex: 1, backgroundColor: 'rgba(11,11,11,0.45)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: space.lg, paddingTop: space.sm, borderTopWidth: 1, borderColor: colors.border },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.surfaceHigh, marginBottom: space.lg },
  sheetOption: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  sheetIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
});
