import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Redirect, router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { IconName } from '@/components/ui';
import { colors, fonts, maxContentWidth } from '@/constants/theme';
import { useFriends } from '@/data/friends';
import { actionNeeded, totalUnread, useStore } from '@/data/store';

const TABS: { name: string; label: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { name: 'season', label: 'My season', icon: 'calendar-outline', iconActive: 'calendar' },
  { name: 'post', label: 'Post', icon: 'add', iconActive: 'add' },
  { name: 'friends', label: 'Friends', icon: 'people-outline', iconActive: 'people' },
  { name: 'messages', label: 'Messages', icon: 'chatbubble-outline', iconActive: 'chatbubble' },
];

function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const store = useStore();
  const badge = totalUnread(store.state) + actionNeeded(store.state).length;
  const requests = useFriends().incoming.length;

  return (
    <View pointerEvents="box-none" style={[styles.bar, { paddingBottom: Math.max(insets.bottom - 6, 10) }]}>
      <View style={[styles.inner, glass]}>
        {/* a bright top edge, like light catching the rim of a glass panel */}
        <View pointerEvents="none" style={styles.sheen} />
        {state.routes.map((route, index) => {
          const tab = TABS.find((t) => t.name === route.name);
          if (!tab) return null;
          const focused = state.index === index;
          const count = tab.name === 'messages' ? badge : tab.name === 'friends' ? requests : 0;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          if (tab.name === 'post') {
            return (
              <Pressable key={route.key} onPress={() => router.push('/post/game')} accessibilityRole="button" accessibilityLabel="Post a game" style={styles.postItem}>
                <View style={styles.postButton}>
                  <Ionicons name="add" size={30} color={colors.onInk} />
                </View>
              </Pressable>
            );
          }

          return (
            <Pressable key={route.key} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={count > 0 ? `${tab.label}, ${count} new` : tab.label} style={styles.item}>
              <View>
                <View style={[styles.iconWrap, focused && styles.iconWrapOn]}>
                  <Ionicons name={focused ? tab.iconActive : tab.icon} size={22} color={focused ? colors.accent : colors.onInkMuted} />
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

export default function TabsLayout() {
  const { me } = useStore();
  if (!me) return <Redirect href="/welcome" />;

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.page } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="season" />
      <Tabs.Screen name="post" />
      <Tabs.Screen name="friends" />
      <Tabs.Screen name="messages" />
      {/* the full competitions directory, reached from Home and My season rather than its own tab */}
      <Tabs.Screen name="competitions" />
      {/* reached from the photo in the corner, so it has no tab of its own */}
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

// Forest app chrome, as in the brand guidelines. On the web app the page shows through faintly,
// blurred; native has no blur without a new build, so it uses solid forest instead.
const glass =
  Platform.OS === 'web'
    ? ({ backgroundColor: 'rgba(15,26,20,0.94)', backdropFilter: 'blur(24px) saturate(140%)', WebkitBackdropFilter: 'blur(24px) saturate(140%)' } as object)
    : { backgroundColor: colors.ink };

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'transparent', paddingHorizontal: 12, paddingTop: 6 },
  inner: { flexDirection: 'row', width: '100%', maxWidth: maxContentWidth - 24, alignSelf: 'center', borderRadius: 32, paddingVertical: 7, paddingHorizontal: 6, borderWidth: 1, borderColor: 'rgba(231,225,219,0.08)', overflow: 'hidden', shadowColor: '#0F1A14', shadowOpacity: 0.22, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  sheen: { position: 'absolute', left: 24, right: 24, top: 0, height: 1, backgroundColor: 'rgba(231,225,219,0.12)' },
  iconWrap: { width: 46, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  iconWrapOn: { backgroundColor: 'rgba(173,200,162,0.16)' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 52 },
  postItem: { width: 62, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  label: { fontFamily: fonts.medium, fontSize: 10.5, color: colors.onInkMuted },
  labelOn: { fontFamily: fonts.semibold, color: colors.onInk },
  postButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center', shadowColor: '#0F1A14', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  badge: { position: 'absolute', top: -4, right: 4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.ink },
  badgeText: { fontFamily: fonts.extrabold, fontSize: 10, color: colors.ink },
});
