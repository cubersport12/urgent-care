import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import type { StatusType } from '@/components/ui/status-badge';
import { TypeIcon, type MaterialKind } from '@/components/ui/type-icon';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { IconSize, Radius, Spacing, ThemeValues } from '@/constants/theme';
import { useFileImage } from '@/hooks/api/useFileImage';
import { useAppTheme } from '@/hooks/use-theme-color';
import { useTheme } from '@/contexts/theme-context';
import { staggerEnter } from '@/hooks/use-enter-animation';
import type { LockReason } from '@/components/explorer/types';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

type ContentCardProps = {
  title: string;
  description?: string;
  kind: MaterialKind;
  iconPath?: string | null;
  backgroundPath?: string | null;
  iconPathDark?: string | null;
  backgroundPathDark?: string | null;
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
  iconPathDark,
  backgroundPathDark,
  status,
  disabled = false,
  locked,
  onPress,
  index = 0,
}: ContentCardProps) {
  const { neutral, neutralSoft, warning, success, error, surfaceRaised } = useAppTheme();
  const { theme } = useTheme();
  const { response: icon } = useFileImage((theme === 'dark' ? iconPathDark ?? iconPath : iconPath) ?? '');
  const { response: background } = useFileImage((theme === 'dark' ? backgroundPathDark ?? backgroundPath : backgroundPath) ?? '');
  const [failedIcon, setFailedIcon] = useState<string>();
  // Золото с полосой — только тарифный замок; остальные причины помечаем серым замком без полосы
  const isTariffLock = locked === 'tariff';
  const statusLabels: Record<StatusType, string> = {
    read: 'Прочитано', unread: 'Не прочитано', passed: 'Пройдено',
    'not-passed': 'Не пройдено', success: 'Успешно', failure: 'Не успешно', locked: 'Заблокировано',
  };
  const kindLabels: Record<MaterialKind, string> = { folder: 'Раздел', article: 'Статья', test: 'Тест', rescue: 'Режим спасения' };
  const indicator = locked ? 'lock.fill' : status === 'failure' ? 'xmark.circle.fill' : status === 'read' || status === 'passed' || status === 'success' ? 'checkmark.circle.fill' : status ? 'circle' : undefined;
  const indicatorColor = locked ? (isTariffLock ? warning : neutral) : status === 'failure' ? error : status === 'not-passed' || status === 'unread' ? neutral : success;

  return (
    <Animated.View entering={staggerEnter(index)}>
      <Pressable
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={[kindLabels[kind], title, locked ? 'Заблокировано' : status ? statusLabels[status] : undefined, description].filter(Boolean).join(', ')}
        accessibilityState={{ disabled }}
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
            <View style={styles.iconWrap}>
              {icon && failedIcon !== icon ? (
                <Image source={{ uri: icon }} resizeMode="contain" style={styles.iconImage} onError={() => setFailedIcon(icon)} />
              ) : <TypeIcon kind={kind} size={IconSize.contentType} />}
              {indicator ? <View style={[styles.indicator, { backgroundColor: surfaceRaised }]}>
                <IconSymbol name={indicator} size={Spacing.card} color={indicatorColor} />
              </View> : null}
            </View>
            <View style={styles.body}>
              <ThemedText type="defaultSemiBold" numberOfLines={2}>
                {title}
              </ThemedText>
              {description ? (
                <ThemedText type="caption" style={{ color: neutral }} numberOfLines={1}>
                  {description}
                </ThemedText>
              ) : null}
            </View>
            <IconSymbol name="chevron.right" size={16} color={neutralSoft} />
          </View>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  iconImage: { width: Spacing.minTouchTarget, height: Spacing.minTouchTarget },
  iconWrap: { position: 'relative' },
  indicator: { position: 'absolute', right: -Radius.sm / 2, bottom: -Radius.sm / 2, borderRadius: Radius.pill },
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
