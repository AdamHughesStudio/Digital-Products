import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { GamesMap } from './games-map';
import { T } from './ui';
import { colors, hair, hairline, radius, space } from '@/constants/theme';
import type { Course } from '@/data/types';

/**
 * A still map of one club with a pin on it and a Directions button. Used on the club, game, open and
 * championship profiles so there is always a "where is it" answer.
 */
export function PlaceMap({ course, height = 150 }: { course: Course; height?: number }) {
  const label = course.name.replace(/ Golf (Club|Course|Links)$/i, '');
  const directions = () => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${course.lat},${course.lng}`);
  return (
    <View>
      <View style={[s.map, { height }]}>
        <GamesMap me={{ lat: course.lat, lng: course.lng }} radiusMiles={1} pins={[{ id: course.id, lat: course.lat, lng: course.lng, label }]} selectedId={course.id} onSelect={() => {}} interactive={false} showMe={false} zoom={13} />
      </View>
      <Pressable onPress={directions} accessibilityRole="link" accessibilityLabel={`Directions to ${course.name}`} style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}>
        <Ionicons name="navigate-outline" size={20} color={colors.text} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T variant="bodyStrong" numberOfLines={1}>{course.name}</T>
          <T variant="small" color={colors.textMuted} numberOfLines={1}>{course.town === course.region ? course.town : `${course.town}, ${course.region}`}</T>
        </View>
        <T variant="smallStrong" color={colors.sageDeep}>Directions</T>
        <Ionicons name="open-outline" size={14} color={colors.sageDeep} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  map: { borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.mist, borderWidth: hair, borderColor: hairline },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.md, minHeight: 44 },
});
