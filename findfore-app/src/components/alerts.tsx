import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useToast } from './toast';
import { Button, Chip, ChipRow, Field, Row, Sheet, T, styles as ui } from './ui';
import { colors, radius, space } from '@/constants/theme';
import { addAlert, removeAlert, setAlertCadence, useAlerts, type AlertCadence } from '@/data/events';
import { useStore } from '@/data/store';
import { haptic } from '@/lib/haptics';

export const CADENCES: { key: AlertCadence; label: string; detail: string }[] = [
  { key: 'instant', label: 'As soon as it’s listed', detail: 'One email per event' },
  { key: 'daily', label: 'Daily round up', detail: 'One email a day, 7am' },
  { key: 'weekly', label: 'Weekly digest', detail: 'Sunday evening' },
];

export const FREE_ALERTS = 1;

/** Turn the current search into an email alert */
export function AlertSheet({ visible, onClose, suggestedName, filters }: { visible: boolean; onClose: () => void; suggestedName: string; filters: Record<string, string | number | boolean | undefined> }) {
  const { state } = useStore();
  const toast = useToast();
  const alerts = useAlerts();
  const pro = !!state.credits?.pro;
  const [name, setName] = useState('');
  const [cadence, setCadence] = useState<AlertCadence>('instant');
  const atLimit = !pro && alerts.length >= FREE_ALERTS;

  const create = () => {
    addAlert({ name: name.trim() || suggestedName, cadence, filters });
    haptic.success();
    toast('Alert on. We’ll email you when a match is listed', { icon: 'notifications' });
    setName('');
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Email me new events">
      <T variant="body" color={colors.textMuted}>We’ll watch for events that match this search and email you as clubs list them, so you hear before the popular ones fill.</T>
      <View style={{ marginTop: space.lg }}>
        <Field label="Name this alert" value={name} onChangeText={setName} placeholder={suggestedName} />
      </View>
      <T variant="smallStrong" color={colors.textMuted} style={{ marginTop: space.lg, marginBottom: space.sm }}>How often</T>
      <View style={{ gap: space.sm }}>
        {CADENCES.map((c) => (
          <Pressable key={c.key} onPress={() => { haptic.select(); setCadence(c.key); }} accessibilityRole="radio" accessibilityState={{ checked: cadence === c.key }} style={[s.option, cadence === c.key && s.optionOn]}>
            <View style={[s.radio, cadence === c.key && s.radioOn]}>{cadence === c.key ? <Ionicons name="checkmark" size={14} color={colors.ink} /> : null}</View>
            <View style={{ flex: 1 }}>
              <T variant="bodyStrong" color={cadence === c.key ? colors.onInk : colors.text}>{c.label}</T>
              <T variant="caption" color={cadence === c.key ? colors.onInkMuted : colors.textMuted}>{c.detail}</T>
            </View>
          </Pressable>
        ))}
      </View>
      {atLimit ? (
        <View style={s.limit}>
          <T variant="bodyStrong">You’ve used your free alert</T>
          <T variant="small" color={colors.textMuted}>Pro members can run as many alerts as they like, daily or weekly.</T>
          <Row gap={space.sm} style={{ marginTop: space.md }}>
            <Button title="See Pro" size="md" onPress={() => { onClose(); router.push('/pro'); }} style={{ flex: 1 }} />
            <Button title="Manage alerts" kind="ghost" size="md" onPress={() => { onClose(); router.push('/profile'); }} style={{ flex: 1 }} />
          </Row>
        </View>
      ) : (
        <Button title="Turn on alert" icon="notifications" onPress={create} style={{ marginTop: space.xl }} />
      )}
      <T variant="caption" color={colors.textFaint} style={{ textAlign: 'center', marginTop: space.md }}>Preview build: the alert is saved on this phone and no email is sent yet.</T>
    </Sheet>
  );
}

/** Your alerts, with a way to change how often they arrive or switch them off */
export function AlertsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const alerts = useAlerts();
  const toast = useToast();
  return (
    <Sheet visible={visible} onClose={onClose} title="Event alerts">
      {alerts.length === 0 ? (
        <T variant="body" color={colors.textMuted}>No alerts yet. Search for events, then tap “Email me new events” to set one up.</T>
      ) : (
        <View style={{ gap: space.md }}>
          {alerts.map((a) => (
            <View key={a.id} style={s.alert}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T variant="bodyStrong" style={{ flex: 1 }}>{a.name}</T>
                <Pressable onPress={() => { removeAlert(a.id); toast('Alert switched off', { icon: 'notifications-off-outline' }); }} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${a.name}`}>
                  <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                </Pressable>
              </Row>
              <ChipRow>
                {CADENCES.map((c) => (
                  <Chip key={c.key} label={c.key === 'instant' ? 'Instant' : c.key === 'daily' ? 'Daily' : 'Weekly'} selected={a.cadence === c.key} onPress={() => setAlertCadence(a.id, c.key)} />
                ))}
              </ChipRow>
            </View>
          ))}
        </View>
      )}
      <Button title="Find events" kind="ghost" onPress={() => { onClose(); router.push('/competitions'); }} style={{ marginTop: space.xl }} />
    </Sheet>
  );
}

const s = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.bg },
  optionOn: { backgroundColor: colors.ink },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: colors.lime, borderColor: colors.lime },
  limit: { marginTop: space.xl, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.bg },
  alert: { gap: space.sm, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.bg },
});
