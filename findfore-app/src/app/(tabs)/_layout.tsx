import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { IconName } from '@/components/ui';
import { colors, fonts, maxContentWidth } from '@/constants/theme';
import { actionNeeded, totalUnread, useStore } from '@/data/store';

const TABS: { name: string; label: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { name: 'search', label: 'Search', icon: 'search-outline', iconActive: 'search' },
  { name: 'post', label: 'Post', icon: 'add', iconActive: 'add' },
  { name: 'competitions', label: 'Competitions', icon: 'trophy-outline', iconActive: 'trophy' },
  { name: 'messages', label: 'Messages', icon: 'chatbubble-outline', iconActive: 'chatbubble' },
];

function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const store = useStore();
  const badge = totalUnread(store.state) + actionNeeded(store.state).length;

  return (
    <View pointerEvents="box-none" style={[styles.bar, { paddingBottom: Math.max(insets.bottom - 6, 10) }]}>
      <View style={styles.inner}>
        {state.routes.map((route, index) => {
          const tab = TABS.find((t) => t.name === route.name);
          if (!tab) return null;
          const focused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          if (tab.name === 'post') {
            return (
              <Pressable key={route.key} onPress={onPress} accessibilityRole="button" accessibilityLabel="Post a game or availability" style={styles.postItem}>
                <View style={styles.postButton}>
                  <Ionicons name="add" size={30} color={colors.ink} />
                </View>
              </Pressable>
            );
          }

          return (
            <Pressable key={route.key} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={tab.name === 'messages' && badge > 0 ? `${tab.label}, ${badge} new` : tab.label} style={styles.item}>
              <View>
                <Ionicons name={focused ? tab.iconActive : tab.icon} size={23} color={focused ? colors.lime : colors.onInkMuted} />
                {tab.name === 'messages' && badge > 0 ? (
                  <View style={styles.badge}>
                    <Text maxFontSizeMultiplier={1} style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text maxFontSizeMultiplier={1.2} style={[styles.label, focused && { color: colors.lime }]}>{tab.label}</Text>
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
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="post" />
      <Tabs.Screen name="competitions" />
      <Tabs.Screen name="messages" />
      {/* reached from the photo in the corner, so it has no tab of its own */}
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'transparent', paddingHorizontal: 12, paddingTop: 6 },
  inner: { flexDirection: 'row', width: '100%', maxWidth: maxContentWidth - 24, alignSelf: 'center', backgroundColor: colors.ink, borderRadius: 30, paddingVertical: 8, paddingHorizontal: 6, shadowColor: '#0B0B0B', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 50 },
  postItem: { width: 62, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  label: { fontFamily: fonts.semibold, fontSize: 10.5, color: colors.onInkMuted },
  postButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -5, right: -10, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.ink },
  badgeText: { fontFamily: fonts.extrabold, fontSize: 10, color: colors.ink },
});
