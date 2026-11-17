import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Sheet, T } from './ui';
import { colors, space } from '@/constants/theme';
import { useSession } from '@/lib/cloud';
import { haptic } from '@/lib/haptics';
import { acceptTerms, hasAcceptedTerms } from '@/lib/terms';

/**
 * Asks a signed-in golfer to agree to the terms and privacy policy, once, if they haven't agreed to
 * this version: everyone who signed up before agreeing was part of sign-up, and everyone again if
 * the terms change. New sign-ups agree on the email screen, so they never see this.
 */
export function TermsGate() {
  const session = useSession();
  const [needed, setNeeded] = useState(false);
  const [busy, setBusy] = useState(false);
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return setNeeded(false);
    let live = true;
    hasAcceptedTerms().then((ok) => live && setNeeded(ok === false));
    return () => {
      live = false;
    };
  }, [userId]);

  const agree = async () => {
    setBusy(true);
    const ok = await acceptTerms();
    setBusy(false);
    if (ok) {
      haptic.success();
      setNeeded(false);
    }
  };

  const read = (doc: 'terms' | 'privacy') => {
    setNeeded(false);
    router.push(`/legal/${doc}` as never);
    // asked again when they come back
    setTimeout(() => hasAcceptedTerms().then((ok) => setNeeded(ok === false)), 1500);
  };

  return (
    <Sheet visible={needed} onClose={() => {}} title="Our terms">
      <View style={{ gap: space.md }}>
        <T variant="body" color={colors.textMuted}>
          Before you carry on, please read and agree to PlusFore’s terms of use and privacy policy. They set out how golfers treat each other here, and how we look after your information.
        </T>
        <View style={{ gap: space.sm }}>
          <Pressable onPress={() => read('terms')} accessibilityRole="link" hitSlop={6}>
            <T variant="bodyStrong" style={{ textDecorationLine: 'underline' }}>Read the terms of use</T>
          </Pressable>
          <Pressable onPress={() => read('privacy')} accessibilityRole="link" hitSlop={6}>
            <T variant="bodyStrong" style={{ textDecorationLine: 'underline' }}>Read the privacy policy</T>
          </Pressable>
        </View>
        <T variant="small" color={colors.textMuted}>
          We don’t allow abuse, harassment or objectionable content. You can report or block any golfer, and we act on every report.
        </T>
        <Button title="I agree" loading={busy} onPress={agree} style={{ marginTop: space.sm }} />
      </View>
    </Sheet>
  );
}
