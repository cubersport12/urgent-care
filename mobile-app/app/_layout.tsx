import { configureApiClient } from '@/api/client';
import { AchievementsProvider } from '@/contexts/achievements-context';
import { CertificatesProvider } from '@/contexts/certificates-context';
import { AuthProvider } from '@/contexts/auth-context';
import { ImmersiveProvider } from '@/contexts/immersive-context';
import { NotificationsProvider } from '@/contexts/notifications-context';
import { TestProvider } from '@/contexts/test-context';
import { ThemeProvider, useTheme } from '@/contexts/theme-context';
import { GlobalNotificationBanner } from '@/components/ui/global-notification-banner';

import {
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
} from '@expo-google-fonts/ibm-plex-mono';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Image as ExpoImage } from 'expo-image';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Animation, Colors } from '@/constants/theme';
import { CookieConsentBanner } from '@/components/cookie-consent-banner';
import Animated, { FadeOut, useReducedMotion } from 'react-native-reanimated';

configureApiClient();
SplashScreen.preventAutoHideAsync();

const startupImages = {
  light: { animation: require('@/assets/images/startup-light.gif'), final: require('@/assets/images/startup-light-final.png') },
  dark: { animation: require('@/assets/images/startup-dark.gif'), final: require('@/assets/images/startup-dark-final.png') },
} as const;

function StartupSplash() {
  const { theme, isThemeLoaded } = useTheme();
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const started = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function start() {
    if (started.current) return;
    started.current = true;
    void SplashScreen.hideAsync();
    timer.current = setTimeout(() => setVisible(false), reducedMotion ? 1000 : 2000);
  }

  function onError() {
    if (timer.current) clearTimeout(timer.current);
    void SplashScreen.hideAsync();
    setVisible(false);
  }

  if (!isThemeLoaded || !visible) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: Colors[theme].splashBackground }]} exiting={reducedMotion ? undefined : FadeOut.duration(Animation.enterDuration)} accessibilityViewIsModal>
      <ExpoImage
        source={reducedMotion ? startupImages[theme].final : startupImages[theme].animation}
        style={styles.splashImage}
        contentFit="contain"
        onLoad={start}
        onError={onError}
        accessible={false}
      />
    </Animated.View>
  );
}

function RootStack() {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: Colors[theme].page }}>
      <NavigationThemeProvider
        value={
          theme === 'dark'
            ? {
                ...DarkTheme,
                colors: {
                  ...DarkTheme.colors,
                  background: Colors.dark.page,
                  card: Colors.dark.page,
                  border: Colors.dark.border,
                  primary: Colors.dark.primary,
                  text: Colors.dark.text,
                },
              }
            : {
                ...DefaultTheme,
                colors: {
                  ...DefaultTheme.colors,
                  background: Colors.light.page,
                  card: Colors.light.page,
                  border: Colors.light.border,
                  primary: Colors.light.primary,
                  text: Colors.light.text,
                },
              }
        }
      >
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: Colors[theme].page },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          {/* Корневые маршруты поверх табов — «назад» возвращает на исходный таб */}
          <Stack.Screen name="achievements" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="subscription" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="notifications" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="billing/return" options={{ presentation: 'transparentModal', headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} translucent />
      </NavigationThemeProvider>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <TestProvider>
          <AuthProvider>
            <ImmersiveProvider>
              <NotificationsProvider>
                <AchievementsProvider>
                  <CertificatesProvider>
                    <View style={styles.root}>
                      <RootStack />
                      <GlobalNotificationBanner />
                      <CookieConsentBanner />
                      <StartupSplash />
                    </View>
                  </CertificatesProvider>
                </AchievementsProvider>
              </NotificationsProvider>
            </ImmersiveProvider>
          </AuthProvider>
        </TestProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  splashImage: { width: '100%', height: '100%' },
});
