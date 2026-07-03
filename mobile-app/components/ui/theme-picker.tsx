import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type ThemePreference, useTheme } from '@/contexts/theme-context';
import { useAppTheme, useGlass } from '@/hooks/use-theme-color';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Системная' },
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
];

export function ThemePicker() {
  const { themePreference, setThemePreference } = useTheme();
  const { text, neutralSoft, primary } = useAppTheme();
  const glass = useGlass();
  const [open, setOpen] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const selectedLabel =
    OPTIONS.find((option) => option.value === themePreference)?.label ?? 'Системная';

  useEffect(() => {
    Animated.timing(animation, {
      toValue: open ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [open, animation]);

  const dropdownHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, OPTIONS.length * 48 + 8],
  });

  const dropdownOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={() => setOpen((prev) => !prev)}
        style={[
          styles.row,
          {
            backgroundColor: glass.backgroundSubtle,
            borderColor: open ? 'rgba(0, 132, 255, 0.4)' : glass.borderSubtle,
          },
        ]}
      >
        <IconSymbol name="moon.fill" size={20} color={text} />
        <ThemedText style={styles.label}>Тема</ThemedText>
        <ThemedText style={[styles.value, { color: neutralSoft }]}>{selectedLabel}</ThemedText>
        <IconSymbol
          name="chevron.right"
          size={16}
          color={neutralSoft}
          style={{
            transform: [{ rotate: open ? '90deg' : '0deg' }],
          }}
        />
      </Pressable>

      <Animated.View
        style={[
          styles.dropdown,
          {
            height: dropdownHeight,
            opacity: dropdownOpacity,
            borderColor: glass.borderSubtle,
            backgroundColor: glass.backgroundSubtle,
          },
        ]}
      >
        {OPTIONS.map((option) => {
          const active = themePreference === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => {
                void setThemePreference(option.value);
                setOpen(false);
              }}
              style={[
                styles.option,
                active && {
                  backgroundColor: 'rgba(0, 132, 255, 0.12)',
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.optionLabel,
                  active && { color: primary, fontWeight: '600' },
                ]}
              >
                {option.label}
              </ThemedText>
              {active ? <IconSymbol name="checkmark.circle.fill" size={18} color={primary} /> : null}
            </Pressable>
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  label: {
    flex: 1,
    fontSize: 14,
  },
  value: {
    fontSize: 13,
  },
  dropdown: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  optionLabel: {
    fontSize: 14,
  },
});
