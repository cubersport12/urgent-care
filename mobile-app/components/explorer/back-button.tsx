import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppTheme, useGlass } from '@/hooks/use-theme-color';
import { useTheme } from '@/contexts/theme-context';
import { BlurView } from 'expo-blur';
import { Platform, Pressable, StyleSheet } from 'react-native';

type BackButtonProps = {
  onPress: () => void;
  label?: string;
};

export function BackButton({ onPress }: BackButtonProps) {
  const { theme } = useTheme();
  const { text, layout1 } = useAppTheme();
  const glass = useGlass();
  const isLight = theme === 'light';
  const showBlur = !isLight && Platform.OS !== 'web';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isLight ? layout1 : glass.background,
          borderColor: glass.border,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
      ]}
    >
      {showBlur ? (
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      ) : null}
      <IconSymbol name="chevron.left" size={18} color={text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
});
