import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { StatusBadge, type StatusType } from '@/components/ui/status-badge';
import { TypeIcon, type MaterialKind } from '@/components/ui/type-icon';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Spacing, ThemeValues } from '@/constants/theme';
import { useFileImage } from '@/hooks/api/useFileImage';
import { useAppTheme } from '@/hooks/use-theme-color';
import { staggerEnter } from '@/hooks/use-enter-animation';
import type { LockReason } from '@/components/explorer/types';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

type ContentCardProps = {
  title: string;
  description: string;
  kind: MaterialKind;
  iconPath?: string | null;
  backgroundPath?: string | null;
  status?: StatusType;
  disabled?: boolean;
  /** Причина блокировки: 'tariff' — золотой замок + золотая полоса слева; иначе серый замок без полосы */
  locked?: LockReason | null;
  onPress?: () => void;
  index?: number;
};

export function ContentCard({
  title,
  description,
  kind,
  iconPath,
  backgroundPath,
  status,
  disabled = false,
  locked,
  onPress,
  index = 0,
}: ContentCardProps) {
  const { neutralSoft, warning } = useAppTheme();
  const { response: icon } = useFileImage(iconPath ?? '');
  const { response: background } = useFileImage(backgroundPath ?? '');
  const [failedIcon, setFailedIcon] = useState<string>();
  // Золото с полосой — только тарифный замок; остальные причины помечаем серым замком без полосы
  const isTariffLock = locked === 'tariff';

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
        <GlassCard padding={16} borderRadius={12} style={styles.card} backgroundImage={background}>
          {isTariffLock ? (
            <View pointerEvents="none" style={[styles.lockStrip, { backgroundColor: warning }]} />
          ) : null}
          <View style={styles.row}>
            {icon && failedIcon !== icon ? (
              <Image source={{ uri: icon }} resizeMode="contain" style={styles.iconImage} onError={() => setFailedIcon(icon)} />
            ) : <TypeIcon kind={kind} size={20} locked={locked ?? undefined} />}
            <View style={styles.body}>
              <ThemedText style={styles.title} numberOfLines={1}>
                {title}
              </ThemedText>
              <ThemedText style={[styles.description, { color: neutralSoft }]} numberOfLines={1}>
                {description}
              </ThemedText>
            </View>
            {locked && icon && failedIcon !== icon ? <IconSymbol name="lock.fill" size={16} color={locked === 'tariff' ? warning : neutralSoft} /> : null}
            {locked ? null : status ? <StatusBadge status={status} /> : null}
            <IconSymbol name="chevron.right" size={16} color={neutralSoft} />
          </View>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  iconImage: { width: Spacing.minTouchTarget, height: Spacing.minTouchTarget },
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
  // Вертикальная золотая полоса причины слева: отрицательные отступы = padding GlassCard (16),
  // контейнер карточки overflow hidden — полоса повторяет круглый угол карточки
  lockStrip: {
    position: 'absolute',
    top: -16,
    bottom: -16,
    left: -16,
    width: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
});
