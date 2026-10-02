import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { StatusBadge, type StatusType } from '@/components/ui/status-badge';
import { TypeIcon, type MaterialKind } from '@/components/ui/type-icon';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemeValues } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme-color';
import { staggerEnter } from '@/hooks/use-enter-animation';
import type { LockReason } from '@/components/explorer/types';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

type ContentCardProps = {
  title: string;
  description: string;
  kind: MaterialKind;
  status?: StatusType;
  disabled?: boolean;
  /** Причина блокировки: золотая рамка + корона (тариф) / трофей (награда); клик обрабатывает родитель */
  locked?: LockReason | null;
  onPress?: () => void;
  index?: number;
};

export function ContentCard({
  title,
  description,
  kind,
  status,
  disabled = false,
  locked,
  onPress,
  index = 0,
}: ContentCardProps) {
  const { neutralSoft, warning, onWarning } = useAppTheme();
  const lockReason = locked
    ? locked === 'reward'
      ? 'Открывается за достижение'
      : 'Доступно в тарифе выше'
    : null;

  return (
    <Animated.View entering={staggerEnter(index)}>
      <Pressable
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        style={({ pressed }) => [
          {
            opacity: disabled || locked ? ThemeValues.disabledOpacity : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        <GlassCard padding={16} borderRadius={12} style={styles.card}>
          <View style={styles.row}>
            <TypeIcon kind={kind} size={20} locked={!!locked} />
            <View style={styles.body}>
              <ThemedText style={styles.title} numberOfLines={1}>
                {title}
              </ThemedText>
              <ThemedText style={[styles.description, { color: neutralSoft }]} numberOfLines={1}>
                {description}
              </ThemedText>
            </View>
            {locked ? null : status ? <StatusBadge status={status} /> : null}
            <IconSymbol name="chevron.right" size={16} color={neutralSoft} />
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
  card: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    marginTop: 2,
  },
  // Золотая полоса причины: отрицательные отступы = padding GlassCard (16),
  // контейнер карточки overflow hidden — полоса до самых краёв с круглыми углами
  lockBand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    marginHorizontal: -16,
    marginBottom: -16,
    paddingVertical: 4,
  },
  lockBandText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
