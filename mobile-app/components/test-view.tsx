import { AppTestVm } from '@/hooks/api/types';
import { useAppTheme } from '@/hooks/use-theme-color';
import { staggerEnter } from '@/hooks/use-enter-animation';
import { useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { BackButton } from './explorer/back-button';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { GlassCard } from './ui/glass-card';
import { GradientButton } from './ui/gradient-button';
import { IconSymbol } from './ui/icon-symbol';
import { ScreenBackground } from './ui/screen-background';

type TestViewProps = {
  test: AppTestVm;
  onBack: () => void;
  onStart?: () => void;
};

export function TestView({ test, onBack, onStart }: TestViewProps) {
  const opacity = useSharedValue(0);
  const { primary: tintColor } = useAppTheme();

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <ScreenBackground style={styles.container}>
      <Animated.View style={[styles.inner, animatedStyle]}>
        <BackButton onPress={onBack} label="Назад" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={staggerEnter(0)}>
            <ThemedText type="h1" style={styles.title}>
              {test.name}
            </ThemedText>
          </Animated.View>
          <Animated.View entering={staggerEnter(1)}>
            <GlassCard padding={24} borderRadius={16} style={styles.infoCard}>
              <ThemedText type="caption" style={styles.infoHeading}>
                Информация о тесте
              </ThemedText>
              <ThemedView style={styles.infoGrid}>
                {test.questions && test.questions.length > 0 && (
                  <InfoItem icon="questionmark.circle.fill" label="Вопросов" value={String(test.questions.length)} color={tintColor} />
                )}
                {test.minScore != null && (
                  <InfoItem icon="star.fill" label="Мин. балл" value={String(test.minScore)} color={tintColor} />
                )}
                {test.maxErrors != null && (
                  <InfoItem icon="exclamationmark.triangle.fill" label="Макс. ошибок" value={String(test.maxErrors)} color={tintColor} />
                )}
              </ThemedView>
            </GlassCard>
          </Animated.View>
          {onStart && (
            <Animated.View entering={staggerEnter(2)} style={styles.startWrap}>
              <GradientButton title="Начать тест" onPress={onStart} fullWidth />
            </Animated.View>
          )}
        </ScrollView>
      </Animated.View>
    </ScreenBackground>
  );
}

function InfoItem({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <ThemedView style={styles.infoItem}>
      <IconSymbol name={icon as never} size={24} color={color} />
      <ThemedText style={styles.infoValue}>{value}</ThemedText>
      <ThemedText type="caption">{label}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  scrollContent: { paddingBottom: 96, paddingTop: 8 },
  title: { marginBottom: 16 },
  infoCard: { marginTop: 8 },
  infoHeading: { marginBottom: 16, opacity: 0.7 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  infoItem: { alignItems: 'center', minWidth: 80, gap: 4 },
  infoValue: { fontSize: 24, fontWeight: '300' },
  startWrap: { marginTop: 32 },
});
