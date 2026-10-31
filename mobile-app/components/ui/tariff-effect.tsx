import { Animation, Radius } from '@/constants/theme';
import { useIsFocused } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedProps, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';

type Effect = 'none' | 'pulse' | 'shimmer' | 'orbit';
const AnimatedRect = Animated.createAnimatedComponent(Rect);

export function TariffEffect({ color, effect }: { color: string; effect: Effect }) {
  const focused = useIsFocused();
  const reducedMotion = useReducedMotion();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const phase = useSharedValue(0);
  const perimeter = 2 * (size.width + size.height - 4) - (8 - 2 * Math.PI) * (Radius.xl - 1);

  useEffect(() => {
    phase.value = focused && !reducedMotion
      ? withRepeat(withTiming(1, { duration: Animation.shimmer, easing: Easing.linear }), -1, effect === 'pulse')
      : 0;
    return () => cancelAnimation(phase);
  }, [effect, focused, reducedMotion, phase]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: effect === 'pulse' ? 0 : -phase.value * perimeter,
    opacity: effect === 'pulse' ? 0.25 + phase.value * 0.75 : 1,
  }));

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize((previous) => previous.width === width && previous.height === height ? previous : { width, height });
      }}
    >
      {size.width > 0 && size.height > 0 && !reducedMotion && effect !== 'none' && (
        <Svg width={size.width} height={size.height}>
          <AnimatedRect
            x={1} y={1} width={size.width - 2} height={size.height - 2}
            rx={Radius.xl - 1} ry={Radius.xl - 1}
            fill="none" stroke={color} strokeWidth={2} strokeLinecap="round"
            strokeDasharray={effect === 'pulse' ? undefined : effect === 'orbit' ? [perimeter * 0.08, perimeter * 0.42] : [perimeter * 0.22, perimeter * 0.78]}
            animatedProps={animatedProps}
          />
        </Svg>
      )}
    </View>
  );
}
