import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import '../global.css';
import LoginScreen from './screens/LoginScreen';
import { auth } from '@/FirebaseConfig';
import { SafeAreaView } from 'react-native';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';

// Prevent the splash screen from auto-hiding before asset loading is complete.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isAuth, setIsAuth] = useState<boolean>(false);
  const [loaded] = useFonts({
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf')
  });

  const onAuthStateChanged = (user: unknown) => {
    setIsAuth(user != null);
  };

  useEffect(() => {
    return auth.onAuthStateChanged(onAuthStateChanged);
  }, []);

  useEffect(() => {
    if (loaded) {
      void SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaView className="w-full h-full">
      <GluestackUIProvider mode="dark">
        {
          isAuth
            ? (
                <>
                  <Stack>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="+not-found" />
                  </Stack>
                  <StatusBar style="auto" />
                </>
              )
            : <LoginScreen />
        }
      </GluestackUIProvider>
    </SafeAreaView>

  );
}
