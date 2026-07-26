import { configureApiClient } from '@/api/client';
import { AuthProvider } from '@/contexts/auth-context';
import { TestProvider } from '@/contexts/test-context';
import { ThemeProvider } from '@/contexts/theme-context';

configureApiClient();
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
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

SplashScreen.preventAutoHideAsync();

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

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <TestProvider>
          <AuthProvider>
            <RootStack />
          </AuthProvider>
        </TestProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
