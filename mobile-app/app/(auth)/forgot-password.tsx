import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenBackground } from '@/components/ui/screen-background';
import { useAppTheme, useGlass } from '@/hooks/use-theme-color';
import { forgotPassword } from '@/lib/auth-api';
import { Link, useRouter } from 'expo-router';
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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { primary: tintColor, layout1, border, text, neutralSoft } = useAppTheme();
  const glass = useGlass();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const e = email.trim();
    if (!e) {
      Alert.alert('Ошибка', 'Введите почту');
      return;
    }
    setSubmitting(true);
    try {
      await forgotPassword(e);
      Alert.alert(
        'Проверьте почту',
        'Если аккаунт существует, мы отправили ссылку для сброса пароля.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }],
      );
    } catch (err) {
      Alert.alert('Ошибка', err instanceof Error ? err.message : 'Не удалось отправить');
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
            Сброс пароля
          </ThemedText>
          <ThemedText style={[styles.hint, { color: neutralSoft }]}>
            Укажите почту — пришлём ссылку для нового пароля
          </ThemedText>
          <View
            style={[
              styles.inputWrapper,
              { borderColor: glass.border, backgroundColor: glass.backgroundSubtle },
            ]}
          >
            <IconSymbol name="envelope.fill" size={20} color={neutralSoft} style={styles.icon} />
            <TextInput
              style={[styles.input, { color: text }]}
              placeholder="email@example.com"
              placeholderTextColor={neutralSoft}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          <Button
            title={submitting ? 'Отправка…' : 'Отправить ссылку'}
            onPress={() => void handleSubmit()}
            disabled={submitting}
            fullWidth
            size="large"
          />
          <Link href="/(auth)/login" asChild>
            <Pressable style={styles.linkWrap}>
              <ThemedText style={[styles.link, { color: tintColor }]}>Назад ко входу</ThemedText>
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
    gap: 16,
  },
  title: { textAlign: 'center', fontSize: 26 },
  hint: { textAlign: 'center', marginBottom: 4 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  icon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 16 },
  linkWrap: { alignItems: 'center', paddingTop: 4 },
  link: { fontWeight: '600' },
});
