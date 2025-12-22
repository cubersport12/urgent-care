import { useAppTheme, useThemeValue } from '@/hooks/use-theme-color';
import { Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { IconSymbol } from '../ui/icon-symbol';
import { ExplorerItem } from './types';

type ExplorerItemComponentProps = {
  item: ExplorerItem;
  onPress: () => void;
  isRead?: boolean;
  isDisabled?: boolean;
  testStats?: {
    passed: boolean | null | undefined;
    completedAt?: string | null;
    startedAt?: string | null;
  };
  description?: string;
};

export function ExplorerItemComponent({ item, onPress, isRead = false, isDisabled = false, testStats, description }: ExplorerItemComponentProps) {
  const { layout1: itemBackground, layout2: pressedBackgroundColor, success: successColor, error: errorColor, neutralSoft, neutral: iconColor, onLayout1 } = useAppTheme();
  const disabledOpacityValue = useThemeValue('disabledOpacity');
  
  // Определяем, какую иконку показывать для теста
  const testStatusIcon = item.type === 'test' && testStats && testStats.passed !== null && testStats.passed !== undefined
    ? testStats.passed
      ? { name: 'checkmark.circle.fill' as const, color: successColor }
      : { name: 'xmark.circle.fill' as const, color: errorColor }
    : null;

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.item,
        {
          backgroundColor: pressed && !isDisabled ? pressedBackgroundColor : itemBackground,
          opacity: isDisabled ? 0.5 : 1,
        },
      ]}
    >
      <ThemedView style={styles.itemContent}>
        <ThemedView style={styles.itemIconContainer}>
          <ThemedText style={styles.itemIcon}>
            {item.type === 'folder' ? '📁' : item.type === 'article' ? '📄' : '📝'}
          </ThemedText>
          {item.type === 'article' && isRead && !isDisabled && (
            <IconSymbol name="checkmark.circle.fill" size={12} color={successColor} style={styles.itemCheckmark} />
          )}
          {item.type === 'test' && testStatusIcon && !isDisabled && (
            <IconSymbol name={testStatusIcon.name} size={12} color={testStatusIcon.color} style={styles.itemCheckmark} />
          )}
        </ThemedView>
        <ThemedView style={styles.itemTextContainer}>
          <ThemedText 
                   style={[
                     styles.itemName,
                     item.type === 'article' && isRead && !isDisabled && { color: successColor },
                     isDisabled && { opacity: disabledOpacityValue, color: onLayout1 },
                   ]}
          >
            {item.data.name}
          </ThemedText>
          {description && (
            <ThemedText 
              style={[
                styles.itemDescription,
                { color: neutralSoft },
                isDisabled && { opacity: disabledOpacityValue },
              ]}
            >
              {testStats?.passed ? 'Успешно пройден ' : 'Не пройден '}
              {description}
            </ThemedText>
          )}
        </ThemedView>
        {item.type === 'folder' && (
          <IconSymbol name="chevron.right" size={20} color={iconColor} />
        )}
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    marginBottom: 12,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'none'
  },
  itemIconContainer: {
    position: 'relative',
    marginRight: 12,
    backgroundColor: 'none'
  },
  itemIcon: {
    fontSize: 38,
    lineHeight: -1
  },
  itemTextContainer: {
    flex: 1,
    backgroundColor: 'none',
    paddingBottom: 0
  },
  itemName: {
    fontSize: 16,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  itemCheckmark: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    fontSize: 20
  },
});

