import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ThemeValues } from '@/constants/theme';
import { useAppTheme, useGlass, useGlow } from '@/hooks/use-theme-color';
import { staggerEnter } from '@/hooks/use-enter-animation';
import type { LockReason } from './types';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

type StudyFolderCardProps = {
  name: string;
  materialCount: number;
  progressPercent: number;
  /** Причина блокировки: золотая рамка + корона (тариф) / трофей (награда); клик обрабатывает родитель */
  locked?: LockReason | null;
  onPress: () => void;
  index: number;
};

export function StudyFolderCard({
  name,
  materialCount,
  progressPercent,
  locked,
  onPress,
  index,
}: StudyFolderCardProps) {
  const { primary, neutralSoft, warning, onWarning, warningContainer } = useAppTheme();
  const glass = useGlass();
  const glow = useGlow();
  const completed = Math.round((progressPercent / 100) * materialCount);
  const countLabel =
    materialCount === 1
      ? '1 материал'
      : materialCount < 5
        ? `${materialCount} материала`
        : `${materialCount} материалов`;
  const lockReason = locked
    ? locked === 'reward'
      ? 'За достижение'
      : 'Тариф выше'
    : null;

  return (
    <Animated.View entering={staggerEnter(index)} style={styles.wrapper}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          {
            opacity: locked ? ThemeValues.disabledOpacity : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        <GlassCard padding={20} borderRadius={16}>
          <View
            style={[
              styles.iconCircle,
              locked
                ? { backgroundColor: warningContainer }
                : { backgroundColor: glass.primaryTint, shadowColor: glow.title },
            ]}
          >
            <IconSymbol
              name={locked ? 'lock.fill' : 'folder.fill'}
              size={32}
              color={locked ? warning : primary}
            />
          </View>
          <ThemedText style={styles.name}>{name}</ThemedText>
          <ThemedText style={[styles.count, { color: neutralSoft }]}>{countLabel}</ThemedText>
          <View style={styles.progress}>
            <ProgressBar current={completed} total={materialCount || 1} height={4} />
          </View>
          {lockReason ? (
            <View style={[styles.lockBand, { backgroundColor: warning }]}>
              <IconSymbol name="lock.fill" size={12} color={onWarning} />
              <ThemedText style={[styles.lockBandText, { color: onWarning }]} numberOfLines={1}>
                {lockReason}
              </ThemedText>
            </View>
          ) : null}
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '48%',
    flexGrow: 1,
    minWidth: 140,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  count: {
    fontSize: 13,
    marginTop: 4,
  },
  progress: {
    marginTop: 12,
  },
  // Золотая полоса причины: отрицательные отступы = padding GlassCard (20),
  // контейнер карточки overflow hidden — полоса до самых краёв с круглыми углами
  lockBand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    marginHorizontal: -20,
    marginBottom: -20,
    paddingVertical: 4,
  },
  lockBandText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
