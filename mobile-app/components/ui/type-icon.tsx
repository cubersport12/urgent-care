import { IconSymbol } from '@/components/ui/icon-symbol';
import { StyleSheet, View } from 'react-native';

export type MaterialKind = 'folder' | 'article' | 'test' | 'rescue';

const config: Record<
  MaterialKind,
  { icon: string; bg: string; color: string; shadowColor?: string }
> = {
  folder: {
    icon: 'folder.fill',
    bg: 'rgba(0, 132, 255, 0.1)',
    color: '#0084FF',
    shadowColor: 'rgba(0, 132, 255, 0.2)',
  },
  article: {
    icon: 'doc.text.fill',
    bg: 'rgba(234, 234, 234, 0.06)',
    color: '#EAEAEA',
  },
  test: {
    icon: 'list.bullet.clipboard.fill',
    bg: 'rgba(0, 132, 255, 0.1)',
    color: '#0084FF',
    shadowColor: 'rgba(0, 132, 255, 0.2)',
  },
  rescue: {
    icon: 'cross.fill',
    bg: 'rgba(255, 107, 107, 0.1)',
    color: '#FF6B6B',
    shadowColor: 'rgba(255, 107, 107, 0.2)',
  },
};

export function TypeIcon({ kind, size = 20 }: { kind: MaterialKind; size?: number }) {
  const c = config[kind];
  const containerSize = size + 16;

  return (
    <View
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          backgroundColor: c.bg,
          shadowColor: c.shadowColor,
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
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2,
  },
});
