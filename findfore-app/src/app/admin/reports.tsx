import { router } from 'expo-router';
import { apiUrl } from '@/constants/site';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { useToast } from '@/components/toast';
import { Button, EmptyState, Row, Screen, T, TopBar, styles as ui } from '@/components/ui';
import { colors, hair, hairline, radius, space } from '@/constants/theme';
import { timeAgo } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';

/**
 * Admins only: reports golfers have made about other golfers, newest first. Each can be dismissed,
 * or the golfer banned, which stops them signing in. Apple expects reports to be acted on within a
 * day, and admins are sent a notification for each new one. The database enforces who can see these.
 */

interface Report {
  id: string;
  reporter: string | null;
  reported: string;
  reason: string;
  note: string | null;
  created_at: string;
}

const REASON: Record<string, string> = {
  no_show: 'Didn’t show up',
  inappropriate: 'Inappropriate behaviour',
  spam: 'Spam or fake profile',
  misuse: 'Misusing member guest',
  other: 'Something else',
};

function confirm(title: string, body: string, yes: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${body}`)) onYes();
    return;
  }
  Alert.alert(title, body, [
    { text: 'Cancel', style: 'cancel' },
    { text: yes, style: 'destructive', onPress: onYes },
  ]);
}

export default function Reports() {
  const toast = useToast();
  const [state, setState] = useState<'loading' | 'signed-out' | 'not-admin' | 'ready'>('loading');
  const [reports, setReports] = useState<Report[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return setState('signed-out');
    const { data: admin } = await supabase.rpc('is_admin');
    if (!admin) return setState('not-admin');
    const { data } = await supabase.from('reports').select('id, reporter, reported, reason, note, created_at').eq('status', 'open').order('created_at', { ascending: false }).limit(200);
    const rows = (data ?? []) as Report[];
    const ids = [...new Set(rows.flatMap((r) => [r.reported, r.reporter]).filter(Boolean))] as string[];
    if (ids.length) {
      const { data: people } = await supabase.from('profiles').select('id, first_name, last_name, username').in('id', ids);
      setNames(Object.fromEntries(((people ?? []) as { id: string; first_name: string; last_name: string; username: string }[]).map((p) => [p.id, `${p.first_name} ${p.last_name} (@${p.username})`])));
    }
    setReports(rows);
    setState('ready');
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dismiss = async (r: Report) => {
    setBusy(r.id);
    const { data: who } = await supabase.auth.getUser();
    const { error } = await supabase.from('reports').update({ status: 'dismissed', resolved_at: new Date().toISOString(), resolved_by: who.user?.id, resolution: 'Dismissed' }).eq('id', r.id);
    setBusy(null);
    if (error) return toast('Couldn’t dismiss that report', { icon: 'alert-circle-outline' });
    haptic.select();
    setReports((list) => list.filter((x) => x.id !== r.id));
  };

  const ban = (r: Report) =>
    confirm(`Ban ${names[r.reported] ?? 'this golfer'}?`, 'They won’t be able to sign in again, and every open report about them is closed.', 'Ban', async () => {
      setBusy(r.id);
      const { data: session } = await supabase.auth.getSession();
      try {
        const res = await fetch(apiUrl('/api/admin-moderate'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.session?.access_token ?? ''}` },
          body: JSON.stringify({ action: 'ban', golferId: r.reported, note: `Banned after report: ${REASON[r.reason] ?? r.reason}` }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? 'Couldn’t ban this golfer');
        haptic.success();
        toast('Banned. Their open reports are closed.', { icon: 'ban-outline' });
        setReports((list) => list.filter((x) => x.reported !== r.reported));
      } catch (e) {
        toast((e as Error).message, { icon: 'alert-circle-outline' });
      } finally {
        setBusy(null);
      }
    });

  return (
    <View style={ui.screen}>
      <TopBar title="Reports" />
      <Screen>
        {state === 'loading' ? (
          <ActivityIndicator color={colors.ink} style={{ marginTop: space.xxxl }} />
        ) : state === 'signed-out' ? (
          <EmptyState icon="lock-closed-outline" title="Sign in first" body="Reports are only for PlusFore admins." />
        ) : state === 'not-admin' ? (
          <EmptyState icon="lock-closed-outline" title="Admins only" body="Reports are only for PlusFore admins." />
        ) : reports.length === 0 ? (
          <EmptyState icon="shield-checkmark-outline" title="No open reports" body="New reports appear here, and admins get a notification for each one." />
        ) : (
          <View style={{ gap: space.md }}>
            <T variant="small" color={colors.textMuted}>
              {reports.length} open. Look at each within a day: dismiss it, or ban the golfer.
            </T>
            {reports.map((r) => (
              <View key={r.id} style={s.card}>
                <Pressable onPress={() => router.push(`/golfer/${r.reported}` as never)} accessibilityRole="button">
                  <T variant="bodyStrong">{names[r.reported] ?? 'A golfer'}</T>
                </Pressable>
                <T variant="smallStrong" style={{ marginTop: 2 }}>{REASON[r.reason] ?? r.reason}</T>
                {r.note ? <T variant="body" style={{ marginTop: space.sm }}>“{r.note}”</T> : null}
                <T variant="caption" color={colors.textMuted} style={{ marginTop: space.sm }}>
                  Reported by {r.reporter ? names[r.reporter] ?? 'a golfer' : 'a deleted account'} · {timeAgo(r.created_at)}
                </T>
                <Row gap={space.sm} style={{ marginTop: space.md }}>
                  <Button title="Dismiss" kind="ghost" size="md" disabled={busy === r.id} onPress={() => dismiss(r)} style={{ flex: 1 }} />
                  <Button title="Ban golfer" kind="danger" size="md" loading={busy === r.id} onPress={() => ban(r)} style={{ flex: 1 }} />
                </Row>
              </View>
            ))}
          </View>
        )}
      </Screen>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: hair, borderColor: hairline, padding: space.lg },
});
