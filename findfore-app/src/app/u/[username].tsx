import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { EmptyState, TopBar, styles as ui } from '@/components/ui';
import { ME, useStore } from '@/data/store';

/** findfore.app/u/username: someone's shared profile link */
export default function ProfileLink() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { state, me } = useStore();
  if (!me) return <Redirect href="/welcome" />;
  const handle = (username ?? '').toLowerCase().replace(/^@/, '');
  const g = Object.values(state.golfers).find((x) => x.username === handle);
  if (g) return <Redirect href={g.id === ME ? '/profile' : `/golfer/${g.id}`} />;
  return (
    <View style={ui.screen}>
      <TopBar />
      <EmptyState icon="person-outline" title={`No one is @${handle} yet`} body="They may have changed their username. Try searching for them by name." action="Find golfers" onAction={() => router.replace('/friends')} />
    </View>
  );
}
