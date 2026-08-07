import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ScreenBackground } from '@/components/ui/screen-background';
import { useAppTheme, useGlass } from '@/hooks/use-theme-color';
import { resetPassword } from '@/lib/auth-api';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const { primary: tintColor, layout1, border, text, neutralSoft } = useAppTheme();
  const glass = useGlass();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!token) {
      Alert.alert('Ошибка', 'Ссылка недействительна');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Ошибка', 'Пароль должен быть не короче 6 символов');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Ошибка', 'Пароли не совпадают');
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(token, password);
      Alert.alert('Готово', 'Пароль обновлён. Войдите с новым паролем.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err) {
      Alert.alert('Ошибка', err instanceof Error ? err.message : 'Не удалось сбросить пароль');
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
        <View style={[styles.card, { backgroundColor: layout1, borderColor: border }]}>
          <ThemedText type="h1" style={styles.title}>
            Новый пароль
          </ThemedText>
          {!token ? (
            <ThemedText style={{ color: neutralSoft, textAlign: 'center' }}>
              В ссылке нет токена. Запросите сброс пароля снова.
            </ThemedText>
          ) : (
            <>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: text,
                    borderColor: glass.border,
                    backgroundColor: glass.backgroundSubtle,
                  },
                ]}
                placeholder="Новый пароль"
                placeholderTextColor={neutralSoft}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    color: text,
                    borderColor: glass.border,
                    backgroundColor: glass.backgroundSubtle,
                  },
                ]}
                placeholder="Повторите пароль"
                placeholderTextColor={neutralSoft}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
              />
              <Button
                title={submitting ? 'Сохранение…' : 'Сохранить пароль'}
                onPress={() => void handleSubmit()}
                disabled={submitting}
                fullWidth
                size="large"
              />
            </>
          )}
          <Link href="/(auth)/login" asChild>
            <Pressable style={styles.linkWrap}>
              <ThemedText style={[styles.link, { color: tintColor }]}>Ко входу</ThemedText>
            </Pressable>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'center', padding: 24 },
  card: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    gap: 14,
  },
  title: { textAlign: 'center', fontSize: 26, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  linkWrap: { alignItems: 'center', paddingTop: 4 },
  link: { fontWeight: '600' },
});
