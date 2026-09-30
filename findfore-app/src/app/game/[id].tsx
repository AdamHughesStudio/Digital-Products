import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CourseArt, gameTypeIcon } from '@/components/cards';
import { CreditCoin, useCredits } from '@/components/credits';
import { RoundCheckIn } from '@/components/round-check-in';
import { SafetySheet } from '@/components/safety';
import { useToast } from '@/components/toast';
import { useRequestActions } from '@/lib/actions';
import { haptic } from '@/lib/haptics';
import { Avatar, Button, EmptyState, Field, IconButton, Pill, Row, SectionHeader, Sheet, SheetOption, T, TopBar, styles as ui, type IconName } from '@/components/ui';
import { colors, radius, shadow, space } from '@/constants/theme';
import { courseById } from '@/data/courses';
import { acceptedFor, gameChatId, isFull, isPast, ME, myRequestFor, spacesLeft, useStore } from '@/data/store';
import type { Golfer, JoinRequest } from '@/data/types';
import { dayDiff, displayName, distanceMiles, formatTime, gameTypeLabels, handicapFits, handicapLabel, hcpText, NO_HANDICAP, handicapPrefLabel, longDate, milesLabel, placeLabel, plural, priceLabel, relativeDay } from '@/lib/format';
import { activeLooking } from '@/lib/selectors';

export default function GameDetail() {
  const { id, posted } = useLocalSearchParams<{ id: string; posted?: string }>();
  const insets = useSafeAreaInsets();
  const store = useStore();
  const toast = useToast();
  const { state, me } = store;
  const [menu, setMenu] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const g = state.games[id];
  if (!g || !me) {
    return (
      <View style={ui.screen}>
        <TopBar />
        <EmptyState icon="flag-outline" title="Game not found" body="This game may have been removed." />
      </View>
    );
  }

  const c = courseById(g.courseId);
  const host = state.golfers[g.hostId];
  const d = new Date(g.teeTime);
  const isHost = g.hostId === ME;
  const accepted = acceptedFor(state, g.id);
  const players = [host, ...accepted.map((r) => state.golfers[r.golferId])].filter(Boolean);
  const left = spacesLeft(state, g);
  const full = isFull(state, g);
  const past = isPast(g);
  const mine = myRequestFor(state, g.id);
  const pendingForHost = Object.values(state.requests).filter((r) => r.gameId === g.id && r.status === 'pending' && r.kind === 'request');
  const invitesOut = Object.values(state.requests).filter((r) => r.gameId === g.id && r.status === 'pending' && r.kind === 'invite');
  const chatId = gameChatId(g.id);
  // the eyebrow only says what is worth saying: casual rounds are the norm, so they carry no label
  const label = [g.type !== 'casual' ? gameTypeLabels[g.type] : '', g.cancelled ? 'Cancelled' : past ? 'Played' : full ? 'Full' : ''].filter(Boolean).join('  ·  ');
  const timing = g.cancelled || past ? '' : countdown(d);
  const urgent = !!timing && dayDiff(d, new Date()) <= 1;
  const inChat = !!state.conversations[chatId]?.participantIds.includes(ME);
  const miles = c ? distanceMiles(c, me.location) : 0;
  const fits = handicapFits(g.handicap, me.handicap);

  const share = async () => {
    const link = Platform.OS === 'web' && typeof window !== 'undefined' ? `${window.location.origin}/game/${g.id}` : `https://findfore-app.vercel.app/game/${g.id}`;
    const message = `Fancy a game? ${c?.name ?? 'Golf'}, ${relativeDay(d)} at ${formatTime(d)}. ${g.spacesTotal - accepted.length > 0 ? 'Spaces available on FindFore.' : ''}`.trim();
    try {
      if (Platform.OS === 'web') {
        const nav = navigator as Navigator & { share?: (data: { title?: string; text?: string; url?: string }) => Promise<void> };
        if (nav.share) {
          await nav.share({ title: 'FindFore', text: message, url: link });
        } else {
          await navigator.clipboard.writeText(`${message} ${link}`);
          toast('Link copied. Paste it anywhere to share.', { icon: 'link' });
        }
      } else {
        await Share.share({ message: `${message} ${link}`, url: link });
      }
    } catch {
      // share sheet dismissed
    }
  };

  return (
    <View style={ui.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <View style={[s.heroWrap, { marginTop: insets.top + 6 }]}>
        <CourseArt course={c} height={270}>
          <View style={[s.topBar, { top: 12 }]}>
            <IconButton icon="chevron-back" label="Back" color={colors.onInk} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={s.glass} />
            <Row gap={8}>
              {!g.cancelled && !past ? <IconButton icon="share-outline" label="Share game" color={colors.onInk} onPress={share} style={s.glass} /> : null}
              {!isHost ? <IconButton icon="ellipsis-horizontal" label="More" color={colors.onInk} onPress={() => setMenu(true)} style={s.glass} /> : null}
            </Row>
          </View>
          <View style={[ui.contentWidth, s.hero]}>
            <Row gap={6} style={{ flexWrap: 'wrap' }}>
              {label ? (
                <T variant="label" color={g.cancelled ? '#FF8A7A' : colors.lime} style={s.eyebrow}>{label}</T>
              ) : null}
              {label && timing ? <T variant="label" color={colors.lime} style={s.eyebrow}>·</T> : null}
              {timing ? (
                // a game today or tomorrow is time sensitive, so it gets a clock in amber as a gentle warning
                <Row gap={5}>
                  {urgent ? <Ionicons name="time" size={14} color={AMBER} /> : null}
                  <T variant="label" color={urgent ? AMBER : colors.lime} style={s.eyebrow}>{timing}</T>
                </Row>
              ) : null}
            </Row>
            <T variant="title" color={colors.onInk} style={{ marginTop: space.sm, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 10 }}>{c?.name}</T>
            <T variant="small" color={colors.onInkMuted}>{c ? placeLabel(c) : ''}{isHost ? '' : `  ·  ${milesLabel(miles)} away`}</T>
          </View>
        </CourseArt>
        </View>

        <View style={[ui.contentWidth, ui.padded]}>
          {posted && isHost ? (
            <View style={s.posted}>
              <Ionicons name="checkmark-circle" size={22} color={colors.ink} />
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong" color={colors.ink}>Your game is live</T>
                <T variant="small" color={colors.ink}>Golfers nearby can now request to join. You’ll be notified when they do.</T>
              </View>
            </View>
          ) : null}

          {/* the facts strip: when, who, how much, all in one glance */}
          <View style={[ui.card, s.facts]}>
            <Row gap={0} align="flex-start">
              <Fact icon="calendar" top={relativeDay(d)} bottom={`${longDate(d).split(' ').slice(1).join(' ')} · ${formatTime(d)}`} />
              <View style={s.factDivider} />
              <Fact icon="people" top={full ? 'Full' : `${left} space${left === 1 ? '' : 's'}`} bottom={full ? 'None left' : `${players.length} playing so far`} />
              <View style={s.factDivider} />
              <Fact icon="pricetag" top={priceLabel(g.costPerGolfer)} bottom={g.type === 'member_guest' && g.visitorFee ? `Guests pay ${priceLabel(g.visitorFee)}` : g.type === 'competition' ? 'Entry fee' : 'Paid at the club'} />
            </Row>
            <Row gap={8} style={s.factNote}>
              <Ionicons name={fits ? 'checkmark-circle' : 'alert-circle'} size={17} color={fits ? '#5FA800' : colors.warning} />
              <T variant="small" color={colors.textMuted} style={{ flex: 1 }}>
                {handicapPrefLabel(g.handicap)}{fits ? '. Suits your handicap' : me.handicap >= NO_HANDICAP ? '. The host would like a handicap' : `. Yours is ${handicapLabel(me.handicap)}`}
              </T>
            </Row>
          </View>

          {past && !g.cancelled && (isHost || mine?.status === 'accepted') && !(state.roundsDone ?? []).includes(g.id) ? (
            <View style={{ marginTop: space.md }}>
              <RoundCheckIn game={g} compact />
            </View>
          ) : null}

          {mine?.status === 'pending' && mine.kind === 'request' && !past && !g.cancelled ? (
            <View style={[ui.card, { marginTop: space.md, gap: space.md }]}>
              <T variant="subheading">What happens next</T>
              <NextStep n={1} text={`${host.firstName} reviews your request and your profile.`} />
              <NextStep n={2} text="You’ll get a notification when they accept or decline." />
              <NextStep n={3} text="Once you’re in, a group chat opens so you can sort out the details." />
            </View>
          ) : null}

          {/* everyone in the game, host first, then the open spaces */}
          <View style={[ui.card, { marginTop: space.md, paddingVertical: space.sm }]}>
            <T variant="label" color={colors.textMuted} style={{ paddingTop: space.sm, paddingBottom: 2 }}>Who’s playing</T>
            {players.map((p, i) => (
              <PlayerRow key={p.id} golfer={p} host={p.id === g.hostId} divider={i > 0} />
            ))}
            {!full ? (
              <Row gap={space.md} style={[ui.panelRow, ui.panelDivider]}>
                <View style={s.openSpace}>
                  <Ionicons name="add" size={20} color={colors.textFaint} />
                </View>
                <T variant="body" color={colors.textMuted}>{left === 1 ? '1 open space' : `${left} open spaces`}{isHost ? '' : '. Could be you'}</T>
              </Row>
            ) : null}
          </View>

          {c ? (
            <Pressable onPress={() => router.push(`/club/${c.id}`)} accessibilityRole="button" accessibilityLabel={`About ${c.name}`} style={({ pressed }) => [ui.card, s.clubRow, pressed && ui.pressed]}>
              <View style={s.clubIcon}><Ionicons name="flag" size={16} color={colors.lime} /></View>
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong" numberOfLines={1}>About {c.name}</T>
                <T variant="caption" color={colors.textMuted}>{c.visitorFee ? `Visitors usually pay £${c.visitorFee}` : c.town}  ·  Club profile</T>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Pressable>
          ) : null}

          {g.description ? (
            <View style={[ui.card, { marginTop: space.md }]}>
              <T variant="label" color={colors.textMuted} style={{ marginBottom: 6 }}>From {isHost ? 'you' : host.firstName}</T>
              <T variant="body" color={colors.text}>{g.description}</T>
            </View>
          ) : null}

          {isHost && !g.cancelled && !past ? (
            <>
              <SectionHeader title={`Requests${pendingForHost.length ? ` (${pendingForHost.length})` : ''}`} />
              {pendingForHost.length === 0 ? (
                <T variant="body" color={colors.textMuted}>No requests yet. Invite golfers directly, or sit tight: nearby golfers are seeing your game now.</T>
              ) : (
                <View style={{ gap: space.md }}>
                  {pendingForHost.map((r) => (
                    <HostRequest key={r.id} r={r} />
                  ))}
                </View>
              )}
              {invitesOut.length > 0 ? (
                <T variant="small" color={colors.textMuted} style={{ marginTop: space.md }}>
                  Invited: {invitesOut.map((r) => state.golfers[r.golferId]?.firstName).join(', ')}. Waiting for a reply.
                </T>
              ) : null}
              {!full ? <Button title="Invite golfers" kind="secondary" icon="person-add-outline" size="md" onPress={() => setInviteOpen(true)} style={{ marginTop: space.lg }} /> : null}
              <Button title="Cancel game" kind="ghost" size="md" onPress={() => setConfirmCancel(true)} style={{ marginTop: space.sm }} />
            </>
          ) : null}
        </View>
      </ScrollView>

      {!g.cancelled ? (
        <View style={[ui.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={ui.contentWidth}>
            <Footer
              isHost={isHost}
              past={past}
              full={full}
              mine={mine}
              inChat={inChat}
              onJoin={() => setJoinOpen(true)}
              onChat={() => router.push(`/chat/${chatId}`)}
            />
          </View>
        </View>
      ) : null}

      <JoinSheet visible={joinOpen} onClose={() => setJoinOpen(false)} hostName={host.firstName} gameId={g.id} />
      <InviteSheet visible={inviteOpen} onClose={() => setInviteOpen(false)} gameId={g.id} />
      <SafetySheet golfer={host} visible={menu} onClose={() => setMenu(false)} />
      <Sheet visible={confirmCancel} onClose={() => setConfirmCancel(false)} title="Cancel this game?">
        <T variant="body" color={colors.textMuted}>Everyone playing gets a message in the game chat and pending requests are closed.</T>
        <Row gap={space.sm} style={{ marginTop: space.xl }}>
          <Button title="Keep it" kind="ghost" onPress={() => setConfirmCancel(false)} style={{ flex: 1 }} />
          <Button
            title="Cancel game"
            kind="danger"
            onPress={() => {
              store.cancelGame(g.id);
              haptic.warn();
              toast('Game cancelled. Everyone playing has been told.', { icon: 'close-circle' });
              setConfirmCancel(false);
            }}
            style={{ flex: 1 }}
          />
        </Row>
      </Sheet>
    </View>
  );
}

/** "Tees off today", "Tees off tomorrow", "Tees off in 3 days" */
const AMBER = '#FFC53D';

function countdown(d: Date) {
  const n = dayDiff(d, new Date());
  if (n <= 0) return `Tees off today, ${formatTime(d)}`;
  if (n === 1) return 'Tees off tomorrow';
  return `Tees off in ${n} days`;
}

function NextStep({ n, text }: { n: number; text: string }) {
  return (
    <Row gap={space.md} align="flex-start">
      <View style={s.stepNum}>
        <T variant="smallStrong" color={colors.lime}>{n}</T>
      </View>
      <T variant="body" color={colors.textMuted} style={{ flex: 1 }}>{text}</T>
    </Row>
  );
}

function Footer({ isHost, past, full, mine, inChat, onJoin, onChat }: { isHost: boolean; past: boolean; full: boolean; mine?: JoinRequest; inChat: boolean; onJoin: () => void; onChat: () => void }) {
  const act = useRequestActions();
  const credits = useCredits();
  if (isHost || mine?.status === 'accepted') {
    return (
      <Row gap={space.sm}>
        {!isHost ? (
          <View style={[s.status, { flex: 1 }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.lime} />
            <T variant="bodyStrong" color={colors.onInk}>{past ? 'You played' : 'You’re in'}</T>
          </View>
        ) : null}
        {inChat ? <Button title="Group chat" icon="chatbubble-ellipses" onPress={onChat} style={{ flex: 1 }} /> : <View style={[s.status, { flex: 1 }]}><T variant="small" color={colors.onInkMuted}>Chat opens when someone joins</T></View>}
      </Row>
    );
  }
  if (past) return <View style={s.status}><T variant="bodyStrong" color={colors.onInkMuted}>This game has been played</T></View>;
  if (mine?.status === 'pending' && mine.kind === 'invite') {
    return (
      <View style={{ gap: space.sm }}>
        <CostLine text={credits.available >= 1 ? 'You’ve been invited. Accepting uses 1 credit' : credits.held > 0 ? 'Invited, but your credits are held by pending requests' : 'You’ve been invited, but you need a credit to accept'} />
        <Row gap={space.sm}>
          <Button title="Decline" kind="ghost" onPress={() => act.decline(mine)} style={{ flex: 1 }} />
          {credits.available >= 1 ? (
            <Button title="Accept invite" onPress={() => act.accept(mine)} style={{ flex: 1.4 }} />
          ) : (
            <Button title="Host to earn" kind="dark" icon="add" onPress={() => router.push('/post/game')} style={{ flex: 1.4 }} />
          )}
        </Row>
      </View>
    );
  }
  if (mine?.status === 'pending') {
    return (
      <Row gap={space.sm}>
        <View style={[s.status, { flex: 1.4 }]}>
          <Ionicons name="time-outline" size={20} color={colors.lime} />
          <T variant="bodyStrong" color={colors.onInk}>Request sent</T>
        </View>
        <Button title="Withdraw" kind="ghost" onPress={() => act.withdraw(mine)} style={{ flex: 1 }} />
      </Row>
    );
  }
  if (full) return <Button title="This game is full" disabled />;
  if (mine?.status === 'declined') {
    return (
      <View style={{ gap: space.sm }}>
        <T variant="small" color={colors.textMuted} style={{ textAlign: 'center' }}>The host couldn’t fit you in this time.</T>
        <Button title="Find another game" kind="ghost" onPress={() => router.replace('/search')} />
      </View>
    );
  }
  if (credits.available < 1) {
    return (
      <View style={{ gap: space.sm }}>
        <CostLine text={credits.held > 0 ? `Your credits are held by ${credits.held} pending request${credits.held === 1 ? '' : 's'}` : 'You need 1 credit to join a game'} />
        <Row gap={space.sm}>
          <Button title="Host to earn" kind="dark" icon="add" onPress={() => router.push('/post/game')} style={{ flex: 1 }} />
          <Button title="Get Pro" icon="ribbon" onPress={() => router.push('/pro')} style={{ flex: 1 }} />
        </Row>
      </View>
    );
  }
  return (
    <View style={{ gap: space.sm }}>
      <CostLine text={`Uses 1 credit, only if the host says yes  ·  ${credits.available} free`} />
      <Button title="Request to join" icon="hand-right-outline" onPress={onJoin} />
    </View>
  );
}

function CostLine({ text }: { text: string }) {
  return (
    <Pressable onPress={() => router.push('/credits')} accessibilityRole="button" accessibilityLabel={`${text}. How credits work`}>
      <Row gap={6} style={{ justifyContent: 'center' }}>
        <CreditCoin size={16} />
        <T variant="smallStrong">{text}</T>
      </Row>
    </Pressable>
  );
}

function Fact({ icon, top, bottom }: { icon: IconName; top: string; bottom: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 4 }}>
      <View style={s.factIcon}>
        <Ionicons name={icon} size={15} color={colors.lime} />
      </View>
      <T variant="bodyStrong" numberOfLines={1} style={{ marginTop: space.sm, textAlign: 'center' }}>{top}</T>
      <T variant="caption" color={colors.textMuted} numberOfLines={2} style={{ textAlign: 'center' }}>{bottom}</T>
    </View>
  );
}

function PlayerRow({ golfer, host, divider }: { golfer: Golfer; host?: boolean; divider?: boolean }) {
  const me = golfer.id === ME;
  return (
    <Pressable onPress={() => router.push(me ? '/profile' : `/golfer/${golfer.id}`)} accessibilityRole="button" accessibilityLabel={`${me ? 'You' : displayName(golfer)}${host ? ', hosting' : ''}. ${hcpText(golfer.handicap)}`} style={({ pressed }) => [ui.panelRow, divider && ui.panelDivider, pressed && ui.pressed]}>
      <Avatar golfer={golfer} size={44} />
      <View style={{ flex: 1 }}>
        <Row gap={6}>
          <T variant="bodyStrong">{me ? 'You' : displayName(golfer)}</T>
          {host ? <Pill label="Host" tone="lime" /> : null}
        </Row>
        <Row gap={4}>
          <T variant="caption" color={colors.textMuted}>{hcpText(golfer.handicap)}{golfer.handicapVerified ? ' · verified' : ''}  ·  {plural(golfer.gamesPlayed, 'game')}</T>
          <Ionicons name="star" size={11} color={colors.textMuted} />
          <T variant="caption" color={colors.textMuted}>{golfer.rating.toFixed(1)}</T>
        </Row>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

function HostRequest({ r }: { r: JoinRequest }) {
  const { state } = useStore();
  const act = useRequestActions();
  const who = state.golfers[r.golferId];
  return (
    <View style={[ui.card, { gap: space.md }]}>
      <Pressable onPress={() => router.push(`/golfer/${who.id}`)}>
        <Row gap={space.md}>
          <Avatar golfer={who} size={46} />
          <View style={{ flex: 1 }}>
            <T variant="bodyStrong">{displayName(who)}</T>
            <T variant="caption" color={colors.textMuted}>{hcpText(who.handicap)}  ·  {plural(who.gamesPlayed, 'game')}  ·  {who.rating.toFixed(1)} rating</T>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
        </Row>
      </Pressable>
      {r.message ? <T variant="small" color={colors.textMuted}>{r.message}</T> : null}
      <Row gap={space.sm}>
        <Button title="Decline" kind="ghost" size="md" onPress={() => act.decline(r)} style={{ flex: 1 }} />
        <Button title="Accept" size="md" onPress={() => act.accept(r)} style={{ flex: 1 }} />
      </Row>
    </View>
  );
}

function JoinSheet({ visible, onClose, hostName, gameId }: { visible: boolean; onClose: () => void; hostName: string; gameId: string }) {
  const act = useRequestActions();
  const [msg, setMsg] = useState('');
  return (
    <Sheet visible={visible} onClose={onClose} title={`Ask ${hostName} for a space`}>
      <Field value={msg} onChangeText={setMsg} placeholder={`Hi ${hostName}, I’d love to join. Happy to fit in with whatever you’re playing.`} multiline maxLength={240} />
      <T variant="caption" color={colors.textFaint} style={{ marginTop: space.sm }}>Your profile and handicap are shared with the host. 1 credit is held while you wait and only used if they accept. Messaging opens once you’re in.</T>
      <Button
        title="Send request"
        style={{ marginTop: space.xl }}
        onPress={() => {
          act.request(gameId, msg);
          setMsg('');
          onClose();
        }}
      />
    </Sheet>
  );
}

function InviteSheet({ visible, onClose, gameId }: { visible: boolean; onClose: () => void; gameId: string }) {
  const { state, me, invite } = useStore();
  const toast = useToast();
  const g = state.games[gameId];
  const candidates = useMemo(() => {
    if (!me) return [];
    const taken = new Set(Object.values(state.requests).filter((r) => r.gameId === gameId && (r.status === 'pending' || r.status === 'accepted')).map((r) => r.golferId));
    const looking = new Set(activeLooking(state).map((l) => l.golferId));
    return Object.values(state.golfers)
      .filter((x) => x.id !== ME && x.id !== g.hostId && !state.blockedIds.includes(x.id) && !taken.has(x.id))
      .map((x) => ({ x, saved: state.savedGolferIds.includes(x.id), looking: looking.has(x.id), miles: distanceMiles(x.location, me.location) }))
      .sort((a, b) => Number(b.saved) - Number(a.saved) || Number(b.looking) - Number(a.looking) || a.miles - b.miles)
      .slice(0, 8);
  }, [state, me, gameId, g.hostId]);

  return (
    <Sheet visible={visible} onClose={onClose} title="Invite golfers">
      <ScrollView style={{ maxHeight: 440 }}>
        {candidates.length === 0 ? <T variant="body" color={colors.textMuted}>Everyone nearby has already been invited.</T> : null}
        {candidates.map(({ x, saved, looking, miles }) => (
          <SheetOption
            key={x.id}
            icon={saved ? 'star' : looking ? 'search' : 'person-outline'}
            label={displayName(x)}
            detail={`${hcpText(x.handicap)}  ·  ${saved ? 'In My Golfers' : looking ? 'Looking for a game' : milesLabel(miles) + ' away'}`}
            onPress={() => {
              invite(gameId, x.id);
              haptic.success();
              toast(`Invite sent to ${x.firstName}`, { icon: 'paper-plane' });
            }}
          />
        ))}
      </ScrollView>
      <Button title="Done" kind="ghost" onPress={onClose} style={{ marginTop: space.md }} />
    </Sheet>
  );
}

const s = StyleSheet.create({
  topBar: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', justifyContent: 'space-between', zIndex: 2 },
  glass: { backgroundColor: 'rgba(11,11,11,0.55)', borderColor: 'rgba(255,255,255,0.12)' },
  hero: { position: 'absolute', bottom: space.lg, left: 0, right: 0, paddingHorizontal: space.lg },
  heroWrap: { marginHorizontal: space.md, borderRadius: radius.panel, overflow: 'hidden', backgroundColor: colors.ink },
  eyebrow: { letterSpacing: 1.4, textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  posted: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', backgroundColor: colors.lime, padding: space.lg, borderRadius: radius.panel, marginTop: space.lg },
  clubRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.md, paddingVertical: space.md },
  clubIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  facts: { marginTop: space.lg, paddingHorizontal: space.md, paddingTop: space.lg, paddingBottom: space.md },
  factIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  factDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.border },
  factNote: { marginTop: space.md, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  openSpace: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.ink, borderRadius: radius.pill, paddingVertical: 14, paddingHorizontal: 16 },
});
