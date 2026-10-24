import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/contexts/theme-context';
import { useAppTheme, useGlass } from '@/hooks/use-theme-color';
import { Spacing } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

type LoadingOverlayProps = {
  /** Текст под индикатором. */
  label?: string;
};

/** Спиннер страницы: подложка с лёгким блюром, в центре — индикатор и
 *  «Загружаем...». Рендерить последним ребёнком контейнера экрана
 *  (absoluteFill — поверх содержимого), но вне анимируемых блоков:
 *  у уходящих в opacity 0 родителей оверлей гаснет вместе с ними. */
export function LoadingOverlay({ label = 'Загружаем...' }: LoadingOverlayProps) {
  const { primary, neutralSoft } = useAppTheme();
  const glass = useGlass();
  const { theme } = useTheme();

  return (
    <Animated.View entering={FadeIn} style={[StyleSheet.absoluteFill, styles.root]}>
      {Platform.OS !== 'web' ? (
        <BlurView
          intensity={20}
          tint={theme === 'dark' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: glass.scrim }]} />
      )}
      <View style={styles.center}>
        <ActivityIndicator size="large" color={primary} />
        <ThemedText style={{ color: neutralSoft }}>{label}</ThemedText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    gap: Spacing.card,
  },
});
