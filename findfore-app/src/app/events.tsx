import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { EventCard } from '@/components/event-card';
import { Chip, ChipRow, Screen, T, TopBar, styles as ui } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { ASSOCIATIONS, upcomingEvents, type Association } from '@/data/events';

export default function Events() {
  const params = useLocalSearchParams<{ a?: string }>();
  const [assoc, setAssoc] = useState<Association | undefined>(ASSOCIATIONS.find((a) => a.id === params.a)?.id);
  const list = upcomingEvents(assoc);

  return (
    <View style={ui.screen}>
      <TopBar title="Amateur events" />
      <Screen>
        <T variant="body" color={colors.textMuted}>National championships and opens for amateurs. Set a reminder and we’ll tell you the moment entry opens, before places go.</T>
        <View style={{ marginTop: space.lg, marginBottom: space.lg }}>
          <ChipRow scroll>
            <Chip label="All" selected={!assoc} onPress={() => setAssoc(undefined)} />
            {ASSOCIATIONS.map((a) => (
              <Chip key={a.id} label={a.short} selected={assoc === a.id} onPress={() => setAssoc(a.id)} />
            ))}
          </ChipRow>
        </View>
        {list.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
        <T variant="caption" color={colors.textFaint} style={{ textAlign: 'center', marginTop: space.md }}>Preview listings. Dates are examples only.</T>
      </Screen>
    </View>
  );
}
