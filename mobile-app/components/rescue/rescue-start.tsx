import { AppRescueItemVm, RescueTimerParameterVm } from '@/hooks/api/types';
import { formatSecondsAsHms } from '@/lib/rescue-timer-format';
import { useAddOrUpdateRescueStats } from '@/hooks/api/useRescueStats';
import { useAppTheme } from '@/hooks/use-theme-color';
import { useDeviceId } from '@/hooks/use-device-id';
import { useCallback, useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { BackButton } from '../explorer/back-button';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { GlassCard } from '../ui/glass-card';
import { GradientButton } from '../ui/gradient-button';
import { IconSymbol } from '../ui/icon-symbol';
import { ScreenBackground } from '../ui/screen-background';

type RescueStartProps = {
  rescueItem: AppRescueItemVm;
  onBack: () => void;
  /** После перехода к сценам (статистика старта уже записана в rescue_stats) */
  onStart: () => void | Promise<void>;
  /** Вызывается после попытки записать время начала в статистику (например, обновить список в Explorer) */
  onRescueSessionStarted?: () => void;
};

export function RescueStart({ rescueItem, onBack, onStart, onRescueSessionStarted }: RescueStartProps) {
  const { deviceId } = useDeviceId();
  const { addOrUpdate, isLoading: isRecordingStart } = useAddOrUpdateRescueStats({
    clientId: deviceId ?? '',
    rescueId: rescueItem.id,
  });

  const handleBegin = useCallback(async () => {
    try {
      await addOrUpdate({
        startedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('rescue_stats start:', e);
    }
    onRescueSessionStarted?.();
    await onStart();
  }, [addOrUpdate, onRescueSessionStarted, onStart]);

  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const { primary: tintColor } = useAppTheme();

  // Форматируем дату создания
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const formatTimerParameter = (param: RescueTimerParameterVm) => {
    if (param.type === 'timer') {
      return formatSecondsAsHms(param.startValue);
    }
    return String(param.startValue);
  };

  return (
    <ScreenBackground style={styles.container}>
      <Animated.View style={[styles.inner, animatedStyle]}>
        <BackButton onPress={onBack} label="Назад" />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollViewContent, styles.scrollViewContentWithButton]}
        >
          <ThemedText type="h1" style={styles.title}>
            {rescueItem.name}
          </ThemedText>

          {rescueItem.createdAt && (
            <GlassCard padding={16} borderRadius={12} style={styles.infoCard}>
              <ThemedView style={styles.infoRowHorizontal}>
                <IconSymbol name="clock.fill" size={20} color={tintColor} />
                <ThemedText style={styles.infoLabel}>Создано:</ThemedText>
              </ThemedView>
              <ThemedText style={styles.infoValue}>{formatDate(rescueItem.createdAt)}</ThemedText>
            </GlassCard>
          )}

          {rescueItem.description && (
            <GlassCard padding={16} borderRadius={12} style={styles.infoCard}>
              <ThemedView style={styles.infoRowHorizontal}>
                <IconSymbol name="doc.fill" size={20} color={tintColor} />
                <ThemedText style={styles.infoLabel}>Описание:</ThemedText>
              </ThemedView>
              <ThemedText style={styles.descriptionText}>{rescueItem.description}</ThemedText>
            </GlassCard>
          )}

          {(rescueItem.data?.parameters?.length ?? 0) > 0 && (
            <GlassCard padding={16} borderRadius={12} style={styles.infoCard}>
              <ThemedView style={styles.infoRowHorizontal}>
                <IconSymbol name="list.bullet.clipboard.fill" size={20} color={tintColor} />
                <ThemedText style={styles.infoLabel}>Параметры сцены:</ThemedText>
              </ThemedView>
              <ThemedView style={styles.parametersContainer}>
                {rescueItem.data?.parameters?.map((param) => (
                  <ThemedView key={param.id} style={styles.parameterItem}>
                    <ThemedText style={styles.parameterLabel}>{param.name}:</ThemedText>
                    <ThemedText type="mono" style={styles.parameterValue}>
                      {formatTimerParameter(param)}
                    </ThemedText>
                  </ThemedView>
                ))}
              </ThemedView>
            </GlassCard>
          )}
        </ScrollView>
        <ThemedView style={styles.startButtonContainer}>
          <GradientButton
            title={isRecordingStart ? 'Загрузка...' : 'Начать'}
            onPress={() => void handleBegin()}
            disabled={isRecordingStart}
            fullWidth
          />
        </ThemedView>
      </Animated.View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    padding: 20,
  },
  scrollViewContentWithButton: {
    paddingBottom: 100, // Отступ снизу для кнопки
  },
  content: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    marginBottom: 24,
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 36,
    textAlign: 'center',
  },
  infoCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    width: '100%',
    gap: 8,
  },
  infoRowHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    opacity: 0.7,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.9,
  },
  parametersContainer: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  parameterItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  parameterLabel: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  parameterValue: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  startButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'transparent',
  },
  startButton: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    width: '100%',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
});

