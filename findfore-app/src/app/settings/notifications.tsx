import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ToggleRow } from '@/components/form';
import { useToast } from '@/components/toast';
import { Button, Screen, SectionHeader, T, TopBar, styles as ui } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
import { setNotificationPref, useNotificationPrefs, type NotificationPrefs } from '@/data/notification-prefs';
import { haptic } from '@/lib/haptics';
import { pushState, sendTestPush, turnOffPush, turnOnPush, type PushState } from '@/lib/push';

const PUSH: { key: keyof NotificationPrefs; label: string; detail: string }[] = [
  { key: 'gameRequests', label: 'Game requests and replies', detail: 'Someone asks to join your game, or a host answers you' },
  { key: 'messages', label: 'Messages', detail: 'New messages from friends and game chats' },
  { key: 'friendRequests', label: 'Friend requests', detail: 'When a golfer adds you, or accepts your request' },
  { key: 'gameReminders', label: 'Game reminders', detail: 'The day before you play' },
  { key: 'entriesOpening', label: 'Entries opening', detail: 'For competitions you’ve saved' },
  { key: 'friendsInterested', label: 'Friends’ competitions', detail: 'When a friend saves a competition you’ve saved too' },
];

const COPY: Record<PushState, { title: string; body: string }> = {
  on: { title: 'Notifications are on', body: 'This phone will get PlusFore notifications on the lock screen.' },
  off: { title: 'Turn on notifications', body: 'Hear the moment someone asks to join your game, replies to you or messages you.' },
  blocked: { title: 'Notifications are blocked', body: 'Turn them on in your iPhone’s Settings, then Notifications, then PlusFore.' },
  'needs-home-screen': { title: 'Add PlusFore to your Home Screen', body: 'On iPhone, notifications work when PlusFore is opened from its Home Screen icon. In Safari tap Share, then Add to Home Screen.' },
  unsupported: { title: 'Not available here', body: 'This browser can’t receive notifications. Open PlusFore from your Home Screen on an up to date iPhone.' },
};

export default function NotificationSettings() {
  const prefs = useNotificationPrefs();
  const toast = useToast();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    pushState().then(setState).catch(() => setState('unsupported'));
  }, []);

  const turnOn = async () => {
    setBusy(true);
    try {
      const next = await turnOnPush();
      setState(next);
      if (next === 'on') {
        haptic.success();
        toast('Notifications are on', { icon: 'notifications' });
      }
    } catch {
      toast('Couldn’t turn on notifications', { icon: 'alert-circle' });
    }
    setBusy(false);
  };
  const turnOff = async () => {
    setState(await turnOffPush());
    toast('Notifications are off on this phone', { icon: 'notifications-off-outline' });
  };
  const test = async () => {
    setBusy(true);
    const r = await sendTestPush();
    setBusy(false);
    toast(r.ok ? 'Sent. It should arrive in a few seconds' : r.error ?? 'Couldn’t send', { icon: r.ok ? 'paper-plane' : 'alert-circle' });
  };

  const copy = state ? COPY[state] : null;

  return (
    <View style={ui.screen}>
      <TopBar title="Notifications" />
      <Screen>
        {copy ? (
          <View style={[s.card, state === 'on' && s.cardOn]}>
            <View style={s.icon}>
              <Ionicons name={state === 'on' ? 'notifications' : state === 'blocked' ? 'notifications-off' : 'notifications-outline'} size={20} color={colors.ink} />
            </View>
            <T variant="subheading" style={{ marginTop: space.md }}>{copy.title}</T>
            <T variant="small" color={colors.textMuted} style={{ marginTop: 4 }}>{copy.body}</T>
            {state === 'off' ? <Button title="Turn on notifications" icon="notifications" loading={busy} onPress={turnOn} style={{ marginTop: space.lg }} /> : null}
            {state === 'on' ? (
              <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.lg }}>
                <Button title="Send a test" kind="dark" icon="paper-plane-outline" size="md" loading={busy} onPress={test} style={{ flex: 1 }} />
                <Button title="Turn off" kind="ghost" size="md" onPress={turnOff} style={{ flex: 1 }} />
              </View>
            ) : null}
          </View>
        ) : null}

        <SectionHeader title="What to tell me about" />
        <View style={ui.panel}>
          {PUSH.map((p, i) => (
            <View key={p.key} style={i > 0 ? ui.panelDivider : undefined}>
              <ToggleRow label={p.label} detail={p.detail} value={prefs[p.key]} onChange={(v) => setNotificationPref(p.key, v)} />
            </View>
          ))}
        </View>

        <SectionHeader title="By email" />
        <View style={ui.panel}>
          <ToggleRow label="Weekly round up" detail="Games and competitions near you, every Thursday" value={prefs.weeklyEmail} onChange={(v) => setNotificationPref('weeklyEmail', v)} />
        </View>
        <T variant="caption" color={colors.textFaint} style={{ marginTop: space.md }}>Competition alerts you’ve set up are managed under Event alerts on your profile. Preview build: only the test notification is sent for now. The rest switch on once PlusFore has its server.</T>
      </Screen>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.mist, borderRadius: radius.lg, padding: space.xl, marginTop: space.lg },
  cardOn: { backgroundColor: colors.limeSoft },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
});
