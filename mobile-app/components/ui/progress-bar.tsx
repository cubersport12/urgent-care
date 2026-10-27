import { Gradients } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { useAppTheme, useGlass, useGlow } from '@/hooks/use-theme-color';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type ProgressBarProps = {
  current: number;
  total: number;
  height?: number;
  shimmer?: boolean;
  variant?: 'brand' | 'muted';
};

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

export function ProgressBar({ current, total, height = 6, shimmer = false, variant = 'brand' }: ProgressBarProps) {
  const glass = useGlass();
  const glow = useGlow();
  const { primary } = useAppTheme();
  const { theme } = useTheme();
  const gradientColors =
    variant === 'muted'
      ? [primary, primary] as const
      : theme === 'light'
        ? Gradients.primaryLight
        : Gradients.primary;
  const percentage = total > 0 ? Math.min(100, (current / total) * 100) : 0;
  const shimmerOffset = useSharedValue(0);

  useEffect(() => {
    if (shimmer) {
      shimmerOffset.value = withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }
  }, [shimmer, shimmerOffset]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmer ? 0.85 + shimmerOffset.value * 0.15 : 1,
  }));

  return (
    <View style={[styles.track, { height, backgroundColor: glass.progressTrack }]}>
      <AnimatedGradient
        colors={[...gradientColors]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.fill,
          {
            width: `${percentage}%`,
            height,
            shadowColor: variant === 'muted' ? 'transparent' : glow.primary,
          },
          variant === 'muted' && styles.mutedFill,
          shimmerStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 9999,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  mutedFill: {
    shadowOpacity: 0,
    elevation: 0,
  },
});
