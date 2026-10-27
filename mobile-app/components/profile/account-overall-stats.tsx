import { IconSize, Radius, Spacing } from '@/constants/theme';
import { useAccountOverallStats } from '@/hooks/api/useAccountOverallStats';
import { staggerEnter } from '@/hooks/use-enter-animation';
import { useAppTheme, useGlass, useGlow } from '@/hooks/use-theme-color';
import { useTheme } from '@/contexts/theme-context';
import { useIsFocused } from '@react-navigation/native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated from 'react-native-reanimated';
import { ThemedText } from '../themed-text';
import { GlassCard } from '../ui/glass-card';
import { IconSymbol, type IconSymbolName } from '../ui/icon-symbol';
import { ProgressBar } from '../ui/progress-bar';

type AccountOverallStatsProps = {
  /** Хук поднят на уровень экрана — страница показывает поверх себя спиннер. */
  stats: ReturnType<typeof useAccountOverallStats>;
  refreshKey?: number;
};

type OutcomeDonutProps = {
  passed: number;
  failed: number;
  caption: string;
  successColor: string;
  errorColor: string;
  trackColor: string;
};

type OutcomeLineProps = {
  icon: IconSymbolName;
  label: string;
  count: number;
  percent: string;
  color: string;
  backgroundColor: string;
  neutralColor: string;
};

const ringSize = Spacing.card * 5;
const ringStroke = Spacing.card / 2;
const ringRadius = (ringSize - Spacing.card) / 2;
const metricWatermarkSize = Spacing.card * 6;

function OutcomeDonut({ passed, failed, caption, successColor, errorColor, trackColor }: OutcomeDonutProps) {
  const attempts = passed + failed;
  const successPercent = attempts > 0 ? Math.round((passed / attempts) * 100) : null;
  const circumference = 2 * Math.PI * ringRadius;
  const successLength = attempts > 0 ? (passed / attempts) * circumference : 0;
  const failureLength = attempts > 0 ? (failed / attempts) * circumference : 0;

  return (
    <View style={styles.donut}>
      <Svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} accessible={false}>
        <Circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={ringRadius}
          fill="none"
          stroke={trackColor}
          strokeWidth={ringStroke}
        />
        {successLength > 0 ? (
          <Circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={ringRadius}
            fill="none"
            stroke={successColor}
            strokeWidth={ringStroke}
            strokeDasharray={`${successLength} ${circumference}`}
            transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
            strokeLinecap="round"
          />
        ) : null}
        {failureLength > 0 ? (
          <Circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={ringRadius}
            fill="none"
            stroke={errorColor}
            strokeWidth={ringStroke}
            strokeDasharray={`${failureLength} ${circumference}`}
            strokeDashoffset={-successLength}
            transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
            strokeLinecap="round"
          />
        ) : null}
      </Svg>
      <View pointerEvents="none" style={styles.donutLabel}>
        <ThemedText type="defaultSemiBold">
          {successPercent === null ? '—' : `${successPercent}%`}
        </ThemedText>
        <ThemedText type="caption" style={styles.donutCaption}>
          {successPercent === null ? 'нет попыток' : caption}
        </ThemedText>
      </View>
    </View>
  );
}

function OutcomeLine({ icon, label, count, percent, color, backgroundColor, neutralColor }: OutcomeLineProps) {
  return (
    <View style={styles.outcomeLine}>
      <View style={[styles.outcomeIcon, { backgroundColor }]}>
        <IconSymbol name={icon} size={Spacing.card} color={color} />
      </View>
      <ThemedText type="caption" style={[styles.outcomeName, { color: neutralColor }]} numberOfLines={1}>
        {label}
      </ThemedText>
      <ThemedText type="defaultSemiBold" style={styles.outcomeCount}>
        {count}
      </ThemedText>
      <ThemedText type="caption" style={[styles.outcomePercent, { color: neutralColor }]}>
        {percent}
      </ThemedText>
    </View>
  );
}

export function AccountOverallStats({ stats, refreshKey = 0 }: AccountOverallStatsProps) {
  const {
    primary,
    warning,
    success,
    error,
    neutral,
    neutralSoft,
    primaryContainer,
    warningContainer,
    errorContainer,
    successContainer,
  } = useAppTheme();
  const glass = useGlass();
  const glow = useGlow();
  const { theme } = useTheme();
  const { data, isLoading, error: statsError, fetchData } = stats;
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      void fetchData();
    }
  }, [isFocused, fetchData, refreshKey]);

  const overallTotal = data.totals.documents + data.totals.tests + data.totals.rescues;
  const overallCompleted = data.counts.documentsRead + data.counts.testsPassed + data.counts.rescuesPassed;
  const overallPercent = overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0;
  const testAttempts = data.counts.testsPassed + data.counts.testsFailed;
  const rescueAttempts = data.counts.rescuesPassed + data.counts.rescuesFailed;
  const testSuccessPercent = testAttempts > 0 ? Math.round((data.counts.testsPassed / testAttempts) * 100) : null;
  const testFailurePercent = testAttempts > 0 ? Math.round((data.counts.testsFailed / testAttempts) * 100) : null;
  const rescueSuccessPercent = rescueAttempts > 0 ? Math.round((data.counts.rescuesPassed / rescueAttempts) * 100) : null;
  const rescueFailurePercent = rescueAttempts > 0 ? Math.round((data.counts.rescuesFailed / rescueAttempts) * 100) : null;

  const metrics = [
    {
      icon: 'book.fill' as const,
      label: 'Статьи',
      value: `${data.documentsReadPercent}%`,
      color: primary,
      backgroundColor: primaryContainer,
      tint: glass.primaryTint,
      border: glass.primaryBorder,
      glow: glow.primary,
    },
    {
      icon: 'list.bullet.clipboard.fill' as const,
      label: 'Тесты',
      value: `${data.testsPassedPercent}%`,
      color: warning,
      backgroundColor: warningContainer,
      tint: glass.warningTint,
      border: glass.warningBorder,
      glow: glow.warning,
    },
    {
      icon: 'cross.case.fill' as const,
      label: 'Режимы спасения',
      value: `${data.rescuesPassedPercent}%`,
      color: error,
      backgroundColor: errorContainer,
      tint: glass.dangerTint,
      border: glass.dangerBorder,
      glow: glow.danger,
    },
    {
      icon: 'chart.bar.fill' as const,
      label: 'Общий прогресс',
      value: `${overallPercent}%`,
      color: success,
      backgroundColor: successContainer,
      tint: glass.successTint,
      border: glass.successBorder,
      glow: glow.success,
    },
  ];

  if (isLoading) {
    return null;
  }

  if (statsError) {
    return <ThemedText style={[styles.errorText, { color: error }]}>Не удалось загрузить статистику</ThemedText>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.metricsGrid}>
        {metrics.map((metric, index) => (
          <Animated.View key={metric.label} entering={staggerEnter(index + 1)} style={styles.metricCell}>
            <GlassCard
              padding={Spacing.card}
              borderRadius={Radius.lg}
              style={[
                styles.metricCard,
                { backgroundColor: metric.tint, borderColor: metric.border },
                theme === 'dark' && { shadowColor: metric.glow, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
              ]}
            >
              <View pointerEvents="none" style={[styles.watermark, { opacity: 0.15 }]}>
                <IconSymbol name={metric.icon} size={metricWatermarkSize} color={metric.color} />
              </View>
              <View style={styles.metricHeader}>
                <View
                  style={[
                    styles.metricIcon,
                    styles.metricIconGlow,
                    { backgroundColor: metric.backgroundColor, shadowColor: metric.glow },
                  ]}
                >
                  <IconSymbol name={metric.icon} size={IconSize.metric} color={metric.color} />
                </View>
                <ThemedText type="subtitle" style={[styles.metricLabel, { color: neutral }]} numberOfLines={2}>
                  {metric.label}
                </ThemedText>
              </View>
              <View style={styles.metricValueRow}>
                <ThemedText type="h1" style={styles.metricValue}>{metric.value}</ThemedText>
                <IconSymbol name="chevron.right" size={Spacing.card * 1.25} color={neutralSoft} />
              </View>
            </GlassCard>
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={staggerEnter(5)} style={styles.section}>
        <ThemedText type="h2">Детальная статистика</ThemedText>

        <GlassCard padding={Spacing.card} borderRadius={Radius.lg}>
          <View style={styles.detailHeader}>
            <View style={styles.detailTitleGroup}>
              <View style={[styles.detailIcon, { backgroundColor: primaryContainer }]}>
                <IconSymbol name="book.fill" size={IconSize.metric} color={primary} />
              </View>
              <View style={styles.detailTitleText}>
                <ThemedText type="defaultSemiBold">Статьи</ThemedText>
                <ThemedText type="caption" style={{ color: neutral }}>
                  {data.counts.documentsRead}/{data.totals.documents} прочитано
                </ThemedText>
              </View>
            </View>
            <ThemedText type="defaultSemiBold">{data.documentsReadPercent}%</ThemedText>
          </View>
          <ProgressBar
            current={data.counts.documentsRead}
            total={data.totals.documents || 1}
            variant="brand"
          />
        </GlassCard>

        <GlassCard padding={Spacing.card} borderRadius={Radius.lg}>
          <View style={styles.detailHeader}>
            <View style={styles.detailTitleGroup}>
              <View style={[styles.detailIcon, { backgroundColor: warningContainer }]}>
                <IconSymbol name="list.bullet.clipboard.fill" size={IconSize.metric} color={warning} />
              </View>
              <View style={styles.detailTitleText}>
                <ThemedText type="defaultSemiBold">Тесты</ThemedText>
                <ThemedText type="caption" style={{ color: neutral }}>
                  {data.counts.testsPassed}/{data.totals.tests} пройдено
                </ThemedText>
              </View>
            </View>
            <ThemedText type="defaultSemiBold">{data.testsPassedPercent}%</ThemedText>
          </View>
          <ProgressBar current={data.counts.testsPassed} total={data.totals.tests || 1} variant="brand" />
          <View style={[styles.outcomePanel, { backgroundColor: glass.backgroundSubtle, borderColor: glass.border }]}>
            <OutcomeDonut
              passed={data.counts.testsPassed}
              failed={data.counts.testsFailed}
              caption="успешных ответов"
              successColor={success}
              errorColor={error}
              trackColor={glass.progressTrack}
            />
            <View style={styles.outcomeList}>
              <OutcomeLine
                icon="checkmark.circle.fill"
                label="Успешно"
                count={data.counts.testsPassed}
                percent={testSuccessPercent === null ? '—' : `${testSuccessPercent}%`}
                color={success}
                backgroundColor={successContainer}
                neutralColor={neutral}
              />
              <OutcomeLine
                icon="xmark.circle.fill"
                label="Неуспешно"
                count={data.counts.testsFailed}
                percent={testFailurePercent === null ? '—' : `${testFailurePercent}%`}
                color={error}
                backgroundColor={errorContainer}
                neutralColor={neutral}
              />
            </View>
          </View>
        </GlassCard>

        <GlassCard padding={Spacing.card} borderRadius={Radius.lg}>
          <View style={styles.detailHeader}>
            <View style={styles.detailTitleGroup}>
              <View style={[styles.detailIcon, { backgroundColor: errorContainer }]}>
                <IconSymbol name="cross.case.fill" size={IconSize.metric} color={error} />
              </View>
              <View style={styles.detailTitleText}>
                <ThemedText type="defaultSemiBold">Режимы спасения</ThemedText>
                <ThemedText type="caption" style={{ color: neutral }}>
                  {data.counts.rescuesPassed}/{data.totals.rescues} пройдено
                </ThemedText>
              </View>
            </View>
            <ThemedText type="defaultSemiBold">{data.rescuesPassedPercent}%</ThemedText>
          </View>
          <ProgressBar current={data.counts.rescuesPassed} total={data.totals.rescues || 1} variant="brand" />
          <View style={[styles.outcomePanel, { backgroundColor: glass.backgroundSubtle, borderColor: glass.border }]}>
            <OutcomeDonut
              passed={data.counts.rescuesPassed}
              failed={data.counts.rescuesFailed}
              caption="успешных сценариев"
              successColor={success}
              errorColor={error}
              trackColor={glass.progressTrack}
            />
            <View style={styles.outcomeList}>
              <OutcomeLine
                icon="checkmark.circle.fill"
                label="Успешно"
                count={data.counts.rescuesPassed}
                percent={rescueSuccessPercent === null ? '—' : `${rescueSuccessPercent}%`}
                color={success}
                backgroundColor={successContainer}
                neutralColor={neutral}
              />
              <OutcomeLine
                icon="xmark.circle.fill"
                label="Неуспешно"
                count={data.counts.rescuesFailed}
                percent={rescueFailurePercent === null ? '—' : `${rescueFailurePercent}%`}
                color={error}
                backgroundColor={errorContainer}
                neutralColor={neutral}
              />
            </View>
          </View>
        </GlassCard>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.card * 1.5,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.card / 2,
  },
  metricCell: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 0,
  },
  metricCard: {
    justifyContent: 'space-between',
    minHeight: Spacing.card * 7,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.card / 2,
  },
  metricIcon: {
    width: Spacing.minTouchTarget,
    height: Spacing.minTouchTarget,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIconGlow: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 2,
  },
  metricLabel: {
    flex: 1,
  },
  watermark: {
    position: 'absolute',
    width: metricWatermarkSize,
    height: metricWatermarkSize,
    alignItems: 'center',
    justifyContent: 'center',
    bottom: -(metricWatermarkSize / 2 + Spacing.card),
    right: -(metricWatermarkSize / 2 + Spacing.card),
    transform: [{ translateX: -10 }, { translateY: -10 }],
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricValue: {
    marginLeft: 5,
  },
  section: {
    gap: Spacing.card,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.card / 2,
    marginBottom: Spacing.card,
  },
  detailTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.card / 2,
    flex: 1,
    minWidth: 0,
  },
  detailIcon: {
    width: Spacing.minTouchTarget,
    height: Spacing.minTouchTarget,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTitleText: {
    flex: 1,
    minWidth: 0,
  },
  outcomePanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.card,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.card / 2,
    marginTop: Spacing.card,
  },
  donut: {
    width: ringSize,
    height: ringSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCaption: {
    textAlign: 'center',
  },
  outcomeList: {
    flex: 1,
    gap: Spacing.card / 2,
    minWidth: 0,
  },
  outcomeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.card / 3,
  },
  outcomeIcon: {
    width: Spacing.card * 2,
    height: Spacing.card * 2,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outcomeName: {
    flex: 1,
    minWidth: 0,
  },
  outcomeCount: {
    minWidth: Spacing.card,
    textAlign: 'right',
  },
  outcomePercent: {
    minWidth: Spacing.minTouchTarget,
    textAlign: 'right',
  },
  errorText: {
    marginTop: Spacing.card,
  },
});
