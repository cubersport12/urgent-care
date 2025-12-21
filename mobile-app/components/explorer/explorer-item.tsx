import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
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
};

export function ExplorerItemComponent({ item, onPress, isRead = false, isDisabled = false }: ExplorerItemComponentProps) {
  const itemBackground = useThemeColor({ light: Colors.light.buttonBackground, dark: '#080d18' }, 'background');
  const pressedBackgroundColor = useThemeColor({ light: Colors.light.pressedBackground, dark: Colors.dark.pressedBackground }, 'background');
  const successColor = useThemeColor({}, 'success');
  const disabledColor = useThemeColor({ light: Colors.light.disabledText, dark: Colors.dark.disabledText }, 'text');
  const descriptionColor = useThemeColor({ light: '#666666', dark: '#9BA1A6' }, 'text');
  const iconColor = useThemeColor({}, 'icon');

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
        </ThemedView>
        <ThemedView style={styles.itemTextContainer}>
          <ThemedText 
            style={[
              styles.itemName,
              item.type === 'article' && isRead && !isDisabled && { color: successColor },
              isDisabled && { color: disabledColor },
            ]}
          >
            {item.data.name}
          </ThemedText>
          <ThemedText 
            style={[
              styles.itemDescription,
              { color: descriptionColor },
              isDisabled && { opacity: 0.5 },
            ]}
          >
            Для описания надо доработать конструктор...
            {/* Описание будет добавлено, когда появится в данных */}
          </ThemedText>
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

