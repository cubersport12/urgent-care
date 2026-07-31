import { Radius } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { useAppTheme, useGlass, useThemeShadow } from '@/hooks/use-theme-color';
import { BlurView } from 'expo-blur';
import { Platform, Pressable, StyleSheet, View, type ViewProps } from 'react-native';

const NO_SHADOW = {
  shadowColor: 'transparent',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,
} as const;

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
  const { layout1 } = useAppTheme();
  const shadow = useThemeShadow('glass');
  const isLight = theme === 'light';
  const blurIntensity = intensity ?? (theme === 'dark' ? 20 : 12);
  const showBlur = !isLight && Platform.OS !== 'web';

  const content = (
    <View
      style={[
        styles.container,
        {
          borderRadius,
          borderColor: glass.border,
          backgroundColor: isLight ? layout1 : glass.background,
          padding,
        },
        isLight ? NO_SHADOW : shadow,
        style,
      ]}
      {...rest}
    >
      {showBlur ? (
        <BlurView
          intensity={blurIntensity}
          tint="dark"
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { borderRadius, overflow: 'hidden' }]}
        />
      ) : null}
      {!isLight ? <View style={styles.insetHighlightDark} pointerEvents="none" /> : null}
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
  insetHighlightDark: {
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
