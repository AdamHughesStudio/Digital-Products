import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameCard } from '@/components/cards';
import { CreditCoin } from '@/components/credits';
import { HowItWorksSteps } from '@/components/how-it-works';
import { GameRow, ProfileHeader } from '@/components/profile';
import { Avatar, Button, Row, SectionHeader, Sheet, T, styles as ui, type IconName } from '@/components/ui';
import { colors, hairline, radius, shadowSoft, space } from '@/constants/theme';
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
  const pro = !!state.credits?.pro;
  const credits = creditBalance(state);

  return (
    <View style={ui.screen}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <View style={[ui.contentWidth, ui.padded]}>
          <Row style={{ justifyContent: 'space-between', marginBottom: space.lg }}>
            <T variant="title" accessibilityRole="header">Profile</T>
          </Row>
          <ProfileHeader golfer={me} self pro={pro} onEdit={() => router.push('/profile/edit')} />

          <Row gap={space.sm} style={{ marginTop: space.md }}>
            <Tile onPress={() => router.push('/credits')} label={`${credits} credit${credits === 1 ? '' : 's'}`} detail="Tap for history"><CreditCoin size={22} /></Tile>
            <Tile onPress={() => router.push('/calendar')} label="Calendar" detail={upcoming.length ? `${upcoming.length} coming up` : 'Nothing booked'} icon="calendar" />
            <Tile onPress={() => router.push('/pro')} label={pro ? 'Pro' : 'Get Pro'} detail={pro ? 'Active' : `${PRO_PRICE} a month`} icon="ribbon" accent={!pro} />
          </Row>

          <SectionHeader title="Upcoming games" action={upcoming.length ? 'Calendar' : undefined} onAction={() => router.push('/calendar')} />
          {upcoming.length === 0 ? (
            <T variant="body" color={colors.textMuted}>Nothing booked yet. Find a game on Home or post your own.</T>
          ) : (
            upcoming.map((g) => <GameCard key={g.id} game={g} compact />)
          )}

          <SectionHeader title="My golfers" />
          {saved.length === 0 ? (
            <T variant="body" color={colors.textMuted}>Save golfers you enjoy playing with and they’ll appear here, ready to invite again.</T>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.lg }}>
              {saved.map((g) => (
                <Pressable key={g.id} onPress={() => router.push(`/golfer/${g.id}`)} accessibilityRole="button" accessibilityLabel={`${g.firstName}, saved golfer`} style={({ pressed }) => [{ alignItems: 'center', width: 72 }, pressed && ui.pressed]}>
                  <Avatar golfer={g} size={60} />
                  <T variant="smallStrong" numberOfLines={1} style={{ marginTop: 6 }}>{g.firstName}</T>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {past.length > 0 ? (
            <>
              <SectionHeader title="Past games" />
              <View style={ui.panel}>
                {past.map((g, i) => (
                  <View key={g.id} style={i > 0 ? ui.panelDivider : undefined}>
                    <GameRow game={g} note={g.hostId === ME ? 'Hosted' : `with ${state.golfers[g.hostId]?.firstName}`} />
                  </View>
                ))}
              </View>
            </>
          ) : null}

          <SectionHeader title="Settings" />
          <View style={ui.panel}>
            <SettingRow icon="navigate-outline" label="Location and radius" value={`${me.location.name}, ${me.radiusMiles} miles`} onPress={() => router.push('/profile/edit')} />
            <SettingRow icon="eye-outline" label="Privacy" value={me.showSurname ? 'Full name shown' : 'Surname hidden'} onPress={() => router.push('/profile/edit')} divider />
            <SettingRow icon="notifications-outline" label="Notifications" onPress={() => router.push('/notifications')} divider />
            <SettingRow icon="ribbon-outline" label="FindFore Pro" value={pro ? 'Active' : `${PRO_MONTHLY_CREDITS} credits a month for ${PRO_PRICE}`} onPress={() => router.push('/pro')} divider />
            <SettingRow icon="help-circle-outline" label="How FindFore works" onPress={() => setHelp(true)} divider />
          </View>

          {blocked.length > 0 ? (
            <>
              <SectionHeader title="Blocked golfers" />
              <View style={ui.panel}>
                {blocked.map((g, i) => (
                  <Row key={g.id} gap={space.md} style={[ui.panelRow, i > 0 && ui.panelDivider]}>
                    <Avatar golfer={g} size={40} />
                    <T variant="bodyStrong" style={{ flex: 1 }}>{g.firstName} {g.lastName}</T>
                    <Button title="Unblock" kind="ghost" size="sm" onPress={() => unblock(g.id)} />
                  </Row>
                ))}
              </View>
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

function Tile({ icon, label, detail, onPress, accent, children }: { icon?: IconName; label: string; detail: string; onPress: () => void; accent?: boolean; children?: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}. ${detail}`} style={({ pressed }) => [s.tile, pressed && ui.pressed]}>
      <View style={[s.tileIcon, accent && { backgroundColor: colors.lime }]}>
        {children ?? <Ionicons name={icon!} size={18} color={accent ? colors.ink : colors.lime} />}
      </View>
      <T variant="smallStrong" numberOfLines={1} style={{ marginTop: space.sm }}>{label}</T>
      <T variant="caption" color={colors.textMuted} numberOfLines={1}>{detail}</T>
    </Pressable>
  );
}

function SettingRow({ icon, label, value, onPress, divider }: { icon: IconName; label: string; value?: string; onPress: () => void; divider?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [ui.panelRow, divider && ui.panelDivider, pressed && ui.pressed]}>
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
  tile: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: hairline, padding: space.md, ...shadowSoft },
  tileIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  settingIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  demo: { marginTop: space.xxxl, padding: space.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, borderStyle: 'dashed' },
});
