import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Radius, Spacing, ThemeValues } from '@/constants/theme';
import { useFileImage } from '@/hooks/api/useFileImage';
import { useAppTheme, useGlass, useGlow } from '@/hooks/use-theme-color';
import { staggerEnter } from '@/hooks/use-enter-animation';
import type { LockReason } from './types';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

type StudyFolderCardProps = {
  name: string;
  iconPath?: string | null;
  backgroundPath?: string | null;
  materialCount: number;
  progressPercent: number;
  /** Причина блокировки: 'tariff' — золотой замок + золотая полоса слева; иначе серый замок без полосы */
  locked?: LockReason | null;
  onPress: () => void;
  index: number;
};

export function StudyFolderCard({
  name,
  iconPath,
  backgroundPath,
  materialCount,
  progressPercent,
  locked,
  onPress,
  index,
}: StudyFolderCardProps) {
  const { primary, neutral, neutralSoft, warning, warningContainer, elevated2 } = useAppTheme();
  const glass = useGlass();
  const { response: icon } = useFileImage(iconPath ?? '');
  const { response: background } = useFileImage(backgroundPath ?? '');
  const [failedIcon, setFailedIcon] = useState<string>();
  const glow = useGlow();
  // Золото с полосой — только тарифный замок; остальные причины помечаем серым замком без полосы
  const isTariffLock = locked === 'tariff';
  const completed = Math.round((progressPercent / 100) * materialCount);
  const countUnit = materialCount === 1 ? 'материал' : materialCount < 5 ? 'материала' : 'материалов';

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
          <GlassCard
            padding={20}
            borderRadius={16}
            backgroundImage={background}
            backgroundImageScrim={glass.folderTileImageScrim}
          >
          {isTariffLock ? (
            <View pointerEvents="none" style={[styles.lockStrip, { backgroundColor: warning }]} />
          ) : null}
          <View
            style={[
              styles.iconCircle,
              locked
                ? isTariffLock
                  ? { backgroundColor: warningContainer }
                  : { backgroundColor: elevated2 }
                : { backgroundColor: glass.primaryTint, shadowColor: glow.title },
            ]}
          >
            {icon && failedIcon !== icon ? (
              <Image source={{ uri: icon }} resizeMode="contain" style={styles.iconImage} onError={() => setFailedIcon(icon)} />
            ) : (
              <IconSymbol name={locked ? 'lock.fill' : 'folder.fill'} size={32} color={locked ? (isTariffLock ? warning : neutral) : primary} />
            )}
          </View>
          {locked && icon && failedIcon !== icon ? (
            <View style={[styles.lockBadge, { backgroundColor: isTariffLock ? warningContainer : elevated2 }]}>
              <IconSymbol name="lock.fill" size={16} color={isTariffLock ? warning : neutral} />
            </View>
          ) : null}
          <ThemedText type="defaultSemiBold" style={styles.name} numberOfLines={2}>{name}</ThemedText>
          <View style={styles.countRow}>
            <ThemedText type="title">{materialCount}</ThemedText>
            <ThemedText type="caption" style={[styles.countUnit, { color: neutralSoft }]}>{countUnit}</ThemedText>
          </View>
          <View style={styles.progress}>
            <ProgressBar current={completed} total={materialCount || 1} height={4} />
          </View>
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
  iconImage: { width: Spacing.minTouchTarget, height: Spacing.minTouchTarget },
  lockBadge: { position: 'absolute', top: 0, right: 0, borderRadius: Radius.pill, padding: Spacing.card / 4 },
  name: {
    marginTop: 12,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.card / 2,
    marginTop: Spacing.card / 4,
  },
  countUnit: {
    flexShrink: 1,
  },
  progress: {
    marginTop: 12,
  },
  // Вертикальная золотая полоса причины слева: отрицательные отступы = padding GlassCard (20),
  // контейнер карточки overflow hidden — полоса повторяет круглый угол карточки
  lockStrip: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    left: -20,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
});
