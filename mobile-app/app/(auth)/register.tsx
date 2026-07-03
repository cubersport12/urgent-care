import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { GradientButton } from '@/components/ui/gradient-button';
import { ScreenBackground } from '@/components/ui/screen-background';
import { useAppTheme, useGlass } from '@/hooks/use-theme-color';
import { supabase } from '@/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';

export default function RegisterScreen() {
  const router = useRouter();
  const { text: textColor } = useAppTheme();
  const glass = useGlass();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async () => {
    const n = name.trim();
    const e = email.trim();
    if (!n || !e || !password) {
      Alert.alert('Ошибка', 'Заполните имя, почту и пароль');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Ошибка', 'Пароли не совпадают');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Ошибка', 'Пароль должен быть не короче 6 символов');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: e,
        password,
        options: { data: { full_name: n, name: n } },
      });
      if (error) {
        Alert.alert('Регистрация не удалась', error.message);
        return;
      }
      router.replace('/(auth)/login');
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
              Регистрация
            </ThemedText>
            <ThemedText style={styles.hint}>Создайте учётную запись</ThemedText>

            <ThemedText style={styles.label}>Имя</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: glass.border, backgroundColor: glass.backgroundSubtle, color: textColor }]}
              placeholder="Как к вам обращаться"
              placeholderTextColor={glass.border}
              value={name}
              onChangeText={setName}
            />

            <ThemedText style={styles.label}>Почта</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: glass.border, backgroundColor: glass.backgroundSubtle, color: textColor }]}
              placeholder="email@example.com"
              placeholderTextColor={glass.border}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <ThemedText style={styles.label}>Пароль</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: glass.border, backgroundColor: glass.backgroundSubtle, color: textColor }]}
              placeholder="Не менее 6 символов"
              placeholderTextColor={glass.border}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <ThemedText style={styles.label}>Подтвердите пароль</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: glass.border, backgroundColor: glass.backgroundSubtle, color: textColor }]}
              placeholder="Повторите пароль"
              placeholderTextColor={glass.border}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
            />

            <GradientButton
              title={submitting ? 'Регистрация...' : 'Зарегистрироваться'}
              onPress={() => void handleRegister()}
              disabled={submitting}
              fullWidth
            />
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  inner: { maxWidth: 400, width: '100%', alignSelf: 'center' },
  title: { marginBottom: 8, textAlign: 'center', fontSize: 28 },
  hint: { opacity: 0.75, marginBottom: 24, textAlign: 'center', fontSize: 14 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
});
