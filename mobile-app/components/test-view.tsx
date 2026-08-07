import { AppTestVm } from '@/hooks/api/types';
import { useChromeBack } from '@/contexts/chrome-back-context';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useAppTheme } from '@/hooks/use-theme-color';
import { staggerEnter } from '@/hooks/use-enter-animation';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { BackButton } from './explorer/back-button';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { GlassCard } from './ui/glass-card';
import { Button } from './ui/button';
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
  const { isWide } = useNavRail();
  useChromeBack(onBack);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const poolSize = test.questions?.length ?? 0;
  const questionCount =
    test.randomizeQuestions && test.questionsToShow != null && test.questionsToShow > 0
      ? Math.min(test.questionsToShow, poolSize)
      : poolSize;
  const infoLine =
    questionCount > 0 && test.minScore != null
      ? `${questionCount} вопросов | минимум ${test.minScore}%`
      : questionCount > 0
        ? `${questionCount} вопросов`
        : test.minScore != null
          ? `минимум ${test.minScore}%`
          : null;

  return (
    <ScreenBackground style={styles.container}>
      <Animated.View style={[styles.inner, animatedStyle]}>
        {!isWide ? (
          <View style={styles.header}>
            <BackButton onPress={onBack} />
          </View>
        ) : null}

        <View style={styles.centered}>
          <Animated.View entering={staggerEnter(0)} style={styles.titleBlock}>
            <ThemedText type="h1" style={styles.title}>
              {test.name}
            </ThemedText>
            {infoLine ? (
              <ThemedText type="caption" style={styles.subtitle}>
                {infoLine}
              </ThemedText>
            ) : null}
          </Animated.View>

          <Animated.View entering={staggerEnter(1)} style={styles.cardWrap}>
            <GlassCard padding={24} borderRadius={16}>
              <ThemedText type="caption" style={styles.infoHeading}>
                Информация о тесте
              </ThemedText>
              <ThemedView style={styles.infoGrid}>
                {questionCount > 0 && (
                  <InfoItem
                    icon="questionmark.circle.fill"
                    label="Вопросов"
                    value={String(questionCount)}
                    color={tintColor}
                  />
                )}
                {test.minScore != null && (
                  <InfoItem icon="star.fill" label="Мин. балл" value={String(test.minScore)} color={tintColor} />
                )}
                {test.maxErrors != null && (
                  <InfoItem
                    icon="exclamationmark.triangle.fill"
                    label="Макс. ошибок"
                    value={String(test.maxErrors)}
                    color={tintColor}
                  />
                )}
              </ThemedView>
            </GlassCard>
          </Animated.View>

          {onStart ? (
            <Animated.View entering={staggerEnter(2)} style={styles.startWrap}>
              <Button title="Начать тест" onPress={onStart} fullWidth size="large" />
            </Animated.View>
          ) : null}
        </View>
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
  inner: { flex: 1, paddingHorizontal: 16 },
  header: { paddingTop: 12, paddingBottom: 8 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 48,
    gap: 24,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  titleBlock: { alignItems: 'center', gap: 8 },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', opacity: 0.7 },
  cardWrap: { width: '100%' },
  infoHeading: { marginBottom: 16, opacity: 0.7 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 24 },
  infoItem: { alignItems: 'center', minWidth: 80, gap: 4 },
  infoValue: { fontSize: 24, fontWeight: '300' },
  startWrap: { width: '100%' },
});
