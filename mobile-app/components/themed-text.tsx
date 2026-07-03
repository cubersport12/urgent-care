import { Fonts } from '@/constants/theme';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | 'default'
    | 'title'
    | 'defaultSemiBold'
    | 'subtitle'
    | 'link'
    | 'h1'
    | 'h2'
    | 'caption'
    | 'mono'
    | 'label';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const primaryColor = useThemeColor({}, 'primary');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? [styles.link, { color: primaryColor }] : undefined,
        type === 'h1' ? styles.h1 : undefined,
        type === 'h2' ? styles.h2 : undefined,
        type === 'caption' ? styles.caption : undefined,
        type === 'mono' ? styles.mono : undefined,
        type === 'label' ? styles.label : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Fonts?.sans,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    fontFamily: Fonts?.sansSemiBold,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 36,
    fontFamily: Fonts?.sansSemiBold,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: Fonts?.sansSemiBold,
  },
  h1: {
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 34,
    fontFamily: Fonts?.sansLight,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 20,
    fontWeight: '400',
    lineHeight: 26,
    fontFamily: Fonts?.sans,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts?.sans,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Fonts?.sansMedium,
  },
  mono: {
    fontSize: 13,
    fontFamily: Fonts?.mono,
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
  },
});
