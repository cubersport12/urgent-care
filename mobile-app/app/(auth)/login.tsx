import { ApiError } from '@/api/utils';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenBackground } from '@/components/ui/screen-background';
import { useAppTheme, useGlass } from '@/hooks/use-theme-color';
import { showAlert } from '@/lib/alert';
import { login, loginWithCode, requestLoginCode, resendVerification } from '@/lib/auth-api';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

type GlassInputProps = {
  label: string;
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'email' | 'password' | 'name' | 'off' | 'username' | 'one-time-code';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  maxLength?: number;
};

function GlassInput({
  label,
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  autoCapitalize,
  autoComplete,
  keyboardType,
  maxLength,
}: GlassInputProps) {
  const { primary: tintColor, text: textColor, neutralSoft } = useAppTheme();
  const glass = useGlass();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = secureTextEntry;
  const shouldHideText = isPassword && !showPassword;

  return (
    <View style={styles.inputContainer}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <View
        style={[
          styles.inputWrapper,
          {
            borderColor: isFocused ? tintColor : glass.border,
            backgroundColor: isFocused ? glass.backgroundHover : glass.backgroundSubtle,
          },
        ]}
      >
        <IconSymbol
          name={icon as never}
          size={20}
          color={isFocused ? tintColor : neutralSoft}
          style={styles.leftIcon}
        />
        <TextInput
          style={[styles.textInput, { color: textColor }]}
          placeholder={placeholder}
          placeholderTextColor={neutralSoft}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={shouldHideText}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          keyboardType={keyboardType}
          maxLength={maxLength}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {isPassword ? (
          <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.rightIcon}>
            <IconSymbol
              name={showPassword ? 'eye.slash.fill' : 'eye.fill'}
              size={20}
              color={neutralSoft}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const { primary: tintColor, layout1, border } = useAppTheme();
  const glass = useGlass();
  const [mode, setMode] = useState<'password' | 'code'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notVerifiedEmail, setNotVerifiedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const handleLogin = async () => {
    const e = email.trim();
    if (!e || !password) {
      showAlert('Ошибка', 'Введите почту и пароль');
      return;
    }
    setSubmitting(true);
    try {
      try {
        await login(e, password);
        router.replace('/(tabs)');
      } catch (err) {
        if (err instanceof ApiError && err.status_code === 403 && err.detail === 'Email not verified') {
          setNotVerifiedEmail(e);
        } else {
          showAlert('Не удалось войти', err instanceof Error ? err.message : 'Ошибка входа');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!notVerifiedEmail || resending) return;
    setResending(true);
    try {
      await resendVerification(notVerifiedEmail);
      showAlert('Готово', 'Письмо отправлено. Проверьте почту.');
    } catch (err) {
      showAlert('Ошибка', err instanceof Error ? err.message : 'Не удалось отправить письмо');
    } finally {
      setResending(false);
    }
  };

  const handleSendCode = async () => {
    const e = email.trim();
    if (!e) {
      showAlert('Ошибка', 'Введите почту');
      return;
    }
    setSubmitting(true);
    try {
      await requestLoginCode(e);
      setCodeSent(true);
    } catch (err) {
      showAlert('Ошибка', err instanceof Error ? err.message : 'Не удалось отправить код');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoginWithCode = async () => {
    const e = email.trim();
    if (code.length !== 6) {
      showAlert('Ошибка', 'Введите 6-значный код из письма');
      return;
    }
    setSubmitting(true);
    try {
      await loginWithCode(e, code);
      router.replace('/(tabs)');
    } catch (err) {
      showAlert('Не удалось войти', err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'password' ? 'code' : 'password');
    setCodeSent(false);
    setCode('');
    setNotVerifiedEmail(null);
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
          <View
            style={[
              styles.card,
              {
                backgroundColor: layout1,
                borderColor: border,
              },
            ]}
          >
            <View style={[styles.logoCircle, { borderColor: glass.border, backgroundColor: glass.backgroundSubtle }]}>
              <IconSymbol name="cross.fill" size={32} color={tintColor} />
            </View>

            <ThemedText type="h1" style={styles.title}>
              Вход
            </ThemedText>
            <ThemedText style={styles.hint}>
              {mode === 'password'
                ? 'Введите почту и пароль учётной записи'
                : 'Мы пришлём код на вашу почту'}
            </ThemedText>

            <GlassInput
              label="Электронная почта"
              icon="envelope.fill"
              placeholder="email@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
            />

            {mode === 'password' ? (
              <>
                <GlassInput
                  label="Пароль"
                  icon="lock.fill"
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password"
                />

                {notVerifiedEmail ? (
                  <View style={styles.verifyNotice}>
                    <ThemedText style={styles.verifyText}>
                      Почта не подтверждена. Проверьте письмо или отправьте его ещё раз.
                    </ThemedText>
                    <Pressable onPress={() => void handleResend()} disabled={resending}>
                      <ThemedText style={[styles.resendLink, { color: tintColor }]}>
                        {resending ? 'Отправка...' : 'Отправить письмо повторно'}
                      </ThemedText>
                    </Pressable>
                  </View>
                ) : null}

                <Link href="/(auth)/forgot-password" asChild>
                  <Pressable style={styles.forgotWrap}>
                    <ThemedText style={[styles.forgot, { color: tintColor }]}>Забыли пароль?</ThemedText>
                  </Pressable>
                </Link>

                <View style={styles.buttonContainer}>
                  <Button
                    title={submitting ? 'Вход...' : 'Войти'}
                    onPress={() => void handleLogin()}
                    disabled={submitting}
                    fullWidth
                    size="large"
                  />
                </View>
              </>
            ) : (
              <>
                {codeSent ? (
                  <>
                    <ThemedText style={styles.codeHint}>
                      Код отправлен на {email.trim()}. Он действует 10 минут.
                    </ThemedText>
                    <GlassInput
                      label="Код из письма"
                      icon="envelope.fill"
                      placeholder="000000"
                      value={code}
                      onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
                      autoComplete="one-time-code"
                      keyboardType="numeric"
                      maxLength={6}
                    />
                  </>
                ) : null}
                <View style={styles.buttonContainer}>
                  <Button
                    title={
                      submitting
                        ? codeSent
                          ? 'Вход...'
                          : 'Отправка...'
                        : codeSent
                          ? 'Войти'
                          : 'Отправить код'
                    }
                    onPress={() => void (codeSent ? handleLoginWithCode() : handleSendCode())}
                    disabled={submitting}
                    fullWidth
                    size="large"
                  />
                </View>
              </>
            )}

            <Pressable onPress={toggleMode} style={styles.toggleWrap}>
              <ThemedText style={[styles.toggleText, { color: tintColor }]}>
                {mode === 'password' ? 'Войти по коду из письма' : 'Войти по паролю'}
              </ThemedText>
            </Pressable>

            <Link href="/(auth)/register" asChild>
              <Pressable style={styles.linkWrap}>
                <ThemedText style={styles.linkText}>
                  Нет аккаунта?{' '}
                  <ThemedText style={[styles.link, { color: tintColor }]}>Зарегистрироваться</ThemedText>
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
    padding: 24,
  },
  card: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: 'bold',
  },
  hint: {
    opacity: 0.75,
    marginBottom: 28,
    textAlign: 'center',
    fontSize: 14,
  },
  codeHint: {
    opacity: 0.75,
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },
  inputContainer: {
    marginBottom: 18,
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.9,
    paddingLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 14,
  },
  leftIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    paddingVertical: 0,
  },
  rightIcon: {
    padding: 4,
    marginLeft: 8,
  },
  buttonContainer: {
    marginTop: 12,
    width: '100%',
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: -6,
    marginBottom: 8,
    paddingVertical: 4,
  },
  forgot: {
    fontSize: 14,
    fontWeight: '600',
  },
  verifyNotice: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.4)',
    gap: 8,
  },
  verifyText: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.85,
  },
  resendLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  toggleWrap: {
    marginTop: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  linkWrap: {
    marginTop: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    opacity: 0.8,
  },
  link: {
    fontWeight: '600',
  },
});
