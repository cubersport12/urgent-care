import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { useAppTheme } from '@/hooks/use-theme-color';
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
  const { page: backgroundColor, border: borderColor, onLayout1: textColor } = useAppTheme();
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
        options: {
          data: {
            full_name: n,
            name: n,
          },
        },
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
          <ThemedText type="subtitle" style={styles.subtitle}>
            Создайте учётную запись
          </ThemedText>

          <ThemedText style={styles.label}>Имя</ThemedText>
          <TextInput
            style={[styles.input, { borderColor, color: textColor }]}
            placeholder="Как к вам обращаться"
            placeholderTextColor={`${textColor}99`}
            value={name}
            onChangeText={setName}
            autoComplete="name"
            textContentType="name"
          />

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
            placeholder="Не менее 6 символов"
            placeholderTextColor={`${textColor}99`}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />

          <ThemedText style={styles.label}>Подтвердите пароль</ThemedText>
          <TextInput
            style={[styles.input, { borderColor, color: textColor }]}
            placeholder="Повторите пароль"
            placeholderTextColor={`${textColor}99`}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />

          <Button
            title="Зарегистрироваться"
            variant="primary"
            size="large"
            fullWidth
            disabled={submitting}
            onPress={() => void handleRegister()}
            style={styles.primaryBtn}
          />
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
    padding: 24,
    paddingTop: 16,
  },
  inner: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  subtitle: {
    marginBottom: 20,
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
});
