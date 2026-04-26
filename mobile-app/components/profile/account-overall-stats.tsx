import { useAccountOverallStats } from '@/hooks/api/useAccountOverallStats';
import { useAppTheme } from '@/hooks/use-theme-color';
import { useIsFocused } from '@react-navigation/native';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RADIUS = 42;
const STROKE_WIDTH = 9;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CIRCLE_SIZE = RADIUS * 2 + STROKE_WIDTH * 2;

type StatCircleProps = {
  label: string;
  value: number;
  color: string;
  trackColor: string;
};

function StatCircle({ label, value, color, trackColor }: StatCircleProps) {
  const isFocused = useIsFocused();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (isFocused) {
      progress.value = 0;
      progress.value = withTiming(value / 100, {
        duration: 900,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [isFocused, progress, value]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  return (
    <ThemedView style={styles.circleItem}>
      <View style={styles.circleWrap}>
        <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={RADIUS}
            stroke={trackColor}
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          <AnimatedCircle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={RADIUS}
            stroke={color}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            animatedProps={animatedProps}
            transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
          />
        </Svg>
        <View style={styles.circleCenter}>
          <ThemedText type="defaultSemiBold" style={styles.circlePercent}>
            {value}%
          </ThemedText>
        </View>
      </View>
      <ThemedText style={styles.circleLabel}>{label}</ThemedText>
    </ThemedView>
  );
}

type AccountOverallStatsProps = {
  refreshKey?: number;
};

export function AccountOverallStats({ refreshKey = 0 }: AccountOverallStatsProps) {
  const { success, error, elevated2, text } = useAppTheme();
  const { data, isLoading, error: statsError, fetchData } = useAccountOverallStats();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      void fetchData();
    }
  }, [isFocused, fetchData, refreshKey]);

  const circles = [
    {
      key: 'docs-read',
      label: 'Документы прочитаны',
      value: data.documentsReadPercent,
      color: success,
    },
    {
      key: 'tests-success',
      label: `Успешно ${data.counts.testsPassed}`,
      value: data.testsPassedPercent,
      color: success,
    },
    {
      key: 'tests-failed',
      label: `Неуспешно ${data.counts.testsFailed}`,
      value: data.testsFailedPercent,
      color: error,
    },
    {
      key: 'rescues-success',
      label: `Успешно ${data.counts.rescuesPassed}`,
      value: data.rescuesPassedPercent,
      color: success,
    },
    {
      key: 'rescues-failed',
      label: `Неуспешно ${data.counts.rescuesFailed}`,
      value: data.rescuesFailedPercent,
      color: error,
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="defaultSemiBold" style={styles.title}>
        Общая статистика
      </ThemedText>
      <ThemedText style={styles.subtitle}>
        Документы: {data.totals.documents} | Тесты: {data.totals.tests} | Спасение: {data.totals.rescues}
      </ThemedText>

      {isLoading ? (
        <ThemedView style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={text} />
          <ThemedText style={styles.loadingText}>Загрузка статистики...</ThemedText>
        </ThemedView>
      ) : null}

      {!isLoading && statsError ? (
        <ThemedView style={styles.loadingWrap}>
          <ThemedText style={styles.errorText}>Не удалось загрузить общую статистику</ThemedText>
        </ThemedView>
      ) : null}

      {!isLoading && !statsError ? (
        <View style={styles.sectionsWrap}>
          <ThemedView style={[styles.sectionCard, { borderColor: elevated2 }]}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Документы
            </ThemedText>
            <View style={styles.circlesGrid}>
              <StatCircle
                key={circles[0].key}
                label={circles[0].label}
                value={circles[0].value}
                color={circles[0].color}
                trackColor={elevated2}
              />
            </View>
          </ThemedView>

          <ThemedView style={[styles.sectionCard, { borderColor: elevated2 }]}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Тесты
            </ThemedText>
            <ThemedText style={styles.sectionSummary}>
              Всего {data.totals.tests}. Из них успешно пройдено {data.counts.testsPassed} и с ошибкой {data.counts.testsFailed}
            </ThemedText>
            <View style={styles.circlesGrid}>
              {circles.slice(1, 3).map((circle) => (
                <StatCircle
                  key={circle.key}
                  label={circle.label}
                  value={circle.value}
                  color={circle.color}
                  trackColor={elevated2}
                />
              ))}
            </View>
          </ThemedView>

          <ThemedView style={[styles.sectionCard, { borderColor: elevated2 }]}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Режим спасения
            </ThemedText>
            <ThemedText style={styles.sectionSummary}>
              Всего {data.totals.rescues}. Из них успешно пройдено {data.counts.rescuesPassed} и с ошибкой {data.counts.rescuesFailed}
            </ThemedText>
            <View style={styles.circlesGrid}>
              {circles.slice(3).map((circle) => (
                <StatCircle
                  key={circle.key}
                  label={circle.label}
                  value={circle.value}
                  color={circle.color}
                  trackColor={elevated2}
                />
              ))}
            </View>
          </ThemedView>
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    paddingVertical: 8,
    gap: 8,
  },
  title: {
    fontSize: 20,
  },
  subtitle: {
    opacity: 0.72,
    fontSize: 13,
  },
  circlesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  sectionsWrap: {
    marginTop: 8,
    gap: 12,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
  },
  sectionSummary: {
    fontSize: 13,
    opacity: 0.78,
    lineHeight: 18,
  },
  circleItem: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 14,
  },
  circleWrap: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleCenter: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circlePercent: {
    fontSize: 20,
  },
  circleLabel: {
    marginTop: 8,
    fontSize: 13,
    textAlign: 'center',
    opacity: 0.88,
  },
  loadingWrap: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.75,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
  },
});

