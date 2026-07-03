import { Radius } from '@/constants/theme';
import { useGlass } from '@/hooks/use-theme-color';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const HELIX_COLORS = ['#0084FF', '#F59E0B', '#FF6B6B', '#4D8B31'];
const PARTICLE_COUNT = 60;

function getParticles(rotation: number) {
  return Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
    const t = i / PARTICLE_COUNT;
    const angle = t * Math.PI * 2 * 2.5 + rotation;
    const y = (t - 0.5) * 120;
    const x = Math.cos(angle) * 55;
    const color = HELIX_COLORS[i % HELIX_COLORS.length];
    return { x, y, color };
  });
}

export function ParticleHelix({ height = 280 }: { height?: number }) {
  const glass = useGlass();
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 12000, easing: Easing.linear }),
      -1,
      false
    );
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}rad` }],
  }));

  const particles = getParticles(0);

  return (
    <View
      style={[
        styles.container,
        { height, backgroundColor: glass.backgroundSubtle, borderColor: glass.borderSubtle },
      ]}
    >
      <Animated.View style={[styles.helix, animatedStyle]}>
        <Svg width={200} height={200} viewBox="-100 -100 200 200">
          {particles.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={4} fill={p.color} opacity={0.85} />
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helix: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
