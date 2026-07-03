import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppTheme } from '@/hooks/use-theme-color';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

export type MaterialKind = 'folder' | 'article' | 'test' | 'rescue';

export function TypeIcon({ kind, size = 20 }: { kind: MaterialKind; size?: number }) {
  const theme = useAppTheme();
  const containerSize = size + 16;

  const variant = useMemo(() => {
    const glow = (hex: string) => `${hex}33`;
    return {
      folder: {
        icon: 'folder.fill',
        bg: theme.primaryContainer,
        color: theme.primary,
        shadowColor: glow(theme.primary),
      },
      article: {
        icon: 'doc.text.fill',
        bg: theme.elevated2,
        color: theme.neutral,
      },
      test: {
        icon: 'list.bullet.clipboard.fill',
        bg: theme.primaryContainer,
        color: theme.primary,
        shadowColor: glow(theme.primary),
      },
      rescue: {
        icon: 'cross.fill',
        bg: theme.errorContainer,
        color: theme.error,
        shadowColor: glow(theme.error),
      },
    } satisfies Record<
      MaterialKind,
      { icon: string; bg: string; color: string; shadowColor?: string }
    >;
  }, [theme]);

  const c = variant[kind];

  return (
    <View
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          backgroundColor: c.bg,
        },
        c.shadowColor
          ? {
              shadowColor: c.shadowColor,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 1,
              shadowRadius: 12,
              elevation: 2,
            }
          : styles.noShadow,
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
