/**
 * Material Design 3 color system
 * Based on Google's Material Design guidelines
 * https://m3.material.io/styles/color/the-color-system/overview
 */

import { Platform } from 'react-native';

// Primary color palette
const primaryLight = '#0a7ea4';
const primaryDark = '#4fc3f7';
const onPrimaryLight = '#FFFFFF';
const onPrimaryDark = '#000000';

// Error color palette
const errorLight = '#F44336';
const errorDark = '#EF5350';
const onErrorLight = '#FFFFFF';
const onErrorDark = '#000000';

// Success color palette
const successLight = '#4CAF50';
const successDark = '#66BB6A';
const onSuccessLight = '#FFFFFF';
const onSuccessDark = '#000000';

// Warning color palette
const warningLight = '#FF9800';
const warningDark = '#FFA726';
const onWarningLight = '#000000';
const onWarningDark = '#000000';

export const Colors = {
  light: {
    // Primary colors
    primary: primaryLight,
    onPrimary: onPrimaryLight,
    primaryContainer: '#B3E5FC', // Light blue container
    onPrimaryContainer: '#01579B', // Dark blue text on container
    
    // Error colors
    error: errorLight,
    onError: onErrorLight,
    errorContainer: '#FFCDD2', // Light red container
    onErrorContainer: '#B71C1C', // Dark red text on container
    
    // Success colors
    success: successLight,
    onSuccess: onSuccessLight,
    successContainer: '#C8E6C9', // Light green container
    onSuccessContainer: '#1B5E20', // Dark green text on container
    
    // Warning colors
    warning: warningLight,
    onWarning: onWarningLight,
    warningContainer: '#FFE0B2', // Light orange container
    onWarningContainer: '#E65100', // Dark orange text on container
    
    // Page color (application background)
    page: '#FFFFFF', // Application background
    text: '#11181C', // Text on page
    
    // Layout colors (surface levels)
    layout1: '#FFFFFF', // Container background
    layout2: '#F5F5F5', // Container on layout1
    layout3: '#EEEEEE', // Container on layout2
    onLayout1: '#11181C', // Text on layout1
    onLayout2: '#11181C', // Text on layout2
    onLayout3: '#11181C', // Text on layout3
    
    // Elevated colors (for overlays)
    elevated1: 'rgba(0, 0, 0, 0.05)', // Subtle overlay
    elevated2: 'rgba(0, 0, 0, 0.08)', // Medium overlay
    elevated3: 'rgba(0, 0, 0, 0.12)', // Strong overlay
    
    // Neutral colors
    neutral: '#687076', // Main neutral
    neutralSoft: '#9E9E9E', // Soft neutral for descriptions
    onNeutral: '#FFFFFF', // Text on neutral
    onNeutralSoft: '#FFFFFF', // Text on neutralSoft
    
    // Border colors
    border: '#E0E0E0',
    borderVariant: '#BDBDBD', // Variant border
    
    // Shadow color
    shadow: '#000000',
  },
  dark: {
    // Primary colors
    primary: primaryDark,
    onPrimary: onPrimaryDark,
    primaryContainer: '#0277BD', // Dark blue container
    onPrimaryContainer: '#B3E5FC', // Light blue text on container
    
    // Error colors
    error: errorDark,
    onError: onErrorDark,
    errorContainer: '#B71C1C', // Dark red container
    onErrorContainer: '#FFCDD2', // Light red text on container
    
    // Success colors
    success: successDark,
    onSuccess: onSuccessDark,
    successContainer: '#1B5E20', // Dark green container
    onSuccessContainer: '#C8E6C9', // Light green text on container
    
    // Warning colors
    warning: warningDark,
    onWarning: onWarningDark,
    warningContainer: '#E65100', // Dark orange container
    onWarningContainer: '#FFE0B2', // Light orange text on container
    
    // Page color (application background)
    page: '#070a15', // Application background
    text: '#ECEDEE', // Text on page
    
    // Layout colors (surface levels)
    layout1: '#070a15', // Container background
    layout2: '#0c121f', // Container on layout1
    layout3: '#080d18', // Container on layout2
    onLayout1: '#ECEDEE', // Text on layout1
    onLayout2: '#ECEDEE', // Text on layout2
    onLayout3: '#ECEDEE', // Text on layout3
    
    // Elevated colors (for overlays)
    elevated1: 'rgba(255, 255, 255, 0.05)', // Subtle overlay
    elevated2: 'rgba(255, 255, 255, 0.08)', // Medium overlay
    elevated3: 'rgba(255, 255, 255, 0.12)', // Strong overlay
    
    // Neutral colors
    neutral: '#9BA1A6', // Main neutral
    neutralSoft: '#757575', // Soft neutral for descriptions
    onNeutral: '#000000', // Text on neutral
    onNeutralSoft: '#FFFFFF', // Text on neutralSoft
    
    // Border colors
    border: '#1a1a1a',
    borderVariant: '#333333', // Variant border
    
    // Shadow color
    shadow: '#000000',
  },
};

/**
 * Theme values - numeric values and metrics
 */
export const ThemeValues = {
  disabledOpacity: 0.6,
} as const;

/**
 * Shadow styles for different elevation levels
 */
export const Shadows = {
  light: {
    small: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    large: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 5,
    },
  },
  dark: {
    small: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 4,
    },
    large: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 5,
    },
  },
} as const;

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
