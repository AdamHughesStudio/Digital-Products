import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { IconName } from '@/components/ui';
import { colors, fonts, maxContentWidth, radius, tabularNums } from '@/constants/theme';
import { useFriends } from '@/data/friends';
import { actionNeeded, totalUnread, useStore } from '@/data/store';
import { haptic } from '@/lib/haptics';

export const NAV_TABS: { name: string; path: string; label: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index', path: '/', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { name: 'season', path: '/season', label: 'My season', icon: 'calendar-outline', iconActive: 'calendar' },
  { name: 'post', path: '/post/game', label: 'Post', icon: 'add', iconActive: 'add' },
  { name: 'friends', path: '/friends', label: 'Friends', icon: 'people-outline', iconActive: 'people' },
  { name: 'messages', path: '/messages', label: 'Messages', icon: 'chatbubble-outline', iconActive: 'chatbubble' },
];

// Screens inside the tabs draw their own bar; these are the tab screens' addresses
const TAB_PATHS = ['/', '/season', '/friends', '/messages', '/competitions', '/profile'];

// Pages opened on top of the tabs that keep the bar. Left out on purpose: pages with their own
// action bar at the bottom (a game's You're in and Group chat, a golfer's Message and Invite), chats
// (the message box sits there), posting a game and editing a profile (forms with their own buttons),
// the map (its list drags up from the bottom), welcome and sign in.
const KEEPS_NAV = [/^\/club\//, /^\/course\//, /^\/open\//, /^\/championship\//, /^\/notifications$/, /^\/settings(\/|$)/, /^\/calendar$/];

/** Whether the shared bottom bar shows over this page (the tab screens have their own) */
export const sharedNavFor = (path: string) => !TAB_PATHS.includes(path) && KEEPS_NAV.some((r) => r.test(path));

// ---------- the last tab used, so the bar on a detail page shows where you came from ----------

let lastTab = 'index';
const listeners = new Set<() => void>();
export function setLastTab(name: string) {
  if (name === lastTab || !NAV_TABS.some((t) => t.name === name)) return;
  lastTab = name;
  listeners.forEach((l) => l());
}
const useLastTab = () =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },
    () => lastTab,
    () => lastTab,
  );

// The bar's own height: a 52 pt row of tabs, 6 above and below it, and its 1 pt rim
const BAR_HEIGHT = 52 + 2 * 6 + 2;

/** Height of the bottom bar, including the gap below it on phones without a home button */
export function useNavHeight() {
  const insets = useSafeAreaInsets();
  return 6 + BAR_HEIGHT + Math.max(insets.bottom - 6, 10);
}

/** Room a page should leave at the bottom so nothing sits under the shared bar; 0 where it doesn't show */
export function useNavSpace() {
  const path = usePathname();
  const height = useNavHeight();
  return sharedNavFor(path) ? height : 0;
}

/** The bar itself: Home, My season, post a game, Friends, Messages */
export function BottomNav({ active, onTab }: { active?: string; onTab: (name: string) => void }) {
  const insets = useSafeAreaInsets();
  const store = useStore();
  const badge = totalUnread(store.state) + actionNeeded(store.state).length;
  const requests = useFriends().incoming.length;

  return (
    <View pointerEvents="box-none" style={[styles.bar, { paddingBottom: Math.max(insets.bottom - 6, 10) }]}>
      <View style={[styles.inner, glass]}>
        {/* a faint top edge, like light catching the rim of the panel */}
        <View pointerEvents="none" style={styles.sheen} />
        {NAV_TABS.map((tab) => {
          const focused = active === tab.name;
          const count = tab.name === 'messages' ? badge : tab.name === 'friends' ? requests : 0;

          if (tab.name === 'post') {
            return (
              <Pressable
                key={tab.name}
                onPress={() => {
                  haptic.tap();
                  router.push('/post/game');
                }}
                accessibilityRole="button"
                accessibilityLabel="Post a game"
                style={({ pressed }) => [styles.postItem, pressed && styles.postPressed]}>
                <View style={styles.postButton}>
                  <Ionicons name="add" size={28} color={colors.onInk} />
                </View>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={tab.name}
              onPress={() => {
                haptic.select();
                onTab(tab.name);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={count > 0 ? `${tab.label}, ${count} new` : tab.label}
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
              <View>
                {/* the filled glyph and the brighter label show where you are */}
                <View style={styles.iconWrap}>
                  <Ionicons name={focused ? tab.iconActive : tab.icon} size={24} color={focused ? colors.accent : colors.onInkMuted} />
                </View>
                {count > 0 ? (
                  <View style={styles.badge}>
                    <Text maxFontSizeMultiplier={1} style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
                  </View>
                ) : null}
              </View>
              <Text maxFontSizeMultiplier={1.2} style={[styles.label, focused && styles.labelOn]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * The same bar on pages opened from the tabs (a game, a club, a golfer), so the main sections are
 * always one tap away. Tapping a tab goes back to it from wherever you are.
 */
export function SharedBottomNav() {
  const path = usePathname();
  const last = useLastTab();
  const { me } = useStore();
  if (!me || !sharedNavFor(path)) return null;
  return (
    <View pointerEvents="box-none" style={styles.shared}>
      <BottomNav
        active={last}
        onTab={(name) => {
          const tab = NAV_TABS.find((t) => t.name === name);
          if (!tab) return;
          setLastTab(name);
          router.navigate(tab.path as never);
        }}
      />
    </View>
  );
}

// Forest app chrome, as in the brand guidelines. On the web app the page shows through faintly,
// blurred; native has no blur without a new build, so it uses solid forest instead.
const glass =
  Platform.OS === 'web'
    ? ({ backgroundColor: 'rgba(15,26,20,0.97)', backdropFilter: 'blur(24px) saturate(140%)', WebkitBackdropFilter: 'blur(24px) saturate(140%)' } as object)
    : { backgroundColor: colors.ink };

const styles = StyleSheet.create({
  shared: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'transparent', paddingHorizontal: 12, paddingTop: 6 },
  inner: { flexDirection: 'row', width: '100%', maxWidth: maxContentWidth - 24, alignSelf: 'center', borderRadius: 30, paddingVertical: 6, paddingHorizontal: 6, borderWidth: 1, borderColor: 'rgba(231,225,219,0.08)', overflow: 'hidden', shadowColor: colors.ink, shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  sheen: { position: 'absolute', left: 30, right: 30, top: 0, height: 1, backgroundColor: colors.inkBorder },
  iconWrap: { width: 46, height: 28, alignItems: 'center', justifyContent: 'center' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, height: 52 },
  itemPressed: { opacity: 0.55 },
  postItem: { width: 62, alignItems: 'center', justifyContent: 'center', height: 52 },
  postPressed: { transform: [{ scale: 0.94 }] },
  label: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, color: colors.onInkMuted },
  labelOn: { fontFamily: fonts.semibold, color: colors.onInk },
  postButton: { width: 46, height: 46, borderRadius: radius.pill, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -4, right: 4, minWidth: 18, height: 18, borderRadius: radius.pill, paddingHorizontal: 4, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.ink },
  badgeText: { fontFamily: fonts.extrabold, fontSize: 10, lineHeight: 13, color: colors.ink, ...tabularNums },
});
