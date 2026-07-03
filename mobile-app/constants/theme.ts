/**
 * Kimi-inspired design system
 * Dark theme matches kimi-dental-edu; light is an adapted variant.
 */

import { Platform } from 'react-native';

export const Glass = {
  dark: {
    background: 'rgba(255, 255, 255, 0.05)',
    backgroundSubtle: 'rgba(255, 255, 255, 0.03)',
    backgroundHover: 'rgba(255, 255, 255, 0.06)',
    border: 'rgba(255, 255, 255, 0.1)',
    borderSubtle: 'rgba(255, 255, 255, 0.08)',
    borderHover: 'rgba(255, 255, 255, 0.2)',
    header: 'rgba(5, 5, 5, 0.7)',
    scrim: 'rgba(5, 5, 5, 0.85)',
    progressTrack: 'rgba(255, 255, 255, 0.1)',
    primaryTint: 'rgba(0, 132, 255, 0.1)',
    primaryBorder: 'rgba(0, 132, 255, 0.3)',
    successTint: 'rgba(77, 139, 49, 0.1)',
    successBorder: 'rgba(77, 139, 49, 0.2)',
    dangerTint: 'rgba(255, 107, 107, 0.1)',
    dangerBorder: 'rgba(255, 107, 107, 0.2)',
    row: 'rgba(255, 255, 255, 0.02)',
  },
  light: {
    background: '#FFFFFF',
    backgroundSubtle: '#F3F4F6',
    backgroundHover: '#ECEEF1',
    border: 'rgba(0, 0, 0, 0.08)',
    borderSubtle: 'rgba(0, 0, 0, 0.06)',
    borderHover: 'rgba(0, 0, 0, 0.14)',
    header: 'rgba(248, 249, 250, 0.85)',
    scrim: 'rgba(248, 249, 250, 0.9)',
    progressTrack: 'rgba(0, 0, 0, 0.08)',
    primaryTint: 'rgba(0, 112, 224, 0.1)',
    primaryBorder: 'rgba(0, 112, 224, 0.25)',
    successTint: 'rgba(61, 122, 40, 0.1)',
    successBorder: 'rgba(61, 122, 40, 0.2)',
    dangerTint: 'rgba(224, 85, 85, 0.1)',
    dangerBorder: 'rgba(224, 85, 85, 0.2)',
    row: 'rgba(0, 0, 0, 0.03)',
  },
} as const;

export const Radius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  modal: 20,
  pill: 9999,
} as const;

export const Spacing = {
  pageX: 16,
  pageBottom: 96,
  header: 56,
  nav: 64,
  card: 16,
} as const;

export const Glow = {
  dark: {
    primary: 'rgba(0, 132, 255, 0.3)',
    primaryStrong: 'rgba(0, 132, 255, 0.6)',
    success: 'rgba(77, 139, 49, 0.4)',
    danger: 'rgba(255, 107, 107, 0.4)',
    title: 'rgba(0, 132, 255, 0.2)',
  },
  light: {
    primary: 'rgba(0, 112, 224, 0.25)',
    primaryStrong: 'rgba(0, 112, 224, 0.45)',
    success: 'rgba(61, 122, 40, 0.35)',
    danger: 'rgba(224, 85, 85, 0.35)',
    title: 'rgba(0, 112, 224, 0.15)',
  },
} as const;

export const Gradients = {
  primary: ['#0084FF', '#4D8B31'] as const,
  primaryLight: ['#0070E0', '#3D7A28'] as const,
} as const;

export const Animation = {
  shimmer: 3000,
  pulseDanger: 1500,
  pulseRing: 3000,
  blinkTimer: 1000,
  stagger: 60,
  enterDuration: 600,
} as const;

export const Colors = {
  light: {
    primary: '#0070E0',
    onPrimary: '#FFFFFF',
    primaryContainer: 'rgba(0, 112, 224, 0.12)',
    onPrimaryContainer: '#005BB5',

    error: '#E05555',
    onError: '#FFFFFF',
    errorContainer: 'rgba(224, 85, 85, 0.12)',
    onErrorContainer: '#B33A3A',

    success: '#3D7A28',
    onSuccess: '#FFFFFF',
    successContainer: 'rgba(61, 122, 40, 0.12)',
    onSuccessContainer: '#2D5C1E',

    warning: '#D97706',
    onWarning: '#FFFFFF',
    warningContainer: 'rgba(217, 119, 6, 0.12)',
    onWarningContainer: '#B45309',

    page: '#F8F9FA',
    text: '#1A1A1A',

    layout1: '#FFFFFF',
    layout2: '#F3F4F6',
    layout3: '#E5E7EB',
    onLayout1: '#1A1A1A',
    onLayout2: '#1A1A1A',
    onLayout3: '#1A1A1A',

    elevated1: 'rgba(0, 0, 0, 0.03)',
    elevated2: 'rgba(0, 0, 0, 0.05)',
    elevated3: 'rgba(0, 0, 0, 0.08)',

    neutral: '#6B7280',
    neutralSoft: '#9CA3AF',
    icon: '#6B7280',
    onNeutral: '#FFFFFF',
    onNeutralSoft: '#FFFFFF',

    border: 'rgba(0, 0, 0, 0.1)',
    borderVariant: 'rgba(0, 0, 0, 0.06)',

    shadow: '#000000',
    white: '#FFFFFF',
    accentPurple: '#8B5CF6',
  },
  dark: {
    primary: '#0084FF',
    onPrimary: '#FFFFFF',
    primaryContainer: 'rgba(0, 132, 255, 0.15)',
    onPrimaryContainer: '#B3D9FF',

    error: '#FF6B6B',
    onError: '#FFFFFF',
    errorContainer: 'rgba(255, 107, 107, 0.15)',
    onErrorContainer: '#FFCDD2',

    success: '#4D8B31',
    onSuccess: '#FFFFFF',
    successContainer: 'rgba(77, 139, 49, 0.15)',
    onSuccessContainer: '#C8E6C9',

    warning: '#F59E0B',
    onWarning: '#000000',
    warningContainer: 'rgba(245, 158, 11, 0.15)',
    onWarningContainer: '#FFE0B2',

    page: '#050505',
    text: '#EAEAEA',

    layout1: '#050505',
    layout2: 'rgba(255, 255, 255, 0.05)',
    layout3: 'rgba(255, 255, 255, 0.03)',
    onLayout1: '#EAEAEA',
    onLayout2: '#EAEAEA',
    onLayout3: '#EAEAEA',

    elevated1: 'rgba(255, 255, 255, 0.05)',
    elevated2: 'rgba(255, 255, 255, 0.08)',
    elevated3: 'rgba(255, 255, 255, 0.12)',

    neutral: '#9BA1A6',
    neutralSoft: '#7E7E7E',
    icon: '#7E7E7E',
    onNeutral: '#000000',
    onNeutralSoft: '#FFFFFF',

    border: 'rgba(255, 255, 255, 0.1)',
    borderVariant: 'rgba(255, 255, 255, 0.08)',

    shadow: '#000000',
    white: '#FFFFFF',
    accentPurple: '#A78BFA',
  },
};

export const ThemeValues = {
  disabledOpacity: 0.6,
  blurIntensity: {
    sm: 8,
    md: 16,
    lg: 20,
    xl: 32,
    nav: 40,
  },
} as const;

export const Shadows = {
  light: {
    small: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
    large: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 16,
      elevation: 6,
    },
    glass: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    nav: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.4,
      shadowRadius: 24,
      elevation: 8,
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
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    large: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 6,
    },
    glass: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
      elevation: 4,
    },
    nav: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.4,
      shadowRadius: 24,
      elevation: 8,
    },
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'Inter_400Regular',
    sansLight: 'Inter_300Light',
    sansMedium: 'Inter_500Medium',
    sansSemiBold: 'Inter_600SemiBold',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'IBMPlexMono_400Regular',
    monoMedium: 'IBMPlexMono_500Medium',
  },
  default: {
    sans: 'Inter_400Regular',
    sansLight: 'Inter_300Light',
    sansMedium: 'Inter_500Medium',
    sansSemiBold: 'Inter_600SemiBold',
    serif: 'serif',
    rounded: 'normal',
    mono: 'IBMPlexMono_400Regular',
    monoMedium: 'IBMPlexMono_500Medium',
  },
  web: {
    sans: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    sansLight: "Inter, system-ui, sans-serif",
    sansMedium: "Inter, system-ui, sans-serif",
    sansSemiBold: "Inter, system-ui, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', sans-serif",
    mono: "'IBM Plex Mono', SFMono-Regular, Menlo, monospace",
    monoMedium: "'IBM Plex Mono', monospace",
  },
});

export type ThemeMode = 'light' | 'dark';

export function getGlass(theme: ThemeMode) {
  return Glass[theme];
}

export function getGlow(theme: ThemeMode) {
  return Glow[theme];
}
