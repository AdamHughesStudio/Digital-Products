import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Redirect } from 'expo-router';
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
              <Pressable key={route.key} onPress={onPress} accessibilityRole="button" accessibilityLabel="Post a game or availability" style={styles.postItem}>
                <View style={styles.postButton}>
                  <Ionicons name="add" size={30} color={colors.white} />
                </View>
              </Pressable>
            );
          }

          return (
            <Pressable key={route.key} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={count > 0 ? `${tab.label}, ${count} new` : tab.label} style={styles.item}>
              <View>
                <View style={[styles.iconWrap, focused && styles.iconWrapOn]}>
                  <Ionicons name={focused ? tab.iconActive : tab.icon} size={22} color={focused ? colors.ink : GLASS_MUTED} />
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
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.surface } }}>
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

const GLASS_MUTED = '#4B5058';

// Frosted glass: the page shows through, blurred, on the web app. Native has no blur without a
// new build, so it uses a near solid frosted white instead.
const glass =
  Platform.OS === 'web'
    ? ({ backgroundColor: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(32px) saturate(180%)', WebkitBackdropFilter: 'blur(32px) saturate(180%)' } as object)
    : { backgroundColor: 'rgba(250,250,251,0.96)' };

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'transparent', paddingHorizontal: 12, paddingTop: 6 },
  inner: { flexDirection: 'row', width: '100%', maxWidth: maxContentWidth - 24, alignSelf: 'center', borderRadius: 32, paddingVertical: 7, paddingHorizontal: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', overflow: 'hidden', shadowColor: '#0B0B0B', shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  sheen: { position: 'absolute', left: 24, right: 24, top: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.95)' },
  iconWrap: { width: 46, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  iconWrapOn: { backgroundColor: colors.lime },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 52 },
  postItem: { width: 62, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  label: { fontFamily: fonts.semibold, fontSize: 10.5, color: GLASS_MUTED },
  labelOn: { fontFamily: fonts.bold, color: colors.ink },
  postButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', shadowColor: '#0B0B0B', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  badge: { position: 'absolute', top: -4, right: 4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  badgeText: { fontFamily: fonts.extrabold, fontSize: 10, color: colors.white },
});
