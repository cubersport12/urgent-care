import { Radius, ResultTileTokens, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type ViewProps } from 'react-native';

type ResultTileProps = ViewProps & {
  variant?: 'neutral' | 'primary' | 'warning' | 'danger';
  padding?: number;
};

/** Статичная градиентная кромка: декоративная, не обозначает интерактивность. */
export function ResultTile({ variant = 'neutral', padding = Spacing.card, style, children, ...props }: ResultTileProps) {
  const { theme } = useTheme();
  const colors = ResultTileTokens[theme][variant];
  return (
    <LinearGradient
      colors={colors.edge}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.edge, style]}
      {...props}
    >
      <View style={[styles.surface, { padding, backgroundColor: colors.surface }]}>{children}</View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  edge: { borderRadius: Radius.xl, padding: ResultTileTokens.borderWidth },
  surface: { borderRadius: Radius.xl - ResultTileTokens.borderWidth, flex: 1 },
});
