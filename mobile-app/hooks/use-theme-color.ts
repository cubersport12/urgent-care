/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, Shadows, ThemeValues } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const { theme } = useTheme();
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}

/**
 * Simplified version of useThemeColor that doesn't require props.
 * Colors must be defined in the theme (constants/theme.ts).
 */
export function useThemeColorSimple(
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const { theme } = useTheme();
  return Colors[theme][colorName];
}

export function useAppTheme() {
  const { theme } = useTheme();
  return Colors[theme];
}

/**
 * Hook to get theme values (numeric values like opacity)
 */
export function useThemeValue<T extends keyof typeof ThemeValues>(
  valueName: T
): typeof ThemeValues[T] {
  return ThemeValues[valueName];
}

/**
 * Hook to get shadow styles based on theme and elevation level
 */
export function useThemeShadow(level: 'small' | 'medium' | 'large') {
  const { theme } = useTheme();
  return Shadows[theme][level];
}