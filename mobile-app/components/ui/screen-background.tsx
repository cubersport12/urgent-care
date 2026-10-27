import { useNavRail } from '@/contexts/nav-rail-context';
import { PageArt, Radius } from '@/constants/theme';
import { useAppTheme, useGlass } from '@/hooks/use-theme-color';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Image, StyleSheet, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ScreenBackgroundProps = ViewProps & {
  variant?: 'default' | 'study';
  backgroundImage?: string;
  /** Skip top safe-area padding (e.g. full-bleed media). Default: apply top inset. */
  ignoreTopInset?: boolean;
};

export function ScreenBackground({
  children,
  style,
  variant = 'default',
  ignoreTopInset = false,
  backgroundImage,
  ...rest
}: ScreenBackgroundProps) {
  const [failedImage, setFailedImage] = useState<string>();
  const { page } = useAppTheme();
  const glass = useGlass();
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
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.pageArt]}>
        <LinearGradient
          colors={[glass.primaryTint, 'transparent']}
          start={{ x: 0.1, y: 0.15 }}
          end={{ x: 0.9, y: 0.85 }}
          style={styles.primaryOrb}
        />
        <LinearGradient
          colors={[glass.successTint, 'transparent']}
          start={{ x: 0.1, y: 0.15 }}
          end={{ x: 0.9, y: 0.85 }}
          style={styles.accentOrb}
        />
      </View>
      {backgroundImage && failedImage !== backgroundImage ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Image source={{ uri: backgroundImage }} resizeMode="cover" style={StyleSheet.absoluteFill} onError={() => setFailedImage(backgroundImage)} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: glass.folderImageScrim }]} />
        </View>
      ) : null}
      {variant === 'study' ? (
        <LinearGradient
          colors={[glass.primaryTint, 'transparent']}
          style={styles.gradientTop}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
  },
  pageArt: {
    overflow: 'hidden',
  },
  primaryOrb: {
    position: 'absolute',
    width: PageArt.primaryOrbSize,
    height: PageArt.primaryOrbSize,
    top: -PageArt.primaryOrbSize / 2,
    right: -PageArt.primaryOrbSize / 3,
    borderRadius: Radius.pill,
  },
  accentOrb: {
    position: 'absolute',
    width: PageArt.accentOrbSize,
    height: PageArt.accentOrbSize,
    bottom: -PageArt.accentOrbSize / 2,
    left: -PageArt.accentOrbSize / 2,
    borderRadius: Radius.pill,
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
