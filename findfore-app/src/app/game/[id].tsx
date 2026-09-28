import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CourseArt, gameTypeIcon } from '@/components/cards';
import { SafetySheet } from '@/components/safety';
import { Avatar, Button, EmptyState, Field, IconButton, Pill, Row, SectionHeader, Sheet, SheetOption, T, TopBar, styles as ui, type IconName } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
import { courseById } from '@/data/courses';
import { acceptedFor, gameChatId, isFull, isPast, ME, myRequestFor, spacesLeft, useStore } from '@/data/store';
import type { Golfer, JoinRequest } from '@/data/types';
import { displayName, distanceMiles, formatTime, gameTypeLabels, handicapFits, handicapLabel, handicapPrefLabel, longDate, milesLabel, placeLabel, plural, priceLabel, relativeDay } from '@/lib/format';
import { activeLooking } from '@/lib/selectors';

export default function GameDetail() {
  const { id, posted } = useLocalSearchParams<{ id: string; posted?: string }>();
  const insets = useSafeAreaInsets();
  const store = useStore();
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
  const inChat = !!state.conversations[chatId]?.participantIds.includes(ME);
  const miles = c ? distanceMiles(c, me.location) : 0;
  const fits = handicapFits(g.handicap, me.handicap);

  return (
    <View style={ui.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <CourseArt course={c} height={250 + insets.top}>
          <View style={[s.topBar, { top: insets.top + 6 }]}>
            <IconButton icon="chevron-back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={s.glass} />
            {!isHost ? <IconButton icon="ellipsis-horizontal" label="More" onPress={() => setMenu(true)} style={s.glass} /> : null}
          </View>
          <View style={[ui.contentWidth, s.hero]}>
            <Row gap={6}>
              <Pill label={gameTypeLabels[g.type]} icon={gameTypeIcon[g.type]} />
              {g.cancelled ? <Pill label="Cancelled" tone="danger" /> : past ? <Pill label="Played" tone="muted" /> : full ? <Pill label="Full" tone="muted" /> : null}
            </Row>
            <T variant="title" style={{ marginTop: space.sm }}>{c?.name}</T>
            <T variant="small" color={colors.textMuted}>{c ? placeLabel(c) : ''}{isHost ? '' : `  ·  ${milesLabel(miles)} away`}</T>
          </View>
        </CourseArt>

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

          <View style={s.grid}>
            <Info icon="calendar" top={relativeDay(d)} bottom={`${longDate(d)} at ${formatTime(d)}`} />
            <Info icon="people" top={full ? 'Full' : `${left} of ${g.spacesTotal} space${g.spacesTotal === 1 ? '' : 's'} left`} bottom={`${players.length} playing so far`} />
            <Info
              icon="pricetag"
              top={priceLabel(g.costPerGolfer)}
              bottom={g.type === 'member_guest' && g.visitorFee ? `Guest rate. Visitors usually pay ${priceLabel(g.visitorFee)}` : g.type === 'competition' ? 'Entry fee per golfer' : 'Per golfer, paid at the club'}
            />
            <Info icon="golf" top={handicapPrefLabel(g.handicap)} bottom={fits ? 'Suits your handicap' : `Your handicap is ${handicapLabel(me.handicap)}`} warn={!fits} />
          </View>

          {g.description ? (
            <>
              <SectionHeader title="About this game" />
              <T variant="body" color={colors.textMuted}>{g.description}</T>
            </>
          ) : null}

          <SectionHeader title="Host" />
          <Pressable onPress={() => router.push(isHost ? '/profile' : `/golfer/${host.id}`)} style={({ pressed }) => [ui.card, s.hostCard, pressed && ui.pressed]}>
            <Avatar golfer={host} size={56} />
            <View style={{ flex: 1 }}>
              <T variant="subheading">{isHost ? 'You' : displayName(host)}</T>
              <T variant="small" color={colors.textMuted}>
                {handicapLabel(host.handicap)} HCP{host.handicapVerified ? ' (verified)' : ''}  ·  {plural(host.gamesPlayed, 'game')}
              </T>
              <Row gap={4} style={{ marginTop: 2 }}>
                <Ionicons name="star" size={13} color={colors.lime} />
                <T variant="caption" color={colors.textMuted}>{host.rating.toFixed(1)}{host.homeClub && host.showHomeClub ? `  ·  ${host.homeClub}` : ''}</T>
              </Row>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </Pressable>

          <SectionHeader title={`Players (${players.length}/${g.spacesTotal + 1})`} />
          <View style={{ gap: space.md }}>
            {players.map((p) => (
              <PlayerRow key={p.id} golfer={p} tag={p.id === g.hostId ? 'Host' : undefined} />
            ))}
            {Array.from({ length: left }).map((_, i) => (
              <Row key={i} gap={space.md}>
                <View style={s.openSpace}>
                  <Ionicons name="add" size={20} color={colors.textFaint} />
                </View>
                <T variant="body" color={colors.textFaint}>Open space</T>
              </Row>
            ))}
          </View>

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
              setConfirmCancel(false);
            }}
            style={{ flex: 1 }}
          />
        </Row>
      </Sheet>
    </View>
  );
}

function Footer({ isHost, past, full, mine, inChat, onJoin, onChat }: { isHost: boolean; past: boolean; full: boolean; mine?: JoinRequest; inChat: boolean; onJoin: () => void; onChat: () => void }) {
  const { respond, withdrawRequest } = useStore();
  if (isHost || mine?.status === 'accepted') {
    return (
      <Row gap={space.sm}>
        {!isHost ? (
          <View style={[s.status, { flex: 1 }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.lime} />
            <T variant="bodyStrong">{past ? 'You played' : 'You’re in'}</T>
          </View>
        ) : null}
        {inChat ? <Button title="Group chat" icon="chatbubble-ellipses" onPress={onChat} style={{ flex: 1 }} /> : <View style={[s.status, { flex: 1 }]}><T variant="small" color={colors.textMuted}>Chat opens when someone joins</T></View>}
      </Row>
    );
  }
  if (past) return <View style={s.status}><T variant="bodyStrong" color={colors.textMuted}>This game has been played</T></View>;
  if (mine?.status === 'pending' && mine.kind === 'invite') {
    return (
      <View style={{ gap: space.sm }}>
        <T variant="smallStrong" color={colors.lime} style={{ textAlign: 'center' }}>You’ve been invited to this game</T>
        <Row gap={space.sm}>
          <Button title="Decline" kind="ghost" onPress={() => respond(mine.id, false)} style={{ flex: 1 }} />
          <Button title="Accept invite" onPress={() => respond(mine.id, true)} style={{ flex: 1.4 }} />
        </Row>
      </View>
    );
  }
  if (mine?.status === 'pending') {
    return (
      <Row gap={space.sm}>
        <View style={[s.status, { flex: 1.4 }]}>
          <Ionicons name="time-outline" size={20} color={colors.lime} />
          <T variant="bodyStrong">Request sent</T>
        </View>
        <Button title="Withdraw" kind="ghost" onPress={() => withdrawRequest(mine.id)} style={{ flex: 1 }} />
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
  return <Button title="Request to join" icon="hand-right-outline" onPress={onJoin} />;
}

function Info({ icon, top, bottom, warn }: { icon: IconName; top: string; bottom: string; warn?: boolean }) {
  return (
    <View style={s.info}>
      <Ionicons name={icon} size={20} color={warn ? colors.warning : colors.lime} />
      <T variant="bodyStrong" style={{ marginTop: space.sm }}>{top}</T>
      <T variant="caption" color={colors.textMuted}>{bottom}</T>
    </View>
  );
}

function PlayerRow({ golfer, tag }: { golfer: Golfer; tag?: string }) {
  const me = golfer.id === ME;
  return (
    <Pressable onPress={() => router.push(me ? '/profile' : `/golfer/${golfer.id}`)}>
      <Row gap={space.md}>
        <Avatar golfer={golfer} size={44} />
        <View style={{ flex: 1 }}>
          <T variant="bodyStrong">{me ? 'You' : displayName(golfer)}</T>
          <T variant="caption" color={colors.textMuted}>{handicapLabel(golfer.handicap)} HCP  ·  {plural(golfer.gamesPlayed, 'game')}</T>
        </View>
        {tag ? <Pill label={tag} tone="lime" /> : null}
      </Row>
    </Pressable>
  );
}

function HostRequest({ r }: { r: JoinRequest }) {
  const { state, respond } = useStore();
  const who = state.golfers[r.golferId];
  return (
    <View style={[ui.card, { gap: space.md }]}>
      <Pressable onPress={() => router.push(`/golfer/${who.id}`)}>
        <Row gap={space.md}>
          <Avatar golfer={who} size={46} />
          <View style={{ flex: 1 }}>
            <T variant="bodyStrong">{displayName(who)}</T>
            <T variant="caption" color={colors.textMuted}>{handicapLabel(who.handicap)} HCP  ·  {plural(who.gamesPlayed, 'game')}  ·  {who.rating.toFixed(1)} rating</T>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
        </Row>
      </Pressable>
      {r.message ? <T variant="small" color={colors.textMuted}>{r.message}</T> : null}
      <Row gap={space.sm}>
        <Button title="Decline" kind="ghost" size="md" onPress={() => respond(r.id, false)} style={{ flex: 1 }} />
        <Button title="Accept" size="md" onPress={() => respond(r.id, true)} style={{ flex: 1 }} />
      </Row>
    </View>
  );
}

function JoinSheet({ visible, onClose, hostName, gameId }: { visible: boolean; onClose: () => void; hostName: string; gameId: string }) {
  const { requestToJoin } = useStore();
  const [msg, setMsg] = useState('');
  return (
    <Sheet visible={visible} onClose={onClose} title={`Ask ${hostName} for a space`}>
      <Field value={msg} onChangeText={setMsg} placeholder={`Hi ${hostName}, I’d love to join. Happy to fit in with whatever you’re playing.`} multiline maxLength={240} />
      <T variant="caption" color={colors.textFaint} style={{ marginTop: space.sm }}>Your profile and handicap are shared with the host. Messaging opens once they accept.</T>
      <Button
        title="Send request"
        style={{ marginTop: space.xl }}
        onPress={() => {
          requestToJoin(gameId, msg);
          setMsg('');
          onClose();
        }}
      />
    </Sheet>
  );
}

function InviteSheet({ visible, onClose, gameId }: { visible: boolean; onClose: () => void; gameId: string }) {
  const { state, me, invite } = useStore();
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
            detail={`${handicapLabel(x.handicap)} HCP  ·  ${saved ? 'In My Golfers' : looking ? 'Looking for a game' : milesLabel(miles) + ' away'}`}
            onPress={() => invite(gameId, x.id)}
          />
        ))}
      </ScrollView>
      <Button title="Done" kind="ghost" onPress={onClose} style={{ marginTop: space.md }} />
    </Sheet>
  );
}

const s = StyleSheet.create({
  topBar: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', justifyContent: 'space-between', zIndex: 2 },
  glass: { backgroundColor: 'rgba(11,11,11,0.6)' },
  hero: { position: 'absolute', bottom: space.lg, left: 0, right: 0, paddingHorizontal: space.lg },
  posted: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', backgroundColor: colors.lime, padding: space.lg, borderRadius: radius.lg, marginTop: space.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.lg },
  info: { width: '48.8%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.md },
  hostCard: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  openSpace: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.surfaceRaised, borderRadius: radius.pill, paddingVertical: 14, paddingHorizontal: 16 },
});
