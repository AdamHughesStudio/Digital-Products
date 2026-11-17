import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker, type Region } from 'react-native-maps';

import type { GamesMapProps, MapPin } from './games-map.types';
import { colors, fonts, tabularNums } from '@/constants/theme';

const MILE_DEG = 1 / 69; // a mile in degrees of latitude, near enough for framing

/** A region that shows a radius around a point */
function regionAround(lat: number, lng: number, radiusMiles: number): Region {
  const latitudeDelta = Math.max(0.02, radiusMiles * 2.2 * MILE_DEG);
  return { latitude: lat, longitude: lng, latitudeDelta, longitudeDelta: latitudeDelta / Math.max(0.2, Math.cos((lat * Math.PI) / 180)) };
}

/** A region that holds every point, with a little room round the edge */
function regionFitting(points: { lat: number; lng: number }[]): Region | undefined {
  if (!points.length) return undefined;
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const [s, n, w, e] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  return { latitude: (s + n) / 2, longitude: (w + e) / 2, latitudeDelta: Math.max(0.05, (n - s) * 1.4), longitudeDelta: Math.max(0.05, (e - w) * 1.4) };
}

/** A zoom level as the web map counts it, turned into a region round one point */
function regionAtZoom(lat: number, lng: number, zoom: number): Region {
  const longitudeDelta = 360 / 2 ** zoom;
  return { latitude: lat, longitude: lng, latitudeDelta: longitudeDelta * Math.cos((lat * Math.PI) / 180), longitudeDelta };
}

/**
 * The map on the iPhone and Android apps: Apple Maps on iPhone, Google Maps on Android, with the
 * same pins, grouping, selection and "search as the map moves" behaviour as the web map.
 */
export function GamesMap({ me, radiusMiles, pins, selectedId, onSelect, bottomInset = 0, topInset = 0, interactive = true, noun = 'games', showMe = true, zoom, onAreaChange, recenter }: GamesMapProps) {
  const map = useRef<MapView>(null);
  const follow = !!onAreaChange;
  const home = useMemo(() => regionAround(me.lat, me.lng, radiusMiles), [me.lat, me.lng, radiusMiles]);
  const [region, setRegion] = useState<Region>(() => {
    if (zoom && pins[0]) return regionAtZoom(pins[0].lat, pins[0].lng, zoom);
    if (follow) return home;
    return regionFitting([...(showMe ? [me] : []), ...pins]) ?? home;
  });

  // a map that doesn't follow the golfer frames its pins whenever the set changes
  const key = pins.map((p) => p.id).join(',');
  useEffect(() => {
    if (follow || zoom) return;
    const r = regionFitting([...(showMe ? [me] : []), ...pins]);
    if (r) map.current?.animateToRegion(r, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // back to the golfer's own area at the starting zoom
  useEffect(() => {
    if (recenter) map.current?.animateToRegion(home, 600);
  }, [recenter, home]);

  // bring a pin chosen from the list into view
  useEffect(() => {
    const sel = pins.find((p) => p.id === selectedId);
    if (!sel || !interactive) return;
    const inView = Math.abs(sel.lat - region.latitude) < region.latitudeDelta * 0.4 && Math.abs(sel.lng - region.longitude) < region.longitudeDelta * 0.45;
    if (!inView) map.current?.animateToRegion({ ...region, latitude: sel.lat, longitude: sel.lng }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // pins close enough to overlap at this zoom share one "3 games" bubble; the chosen pin stays on its own
  const groups = useMemo(() => {
    const cellLat = region.latitudeDelta / 9;
    const cellLng = region.longitudeDelta / 6;
    const cells = new Map<string, MapPin[]>();
    const out: { id: string; lat: number; lng: number; members: MapPin[] }[] = [];
    for (const p of pins) {
      if (p.id === selectedId) {
        out.push({ id: p.id, lat: p.lat, lng: p.lng, members: [p] });
        continue;
      }
      const k = `${Math.floor(p.lat / cellLat)}:${Math.floor(p.lng / cellLng)}`;
      cells.set(k, [...(cells.get(k) ?? []), p]);
    }
    cells.forEach((members, k) => {
      const lat = members.reduce((n, p) => n + p.lat, 0) / members.length;
      const lng = members.reduce((n, p) => n + p.lng, 0) / members.length;
      out.push({ id: members.length === 1 ? members[0].id : `group-${k}`, lat, lng, members });
    });
    return out;
  }, [pins, selectedId, region.latitudeDelta, region.longitudeDelta]);

  const settle = (r: Region) => {
    setRegion(r);
    if (!onAreaChange) return;
    onAreaChange({
      north: r.latitude + r.latitudeDelta / 2,
      south: r.latitude - r.latitudeDelta / 2,
      west: r.longitude - r.longitudeDelta / 2,
      east: r.longitude + r.longitudeDelta / 2,
      centre: { lat: r.latitude, lng: r.longitude },
    });
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        onRegionChangeComplete={settle}
        mapPadding={{ top: topInset, bottom: bottomInset, left: 0, right: 0 }}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={false}
        pitchEnabled={false}
        showsCompass={false}
        showsPointsOfInterests={false}
        toolbarEnabled={false}
        userInterfaceStyle="light">
        {showMe && !follow ? (
          <Circle center={{ latitude: me.lat, longitude: me.lng }} radius={radiusMiles * 1609.34} strokeColor="rgba(15,26,20,0.35)" strokeWidth={1} fillColor="rgba(173,200,162,0.08)" />
        ) : null}
        {showMe ? (
          <Marker coordinate={{ latitude: me.lat, longitude: me.lng }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false} tappable={false}>
            <View style={s.me} />
          </Marker>
        ) : null}
        {groups.map((g) => {
          const one = g.members.length === 1;
          const on = one && g.members[0].id === selectedId;
          const label = one ? g.members[0].label : `${g.members.length} ${noun}`;
          return (
            <Marker
              key={g.id}
              coordinate={{ latitude: g.lat, longitude: g.lng }}
              anchor={{ x: 0.5, y: 1 }}
              zIndex={on ? 1000 : one ? 1 : 2}
              tracksViewChanges={false}
              onPress={() => {
                if (!interactive) return;
                if (one) return onSelect(g.members[0].id);
                // a bubble zooms in to split itself into its pins
                const r = regionFitting(g.members.map((p) => ({ lat: p.lat, lng: p.lng })));
                if (r) map.current?.animateToRegion({ ...r, latitudeDelta: Math.min(r.latitudeDelta, region.latitudeDelta / 3), longitudeDelta: Math.min(r.longitudeDelta, region.longitudeDelta / 3) }, 450);
              }}>
              <View style={s.pinWrap} accessibilityLabel={label}>
                <View style={[s.pin, on && s.pinOn]}>
                  <Text style={[s.pinText, on && s.pinTextOn]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{label}</Text>
                </View>
                <View style={[s.tail, on && s.tailOn]} />
              </View>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}

const s = StyleSheet.create({
  me: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.ink, borderWidth: 3, borderColor: colors.white },
  pinWrap: { alignItems: 'center' },
  pin: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.ink, maxWidth: 200 },
  pinOn: { backgroundColor: colors.ink },
  pinText: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 17, color: colors.ink, ...tabularNums },
  pinTextOn: { color: colors.white },
  tail: { width: 8, height: 8, marginTop: -4, backgroundColor: colors.ink, transform: [{ rotate: '45deg' }] },
  tailOn: { backgroundColor: colors.ink },
});
