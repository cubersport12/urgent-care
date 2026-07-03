import { useAccountOverallStats } from '@/hooks/api/useAccountOverallStats';
import { staggerEnter } from '@/hooks/use-enter-animation';
import { useAppTheme, useGlass } from '@/hooks/use-theme-color';
import { useIsFocused } from '@react-navigation/native';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { ThemedText } from '../themed-text';
import { GlassCard } from '../ui/glass-card';
import { IconSymbol } from '../ui/icon-symbol';
import { ProgressBar } from '../ui/progress-bar';
import { StatusBadge } from '../ui/status-badge';

type AccountOverallStatsProps = {
  refreshKey?: number;
};

const METRIC_COLORS = {
  articles: '#0084FF',
  tests: '#F59E0B',
  rescues: '#FF6B6B',
  overall: '#4D8B31',
};

export function AccountOverallStats({ refreshKey = 0 }: AccountOverallStatsProps) {
  const { primary, text, neutralSoft } = useAppTheme();
  const glass = useGlass();
  const { data, isLoading, error: statsError, fetchData } = useAccountOverallStats();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      void fetchData();
    }
  }, [isFocused, fetchData, refreshKey]);

  const metrics = [
    {
      icon: 'book.fill' as const,
      label: 'Статьи',
      value: `${data.documentsReadPercent}%`,
      color: METRIC_COLORS.articles,
      bg: 'rgba(0, 132, 255, 0.1)',
    },
    {
      icon: 'list.bullet.clipboard.fill' as const,
      label: 'Тесты',
      value: `${data.testsPassedPercent}%`,
      color: METRIC_COLORS.tests,
      bg: 'rgba(245, 158, 11, 0.1)',
    },
    {
      icon: 'cross.fill' as const,
      label: 'Режимы спасения',
      value: `${data.rescuesPassedPercent}%`,
      color: METRIC_COLORS.rescues,
      bg: 'rgba(255, 107, 107, 0.1)',
    },
    {
      icon: 'chart.bar.fill' as const,
      label: 'Общий прогресс',
      value: `${Math.round(
        ((data.counts.documentsRead + data.counts.testsPassed + data.counts.rescuesPassed) /
          Math.max(1, data.totals.documents + data.totals.tests + data.totals.rescues)) *
          100,
      )}%`,
      color: METRIC_COLORS.overall,
      bg: 'rgba(77, 139, 49, 0.1)',
    },
  ];

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color={primary} />
        <ThemedText style={{ color: neutralSoft }}>Загрузка статистики...</ThemedText>
      </View>
    );
  }

  if (statsError) {
    return (
      <ThemedText style={styles.errorText}>Не удалось загрузить статистику</ThemedText>
    );
  }

  return (
    <View style={styles.container}>
      {/* <Animated.View entering={staggerEnter(1)} style={styles.helixWrap}>
        <ParticleHelix />
      </Animated.View> */}

      <View style={styles.metricsGrid}>
        {metrics.map((m, i) => (
          <Animated.View key={m.label} entering={staggerEnter(2 + i)} style={styles.metricCell}>
            <GlassCard padding={16} borderRadius={12}>
              <View style={[styles.metricIcon, { backgroundColor: m.bg }]}>
                <IconSymbol name={m.icon} size={20} color={m.color} />
              </View>
              <ThemedText style={styles.metricValue}>{m.value}</ThemedText>
              <ThemedText type="caption" style={{ color: neutralSoft, marginTop: 6 }}>
                {m.label}
              </ThemedText>
            </GlassCard>
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={staggerEnter(6)} style={styles.section}>
        <ThemedText type="h2">Детальная статистика</ThemedText>

        <View style={styles.detailBlock}>
          <View style={styles.detailHeader}>
            <ThemedText style={styles.detailTitle}>Статьи</ThemedText>
            <ThemedText type="caption" style={{ color: neutralSoft }}>
              {data.counts.documentsRead}/{data.totals.documents}
            </ThemedText>
          </View>
          <ProgressBar current={data.counts.documentsRead} total={data.totals.documents || 1} />
        </View>

        <View style={styles.detailBlock}>
          <View style={styles.detailHeader}>
            <ThemedText style={styles.detailTitle}>Тесты</ThemedText>
            <ThemedText type="caption" style={{ color: neutralSoft }}>
              {data.counts.testsPassed}/{data.totals.tests} пройдено
            </ThemedText>
          </View>
          <ProgressBar current={data.counts.testsPassed} total={data.totals.tests || 1} />
          <View style={[styles.summaryRow, { backgroundColor: glass.row }]}>
            <ThemedText type="caption">Успешно: {data.counts.testsPassed}</ThemedText>
            <StatusBadge status={data.counts.testsPassed > 0 ? 'success' : 'not-passed'} />
          </View>
          <View style={[styles.summaryRow, { backgroundColor: glass.row }]}>
            <ThemedText type="caption">Неуспешно: {data.counts.testsFailed}</ThemedText>
            <StatusBadge status={data.counts.testsFailed > 0 ? 'failure' : 'not-passed'} />
          </View>
        </View>

        <View style={styles.detailBlock}>
          <View style={styles.detailHeader}>
            <ThemedText style={styles.detailTitle}>Режимы спасения</ThemedText>
            <ThemedText type="caption" style={{ color: neutralSoft }}>
              {data.counts.rescuesPassed}/{data.totals.rescues} пройдено
            </ThemedText>
          </View>
          <ProgressBar current={data.counts.rescuesPassed} total={data.totals.rescues || 1} />
          <View style={[styles.summaryRow, { backgroundColor: glass.row }]}>
            <ThemedText type="caption">Успешно: {data.counts.rescuesPassed}</ThemedText>
            <StatusBadge status={data.counts.rescuesPassed > 0 ? 'success' : 'not-passed'} />
          </View>
          <View style={[styles.summaryRow, { backgroundColor: glass.row }]}>
            <ThemedText type="caption">Неуспешно: {data.counts.rescuesFailed}</ThemedText>
            <StatusBadge status={data.counts.rescuesFailed > 0 ? 'failure' : 'not-passed'} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    gap: 24,
  },
  helixWrap: {
    marginTop: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCell: {
    width: '47%',
    flexGrow: 1,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '300',
    marginTop: 12,
    letterSpacing: -0.5,
  },
  section: {
    gap: 16,
  },
  detailBlock: {
    gap: 8,
    marginTop: 8,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  loadingWrap: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: '#FF6B6B',
    marginTop: 24,
  },
});
