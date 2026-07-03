import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { GradientButton } from '@/components/ui/gradient-button';
import { ScreenBackground } from '@/components/ui/screen-background';
import { useAppTheme, useGlass } from '@/hooks/use-theme-color';
import { supabase } from '@/supabase';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';

export default function LoginScreen() {
  const router = useRouter();
  const { primary: tintColor, text: textColor } = useAppTheme();
  const glass = useGlass();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    const e = email.trim();
    if (!e || !password) {
      Alert.alert('Ошибка', 'Введите почту и пароль');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: e, password });
      if (error) {
        Alert.alert('Не удалось войти', error.message);
        return;
      }
      router.replace('/(tabs)');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenBackground style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <GlassCard padding={24} borderRadius={16} style={styles.inner}>
            <ThemedText type="h1" style={styles.title}>
              Вход
            </ThemedText>
            <ThemedText style={styles.hint}>Введите почту и пароль учётной записи</ThemedText>

            <ThemedText style={styles.label}>Почта</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: glass.border,
                  backgroundColor: glass.backgroundSubtle,
                  color: textColor,
                },
              ]}
              placeholder="email@example.com"
              placeholderTextColor={glass.border}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
            />

            <ThemedText style={styles.label}>Пароль</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: glass.border,
                  backgroundColor: glass.backgroundSubtle,
                  color: textColor,
                },
              ]}
              placeholder="••••••••"
              placeholderTextColor={glass.border}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />

            <GradientButton
              title={submitting ? 'Вход...' : 'Войти'}
              onPress={() => void handleLogin()}
              disabled={submitting}
              fullWidth
            />

            <Link href="/(auth)/register" asChild>
              <Pressable style={styles.linkWrap}>
                <ThemedText style={[styles.link, { color: tintColor }]}>Регистрация</ThemedText>
              </Pressable>
            </Link>
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  inner: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 28,
  },
  hint: {
    opacity: 0.75,
    marginBottom: 24,
    textAlign: 'center',
    fontSize: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
    opacity: 0.9,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  linkWrap: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  link: {
    fontSize: 16,
    fontWeight: '500',
  },
});
