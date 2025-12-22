import { useThemeColorSimple, useThemeValue } from '@/hooks/use-theme-color';
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
  const primaryColor = useThemeColorSimple('primary');
  const onPrimaryColor = useThemeColorSimple('onPrimary');
  const successColor = useThemeColorSimple('success');
  const onSuccessColor = useThemeColorSimple('onSuccess');
  const errorColor = useThemeColorSimple('error');
  const onErrorColor = useThemeColorSimple('onError');
  const layout1 = useThemeColorSimple('layout1');
  const layout2 = useThemeColorSimple('layout2');
  const onLayout1 = useThemeColorSimple('onLayout1');
  const disabledOpacityValue = useThemeValue('disabledOpacity');
  
  const getButtonColors = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: primaryColor,
          pressedBackgroundColor: primaryColor + 'CC',
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
      case 'default':
        return {
          backgroundColor: layout1,
          pressedBackgroundColor: layout2,
          textColor: onLayout1,
        };
      default:
        return {
          backgroundColor: primaryColor,
          pressedBackgroundColor: primaryColor + 'CC',
          textColor: onPrimaryColor,
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
            ? (variant === 'default' ? layout2 : layout2)
            : pressed 
            ? colors.pressedBackgroundColor 
            : colors.backgroundColor,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          paddingVertical: sizeStyles.paddingVertical,
          minHeight: sizeStyles.minHeight,
          opacity: isDisabled ? disabledOpacityValue : pressed ? 0.8 : 1,
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
              color={isDisabled ? onLayout1 : colors.textColor} 
            />
          )}
          <ThemedText
            lightColor={isDisabled ? onLayout1 : colors.textColor}
            darkColor={isDisabled ? onLayout1 : colors.textColor}
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
              color={isDisabled ? onLayout1 : colors.textColor} 
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

