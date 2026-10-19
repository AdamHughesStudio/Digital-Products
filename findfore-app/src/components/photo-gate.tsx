import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/components/toast';
import { usePickProfilePhoto } from '@/components/photo-cropper';
import { Avatar, Button, T, styles as ui } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { useStore } from '@/data/store';
import { uploadProfilePhoto, useSession } from '@/lib/cloud';
import { haptic } from '@/lib/haptics';

/**
 * Every account has a profile photo. Anyone signed in without one, such as accounts made before
 * photos were required, sees this until they add one. It can't be skipped.
 */
export function PhotoGate() {
  const { me, updateProfile } = useStore();
  const session = useSession();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const pickProfilePhoto = usePickProfilePhoto();
  const [busy, setBusy] = useState(false);

  if (!session || !me || me.photoUri || me.avatar || pathname.startsWith('/welcome')) return null;

  const choose = async () => {
    const uri = await pickProfilePhoto();
    if (!uri) return;
    setBusy(true);
    const r = await uploadProfilePhoto(uri);
    setBusy(false);
    if (!r.ok) return toast(r.error, { icon: 'alert-circle-outline' });
    updateProfile({ photoUri: r.value });
    haptic.success();
    toast('Looking good', { icon: 'camera' });
  };

  return (
    <View style={[StyleSheet.absoluteFill, s.screen, { paddingTop: insets.top + space.xxl, paddingBottom: Math.max(insets.bottom, 16) + space.md }]}>
      <View style={[ui.contentWidth, ui.padded, { flex: 1 }]}>
        <T variant="display">Add your photo</T>
        <T variant="body" color={colors.textMuted} style={{ marginTop: space.sm }}>
          Every golfer on PlusFore now has a photo, so you know who you’re meeting on the first tee. A clear photo of your face works best.
        </T>
        <Pressable onPress={choose} disabled={busy} accessibilityRole="button" accessibilityLabel="Choose a photo" style={s.photo}>
          <Avatar golfer={me} size={168} />
          <View style={s.badge}>
            <Ionicons name="add" size={22} color={colors.ink} />
          </View>
        </Pressable>
      </View>
      <View style={[ui.contentWidth, ui.padded]}>
        <Button title="Choose a photo" icon="image-outline" loading={busy} onPress={choose} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { backgroundColor: colors.surface, zIndex: 50 },
  photo: { alignSelf: 'center', marginTop: space.xxl },
  badge: { position: 'absolute', right: 6, bottom: 6, width: 42, height: 42, borderRadius: 21, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.surface },
});
