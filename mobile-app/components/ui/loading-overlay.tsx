import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/use-theme-color';
import { Spacing } from '@/constants/theme';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

type LoadingOverlayProps = {
  /** Текст под индикатором. */
  label?: string;
};

/** Спиннер страницы: непрозрачная подложка, в центре — индикатор и
 *  «Загружаем...». Рендерить последним ребёнком контейнера экрана
 *  (absoluteFill — поверх содержимого), но вне анимируемых блоков:
 *  у уходящих в opacity 0 родителей оверлей гаснет вместе с ними. */
export function LoadingOverlay({ label = 'Загружаем...' }: LoadingOverlayProps) {
  const { primary, neutralSoft, page } = useAppTheme();

  return (
    <View style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: page }]} accessibilityRole="progressbar" accessibilityLabel={label}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color={primary} />
        <ThemedText style={{ color: neutralSoft }}>{label}</ThemedText>
      </View>
    </View>
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
