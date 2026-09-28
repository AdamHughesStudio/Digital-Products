import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameCard } from '@/components/cards';
import { HowItWorksSteps } from '@/components/how-it-works';
import { GameRow, ProfileHeader } from '@/components/profile';
import { Avatar, Button, IconButton, Row, SectionHeader, Sheet, T, styles as ui, type IconName } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
import { creditBalance, isPast, ME, myGames, PRO_MONTHLY_CREDITS, PRO_PRICE, useStore } from '@/data/store';

function confirm(title: string, body: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${body}`)) onYes();
    return;
  }
  Alert.alert(title, body, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Continue', style: 'destructive', onPress: onYes },
  ]);
}

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { state, me, unblock, resetDemo } = useStore();
  const [help, setHelp] = useState(false);
  if (!me) return null;

  const games = myGames(state);
  const upcoming = games.filter((g) => !isPast(g)).sort((a, b) => a.teeTime.localeCompare(b.teeTime));
  const past = games.filter(isPast).sort((a, b) => b.teeTime.localeCompare(a.teeTime));
  const saved = state.savedGolferIds.map((id) => state.golfers[id]).filter(Boolean);
  const blocked = state.blockedIds.map((id) => state.golfers[id]).filter(Boolean);

  return (
    <View style={ui.screen}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={[ui.contentWidth, ui.padded]}>
          <Row style={{ justifyContent: 'space-between', marginBottom: space.md }}>
            <T variant="title" accessibilityRole="header">Profile</T>
            <IconButton icon="create-outline" label="Edit profile" onPress={() => router.push('/profile/edit')} />
          </Row>
          <ProfileHeader golfer={me} self pro={!!state.credits?.pro} />
          <Button title="Edit profile" kind="secondary" size="md" icon="create-outline" onPress={() => router.push('/profile/edit')} style={{ marginTop: space.xl }} />

          <SectionHeader title="Upcoming games" />
          {upcoming.length === 0 ? (
            <T variant="body" color={colors.textMuted}>Nothing booked yet. Find a game on Discover or post your own.</T>
          ) : (
            upcoming.map((g) => <GameCard key={g.id} game={g} compact />)
          )}

          <SectionHeader title="My Golfers" />
          {saved.length === 0 ? (
            <T variant="body" color={colors.textMuted}>Save golfers you enjoyed playing with and they’ll appear here, ready to invite again.</T>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.lg }}>
              {saved.map((g) => (
                <Pressable key={g.id} onPress={() => router.push(`/golfer/${g.id}`)} style={{ alignItems: 'center', width: 72 }}>
                  <Avatar golfer={g} size={60} />
                  <T variant="smallStrong" numberOfLines={1} style={{ marginTop: 6 }}>{g.firstName}</T>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <SectionHeader title="Past games" />
          {past.length === 0 ? (
            <T variant="body" color={colors.textMuted}>Your played rounds will show here.</T>
          ) : (
            past.map((g) => <GameRow key={g.id} game={g} note={g.hostId === ME ? 'Hosted' : `with ${state.golfers[g.hostId]?.firstName}`} />)
          )}

          <SectionHeader title="Settings" />
          <View style={s.list}>
            <SettingRow icon="wallet-outline" label="Credits" value={`${creditBalance(state)} available`} onPress={() => router.push('/credits')} />
            <SettingRow icon="ribbon-outline" label="FindFore Pro" value={state.credits?.pro ? 'Active' : `${PRO_MONTHLY_CREDITS} credits a month for ${PRO_PRICE}`} onPress={() => router.push('/pro')} />
            <SettingRow icon="navigate-outline" label="Location and radius" value={`${me.location.name}, ${me.radiusMiles} miles`} onPress={() => router.push('/profile/edit')} />
            <SettingRow icon="eye-outline" label="Privacy" value={me.showSurname ? 'Full name shown' : 'Surname hidden'} onPress={() => router.push('/profile/edit')} />
            <SettingRow icon="notifications-outline" label="Notifications" onPress={() => router.push('/notifications')} />
            <SettingRow icon="help-circle-outline" label="How FindFore works" onPress={() => setHelp(true)} />
          </View>

          {blocked.length > 0 ? (
            <>
              <SectionHeader title="Blocked golfers" />
              {blocked.map((g) => (
                <Row key={g.id} gap={space.md} style={{ paddingVertical: space.sm }}>
                  <Avatar golfer={g} size={40} />
                  <T variant="bodyStrong" style={{ flex: 1 }}>{g.firstName} {g.lastName}</T>
                  <Button title="Unblock" kind="ghost" size="sm" onPress={() => unblock(g.id)} />
                </Row>
              ))}
            </>
          ) : null}

          <View style={s.demo}>
            <T variant="label" color={colors.textMuted}>Preview build</T>
            <T variant="small" color={colors.textMuted} style={{ marginTop: 4 }}>
              You’re using FindFore with demo golfers and games so every feature can be tried. Nothing is shared with anyone.
            </T>
            <Button
              title="Start again"
              kind="ghost"
              size="sm"
              icon="refresh"
              style={{ alignSelf: 'flex-start', marginTop: space.md }}
              onPress={() => confirm('Start again?', 'This clears your profile, posts and messages and restores the demo.', () => {
                resetDemo();
                router.replace('/welcome');
              })}
            />
          </View>
        </View>
      </ScrollView>
      <Sheet visible={help} onClose={() => setHelp(false)} title="How FindFore works">
        <HowItWorksSteps />
        <Button title="Got it" onPress={() => setHelp(false)} style={{ marginTop: space.xl }} />
      </Sheet>
    </View>
  );
}

function SettingRow({ icon, label, value, onPress }: { icon: IconName; label: string; value?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.setting, pressed && ui.pressed]}>
      <View style={s.settingIcon}>
        <Ionicons name={icon} size={18} color={colors.lime} />
      </View>
      <View style={{ flex: 1 }}>
        <T variant="bodyStrong">{label}</T>
        {value ? <T variant="caption" color={colors.textMuted}>{value}</T> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  list: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: space.lg },
  settingIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  setting: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  demo: { marginTop: space.xxxl, padding: space.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, borderStyle: 'dashed' },
});
