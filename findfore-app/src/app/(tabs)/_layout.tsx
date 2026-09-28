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
  { name: 'index', label: 'Discover', icon: 'compass-outline', iconActive: 'compass' },
  { name: 'search', label: 'Search', icon: 'search-outline', iconActive: 'search' },
  { name: 'post', label: 'Post', icon: 'add', iconActive: 'add' },
  { name: 'messages', label: 'Messages', icon: 'chatbubble-outline', iconActive: 'chatbubble' },
  { name: 'profile', label: 'Profile', icon: 'person-outline', iconActive: 'person' },
];

function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const store = useStore();
  const badge = totalUnread(store.state) + actionNeeded(store.state).length;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom - 6, 10) }]}>
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
              <Pressable key={route.key} onPress={onPress} accessibilityRole="button" accessibilityLabel="Post" style={styles.item}>
                <View style={styles.postButton}>
                  <Ionicons name="add" size={30} color={colors.ink} />
                </View>
              </Pressable>
            );
          }

          return (
            <Pressable key={route.key} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: focused }} accessibilityLabel={tab.label} style={styles.item}>
              <View>
                <Ionicons name={focused ? tab.iconActive : tab.icon} size={23} color={focused ? colors.lime : colors.onInkMuted} />
                {tab.name === 'messages' && badge > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, focused && { color: colors.lime }]}>{tab.label}</Text>
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
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.bg, paddingHorizontal: 12, paddingTop: 6 },
  inner: { flexDirection: 'row', width: '100%', maxWidth: maxContentWidth - 24, alignSelf: 'center', backgroundColor: colors.ink, borderRadius: 30, paddingVertical: 8, paddingHorizontal: 6, shadowColor: '#0B0B0B', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 50 },
  label: { fontFamily: fonts.semibold, fontSize: 11, color: colors.onInkMuted },
  postButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -5, right: -10, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.ink },
  badgeText: { fontFamily: fonts.extrabold, fontSize: 10, color: colors.ink },
});
