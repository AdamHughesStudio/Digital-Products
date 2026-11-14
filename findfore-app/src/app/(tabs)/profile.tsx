import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameCard } from '@/components/cards';
import { AlertsSheet } from '@/components/alerts';
import { useAlerts } from '@/data/events';
import { useFriends } from '@/data/friends';
import { HowItWorksSteps } from '@/components/how-it-works';
import { GameRow, ProfileHeader } from '@/components/profile';
import { Avatar, Button, Row, SectionHeader, Sheet, T, styles as ui, type IconName } from '@/components/ui';
import { colors, hair, hairline, radius, shadowSoft, space } from '@/constants/theme';
import { SITE_HOST } from '@/constants/site';
import { isPast, ME, myGames, useStore } from '@/data/store';
import { useToast } from '@/components/toast';
import { clearAccount } from '@/lib/account';
import { useSession } from '@/lib/cloud';
import { shareMyProfile } from '@/lib/invite';
import { supabase } from '@/lib/supabase';

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
  const [accountSheet, setAccountSheet] = useState<'signout' | 'delete' | null>(null);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const alerts = useAlerts();
  const friends = useFriends();
  const toast = useToast();
  const session = useSession();
  const [leaving, setLeaving] = useState(false);
  // admins see a way into the competition leads to check
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!session) return setIsAdmin(false);
    let live = true;
    supabase.rpc('is_admin').then(({ data }) => live && setIsAdmin(data === true));
    return () => {
      live = false;
    };
  }, [session]);
  if (!me) return null;
  const invite = async () => {
    if ((await shareMyProfile(me)) === 'copied') toast('Your profile link is copied. Paste it to your golf friends.', { icon: 'link' });
  };

  const games = myGames(state);
  const upcoming = games.filter((g) => !isPast(g)).sort((a, b) => a.teeTime.localeCompare(b.teeTime));
  const past = games.filter(isPast).sort((a, b) => b.teeTime.localeCompare(a.teeTime));
  const saved = friends.friends.map((id) => state.golfers[id]).filter(Boolean);
  const blocked = state.blockedIds.map((id) => state.golfers[id]).filter(Boolean);

  return (
    <View style={ui.screen}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <View style={[ui.contentWidth, ui.padded]}>
          <Row style={{ justifyContent: 'space-between', marginBottom: space.lg }}>
            <T variant="display">Profile</T>
          </Row>
          <ProfileHeader golfer={me} self onEdit={() => router.push('/profile/edit')} onShare={invite} />

          <View style={{ marginTop: space.sm }}>
            <Tile onPress={() => router.push('/season')} label="Calendar" detail={upcoming.length ? `${upcoming.length} coming up` : 'Nothing booked'} icon="calendar-outline" />
            <Tile onPress={() => router.push('/friends')} label="Friends" detail={saved.length ? `${saved.length} friend${saved.length === 1 ? '' : 's'}` : 'Find golfers'} icon="people-outline" divider />
          </View>

          <SectionHeader title="Upcoming games" action={upcoming.length ? 'Calendar' : undefined} onAction={() => router.push('/season')} />
          {upcoming.length === 0 ? (
            <T variant="body" color={colors.textMuted}>Nothing booked yet. Find a game on Home or post your own.</T>
          ) : (
            upcoming.map((g) => <GameCard key={g.id} game={g} compact />)
          )}

          <SectionHeader title="Friends" action="See all" onAction={() => router.push('/friends')} />
          {saved.length === 0 ? (
            <T variant="body" color={colors.textMuted}>Add golfers you’ve played with as friends and they’ll appear here, ready to invite again.</T>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.lg }}>
              {saved.map((g) => (
                <Pressable key={g.id} onPress={() => router.push(`/golfer/${g.id}`)} accessibilityRole="button" accessibilityLabel={`${g.firstName}, friend`} style={({ pressed }) => [{ alignItems: 'center', width: 64 }, pressed && ui.pressed]}>
                  <Avatar golfer={g} size={56} />
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
            <SettingRow icon="person-add-outline" label="Invite friends to PlusFore" value={`Share your link, ${SITE_HOST}/u/${me.username}`} onPress={invite} />
            <SettingRow divider icon="navigate-outline" label="Location and radius" value={`${me.location.name}, ${me.radiusMiles} miles`} onPress={() => router.push('/profile/edit')} />
            <SettingRow icon="eye-outline" label="Privacy" value={me.showSurname ? 'Full name shown' : 'Surname hidden'} onPress={() => router.push('/profile/edit')} divider />
            <SettingRow icon="mail-unread-outline" label="Event alerts" value={alerts.length ? `${alerts.length} alert${alerts.length === 1 ? '' : 's'} emailing you new events` : 'Get emailed when new events match a search'} onPress={() => setAlertsOpen(true)} divider />
            <SettingRow icon="notifications-outline" label="Notification settings" onPress={() => router.push('/settings/notifications')} divider />
            <SettingRow icon="help-circle-outline" label="How PlusFore works" onPress={() => setHelp(true)} divider />
            {isAdmin ? <SettingRow icon="shield-checkmark-outline" label="Competition leads" value="Check and publish competitions" onPress={() => router.push('/admin/leads')} divider /> : null}
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

          <SectionHeader title="Account" />
          <View style={ui.panel}>
            <SettingRow icon="log-out-outline" label="Sign out" onPress={() => setAccountSheet('signout')} />
            <SettingRow icon="trash-outline" label="Delete account" value="Removes your profile, games and messages" onPress={() => setAccountSheet('delete')} divider />
          </View>

          <View style={s.demo}>
            <T variant="caption" color={colors.textFaint}>
              Preview build.{' '}
              {session
                ? 'Your profile and photo are saved to your account. The golfers, games and messages around you are still demo ones while we connect them up.'
                : 'You’re using PlusFore with demo golfers and games so every feature can be tried. Nothing is shared with anyone.'}
            </T>
            {session ? null : <Pressable
              accessibilityRole="button"
              hitSlop={10}
              style={({ pressed }) => [{ alignSelf: 'flex-start', marginTop: space.sm }, pressed && ui.pressed]}
              onPress={() => confirm('Start again?', 'This clears your profile, posts and messages and restores the demo.', () => {
                resetDemo();
                router.replace('/welcome');
              })}>
              <T variant="smallStrong" color={colors.sageDeep}>Start again</T>
            </Pressable>}
          </View>
        </View>
      </ScrollView>
      <AlertsSheet visible={alertsOpen} onClose={() => setAlertsOpen(false)} />
      <Sheet visible={accountSheet !== null} onClose={() => setAccountSheet(null)} title={accountSheet === 'delete' ? 'Delete your account?' : 'Sign out?'}>
        <T variant="body" color={colors.textMuted}>
          {accountSheet === 'delete'
            ? 'Your profile, games, friends and messages are removed for good, and golfers can no longer find you. This can’t be undone.'
            : session
              ? 'Your profile stays safe online. Sign back in any time with your email.'
              : 'You’re using the demo profile, so signing out clears it and takes you back to the start.'}
        </T>
        <Row gap={space.sm} style={{ marginTop: space.xl }}>
          <Button title="Not now" kind="ghost" onPress={() => setAccountSheet(null)} style={{ flex: 1 }} />
          <Button title={accountSheet === 'delete' ? 'Delete' : 'Sign out'} kind="danger" loading={leaving}
            onPress={async () => {
              setLeaving(true);
              const r = await clearAccount(resetDemo, accountSheet ?? 'signout');
              setLeaving(false);
              if (!r.ok) toast(r.error, { icon: 'alert-circle-outline' });
              else setAccountSheet(null);
            }} style={{ flex: 1 }} />
        </Row>
      </Sheet>
      <Sheet visible={help} onClose={() => setHelp(false)} title="How PlusFore works">
        <HowItWorksSteps />
        <Button title="Got it" onPress={() => setHelp(false)} style={{ marginTop: space.xl }} />
      </Sheet>
    </View>
  );
}

/** A shortcut under the header: where it goes at the left, how things stand at the right */
function Tile({ icon, label, detail, onPress, divider }: { icon: IconName; label: string; detail: string; onPress: () => void; divider?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}. ${detail}`} style={({ pressed }) => [s.tile, divider && s.tileDivider, pressed && ui.pressed]}>
      <Ionicons name={icon} size={20} color={colors.text} />
      <T variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>{label}</T>
      <T variant="small" color={colors.textMuted} tabular numberOfLines={1}>{detail}</T>
      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
    </Pressable>
  );
}

function SettingRow({ icon, label, value, onPress, divider }: { icon: IconName; label: string; value?: string; onPress: () => void; divider?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [ui.panelRow, divider && ui.panelDivider, pressed && ui.pressed]}>
      <Ionicons name={icon} size={20} color={colors.text} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <T variant="bodyStrong" numberOfLines={1}>{label}</T>
        {value ? <T variant="small" color={colors.textMuted} numberOfLines={2}>{value}</T> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  tile: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52 },
  tileDivider: { borderTopWidth: hair, borderTopColor: colors.borderStrong, borderBottomWidth: hair, borderBottomColor: colors.borderStrong },
  demo: { marginTop: space.xxxl },
});
