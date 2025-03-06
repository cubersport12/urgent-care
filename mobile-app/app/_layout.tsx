import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import '../global.css';
import LoginScreen from './screens/LoginScreen';
import { SafeAreaView } from 'react-native';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { supabase } from '@/supabase';
import { Session } from '@supabase/supabase-js';

// Prevent the splash screen from auto-hiding before asset loading is complete.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const colorScheme = 'dark';
  const [loaded] = useFonts({

    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf')
  });

  const onAuthStateChanged = (user: Session | null) => {
    setSession(user);
  };

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      onAuthStateChanged(session);
    });

    void supabase.auth.onAuthStateChange((_event, session) => {
      onAuthStateChanged(session);
    });
  }, []);

  useEffect(() => {
    if (loaded) {
      void SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded || session === undefined) {
    return null;
  }

  return (
    <SafeAreaView className="w-full h-full">
      <GluestackUIProvider mode={colorScheme}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          {
            session != null
              ? (
                  <>
                    <Stack initialRouteName="(tabs)">
                      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                      <Stack.Screen name="+not-found" />
                    </Stack>
                    <StatusBar style="auto" />
                  </>
                )
              : <LoginScreen />
          }
        </ThemeProvider>
      </GluestackUIProvider>
    </SafeAreaView>

  );
}
