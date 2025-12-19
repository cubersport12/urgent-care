import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useDeviceId } from '@/hooks/use-device-id';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/supabase';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet } from 'react-native';

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const { deviceId } = useDeviceId();
  const tintColor = useThemeColor({}, 'tint');

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
      Alert.alert('Ошибка', 'Не удалось получить идентификатор устройства');
      return;
    }

    Alert.alert(
      'Очистить статистику',
      'Вы уверены, что хотите очистить всю статистику по документам? Это действие нельзя отменить.',
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Очистить',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            try {
              const { error } = await supabase
                .from('articles_stats')
                .delete()
                .eq('clientId', deviceId);

              if (error) {
                throw error;
              }

              Alert.alert('Успешно', 'Статистика по документам очищена');
            } catch (error) {
              console.error('Error clearing stats:', error);
              Alert.alert('Ошибка', 'Не удалось очистить статистику');
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
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
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
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
            <ThemedView style={styles.avatarContainer}>
              <ThemedText style={styles.avatarText}>{userInitial}</ThemedText>
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
    color: '#808080',
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
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
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
    color: '#FFFFFF',
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
