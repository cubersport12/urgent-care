import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { useGlass, useThemeShadow } from '@/hooks/use-theme-color';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function GlassTabBarBackground() {
  const { theme } = useTheme();
  const glass = useGlass();
  const shadow = useThemeShadow('nav');
  const insets = useSafeAreaInsets();
  const pageColor = Colors[theme].page;

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom,
          backgroundColor: pageColor,
          borderTopColor: glass.border,
        },
        shadow,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
});
