import { View } from 'react-native';

import { ToggleRow } from '@/components/form';
import { Screen, SectionHeader, T, TopBar, styles as ui } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { setNotificationPref, useNotificationPrefs, type NotificationPrefs } from '@/data/notification-prefs';

const PUSH: { key: keyof NotificationPrefs; label: string; detail: string }[] = [
  { key: 'gameRequests', label: 'Game requests and replies', detail: 'Someone asks to join your game, or a host answers you' },
  { key: 'messages', label: 'Messages', detail: 'New messages from friends and game chats' },
  { key: 'friendRequests', label: 'Friend requests', detail: 'When a golfer adds you, or accepts your request' },
  { key: 'gameReminders', label: 'Game reminders', detail: 'The day before you play' },
  { key: 'entriesOpening', label: 'Entries opening', detail: 'For competitions you’ve saved' },
  { key: 'friendsInterested', label: 'Friends’ competitions', detail: 'When a friend saves a competition you’ve saved too' },
];

export default function NotificationSettings() {
  const prefs = useNotificationPrefs();
  return (
    <View style={ui.screen}>
      <TopBar title="Notifications" />
      <Screen>
        <SectionHeader title="On your phone" />
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
        <T variant="caption" color={colors.textFaint} style={{ marginTop: space.md }}>Competition alerts you’ve set up are managed under Event alerts on your profile. Preview build: these settings are saved on this phone and nothing is sent yet.</T>
      </Screen>
    </View>
  );
}
