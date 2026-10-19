import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Field, IconButton, Row, T, styles as ui } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { isEmail, sendSignInCode, verifySignInCode } from '@/lib/cloud';
import { haptic } from '@/lib/haptics';

const RESEND_AFTER = 30;
// matches Email OTP length in Supabase, under Authentication, Sign In / Providers, Email
const CODE_LENGTH = 8;

/**
 * Sign in or sign up with a code sent by email. A typed code rather than a link, so it works
 * inside the Home Screen app, where a link in Mail would open Safari instead.
 */
export function SignIn({ onBack, onSignedIn }: { onBack: () => void; onSignedIn: () => void | Promise<void> }) {
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = async () => {
    if (!isEmail(email) || busy) return;
    setBusy(true);
    setError(null);
    const r = await sendSignInCode(email);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    haptic.success();
    setCode('');
    setStage('code');
    setWait(RESEND_AFTER);
  };

  const digits = code.replace(/\D/g, '');
  const verify = async () => {
    if (digits.length < CODE_LENGTH || busy) return;
    setBusy(true);
    setError(null);
    const r = await verifySignInCode(email, digits);
    if (!r.ok) {
      setBusy(false);
      haptic.warn();
      return setError(r.error);
    }
    await onSignedIn();
    setBusy(false);
  };

  const back = () => {
    setError(null);
    if (stage === 'code') setStage('email');
    else onBack();
  };

  return (
    <View style={ui.screen}>
      <View style={[ui.contentWidth, ui.padded, { paddingTop: insets.top + 8 }]}>
        <Row style={{ justifyContent: 'space-between' }}>
          <IconButton icon="chevron-back" label="Back" onPress={back} />
        </Row>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[ui.contentWidth, ui.padded]}>
          {stage === 'email' ? (
            <>
              <T variant="display" style={{ marginTop: space.xl }}>What’s your email?</T>
              <T variant="body" color={colors.textMuted} style={{ marginTop: space.sm }}>
                We’ll send you a code to sign in. No password to remember. If you’re new, this sets up your account.
              </T>
              <View style={{ marginTop: space.xl }}>
                <Field
                  label="Email"
                  value={email}
                  onChangeText={(v) => { setEmail(v); setError(null); }}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={send}
                  autoFocus
                  error={!!error}
                  hint={error ?? undefined}
                />
              </View>
            </>
          ) : (
            <>
              <T variant="display" style={{ marginTop: space.xl }}>Check your email</T>
              <T variant="body" color={colors.textMuted} style={{ marginTop: space.sm }}>
                We’ve sent a code to <T variant="bodyStrong">{email.trim().toLowerCase()}</T>. It can take a minute to arrive, so check your junk folder too.
              </T>
              <View style={{ marginTop: space.xl }}>
                <Field
                  label="Code"
                  value={code}
                  onChangeText={(v) => {
                    const d = v.replace(/\D/g, '').slice(0, CODE_LENGTH);
                    setCode(d);
                    setError(null);
                  }}
                  placeholder="12345678"
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  returnKeyType="go"
                  onSubmitEditing={() => verify()}
                  autoFocus
                  error={!!error}
                  hint={error ?? undefined}
                  style={{ fontSize: 24, letterSpacing: 6, fontVariant: ['tabular-nums'] }}
                />
              </View>
              <Row gap={space.lg} style={{ marginTop: space.lg }}>
                <Pressable onPress={wait > 0 ? undefined : send} accessibilityRole="button" disabled={wait > 0 || busy} hitSlop={8}>
                  <T variant="smallStrong" color={wait > 0 ? colors.textFaint : colors.text}>
                    {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
                  </T>
                </Pressable>
                <Pressable onPress={back} accessibilityRole="button" hitSlop={8}>
                  <T variant="smallStrong" color={colors.text}>Use a different email</T>
                </Pressable>
              </Row>
            </>
          )}
        </View>
      </ScrollView>
      <View style={[ui.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={ui.contentWidth}>
          {stage === 'email' ? (
            <Button title="Send my code" disabled={!isEmail(email)} loading={busy} onPress={send} />
          ) : (
            <Button title="Sign in" disabled={digits.length < CODE_LENGTH} loading={busy} onPress={() => verify()} />
          )}
        </View>
      </View>
    </View>
  );
}
