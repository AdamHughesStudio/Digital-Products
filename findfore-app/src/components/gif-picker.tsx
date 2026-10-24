import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Sheet, T, styles as ui } from '@/components/ui';
import { colors, fonts, hairline, radius, space } from '@/constants/theme';
import type { Gif } from '@/data/types';
import { haptic } from '@/lib/haptics';
import { fetchGifs, type GifResult } from '@/lib/social';

const COLS = 2;
const GAP = 8;

/**
 * Pick a GIF to send: trending to start with, or search. Two columns of animated previews, each
 * its true shape, placed in whichever column is shorter so the grid stays even.
 */
export function GifPicker({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (gif: Gif) => void }) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [width, setWidth] = useState(0);
  const asked = useRef(0);

  // trending when the sheet opens, a search a moment after typing stops
  useEffect(() => {
    if (!visible) return;
    const n = ++asked.current;
    const t = setTimeout(
      () => {
        setLoading(true);
        setError('');
        fetchGifs(query)
          .then((r) => n === asked.current && setGifs(r.gifs))
          .catch((e: Error) => n === asked.current && setError(e.message))
          .finally(() => n === asked.current && setLoading(false));
      },
      query ? 350 : 0,
    );
    return () => clearTimeout(t);
  }, [visible, query]);

  const colW = width ? (width - GAP * (COLS - 1)) / COLS : 0;
  const cols: GifResult[][] = Array.from({ length: COLS }, () => []);
  const heights = Array(COLS).fill(0);
  gifs.forEach((g) => {
    const i = heights.indexOf(Math.min(...heights));
    cols[i].push(g);
    heights[i] += (colW * g.height) / g.width + GAP;
  });

  return (
    <Sheet visible={visible} onClose={onClose} title="Send a GIF">
      <View style={s.search}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search GIFs"
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.ink}
          returnKeyType="search"
          autoCorrect={false}
          style={s.input}
          accessibilityLabel="Search GIFs"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={colors.textFaint} />
          </Pressable>
        ) : null}
      </View>
      <T variant="label" color={colors.textMuted} style={s.heading}>{query.trim() ? 'RESULTS' : 'TRENDING'}</T>
      <ScrollView style={{ maxHeight: 440 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {error ? (
          <T variant="body" color={colors.textMuted} style={s.note}>{error}</T>
        ) : loading && gifs.length === 0 ? (
          <ActivityIndicator color={colors.ink} style={{ marginVertical: space.xxl }} />
        ) : gifs.length === 0 ? (
          <T variant="body" color={colors.textMuted} style={s.note}>No GIFs match “{query.trim()}”. Try another word.</T>
        ) : (
          <View style={[s.grid, loading && { opacity: 0.5 }]}>
            {cols.map((col, ci) => (
              <View key={ci} style={{ width: colW, gap: GAP }}>
                {col.map((g) => (
                  <Pressable
                    key={g.id}
                    onPress={() => {
                      haptic.tap();
                      onPick({ url: g.url, width: g.width, height: g.height });
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={g.title ? `Send GIF: ${g.title}` : 'Send this GIF'}
                    style={({ pressed }) => [s.cell, pressed && ui.pressed]}>
                    <Image source={{ uri: g.preview }} style={{ width: colW, height: (colW * g.height) / g.width }} contentFit="cover" autoplay />
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <T variant="caption" color={colors.textFaint} style={s.credit}>Powered by KLIPY</T>
    </Sheet>
  );
}

const s = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: hairline },
  input: { flex: 1, height: '100%', color: colors.text, fontFamily: fonts.medium, fontSize: 16 },
  heading: { marginTop: space.lg, marginBottom: space.sm, letterSpacing: 1 },
  grid: { flexDirection: 'row', gap: GAP },
  cell: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.mist },
  note: { textAlign: 'center', marginVertical: space.xxl },
  credit: { textAlign: 'center', marginTop: space.md },
});
