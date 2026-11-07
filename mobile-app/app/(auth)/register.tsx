import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { GlassInput } from '@/components/ui/glass-input';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenBackground } from '@/components/ui/screen-background';
import { AuthForm, Spacing } from '@/constants/theme';
import { useAppTheme, useGlass } from '@/hooks/use-theme-color';
import { register } from '@/lib/auth-api';
import { showAlert } from '@/lib/alert';
import { legalDocFileUrl } from '@/lib/legal-docs';
import { Link, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

export default function RegisterScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const { primary: tintColor, layout1, border, onPrimary } = useAppTheme();
  const glass = useGlass();
  const compact = height < AuthForm.compactViewportHeight;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async () => {
    const e = email.trim();
    if (!e || !password) {
      showAlert('Ошибка', 'Заполните почту и пароль');
      return;
    }
    if (!consentAccepted) {
      showAlert(
        'Требуется согласие',
        'Необходимо согласие на обработку персональных данных',
      );
      return;
    }
    if (password !== confirm) {
      showAlert('Ошибка', 'Пароли не совпадают');
      return;
    }
    if (password.length < 6) {
      showAlert('Ошибка', 'Пароль должен быть не короче 6 символов');
      return;
    }

    setSubmitting(true);
    try {
      try {
        await register(e, password);
        showAlert(
          'Проверьте почту',
          `Мы отправили ссылку для подтверждения на ${e}. Подтвердите почту и войдите.`,
          () => router.replace('/(auth)/login'),
        );
      } catch (err) {
        showAlert(
          'Регистрация не удалась',
          err instanceof Error ? err.message : 'Ошибка регистрации',
        );
      }
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
          contentContainerStyle={[styles.scroll, compact && styles.compactScroll]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.card,
              compact && styles.compactCard,
              {
                backgroundColor: layout1,
                borderColor: border,
              },
            ]}
          >
            <View style={[
              styles.logoCircle,
              compact && styles.compactLogoCircle,
              { borderColor: glass.border, backgroundColor: glass.backgroundSubtle },
            ]}>
              <IconSymbol name="plus.circle.fill" size={32} color={tintColor} />
            </View>

            <ThemedText type="h1" style={styles.title}>
              Регистрация
            </ThemedText>
            <ThemedText style={[styles.hint, compact && styles.compactHint]}>Создайте учётную запись</ThemedText>

            <GlassInput
              label="Электронная почта"
              icon="envelope.fill"
              placeholder="email@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              compact={compact}
            />

            <GlassInput
              label="Пароль"
              icon="lock.fill"
              placeholder="Не менее 6 символов"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              compact={compact}
            />

            <GlassInput
              label="Подтвердите пароль"
              icon="lock.fill"
              placeholder="Повторите пароль"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              compact={compact}
            />

            <Pressable
              onPress={() => setConsentAccepted((v) => !v)}
              style={styles.consentRow}
            >
              <View
                style={[
                  styles.checkbox,
                  { borderColor: border },
                  consentAccepted && { backgroundColor: tintColor, borderColor: tintColor },
                ]}
              >
                {consentAccepted ? (
                  <IconSymbol name="checkmark" size={14} color={onPrimary} />
                ) : null}
              </View>
              <ThemedText style={styles.consentText}>
                Я даю согласие на обработку персональных данных
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL(legalDocFileUrl('pdn'))}
              style={styles.consentLinkWrap}
            >
              <ThemedText style={[styles.consentLink, { color: tintColor }]}>
                Политика обработки персональных данных
              </ThemedText>
            </Pressable>

            <View style={[styles.buttonContainer, compact && styles.compactButtonContainer]}>
              <Button
                title={submitting ? 'Регистрация...' : 'Зарегистрироваться'}
                onPress={() => void handleRegister()}
                disabled={submitting}
                fullWidth
                size="large"
              />
            </View>

            <Link href="/(auth)/login" asChild>
              <Pressable style={StyleSheet.flatten([styles.linkWrap, compact && styles.compactLinkWrap])}>
                <ThemedText style={styles.linkText}>
                  Уже есть аккаунт?{' '}
                  <ThemedText style={[styles.link, { color: tintColor }]}>Войти</ThemedText>
                </ThemedText>
              </Pressable>
            </Link>
          </View>
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
    padding: Spacing.lg,
  },
  compactScroll: {
    padding: Spacing.sm,
  },
  card: {
    maxWidth: AuthForm.cardMaxWidth,
    width: '100%',
    alignSelf: 'center',
    borderRadius: 24,
    borderWidth: 1,
    padding: AuthForm.cardPadding,
  },
  compactCard: {
    padding: AuthForm.compactCardPadding,
  },
  logoCircle: {
    width: AuthForm.logoSize,
    height: AuthForm.logoSize,
    borderRadius: AuthForm.logoSize / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: AuthForm.logoGap,
  },
  compactLogoCircle: {
    width: AuthForm.compactLogoSize,
    height: AuthForm.compactLogoSize,
    borderRadius: AuthForm.compactLogoSize / 2,
    marginBottom: Spacing.md,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: 'bold',
  },
  hint: {
    opacity: 0.75,
    marginBottom: AuthForm.cardPadding,
    textAlign: 'center',
    fontSize: 14,
  },
  compactHint: {
    marginBottom: Spacing.card,
  },
  buttonContainer: {
    marginTop: Spacing.md,
    width: '100%',
  },
  compactButtonContainer: {
    marginTop: Spacing.sm,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.85,
  },
  consentLinkWrap: {
    marginLeft: 32,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  consentLink: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  linkWrap: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  compactLinkWrap: {
    marginTop: Spacing.md,
  },
  linkText: {
    fontSize: 14,
    opacity: 0.8,
  },
  link: {
    fontWeight: '600',
  },
});
