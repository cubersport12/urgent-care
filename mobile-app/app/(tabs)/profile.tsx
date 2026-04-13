import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/auth-context';
import { useDeviceId } from '@/hooks/use-device-id';
import { useAppTheme } from '@/hooks/use-theme-color';
import { supabase } from '@/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet } from 'react-native';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [isClearing, setIsClearing] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { deviceId } = useDeviceId();
  const {
    primary: tintColor,
    layout2: headerBackground,
    neutral: headerIcon,
    onPrimary: whiteColor,
  } = useAppTheme();

  const accountName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    (user?.email ? user.email.split('@')[0] : null) ||
    '—';
  const accountEmail = user?.email ?? '—';

  const userInitial =
    accountName === '—' ? '?' : accountName.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      router.replace('/(auth)/login');
    } catch (e) {
      console.error('signOut', e);
      Alert.alert('Ошибка', 'Не удалось выйти из учётной записи');
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleClearStats = async () => {
    if (!deviceId) {
      const errorMessage = 'Не удалось получить идентификатор устройства';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(errorMessage);
      } else {
        Alert.alert('Ошибка', errorMessage);
      }
      return;
    }

    const message =
      'Вы уверены, что хотите очистить всю статистику по документам и тестам? Это действие нельзя отменить.';

    const performClear = async () => {
      setIsClearing(true);
      try {
        const articlesError = await supabase.from('articles_stats').delete().eq('clientId', deviceId);

        if (articlesError.error) {
          throw articlesError.error;
        }

        const testsError = await supabase.from('tests_stats').delete().eq('clientId', deviceId);

        if (testsError.error) {
          throw testsError.error;
        }

        const successMessage = 'Статистика по документам и тестам очищена';
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(successMessage);
        } else {
          Alert.alert('Успешно', successMessage);
        }
      } catch (error) {
        console.error('Error clearing stats:', error);
        const errorMessage = 'Не удалось очистить статистику';
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(errorMessage);
        } else {
          Alert.alert('Ошибка', errorMessage);
        }
      } finally {
        setIsClearing(false);
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(message)) {
        void performClear();
      }
    } else {
      Alert.alert('Очистить статистику', message, [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Очистить', style: 'destructive', onPress: () => void performClear() },
      ]);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: headerBackground, dark: headerBackground }}
      headerImage={
        <IconSymbol size={310} color={headerIcon} name="person.fill" style={styles.headerImage} />
      }
    >
      <ThemedView style={styles.userInfoContainer}>
        <ThemedView style={[styles.avatarContainer, { backgroundColor: headerBackground }]}>
          <ThemedText style={[styles.avatarText, { color: whiteColor }]}>{userInitial}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.nameBlock}>
          <ThemedText type="defaultSemiBold" style={styles.userName}>
            {accountName}
          </ThemedText>
          <ThemedText style={styles.emailLine}>{accountEmail}</ThemedText>
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.buttonContainer}>
        <Button
          title="Выйти из учётной записи"
          variant="default"
          onPress={() => void handleSignOut()}
          disabled={isSigningOut}
          fullWidth
        />
        {isSigningOut ? (
          <ThemedView style={styles.clearingContainer}>
            <ActivityIndicator size="small" color={tintColor} />
            <ThemedText style={styles.clearingText}>Выход...</ThemedText>
          </ThemedView>
        ) : null}

        <Button
          title="Очистить статистику"
          variant="error"
          onPress={handleClearStats}
          disabled={isClearing || !deviceId}
          fullWidth
        />
        {isClearing ? (
          <ThemedView style={styles.clearingContainer}>
            <ActivityIndicator size="small" color={tintColor} />
            <ThemedText style={styles.clearingText}>Очистка...</ThemedText>
          </ThemedView>
        ) : null}
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    bottom: -90,
    alignSelf: 'center',
    position: 'absolute',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 24,
    paddingVertical: 16,
  },
  nameBlock: {
    flex: 1,
    gap: 6,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 20,
  },
  emailLine: {
    fontSize: 15,
    opacity: 0.75,
  },
  buttonContainer: {
    marginTop: 8,
    gap: 12,
  },
  clearingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  clearingText: {
    fontSize: 14,
    opacity: 0.7,
  },
});
