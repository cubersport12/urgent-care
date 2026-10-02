import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppTheme, useGlow } from '@/hooks/use-theme-color';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

export type MaterialKind = 'folder' | 'article' | 'test' | 'rescue';

export function TypeIcon({
  kind,
  size = 20,
  locked = false,
}: {
  kind: MaterialKind;
  size?: number;
  /** Заблокирован (тариф/награда): золотой замок вместо иконки типа */
  locked?: boolean;
}) {
  const theme = useAppTheme();
  const glow = useGlow();
  const containerSize = size + 16;

  const variant = useMemo(() => {
    return {
      folder: {
        icon: 'folder.fill',
        bg: theme.primaryContainer,
        color: theme.primary,
        shadowColor: glow.primary,
      },
      article: {
        icon: 'doc.text.fill',
        bg: theme.elevated2,
        color: theme.neutral,
        shadowColor: 'transparent',
      },
      test: {
        icon: 'list.bullet.clipboard.fill',
        bg: theme.primaryContainer,
        color: theme.primary,
        shadowColor: glow.primary,
      },
      rescue: {
        icon: 'cross.fill',
        bg: theme.errorContainer,
        color: theme.error,
        shadowColor: glow.danger,
      },
    } satisfies Record<
      MaterialKind,
      { icon: string; bg: string; color: string; shadowColor: string }
    >;
  }, [theme, glow]);

  const c = locked
    ? // Платный/наградный контент помечаем золотым замком — как во всех приложениях
      { icon: 'lock.fill', bg: theme.warningContainer, color: theme.warning, shadowColor: 'transparent' }
    : variant[kind];

  return (
    <View
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          backgroundColor: c.bg,
        },
        c.shadowColor === 'transparent'
          ? styles.noShadow
          : {
              shadowColor: c.shadowColor,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 1,
              shadowRadius: 12,
              elevation: 2,
            },
      ]}
    >
      <IconSymbol name={c.icon as never} size={size} color={c.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noShadow: {
    shadowOpacity: 0,
    elevation: 0,
  },
});
