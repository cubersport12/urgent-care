import { AuthProvider } from '@/contexts/auth-context';
import { TestProvider } from '@/contexts/test-context';
import { ThemeProvider } from '@/contexts/theme-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // В dev режиме используем темную тему, в prod - системную
  const theme = __DEV__ ? 'dark' : (colorScheme ?? 'light');

  return (
    <ThemeProvider theme={theme}>
      <TestProvider>
        <AuthProvider>
          <NavigationThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            </Stack>
            <StatusBar style="auto" />
          </NavigationThemeProvider>
        </AuthProvider>
      </TestProvider>
    </ThemeProvider>
  );
}
