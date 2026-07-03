import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
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
  autoComplete?: 'email' | 'password' | 'name' | 'off' | 'username';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
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
            <ThemedText style={styles.hint}>Введите почту и пароль учётной записи</ThemedText>

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

            <GlassInput
              label="Пароль"
              icon="lock.fill"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />

            <View style={styles.buttonContainer}>
              <Button
                title={submitting ? 'Вход...' : 'Войти'}
                onPress={() => void handleLogin()}
                disabled={submitting}
                fullWidth
                size="large"
              />
            </View>

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
  linkWrap: {
    marginTop: 24,
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
