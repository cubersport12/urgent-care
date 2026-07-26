import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ScreenBackground } from '@/components/ui/screen-background';
import { ThemePicker } from '@/components/ui/theme-picker';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useAccountOverallStats } from '@/hooks/api/useAccountOverallStats';
import { useDeviceId } from '@/hooks/use-device-id';
import { staggerEnter } from '@/hooks/use-enter-animation';
import { useAppTheme, useGlass } from '@/hooks/use-theme-color';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const settingsItems = [
  { icon: 'globe' as const, label: 'Язык', color: undefined, action: null },
  { icon: 'bell.fill' as const, label: 'Уведомления', color: undefined, action: null },
  { icon: 'info.circle.fill' as const, label: 'О приложении', color: undefined, action: null },
];

function PulseRing() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.08, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    opacity.value = withRepeat(
      withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [scale, opacity]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.pulseRing, ringStyle]} />;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [isClearing, setIsClearing] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { deviceId } = useDeviceId();
  const { primary, neutralSoft, error: dangerColor, text } = useAppTheme();
  const glass = useGlass();
  const { contentPaddingBottom } = useNavRail();
  const { data: stats, fetchData } = useAccountOverallStats();

  const accountName =
    user?.full_name ||
    (user?.email ? user.email.split('@')[0] : null) ||
    'Студент';

  const userInitial = accountName.charAt(0).toUpperCase();

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

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
      Alert.alert('Ошибка', 'Не удалось получить идентификатор устройства');
      return;
    }

    const message =
      'Вы уверены, что хотите очистить всю статистику? Это действие нельзя отменить.';

    const performClear = async () => {
      setIsClearing(true);
      try {
        await apiFetch('/api/v1/stats', { method: 'DELETE' });
        void fetchData();
        Alert.alert('Успешно', 'Статистика очищена');
      } catch (error) {
        console.error('Error clearing stats:', error);
        Alert.alert('Ошибка', 'Не удалось очистить статистику');
      } finally {
        setIsClearing(false);
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm(message)) {
      void performClear();
    } else {
      Alert.alert('Очистить статистику', message, [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Очистить', style: 'destructive', onPress: () => void performClear() },
      ]);
    }
  };

  return (
    <ScreenBackground style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* <Animated.View entering={staggerEnter(0)}>
          <AnimatedOrb />
        </Animated.View> */}

        <Animated.View entering={staggerEnter(1)} style={styles.profileCardWrap}>
          <GlassCard padding={24} borderRadius={16}>
            <View style={styles.avatarBlock}>
              <View style={styles.avatarOuter}>
                <PulseRing />
                <View style={[styles.avatar, { borderColor: 'rgba(0, 132, 255, 0.3)' }]}>
                  <IconSymbol name="person.fill" size={36} color={primary} />
                </View>
              </View>
              <ThemedText style={styles.name}>{accountName}</ThemedText>
              <ThemedText style={[styles.subtitle, { color: neutralSoft }]}>
                {user?.email ?? 'Стоматологический факультет'}
              </ThemedText>
              <View style={styles.statsRow}>
                <ThemedText type="caption" style={{ color: neutralSoft }}>
                  {stats.totals.documents} статей
                </ThemedText>
                <ThemedText type="caption" style={{ color: neutralSoft }}>
                  {stats.totals.tests} тестов
                </ThemedText>
                <ThemedText type="caption" style={{ color: neutralSoft }}>
                  {stats.totals.rescues} режима
                </ThemedText>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        <Animated.View entering={staggerEnter(2)} style={styles.section}>
          <ThemedText type="h2">Прогресс обучения</ThemedText>
          <View style={styles.progressBlock}>
            <ThemedText type="caption" style={{ color: neutralSoft }}>
              Прочитано {stats.counts.documentsRead} из {stats.totals.documents}
            </ThemedText>
            <ProgressBar current={stats.counts.documentsRead} total={stats.totals.documents || 1} />
          </View>
          <View style={styles.progressBlock}>
            <ThemedText type="caption" style={{ color: neutralSoft }}>
              Пройдено {stats.counts.testsPassed} из {stats.totals.tests}
            </ThemedText>
            <ProgressBar current={stats.counts.testsPassed} total={stats.totals.tests || 1} />
          </View>
          <View style={styles.progressBlock}>
            <ThemedText type="caption" style={{ color: neutralSoft }}>
              Пройдено {stats.counts.rescuesPassed} из {stats.totals.rescues}
            </ThemedText>
            <ProgressBar current={stats.counts.rescuesPassed} total={stats.totals.rescues || 1} />
          </View>
        </Animated.View>

        <Animated.View entering={staggerEnter(3)} style={styles.section}>
          <ThemedText type="h2">Настройки</ThemedText>
          <ThemePicker />
          {settingsItems.map((item, i) => (
            <Pressable
              key={item.label}
              style={[styles.settingRow, { backgroundColor: glass.backgroundSubtle, borderColor: glass.borderSubtle }]}
            >
              <IconSymbol name={item.icon} size={20} color={text} />
              <ThemedText style={styles.settingLabel}>{item.label}</ThemedText>
              <IconSymbol name="chevron.right" size={16} color={neutralSoft} />
            </Pressable>
          ))}
          <Pressable
            onPress={() => void handleClearStats()}
            disabled={isClearing}
            style={[styles.settingRow, { backgroundColor: glass.backgroundSubtle, borderColor: glass.borderSubtle }]}
          >
            <IconSymbol name="arrow.counterclockwise" size={20} color={text} />
            <ThemedText style={styles.settingLabel}>Очистить статистику</ThemedText>
            {isClearing ? <ActivityIndicator size="small" color={primary} /> : (
              <IconSymbol name="chevron.right" size={16} color={neutralSoft} />
            )}
          </Pressable>
          <Pressable
            onPress={() => void handleSignOut()}
            disabled={isSigningOut}
            style={[styles.settingRow, { backgroundColor: glass.backgroundSubtle, borderColor: glass.borderSubtle }]}
          >
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color={dangerColor} />
            <ThemedText style={[styles.settingLabel, { color: dangerColor }]}>Выйти</ThemedText>
            {isSigningOut ? <ActivityIndicator size="small" color={dangerColor} /> : null}
          </Pressable>
        </Animated.View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.pageX,
    paddingTop: 16,
  },
  profileCardWrap: {
    zIndex: 1,
  },
  avatarBlock: {
    alignItems: 'center',
    gap: 8,
  },
  avatarOuter: {
    position: 'relative',
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    borderColor: 'rgba(0, 132, 255, 0.15)',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 132, 255, 0.1)',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 132, 255, 0.2)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  name: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 8,
  },
  section: {
    marginTop: 24,
    gap: 12,
  },
  progressBlock: {
    gap: 6,
    marginTop: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  settingLabel: {
    flex: 1,
    fontSize: 14,
  },
});
