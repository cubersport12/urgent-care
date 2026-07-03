import { useAppTheme } from '@/hooks/use-theme-color';
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

export function AnimatedOrb({ height = 240 }: { height?: number }) {
  const { primary, success, accentPurple } = useAppTheme();
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.05, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    rotate.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );
  }, [scale, rotate]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  return (
    <View style={[styles.wrapper, { height }]}>
      <Animated.View style={[styles.orbOuter, animatedStyle]}>
        <LinearGradient
          colors={[`${primary}CC`, `${success}99`, `${accentPurple}66`]}
          style={styles.orb}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
        />
        <View style={styles.glow} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 300,
    alignSelf: 'center',
  },
  orbOuter: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orb: {
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.85,
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 132, 255, 0.08)',
  },
});
