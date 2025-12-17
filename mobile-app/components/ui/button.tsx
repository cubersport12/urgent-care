import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Platform, Pressable, StyleSheet, type PressableProps } from 'react-native';
import { ThemedText } from '../themed-text';
import { IconSymbol } from './icon-symbol';

export type ButtonVariant = 'primary' | 'success' | 'error' | 'default';
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
  const backgroundColor = useThemeColor({}, 'background');
  const pressedBackgroundColor = useThemeColor({ light: Colors.light.pressedBackground, dark: Colors.dark.pressedBackground }, 'background');
  
  const getButtonColors = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: Colors.light.primary,
          pressedBackgroundColor: Colors.light.primaryPressed,
          textColor: Colors.light.white,
        };
      case 'success':
        return {
          backgroundColor: Colors.light.success,
          pressedBackgroundColor: Colors.light.success + 'CC',
          textColor: Colors.light.white,
        };
      case 'error':
        return {
          backgroundColor: Colors.light.error,
          pressedBackgroundColor: Colors.light.error + 'CC',
          textColor: Colors.light.white,
        };
      case 'default':
        return {
          backgroundColor: backgroundColor,
          pressedBackgroundColor: pressedBackgroundColor,
          textColor: useThemeColor({}, 'text'),
        };
      default:
        return {
          backgroundColor: Colors.light.primary,
          pressedBackgroundColor: Colors.light.primaryPressed,
          textColor: Colors.light.white,
        };
    }
  };

  const colors = getButtonColors();
  const isDisabled = disabled || props.disabled;

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: 12,
          paddingVertical: 8,
          minHeight: 36,
          fontSize: 14,
        };
      case 'large':
        return {
          paddingHorizontal: 20,
          paddingVertical: 16,
          minHeight: 52,
          fontSize: 18,
        };
      case 'medium':
      default:
        return {
          paddingHorizontal: 16,
          paddingVertical: 12,
          minHeight: 44,
          fontSize: 16,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <Pressable
      {...props}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isDisabled 
            ? (variant === 'default' ? pressedBackgroundColor : Colors.light.disabledBackground)
            : pressed 
            ? colors.pressedBackgroundColor 
            : colors.backgroundColor,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          paddingVertical: sizeStyles.paddingVertical,
          minHeight: sizeStyles.minHeight,
          opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
          width: fullWidth ? '100%' : 'auto',
        },
        style,
      ]}
      {...(Platform.OS === 'web' && {
        cursor: isDisabled ? 'not-allowed' : 'pointer',
      })}
    >
      {({ pressed }) => (
        <>
          {icon && iconPosition === 'left' && (
            <IconSymbol 
              name={icon} 
              size={sizeStyles.fontSize} 
              color={isDisabled ? Colors.light.disabledText : colors.textColor} 
            />
          )}
          <ThemedText
            lightColor={isDisabled ? Colors.light.disabledText : colors.textColor}
            darkColor={isDisabled ? Colors.dark.disabledText : colors.textColor}
            style={[
              styles.text,
              { fontSize: sizeStyles.fontSize },
            ]}
          >
            {title}
          </ThemedText>
          {icon && iconPosition === 'right' && (
            <IconSymbol 
              name={icon} 
              size={sizeStyles.fontSize} 
              color={isDisabled ? Colors.light.disabledText : colors.textColor} 
            />
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
  },
  text: {
    fontWeight: '500',
  },
});
