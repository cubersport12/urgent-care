import { ThemedText } from '@/components/themed-text';
import { ScreenBackground } from '@/components/ui/screen-background';
import { useAppTheme } from '@/hooks/use-theme-color';
import { verifyEmail } from '@/lib/auth-api';
import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

type VerifyState = 'pending' | 'ok' | 'error';

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const { primary: tintColor, layout1, border } = useAppTheme();
  const [state, setState] = useState<VerifyState>('pending');
  const [errorText, setErrorText] = useState('');
  const submitted = useRef(false);

  useEffect(() => {
    if (!token || submitted.current) return;
    submitted.current = true;
    verifyEmail(token)
      .then(() => setState('ok'))
      .catch((err) => {
        setErrorText(err instanceof Error ? err.message : 'Не удалось подтвердить почту');
        setState('error');
      });
  }, [token]);

  return (
    <ScreenBackground style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.card, { backgroundColor: layout1, borderColor: border }]}>
          <ThemedText type="h1" style={styles.title}>
            Подтверждение почты
          </ThemedText>
          {state === 'pending' ? (
            <ActivityIndicator size="large" color={tintColor} style={styles.spinner} />
          ) : state === 'ok' ? (
            <ThemedText style={styles.message}>
              Почта подтверждена. Теперь войдите с вашей почтой и паролем.
            </ThemedText>
          ) : (
            <ThemedText style={styles.message}>
              {errorText || 'Ссылка недействительна или устарела'}
            </ThemedText>
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
  message: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.85,
  },
  spinner: { marginVertical: 12 },
  linkWrap: { alignItems: 'center', paddingTop: 4 },
  link: { fontWeight: '600' },
});
