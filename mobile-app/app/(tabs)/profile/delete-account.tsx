import { deleteAccount } from '@/lib/auth-api';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassInput } from '@/components/ui/glass-input';
import { ScreenAppBar } from '@/components/ui/screen-app-bar';
import { ScreenBackground } from '@/components/ui/screen-background';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useAppTheme } from '@/hooks/use-theme-color';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { error: dangerColor } = useAppTheme();
  const { contentPaddingBottom } = useNavRail();
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!password) {
      Alert.alert('Ошибка', 'Введите пароль для подтверждения');
      return;
    }
    Alert.alert(
      'Удалить аккаунт?',
      'Аккаунт и все связанные с ним данные будут удалены безвозвратно. Это действие нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setDeleting(true);
              try {
                await deleteAccount(password);
                await signOut();
                router.replace('/(auth)/login');
              } catch (e) {
                Alert.alert(
                  'Ошибка',
                  e instanceof Error ? e.message : 'Не удалось удалить аккаунт',
                );
              } finally {
                setDeleting(false);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <ScreenBackground style={styles.root}>
      <ScreenAppBar title="Удаление аккаунта" backFallbackHref="/(tabs)/profile" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard padding={20} borderRadius={16}>
          <ThemedText style={styles.warning}>
            По требованию 152-ФЗ «О персональных данных» вы можете удалить аккаунт вместе со
            всеми данными: профилем, прогрессом, достижениями, подпиской, обращениями в
            поддержку и историей платежей.
          </ThemedText>
          <ThemedText style={[styles.warning, { color: dangerColor }]}>
            Удаление необратимо. Восстановить аккаунт будет невозможно.
          </ThemedText>
          <View style={styles.spacer} />
          <GlassInput
            label="Подтвердите паролем"
            icon="lock.fill"
            placeholder="Ваш пароль"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Button
            title={deleting ? 'Удаление...' : 'Удалить аккаунт'}
            onPress={() => void handleDelete()}
            disabled={deleting}
            fullWidth
            size="large"
            variant="error"
          />
        </GlassCard>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.pageX,
    paddingTop: 8,
  },
  warning: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  spacer: {
    height: 8,
  },
});
