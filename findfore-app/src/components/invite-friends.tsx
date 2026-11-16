import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { useToast } from './toast';
import { Avatar, Button, Sheet, T, styles as ui } from './ui';
import { colors, fonts, hair, radius, space } from '@/constants/theme';
import { SITE_URL } from '@/constants/site';
import { useFriends } from '@/data/friends';
import { useStore } from '@/data/store';
import { displayName, hcpText } from '@/lib/format';
import { haptic } from '@/lib/haptics';

/** "Ryan", "Ryan and Jamie", "Ryan, Jamie and 2 more" */
function namesLine(names: string[]) {
  if (names.length <= 2) return names.join(' and ');
  return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
}

/**
 * Pick friends to tell about a competition. Each one gets it in their chat with you, as a message
 * with a link card they can tap, so they can answer straight away and it stays in the conversation.
 */
export function InviteFriendsSheet({ visible, onClose, title, detail, path }: { visible: boolean; onClose: () => void; title: string; detail: string; path: string }) {
  const { state, openDirect, sendMessage } = useStore();
  const ids = useFriends().friends;
  const toast = useToast();
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const all = ids.map((id) => state.golfers[id]).filter((g) => g && !state.blockedIds.includes(g.id));
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const friends = all.filter((g) => {
    const text = `${g.firstName} ${g.lastName} @${g.username} ${g.homeClub ?? ''}`.toLowerCase();
    return words.every((w) => text.includes(w));
  });
  // searching opens the sheet to nearly full height, so the list still shows above the keyboard
  const full = searching || query.length > 0;

  const close = () => {
    setPicked([]);
    setQuery('');
    setSearching(false);
    onClose();
  };
  const toggle = (id: string) => {
    haptic.select();
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };
  const send = () => {
    const text = `Fancy this one? ${title}, ${detail}. ${SITE_URL}${path}`;
    for (const id of picked) sendMessage(openDirect(id), text);
    haptic.success();
    toast(`Sent to ${namesLine(picked.map((id) => state.golfers[id]?.firstName ?? 'a friend'))}`, { icon: 'paper-plane-outline' });
    close();
  };

  return (
    <Sheet visible={visible} onClose={close} title="Invite friends" full={full}>
      <T variant="small" color={colors.textMuted} style={{ marginTop: -space.sm, marginBottom: space.sm }}>
        They’ll get {title} in their chat with you.
      </T>
      {all.length > 0 ? (
        <View style={s.search}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onFocus={() => setSearching(true)}
            onBlur={() => setSearching(false)}
            placeholder="Search your friends"
            placeholderTextColor={colors.textFaint}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel="Search your friends"
            style={s.searchInput}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={colors.textFaint} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {all.length === 0 ? (
        <View style={{ gap: space.md }}>
          <T variant="body" color={colors.textMuted}>Add golfers as friends and you can send them competitions you fancy entering.</T>
          <Button title="Find golfers" kind="secondary" size="md" onPress={() => { close(); router.push('/friends'); }} />
        </View>
      ) : (
        <>
          <ScrollView style={full ? { flex: 1 } : { maxHeight: 360 }} keyboardShouldPersistTaps="handled">
            {friends.length === 0 ? <T variant="body" color={colors.textMuted} style={{ paddingVertical: space.lg }}>No friends match “{query.trim()}”.</T> : null}
            {friends.map((g, i) => {
              const on = picked.includes(g.id);
              return (
                <Pressable
                  key={g.id}
                  onPress={() => toggle(g.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={displayName(g)}
                  style={({ pressed }) => [s.row, i > 0 && s.divider, pressed && ui.pressed]}>
                  <Avatar golfer={g} size={40} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T variant="bodyStrong" numberOfLines={1}>{displayName(g)}</T>
                    <T variant="small" color={colors.textMuted} numberOfLines={1}>{hcpText(g.handicap)}{g.homeClub ? ` · ${g.homeClub}` : ''}</T>
                  </View>
                  <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={on ? colors.sageDeep : colors.borderStrong} />
                </Pressable>
              );
            })}
          </ScrollView>
          <Button
            title={picked.length ? `Send to ${picked.length} friend${picked.length === 1 ? '' : 's'}` : 'Choose friends to send to'}
            icon="paper-plane-outline"
            disabled={picked.length === 0}
            onPress={send}
            style={{ marginTop: space.lg }}
          />
        </>
      )}
    </Sheet>
  );
}

const s = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: space.sm, height: 44, paddingHorizontal: space.md, marginBottom: space.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
  // 16px keeps iPhone Safari from zooming the page when the field is focused
  searchInput: { flex: 1, minWidth: 0, height: '100%', fontFamily: fonts.medium, fontSize: 16, color: colors.text, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null) },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 60, paddingVertical: 8 },
  divider: { borderTopWidth: hair, borderTopColor: colors.borderStrong },
});
