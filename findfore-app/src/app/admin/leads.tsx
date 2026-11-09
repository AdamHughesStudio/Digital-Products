import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';

import { useToast } from '@/components/toast';
import { Button, EmptyState, Field, Row, Screen, T, TopBar, styles as ui } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
import { loadCompetitions } from '@/data/club-events';
import { shortDate } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';

/**
 * Admins only: competitions another listings site shows that we haven't found on the club's own
 * website. Nothing here is published until someone has checked it against the club's booking page
 * and confirmed it. The database enforces who can see and review these.
 */

interface Lead {
  id: string;
  source_club: string;
  region: string | null;
  club_id: string | null;
  title: string;
  starts_on: string;
  check_url: string | null;
  listing_url: string | null;
  status: 'new' | 'unmatched';
}

interface ClubGroup {
  key: string;
  name: string;
  region: string | null;
  matched: boolean;
  checkUrl: string | null;
  listingUrl: string | null;
  leads: Lead[];
}

const localDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const regionLabel = (r: string | null) => (r ? r.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()) : '');

export default function CompetitionLeads() {
  const toast = useToast();
  const [state, setState] = useState<'loading' | 'signed-out' | 'not-admin' | 'ready'>('loading');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [pasted, setPasted] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return setState('signed-out');
    const { data: admin } = await supabase.rpc('is_admin');
    if (!admin) return setState('not-admin');
    const rows: Lead[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from('competition_leads')
        .select('id, source_club, region, club_id, title, starts_on, check_url, listing_url, status')
        .in('status', ['new', 'unmatched'])
        .order('starts_on')
        .range(from, from + 999);
      if (error) break;
      rows.push(...((data ?? []) as Lead[]));
      if (!data || data.length < 1000) break;
    }
    setLeads(rows);
    setState('ready');
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => {
    const by = new Map<string, ClubGroup>();
    for (const l of leads) {
      const key = l.club_id ?? `unmatched:${l.source_club}`;
      const g = by.get(key) ?? { key, name: l.source_club, region: l.region, matched: !!l.club_id, checkUrl: l.check_url, listingUrl: l.listing_url, leads: [] };
      g.checkUrl = g.checkUrl ?? l.check_url;
      g.listingUrl = g.listingUrl ?? l.listing_url;
      g.leads.push(l);
      by.set(key, g);
    }
    // soonest first, so what golfers can enter next gets checked first
    return [...by.values()].sort((a, b) => (a.matched === b.matched ? a.leads[0].starts_on.localeCompare(b.leads[0].starts_on) : a.matched ? -1 : 1));
  }, [leads]);

  const review = async (g: ClubGroup, ids: string[], verdict: 'confirmed' | 'not_found') => {
    const url = (pasted[g.key] ?? '').trim() || g.checkUrl;
    if (verdict === 'confirmed' && !url) {
      toast('Paste the link where you found it first', { icon: 'link-outline' });
      return;
    }
    setBusy(`${g.key}:${verdict}:${ids.length}`);
    const { data, error } = await supabase.rpc('review_leads', { lead_ids: ids, verdict, checked_url: url && url !== g.checkUrl ? url : null });
    setBusy(null);
    if (error) {
      toast('That didn’t save. Try again.', { icon: 'alert-circle-outline' });
      return;
    }
    haptic.success();
    setLeads((all) => all.filter((l) => !ids.includes(l.id)));
    const n = (data as number | null) ?? ids.length;
    toast(verdict === 'confirmed' ? `${n} published` : `${n} marked not found`, { icon: verdict === 'confirmed' ? 'checkmark-circle' : 'close-circle-outline' });
    if (verdict === 'confirmed') loadCompetitions();
  };

  if (state !== 'ready') {
    return (
      <View style={ui.screen}>
        <TopBar title="Competition leads" />
        {state === 'loading' ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.ink} accessibilityLabel="Loading leads" />
          </View>
        ) : (
          <EmptyState icon="lock-closed-outline" title="Admins only" body={state === 'signed-out' ? 'Sign in with an admin account to review competition leads.' : 'This account can’t review competition leads.'} />
        )}
      </View>
    );
  }

  const toCheck = leads.filter((l) => l.status === 'new').length;
  return (
    <View style={ui.screen}>
      <TopBar title="Competition leads" />
      <Screen>
        <T variant="body" color={colors.textMuted}>
          {toCheck
            ? `${toCheck} competitions at ${groups.filter((g) => g.matched).length} clubs to check. Open the club’s booking page, check the dates are there, then confirm. Confirmed ones go live straight away.`
            : 'Nothing to check. New leads appear here after each update.'}
        </T>

        {groups.map((g) => (
          <View key={g.key} style={[ui.card, s.card]}>
            <T variant="subheading">{g.name}</T>
            <T variant="small" color={colors.textMuted}>
              {regionLabel(g.region)} · {g.leads.length} competition{g.leads.length === 1 ? '' : 's'}
            </T>

            {g.matched ? (
              <>
                <Row gap={space.sm} style={{ marginTop: space.md, flexWrap: 'wrap' }}>
                  {g.checkUrl ? (
                    <Pressable onPress={() => Linking.openURL(g.checkUrl!)} accessibilityRole="link" style={({ pressed }) => [s.link, pressed && ui.pressed]}>
                      <Ionicons name="open-outline" size={14} color={colors.ink} />
                      <T variant="smallStrong">Club’s booking page</T>
                    </Pressable>
                  ) : null}
                  {g.listingUrl ? (
                    <Pressable onPress={() => Linking.openURL(g.listingUrl!)} accessibilityRole="link" style={({ pressed }) => [s.link, pressed && ui.pressed]}>
                      <Ionicons name="list-outline" size={14} color={colors.ink} />
                      <T variant="smallStrong">Where we spotted it</T>
                    </Pressable>
                  ) : null}
                </Row>
                {!g.checkUrl ? (
                  <View style={{ marginTop: space.md }}>
                    <Field
                      value={pasted[g.key] ?? ''}
                      onChangeText={(t) => setPasted((p) => ({ ...p, [g.key]: t }))}
                      placeholder="Paste the club’s booking page you checked"
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                    />
                  </View>
                ) : null}
              </>
            ) : (
              <T variant="small" color={colors.danger} style={{ marginTop: space.sm }}>
                This club isn’t in our club list yet, so these can’t be published.
              </T>
            )}

            <View style={{ marginTop: space.md }}>
              {g.leads.map((l, i) => (
                <Row key={l.id} gap={space.sm} style={[s.lead, i > 0 && s.leadDivider]}>
                  <View style={{ flex: 1 }}>
                    <T variant="smallStrong">{shortDate(localDay(l.starts_on))}</T>
                    <T variant="small" color={colors.textMuted}>{l.title}</T>
                  </View>
                  {g.matched ? (
                    <>
                      <Pressable onPress={() => review(g, [l.id], 'not_found')} accessibilityRole="button" accessibilityLabel={`${l.title} not found`} hitSlop={8} style={s.icon}>
                        <Ionicons name="close-circle-outline" size={24} color={colors.textMuted} />
                      </Pressable>
                      <Pressable onPress={() => review(g, [l.id], 'confirmed')} accessibilityRole="button" accessibilityLabel={`Confirm ${l.title}`} hitSlop={8} style={s.icon}>
                        <Ionicons name="checkmark-circle-outline" size={24} color={colors.ink} />
                      </Pressable>
                    </>
                  ) : null}
                </Row>
              ))}
            </View>

            {g.matched ? (
              <Row gap={space.sm} style={{ marginTop: space.md }}>
                <Button title="None found" kind="secondary" size="sm" style={{ flex: 1 }} loading={busy === `${g.key}:not_found:${g.leads.length}`} onPress={() => review(g, g.leads.map((l) => l.id), 'not_found')} />
                <Button title="All confirmed" size="sm" style={{ flex: 1 }} loading={busy === `${g.key}:confirmed:${g.leads.length}`} onPress={() => review(g, g.leads.map((l) => l.id), 'confirmed')} />
              </Row>
            ) : null}
          </View>
        ))}
      </Screen>
    </View>
  );
}

const s = StyleSheet.create({
  card: { marginTop: space.lg, padding: space.lg },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.page, borderWidth: 1, borderColor: colors.border },
  lead: { paddingVertical: 10, alignItems: 'center' },
  leadDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  icon: { padding: 2 },
});
