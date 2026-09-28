import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { GamesMapProps } from './games-map.types';
import { T } from './ui';
import { colors } from '@/constants/theme';

/**
 * Native fallback until a native maps module is added: a simple plotted view of the games around you,
 * using the same pins and selection as the web map.
 */
export function GamesMap({ me, radiusMiles, pins, selectedId, onSelect, bottomInset = 0, topInset = 0 }: GamesMapProps) {
  const all = [me, ...pins];
  const lats = all.map((p) => p.lat);
  const lngs = all.map((p) => p.lng);
  const pad = 0.08;
  const minLat = Math.min(...lats) - pad;
  const maxLat = Math.max(...lats) + pad;
  const minLng = Math.min(...lngs) - pad;
  const maxLng = Math.max(...lngs) + pad;
  const x = (lng: number) => `${((lng - minLng) / (maxLng - minLng)) * 100}%`;
  const y = (lat: number) => `${((maxLat - lat) / (maxLat - minLat)) * 100}%`;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.mist }]}>
      <View style={{ position: 'absolute', left: 30, right: 30, top: topInset + 30, bottom: bottomInset + 20 }}>
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Circle cx={x(me.lng)} cy={y(me.lat)} r={Math.max(40, radiusMiles * 4)} fill={colors.lime} fillOpacity={0.08} stroke={colors.ink} strokeOpacity={0.3} strokeDasharray="4 6" />
          <Path d="" />
        </Svg>
        <View style={[s.me, { left: x(me.lng) as unknown as number, top: y(me.lat) as unknown as number }]} />
        {pins.map((p) => {
          const on = p.id === selectedId;
          return (
            <Pressable key={p.id} onPress={() => onSelect(p.id)} style={[s.pinWrap, { left: x(p.lng) as unknown as number, top: y(p.lat) as unknown as number }]}>
              <View style={[s.pin, on && s.pinOn]}>
                <T variant="smallStrong" color={on ? colors.ink : colors.lime}>{p.label}</T>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  me: { position: 'absolute', width: 18, height: 18, marginLeft: -9, marginTop: -9, borderRadius: 9, backgroundColor: colors.ink, borderWidth: 3, borderColor: colors.lime },
  pinWrap: { position: 'absolute', transform: [{ translateX: -30 }, { translateY: -34 }] },
  pin: { backgroundColor: colors.ink, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  pinOn: { backgroundColor: colors.lime },
});
