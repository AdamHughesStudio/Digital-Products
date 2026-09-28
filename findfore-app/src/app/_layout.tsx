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
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { LaunchSplash } from '@/components/launch-splash';
import { ToastProvider } from '@/components/toast';
import { StoreProvider, useStore } from '@/data/store';

SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.bg, primary: colors.ink, text: colors.text, border: colors.border },
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
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {loaded ? <AppRoutes /> : null}
      {!splashDone ? <LaunchSplash ready={loaded} onDone={finishSplash} /> : null}
    </View>
  );
}

function AppRoutes() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
      <Stack.Screen name="post/game" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="post/looking" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="profile/edit" options={{ animation: 'slide_from_bottom' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <ThemeProvider value={theme}>
          <StoreProvider>
            <ToastProvider>
              <StatusBar style="dark" />
              <AppStack />
            </ToastProvider>
          </StoreProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
