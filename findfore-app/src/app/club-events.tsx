import { useState } from 'react';
import { View } from 'react-native';

import { ClubEventCard } from '@/components/club-event-card';
import { Chip, ChipRow, EmptyState, Screen, T, TopBar, styles as ui } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { CLUB_EVENT_KINDS, clubEventsNear, type ClubEventKind } from '@/data/club-events';
import { useStore } from '@/data/store';

export default function ClubEvents() {
  const { me } = useStore();
  const [kind, setKind] = useState<ClubEventKind | undefined>();
  if (!me) return null;
  const list = clubEventsNear(me.location, me.radiusMiles, kind);

  return (
    <View style={ui.screen}>
      <TopBar title="Amateur events" />
      <Screen>
        <T variant="body" color={colors.textMuted}>Club opens within {me.radiusMiles} miles of {me.location.name}. Gents’, ladies’, mixed and Texas scrambles.</T>
        <View style={{ marginTop: space.lg, marginBottom: space.lg }}>
          <ChipRow scroll>
            <Chip label="All" selected={!kind} onPress={() => setKind(undefined)} />
            {CLUB_EVENT_KINDS.map((k) => (
              <Chip key={k.id} label={k.short} selected={kind === k.id} onPress={() => setKind(k.id)} />
            ))}
          </ChipRow>
        </View>
        {list.length === 0 ? (
          <EmptyState icon="trophy-outline" title="No events nearby" body="Try another type, or widen your search area in your profile." />
        ) : (
          list.map(({ e, miles }) => <ClubEventCard key={e.id} event={e} miles={miles} />)
        )}
        <T variant="caption" color={colors.textFaint} style={{ textAlign: 'center', marginTop: space.md }}>Preview listings. Dates and prices are examples only.</T>
      </Screen>
    </View>
  );
}
