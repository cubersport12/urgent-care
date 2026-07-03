import { Gradients, Radius } from '@/constants/theme';
import { useThemeValue } from '@/hooks/use-theme-color';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '../themed-text';

type GradientButtonProps = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
};

export function GradientButton({ title, onPress, disabled, fullWidth }: GradientButtonProps) {
  const disabledOpacity = useThemeValue('disabledOpacity');

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        fullWidth && styles.fullWidth,
        {
          opacity: disabled ? disabledOpacity : pressed ? 0.9 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
      ]}
    >
      <LinearGradient
        colors={[...Gradients.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, fullWidth && styles.fullWidth]}
      >
        <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.text}>
          {title}
        </ThemedText>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    shadowColor: 'rgba(0, 132, 255, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontSize: 15,
    fontWeight: '500',
  },
});
