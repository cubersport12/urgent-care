import { Radius } from '@/constants/theme';
import { useGlass, useThemeShadow } from '@/hooks/use-theme-color';
import { useTheme } from '@/contexts/theme-context';
import { BlurView } from 'expo-blur';
import { Platform, Pressable, StyleSheet, View, type ViewProps } from 'react-native';

type GlassCardProps = ViewProps & {
  onPress?: () => void;
  borderRadius?: number;
  padding?: number;
  intensity?: number;
  disabled?: boolean;
};

export function GlassCard({
  children,
  style,
  onPress,
  borderRadius = Radius.xl,
  padding = 16,
  intensity,
  disabled,
  ...rest
}: GlassCardProps) {
  const { theme } = useTheme();
  const glass = useGlass();
  const shadow = useThemeShadow('glass');
  const blurIntensity = intensity ?? (theme === 'dark' ? 20 : 12);

  const content = (
    <View
      style={[
        styles.container,
        {
          borderRadius,
          borderColor: glass.border,
          backgroundColor: glass.background,
          padding,
        },
        shadow,
        style,
      ]}
      {...rest}
    >
      {Platform.OS !== 'web' && (
        <BlurView
          intensity={blurIntensity}
          tint={theme === 'dark' ? 'dark' : 'light'}
          style={[StyleSheet.absoluteFill, { borderRadius, overflow: 'hidden' }]}
        />
      )}
      <View style={styles.insetHighlight} pointerEvents="none" />
      <View style={styles.content}>{children}</View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [{ opacity: disabled ? 0.5 : pressed ? 0.95 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  insetHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});
