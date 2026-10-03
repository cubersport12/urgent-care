import { AppTestVm } from '@/hooks/api/types';
import { useChromeBack } from '@/contexts/chrome-back-context';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useTestsStats } from '@/hooks/api/useTestStats';
import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme-color';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from './explorer/back-button';
import { ThemedText } from './themed-text';
import { GlassCard } from './ui/glass-card';
import { Button } from './ui/button';
import { IconSymbol } from './ui/icon-symbol';
import { NoScreenCapture } from './ui/no-screen-capture';
import { StatusBadge } from './ui/status-badge';
import { ScreenBackground } from './ui/screen-background';

type TestViewProps = {
  test: AppTestVm;
  onBack: () => void;
  onStart?: () => void;
};

export function TestView({ test, onBack, onStart }: TestViewProps) {
  const { isWide } = useNavRail();
  useChromeBack(onBack);
  const { primary: tintColor, border } = useAppTheme();
  const insets = useSafeAreaInsets();
  // Кнопка прибита к низу: таб-бар absolute — нужен запас на его высоту
  const footerPaddingBottom =
    Math.max(insets.bottom, 12) + (isWide ? 12 : Spacing.nav);

  // Массив id — через useMemo: литерал менял бы идентичность на каждый рендер
  // и useTestsStats уходил бы в бесконечный рефетч.
  const testIds = useMemo(() => [test.id], [test.id]);
  const { data: stats, isLoading: isStatsLoading } = useTestsStats(testIds);
  const attempt = stats?.find((s) => s.testId === test.id) ?? null;

  const poolSize = test.questions?.length ?? 0;
  const shownCount =
    test.randomizeQuestions && test.questionsToShow != null && test.questionsToShow > 0
      ? Math.min(test.questionsToShow, poolSize)
      : poolSize;
  const questionsValue =
    test.randomizeQuestions && shownCount < poolSize ? `${shownCount} из ${poolSize}` : String(poolSize);

  const infoRows = [
    { label: 'Вопросов', value: questionsValue },
    test.minScore != null && { label: 'Минимальный балл', value: `${test.minScore}%` },
    test.maxErrors != null && { label: 'Макс. ошибок', value: String(test.maxErrors) },
  ].filter(Boolean) as { label: string; value: string }[];

  // Правила прохождения — из флагов конструктора; «!== false» = включено по умолчанию
  const rules: string[] = [];
  if (test.randomizeQuestions) {
    rules.push('Вопросы идут в случайном порядке');
  }
  if (test.showCorrectAnswer !== false) {
    rules.push('После ответа сразу виден результат');
  }
  if (test.showSkipButton !== false) {
    rules.push('Вопрос можно пропустить');
  }
  if (test.showNavigation !== false && !test.randomizeQuestions) {
    rules.push('Доступна навигация между вопросами');
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('ru-RU', {
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

  return (
    <ScreenBackground style={styles.container}>
      <NoScreenCapture />
      <Animated.View style={styles.inner} entering={FadeIn.duration(300)}>
        {!isWide ? <BackButton onPress={onBack} label="Назад" /> : null}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText type="h1" style={styles.title}>
            {test.name}
          </ThemedText>

          <GlassCard padding={16} borderRadius={12} style={styles.card}>
            <View style={styles.cardHeader}>
              <IconSymbol name="clock.fill" size={20} color={tintColor} />
              <ThemedText style={styles.cardTitle}>Прошлая попытка</ThemedText>
            </View>
            {isStatsLoading ? (
              <ThemedText style={styles.mutedText}>Загрузка...</ThemedText>
            ) : attempt?.passed != null ? (
              <View style={styles.attemptRow}>
                <StatusBadge status={attempt.passed ? 'passed' : 'not-passed'} />
                {attempt.completedAt ? (
                  <ThemedText style={styles.mutedText}>{formatDate(attempt.completedAt)}</ThemedText>
                ) : null}
              </View>
            ) : attempt ? (
              <ThemedText style={styles.mutedText}>Тест начат, но не завершён</ThemedText>
            ) : (
              <ThemedText style={styles.mutedText}>Вы ещё не проходили этот тест</ThemedText>
            )}
          </GlassCard>

          <GlassCard padding={16} borderRadius={12} style={styles.card}>
            <View style={styles.cardHeader}>
              <IconSymbol name="list.bullet.clipboard.fill" size={20} color={tintColor} />
              <ThemedText style={styles.cardTitle}>Информация о тесте</ThemedText>
            </View>
            <View style={styles.rowsContainer}>
              {infoRows.map((row) => (
                <View key={row.label} style={[styles.row, { borderBottomColor: border }]}>
                  <ThemedText style={styles.rowLabel}>{row.label}:</ThemedText>
                  <ThemedText type="mono" style={styles.rowValue}>
                    {row.value}
                  </ThemedText>
                </View>
              ))}
            </View>
          </GlassCard>

          {rules.length > 0 ? (
            <GlassCard padding={16} borderRadius={12} style={styles.card}>
              <View style={styles.cardHeader}>
                <IconSymbol name="checkmark.circle.fill" size={20} color={tintColor} />
                <ThemedText style={styles.cardTitle}>Как проходит тест</ThemedText>
              </View>
              <View style={styles.rulesContainer}>
                {rules.map((rule) => (
                  <View key={rule} style={styles.ruleRow}>
                    <IconSymbol name="checkmark" size={14} color={tintColor} />
                    <ThemedText style={styles.ruleText}>{rule}</ThemedText>
                  </View>
                ))}
              </View>
            </GlassCard>
          ) : null}

          {poolSize === 0 ? (
            <ThemedText style={[styles.mutedText, styles.emptyHint]}>
              В этом тесте пока нет вопросов.
            </ThemedText>
          ) : null}
        </ScrollView>
        <View style={[styles.startButtonContainer, { paddingBottom: footerPaddingBottom }]}>
          <Button
            title="Начать тест"
            onPress={onStart}
            disabled={!onStart || poolSize === 0}
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
  scrollView: { flex: 1 },
  scrollViewContent: {
    flexGrow: 1,
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 16,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    marginBottom: 24,
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 36,
    textAlign: 'center',
  },
  card: { marginBottom: 16, width: '100%', gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 14, opacity: 0.7, fontWeight: '500' },
  attemptRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  mutedText: { fontSize: 15, opacity: 0.7 },
  rowsContainer: { width: '100%', gap: 2 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  rowLabel: { fontSize: 16, fontWeight: '500', flex: 1 },
  rowValue: { fontSize: 16, fontWeight: '600', marginLeft: 12 },
  rulesContainer: { width: '100%', gap: 10 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleText: { fontSize: 15, flex: 1, opacity: 0.9 },
  emptyHint: { textAlign: 'center', marginBottom: 16 },
  startButtonContainer: {
    paddingTop: 12,
    paddingHorizontal: 4,
  },
});
