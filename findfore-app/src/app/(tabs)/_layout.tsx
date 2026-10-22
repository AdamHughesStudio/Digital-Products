import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect } from 'react';

import { BottomNav, setLastTab } from '@/components/bottom-nav';
import { colors } from '@/constants/theme';
import { useStore } from '@/data/store';

function TabBar({ state, navigation }: BottomTabBarProps) {
  const current = state.routes[state.index]?.name;
  // remembered so the same bar on a game or club page shows where you came from
  useEffect(() => {
    if (current) setLastTab(current);
  }, [current]);

  return (
    <BottomNav
      active={current}
      onTab={(name) => {
        const route = state.routes.find((r) => r.name === name);
        if (!route) return;
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (current !== name && !event.defaultPrevented) navigation.navigate(name);
      }}
    />
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
