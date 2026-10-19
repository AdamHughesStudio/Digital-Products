import { Archivo_800ExtraBold, Archivo_900Black } from '@expo-google-fonts/archivo';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchMyProfile, golferPatch, useSession } from '@/lib/cloud';
import { linkPhoneToAccount, registerServiceWorker, setIconBadge } from '@/lib/push';
import { fetchSnapshot, onCloudError, onSyncRequested, savePrefsCloud, setCloudUser, subscribeLive, toLocalMessage, type ChatIds } from '@/lib/social';
import { AppState, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { LaunchSplash } from '@/components/launch-splash';
import { PhotoCropProvider } from '@/components/photo-cropper';
import { PhotoGate } from '@/components/photo-gate';
import { ToastProvider, useToast } from '@/components/toast';
import { loadClubs } from '@/data/courses';
import { cloudFriendsNow, mergeCloudFriends, useFriends } from '@/data/friends';
import { useNotificationPrefs } from '@/data/notification-prefs';
import { actionNeeded, directChatId, gameChatId, ME, StoreProvider, totalUnread, useStore } from '@/data/store';

SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.surface, card: colors.surface, primary: colors.ink, text: colors.text, border: colors.border },
};

function AppStack() {
  const { ready } = useStore();
  const [fontsLoaded] = useFonts({
    Archivo_800ExtraBold,
    Archivo_900Black,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  const loaded = ready && fontsLoaded;
  const [splashDone, setSplashDone] = useState(false);
  const finishSplash = useCallback(() => setSplashDone(true), []);

  // our animated splash takes over from the native one straight away
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    // ready to receive push notifications on the web app
    registerServiceWorker();
    // every golf club in the UK and Ireland, from the phone's copy first
    loadClubs();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {loaded ? <AppRoutes /> : null}
      {loaded ? <PhotoGate /> : null}
      <CloudSync />
      {!splashDone ? <LaunchSplash ready={loaded} onDone={finishSplash} /> : null}
    </View>
  );
}

const SYNC_EVERY = 30000;
const CHAT_IDS: ChatIds = { ME, gameChatId, directChatId };

/**
 * Keeps the phone in step with the account: the profile once per sign in, and real golfers, games,
 * requests, friends and messages on opening, every 30 seconds while open, on coming back to the
 * app, and straight after any change. New messages arrive live, and any change to games, requests
 * or friends prompts a reload, so the 30 second check is only a safety net.
 */
function CloudSync() {
  const { ready, me, state, updateProfile, mergeCloud, receiveCloudMessage } = useStore();
  const prefs = useNotificationPrefs();
  const friends = useFriends();
  const toast = useToast();
  const session = useSession();
  const profileSynced = useRef<string | null>(null);
  const busy = useRef(false);
  const again = useRef(false);
  const hasMe = !!me;
  const id = session?.user.id ?? null;

  useEffect(() => {
    setCloudUser(id);
    // this phone's notifications go to whoever is signed in
    if (id) linkPhoneToAccount();
  }, [id]);

  // the server checks these before sending anything
  useEffect(() => {
    if (!id) return;
    const t = setTimeout(() => savePrefsCloud(prefs), 500);
    return () => clearTimeout(t);
  }, [id, prefs]);

  // the number on the Home Screen icon matches what's waiting in the app
  const badge = hasMe ? totalUnread(state) + actionNeeded(state).length + friends.incoming.length : 0;
  useEffect(() => setIconBadge(badge), [badge]);

  useEffect(() => {
    if (!ready || !hasMe || !id || profileSynced.current === id) return;
    profileSynced.current = id;
    fetchMyProfile().then((r) => {
      if (r.ok && r.value) updateProfile(golferPatch(r.value));
    });
  }, [ready, hasMe, id, updateProfile]);

  const sync = useCallback(async () => {
    if (!ready || !hasMe || !id) return;
    // one at a time; a request made mid sync runs once more afterwards
    if (busy.current) return void (again.current = true);
    busy.current = true;
    try {
      const snap = await fetchSnapshot(CHAT_IDS);
      if (snap) {
        mergeCloud(snap, cloudFriendsNow());
        mergeCloudFriends(snap.friends);
      }
    } catch {
      // offline or a blip: the next sync catches up
    } finally {
      busy.current = false;
      if (again.current) {
        again.current = false;
        setTimeout(sync, 0);
      }
    }
  }, [ready, hasMe, id, mergeCloud]);

  useEffect(() => {
    if (!ready || !hasMe || !id) return;
    sync();
    let soon: ReturnType<typeof setTimeout> | undefined;
    const off = onSyncRequested(() => {
      clearTimeout(soon);
      soon = setTimeout(sync, 250);
    });
    const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible';
    const timer = setInterval(() => visible() && sync(), SYNC_EVERY);
    const onShow = () => visible() && sync();
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onShow);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && sync());
    return () => {
      off();
      clearTimeout(soon);
      clearInterval(timer);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onShow);
      sub.remove();
    };
  }, [ready, hasMe, id, sync]);

  useEffect(() => {
    if (!ready || !hasMe || !id) return;
    return subscribeLive((row) => {
      const m = toLocalMessage(row, CHAT_IDS);
      if (m) receiveCloudMessage(m.message, m.gameId, m.other);
    });
  }, [ready, hasMe, id, receiveCloudMessage]);

  useEffect(() => onCloudError((m) => toast(m, { icon: 'alert-circle-outline' })), [toast]);
  return null;
}

function AppRoutes() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface }, animation: 'slide_from_right' }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
      <Stack.Screen name="post/game" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="profile/edit" options={{ animation: 'slide_from_bottom' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.surface }}>
      <SafeAreaProvider>
        <ThemeProvider value={theme}>
          <StoreProvider>
            <ToastProvider>
              <PhotoCropProvider>
                <StatusBar style="dark" />
                <AppStack />
              </PhotoCropProvider>
            </ToastProvider>
          </StoreProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
