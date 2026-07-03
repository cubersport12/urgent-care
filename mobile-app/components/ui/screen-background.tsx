import { useAppTheme } from '@/hooks/use-theme-color';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type ViewProps } from 'react-native';

type ScreenBackgroundProps = ViewProps & {
  variant?: 'default' | 'study';
};

export function ScreenBackground({ children, style, variant = 'default', ...rest }: ScreenBackgroundProps) {
  const { page } = useAppTheme();

  return (
    <View style={[styles.root, { backgroundColor: page }, style]} {...rest}>
      {variant === 'study' && (
        <LinearGradient
          colors={['rgba(0, 132, 255, 0.08)', 'transparent']}
          style={styles.gradientTop}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    pointerEvents: 'none',
  },
});
