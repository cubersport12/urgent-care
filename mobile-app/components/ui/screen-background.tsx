import { useNavRail } from '@/contexts/nav-rail-context';
import { useAppTheme } from '@/hooks/use-theme-color';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ScreenBackgroundProps = ViewProps & {
  variant?: 'default' | 'study';
  /** Skip top safe-area padding (e.g. full-bleed media). Default: apply top inset. */
  ignoreTopInset?: boolean;
};

export function ScreenBackground({
  children,
  style,
  variant = 'default',
  ignoreTopInset = false,
  ...rest
}: ScreenBackgroundProps) {
  const { page } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { isWide, contentPaddingLeft } = useNavRail();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: page,
          paddingTop: ignoreTopInset ? 0 : insets.top,
          paddingLeft: isWide ? contentPaddingLeft : insets.left,
          paddingRight: insets.right,
        },
        style,
      ]}
      {...rest}
    >
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
