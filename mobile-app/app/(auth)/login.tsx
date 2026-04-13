import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { useAppTheme } from '@/hooks/use-theme-color';
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
  const { page: backgroundColor, border: borderColor, primary: tintColor, onLayout1: textColor } =
    useAppTheme();
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
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ThemedView style={styles.inner}>
          <ThemedText type="title" style={styles.title}>
            Вход
          </ThemedText>
          <ThemedText style={styles.hint}>Введите почту и пароль учётной записи</ThemedText>

          <ThemedText style={styles.label}>Почта</ThemedText>
          <TextInput
            style={[styles.input, { borderColor, color: textColor }]}
            placeholder="email@example.com"
            placeholderTextColor={`${textColor}99`}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />

          <ThemedText style={styles.label}>Пароль</ThemedText>
          <TextInput
            style={[styles.input, { borderColor, color: textColor }]}
            placeholder="••••••••"
            placeholderTextColor={`${textColor}99`}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
          />

          <Button
            title="Войти"
            variant="primary"
            size="large"
            fullWidth
            disabled={submitting}
            onPress={() => void handleLogin()}
            style={styles.primaryBtn}
          />

          <Link href="/(auth)/register" asChild>
            <Pressable style={styles.linkWrap}>
              <ThemedText style={[styles.link, { color: tintColor }]}>Регистрация</ThemedText>
            </Pressable>
          </Link>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  },
  hint: {
    opacity: 0.75,
    marginBottom: 24,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
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
  primaryBtn: {
    marginTop: 8,
  },
  linkWrap: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  link: {
    fontSize: 16,
    fontWeight: '600',
  },
});
