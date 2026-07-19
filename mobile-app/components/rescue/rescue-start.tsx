import { Spacing } from '@/constants/theme';
import { useChromeBack } from '@/contexts/chrome-back-context';
import { useNavRail } from '@/contexts/nav-rail-context';
import { AppRescueItemVm, RescueTimerParameterVm } from '@/hooks/api/types';
import { formatSecondsAsHms } from '@/lib/rescue-timer-format';
import { useAddOrUpdateRescueStats } from '@/hooks/api/useRescueStats';
import { useAppTheme } from '@/hooks/use-theme-color';
import { useDeviceId } from '@/hooks/use-device-id';
import { useCallback, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../explorer/back-button';
import { ThemedText } from '../themed-text';
import { GlassCard } from '../ui/glass-card';
import { Button } from '../ui/button';
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
  const insets = useSafeAreaInsets();
  const { isWide } = useNavRail();
  useChromeBack(onBack);
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
  const footerPaddingBottom =
    Math.max(insets.bottom, 12) + (isWide ? 12 : Spacing.nav);

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
        {!isWide ? <BackButton onPress={onBack} label="Назад" /> : null}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText type="h1" style={styles.title}>
            {rescueItem.name}
          </ThemedText>

          {rescueItem.createdAt && (
            <GlassCard padding={16} borderRadius={12} style={styles.infoCard}>
              <View style={styles.infoRowHorizontal}>
                <IconSymbol name="clock.fill" size={20} color={tintColor} />
                <ThemedText style={styles.infoLabel}>Создано:</ThemedText>
              </View>
              <ThemedText style={styles.infoValue}>{formatDate(rescueItem.createdAt)}</ThemedText>
            </GlassCard>
          )}

          {rescueItem.description && (
            <GlassCard padding={16} borderRadius={12} style={styles.infoCard}>
              <View style={styles.infoRowHorizontal}>
                <IconSymbol name="doc.fill" size={20} color={tintColor} />
                <ThemedText style={styles.infoLabel}>Описание:</ThemedText>
              </View>
              <ThemedText style={styles.descriptionText}>{rescueItem.description}</ThemedText>
            </GlassCard>
          )}

          {(rescueItem.data?.parameters?.length ?? 0) > 0 && (
            <GlassCard padding={16} borderRadius={12} style={styles.infoCard}>
              <View style={styles.infoRowHorizontal}>
                <IconSymbol name="list.bullet.clipboard.fill" size={20} color={tintColor} />
                <ThemedText style={styles.infoLabel}>Параметры сцены:</ThemedText>
              </View>
              <View style={styles.parametersContainer}>
                {rescueItem.data?.parameters?.map((param) => (
                  <View key={param.id} style={styles.parameterItem}>
                    <ThemedText style={styles.parameterLabel}>{param.name}:</ThemedText>
                    <ThemedText type="mono" style={styles.parameterValue}>
                      {formatTimerParameter(param)}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </GlassCard>
          )}
        </ScrollView>
        <View style={[styles.startButtonContainer, { paddingBottom: footerPaddingBottom }]}>
          <Button
            title={isRecordingStart ? 'Загрузка...' : 'Начать'}
            onPress={() => void handleBegin()}
            disabled={isRecordingStart}
            fullWidth
            size="large"
          />
        </View>
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
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    marginBottom: 24,
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 36,
    textAlign: 'center',
  },
  infoCard: {
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
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
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
    paddingTop: 12,
    paddingHorizontal: 4,
  },
});
