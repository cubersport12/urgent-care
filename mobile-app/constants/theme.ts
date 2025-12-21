/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    // Primary colors
    primary: '#0a7ea4',
    primaryPressed: '#0a7ea4CC',
    // Status colors
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
    // Neutral colors
    white: '#FFFFFF',
    black: '#000000',
    // Background colors
    pressedBackground: '#f0f0f0',
    disabledBackground: '#cccccc',
    disabledText: '#cccccc',
    buttonBackground: '#fff',
    tabBarBackground: '#fff',
    // Border colors
    border: '#e0e0e0',
    borderPrimary: '#0a7ea4',
  },
  dark: {
    text: '#ECEDEE',
    background: '#070a15',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    // Primary colors
    primary: '#0a7ea4',
    primaryPressed: '#0a7ea4CC',
    // Status colors
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
    // Neutral colors
    white: '#FFFFFF',
    black: '#000000',
    // Background colors
    pressedBackground: '#2a2a2a',
    disabledBackground: '#666666',
    disabledText: '#666666',
    buttonBackground: '#080d18',
    tabBarBackground: '#0c121f',
    // Border colors
    border: '#333333',
    borderPrimary: '#0a7ea4',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
