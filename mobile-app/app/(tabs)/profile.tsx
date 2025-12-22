import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useDeviceId } from '@/hooks/use-device-id';
import { useAppTheme } from '@/hooks/use-theme-color';
import { supabase } from '@/supabase';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet } from 'react-native';

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const { deviceId } = useDeviceId();
  const { primary: tintColor, layout2: headerBackground, neutral: headerIcon, error: avatarBackground, onPrimary: whiteColor, shadow: shadowColor } = useAppTheme();

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error getting user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void getUser();
  }, []);

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

    const message = 'Вы уверены, что хотите очистить всю статистику по документам и тестам? Это действие нельзя отменить.';
    
    const performClear = async () => {
      setIsClearing(true);
      try {
        // Очищаем статистику статей
        const articlesError = await supabase
          .from('articles_stats')
          .delete()
          .eq('clientId', deviceId);

        if (articlesError.error) {
          throw articlesError.error;
        }

        // Очищаем статистику тестов
        const testsError = await supabase
          .from('tests_stats')
          .delete()
          .eq('clientId', deviceId);

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
      // Для веб используем window.confirm
      if (typeof window !== 'undefined' && window.confirm(message)) {
        void performClear();
      }
    } else {
      // Для нативных платформ используем Alert.alert
      Alert.alert(
        'Очистить статистику',
        message,
        [
          {
            text: 'Отмена',
            style: 'cancel',
          },
          {
            text: 'Очистить',
            style: 'destructive',
            onPress: performClear,
          },
        ]
      );
    }
  };

  const getUserName = () => {
    if (!user) return 'Анонимно';
    
    // Пытаемся получить имя из разных источников
    const email = user.email;
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name;
    
    if (fullName) return fullName;
    if (email) {
      // Берем часть до @ как имя
      return email.split('@')[0];
    }
    
    return 'Анонимно';
  };

  const getUserInitial = () => {
    const name = getUserName();
    if (name === 'Анонимно') return 'А';
    return name.charAt(0).toUpperCase();
  };

  const userName = getUserName();
  const userInitial = getUserInitial();

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: headerBackground, dark: headerBackground }}
      headerImage={
        <IconSymbol
          size={310}
          color={headerIcon}
          name="person.fill"
          style={styles.headerImage}
        />
      }>

      {isLoading ? (
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tintColor} />
        </ThemedView>
      ) : (
        <>
          <ThemedView style={styles.userInfoContainer}>
            <ThemedView style={[styles.avatarContainer, { backgroundColor: headerBackground }]}>
              <ThemedText style={[styles.avatarText, { color: whiteColor }]}>{userInitial}</ThemedText>
            </ThemedView>
            <ThemedText type="defaultSemiBold" style={styles.userName}>
              {userName}
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.buttonContainer}>
            <Button
              title="Очистить статистику"
              variant="error"
              onPress={handleClearStats}
              disabled={isClearing || !deviceId}
              fullWidth
            />
            {isClearing && (
              <ThemedView style={styles.clearingContainer}>
                <ActivityIndicator size="small" color={tintColor} />
                <ThemedText style={styles.clearingText}>Очистка...</ThemedText>
              </ThemedView>
            )}
          </ThemedView>
        </>
      )}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    // color will be set dynamically
    bottom: -90,
    alignSelf: 'center',
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    paddingVertical: 16,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    // backgroundColor will be set dynamically
    justifyContent: 'center',
    alignItems: 'center',
    // shadowColor will be set dynamically
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
    // color will be set dynamically
  },
  userName: {
    fontSize: 20,
  },
  buttonContainer: {
    marginTop: 16,
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
