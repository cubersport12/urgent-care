import { useAuth } from '@/contexts/auth-context';
import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function AuthLayout() {
  const { session, initialized } = useAuth();

  if (!initialized) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerBackTitle: 'Назад',
      }}
    >
      <Stack.Screen name="login" options={{ title: 'Вход' }} />
      <Stack.Screen name="register" options={{ title: 'Регистрация' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Сброс пароля' }} />
      <Stack.Screen name="reset-password" options={{ title: 'Новый пароль' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
