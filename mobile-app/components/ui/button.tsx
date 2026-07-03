import { Radius } from '@/constants/theme';
import { useAppTheme, useGlass, useThemeValue } from '@/hooks/use-theme-color';
import { useTheme } from '@/contexts/theme-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Gradients } from '@/constants/theme';
import { Platform, Pressable, StyleSheet, type PressableProps } from 'react-native';
import { ThemedText } from '../themed-text';
import { IconSymbol } from './icon-symbol';

export type ButtonVariant = 'primary' | 'success' | 'error' | 'default' | 'glass' | 'gradient' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

export type ButtonProps = PressableProps & {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  disabled?: boolean;
};

export function Button({
  title,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'right',
  fullWidth = false,
  disabled = false,
  style,
  ...props
}: ButtonProps) {
  const { theme } = useTheme();
  const appTheme = useAppTheme();
  const glass = useGlass();
  const disabledOpacityValue = useThemeValue('disabledOpacity');
  const {
    onPrimary: onPrimaryColor,
    success: successColor,
    onSuccess: onSuccessColor,
    error: errorColor,
    onError: onErrorColor,
    layout1,
    layout2,
    onLayout1,
    text,
  } = appTheme;

  const isGradient = variant === 'primary' || variant === 'gradient';
  const gradientColors = theme === 'light' ? Gradients.primaryLight : Gradients.primary;

  const getButtonColors = () => {
    switch (variant) {
      case 'primary':
      case 'gradient':
        return {
          backgroundColor: 'transparent',
          pressedBackgroundColor: 'transparent',
          textColor: onPrimaryColor,
        };
      case 'success':
        return {
          backgroundColor: successColor,
          pressedBackgroundColor: successColor + 'CC',
          textColor: onSuccessColor,
        };
      case 'error':
        return {
          backgroundColor: errorColor,
          pressedBackgroundColor: errorColor + 'CC',
          textColor: onErrorColor,
        };
      case 'glass':
        return {
          backgroundColor: glass.background,
          pressedBackgroundColor: glass.backgroundHover,
          textColor: text,
          borderColor: glass.border,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          pressedBackgroundColor: glass.backgroundSubtle,
          textColor: text,
        };
      case 'default':
      default:
        return {
          backgroundColor: layout1,
          pressedBackgroundColor: layout2,
          textColor: onLayout1,
        };
    }
  };

  const colors = getButtonColors();
  const isDisabled = disabled;

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { paddingHorizontal: 12, paddingVertical: 8, minHeight: 36, fontSize: 14 };
      case 'large':
        return { paddingHorizontal: 20, paddingVertical: 16, minHeight: 52, fontSize: 18 };
      default:
        return { paddingHorizontal: 16, paddingVertical: 12, minHeight: 44, fontSize: 16 };
    }
  };

  const sizeStyles = getSizeStyles();

  const inner = (
    <>
      {icon && iconPosition === 'left' && (
        <IconSymbol name={icon as never} size={sizeStyles.fontSize} color={isDisabled ? onLayout1 : colors.textColor} />
      )}
      <ThemedText
        lightColor={isDisabled ? onLayout1 : colors.textColor}
        darkColor={isDisabled ? onLayout1 : colors.textColor}
        style={[styles.text, { fontSize: sizeStyles.fontSize }]}
      >
        {title}
      </ThemedText>
      {icon && iconPosition === 'right' && (
        <IconSymbol name={icon as never} size={sizeStyles.fontSize} color={isDisabled ? onLayout1 : colors.textColor} />
      )}
    </>
  );

  if (isGradient) {
    return (
      <Pressable
        {...props}
        disabled={isDisabled}
        style={(state) => {
          const resolvedStyle = typeof style === 'function' ? style(state) : style;
          return [
            fullWidth ? { width: '100%' as const } : null,
            {
              opacity: isDisabled ? disabledOpacityValue : state.pressed ? 0.9 : 1,
              transform: [{ scale: state.pressed && !isDisabled ? 0.98 : 1 }],
            },
            resolvedStyle,
          ];
        }}
        {...(Platform.OS === 'web' && {
          cursor: isDisabled ? 'not-allowed' : 'pointer',
        })}
      >
        <LinearGradient
          colors={[...gradientColors]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.button,
            styles.gradientButton,
            {
              paddingHorizontal: sizeStyles.paddingHorizontal,
              paddingVertical: sizeStyles.paddingVertical,
              minHeight: sizeStyles.minHeight,
              width: fullWidth ? '100%' : undefined,
            },
          ]}
        >
          {inner}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      {...props}
      disabled={isDisabled}
      style={(state) => {
        const resolvedStyle = typeof style === 'function' ? style(state) : style;
        return [
          styles.button,
          {
            backgroundColor: isDisabled
              ? layout2
              : state.pressed
                ? colors.pressedBackgroundColor
                : colors.backgroundColor,
            paddingHorizontal: sizeStyles.paddingHorizontal,
            paddingVertical: sizeStyles.paddingVertical,
            minHeight: sizeStyles.minHeight,
            opacity: isDisabled ? disabledOpacityValue : state.pressed ? 0.85 : 1,
            width: fullWidth ? ('100%' as const) : ('auto' as const),
            borderWidth: variant === 'glass' ? 1 : 0,
            borderColor: 'borderColor' in colors ? colors.borderColor : undefined,
          },
          resolvedStyle,
        ];
      }}
      {...(Platform.OS === 'web' && {
        cursor: isDisabled ? 'not-allowed' : 'pointer',
      })}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.lg,
  },
  gradientButton: {
    shadowColor: 'rgba(0, 132, 255, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  text: {
    fontWeight: '500',
  },
});
