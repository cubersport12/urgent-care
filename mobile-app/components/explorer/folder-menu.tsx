import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { IconSymbol } from '../ui/icon-symbol';

type FolderMenuProps = {
  visible: boolean;
  onClose: () => void;
  folderStats: {
    foldersCount: number;
    articlesCount: number;
    testsCount: number;
  };
  showFolders: boolean;
  showArticles: boolean;
  showTests: boolean;
  onToggleFolders: () => void;
  onToggleArticles: () => void;
  onToggleTests: () => void;
};

export function FolderMenu({
  visible,
  onClose,
  folderStats,
  showFolders,
  showArticles,
  showTests,
  onToggleFolders,
  onToggleArticles,
  onToggleTests,
}: FolderMenuProps) {
  const currentFolderButtonBackground = useThemeColor({ light: Colors.light.buttonBackground, dark: Colors.dark.buttonBackground }, 'background');
  const descriptionColor = useThemeColor({ light: '#666666', dark: '#9BA1A6' }, 'text');
  const iconColor = useThemeColor({}, 'icon');
  const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#1a1a1a' }, 'border');

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable 
        style={[styles.menuOverlay, { backgroundColor: currentFolderButtonBackground }]}
        onPress={onClose}
      >
        <ThemedView 
          style={styles.menuContainer}
          onStartShouldSetResponder={() => true}
        >
          <ThemedView style={styles.menuHeader}>
            <ThemedText style={styles.menuTitle}>Параметры</ThemedText>
            <Pressable onPress={onClose}>
              <IconSymbol name="xmark.circle.fill" size={24} color={iconColor} />
            </Pressable>
          </ThemedView>
          <ThemedView style={styles.menuContent}>
            <ThemedText style={styles.menuSectionTitle}>Фильтры</ThemedText>
            <View style={styles.menuFilterButtons}>
              {folderStats.foldersCount > 0 && (
                <Pressable
                  onPress={onToggleFolders}
                  style={({ pressed }) => [
                    styles.menuFilterButton,
                    showFolders && styles.menuFilterButtonActive,
                    showFolders && { backgroundColor: '#0c1227' },
                  ]}
                >
                  <ThemedText 
                    style={[
                      styles.menuFilterButtonText, 
                      showFolders ? styles.filterButtonTextActive : { color: descriptionColor }
                    ]}
                  >
                    📁 {folderStats.foldersCount}
                  </ThemedText>
                </Pressable>
              )}
              {folderStats.articlesCount > 0 && (
                <Pressable
                  onPress={onToggleArticles}
                  style={({ pressed }) => [
                    styles.menuFilterButton,
                    showArticles && styles.menuFilterButtonActive,
                    showArticles && { backgroundColor: '#0c1227' },
                  ]}
                >
                  <ThemedText 
                    style={[
                      styles.menuFilterButtonText, 
                      showArticles ? styles.filterButtonTextActive : { color: descriptionColor }
                    ]}
                  >
                    📄 {folderStats.articlesCount}
                  </ThemedText>
                </Pressable>
              )}
              {folderStats.testsCount > 0 && (
                <Pressable
                  onPress={onToggleTests}
                  style={({ pressed }) => [
                    styles.menuFilterButton,
                    showTests && styles.menuFilterButtonActive,
                    showTests && { backgroundColor: '#0c1227' },
                  ]}
                >
                  <ThemedText 
                    style={[
                      styles.menuFilterButtonText, 
                      showTests ? styles.filterButtonTextActive : { color: descriptionColor }
                    ]}
                  >
                    📝 {folderStats.testsCount}
                  </ThemedText>
                </Pressable>
              )}
            </View>
          </ThemedView>
        </ThemedView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  menuOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menuContainer: {
    borderRadius: 16,
    padding: 20,
    minWidth: 280,
    maxWidth: '90%',
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  menuContent: {
    gap: 16,
  },
  menuSectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.7,
    marginBottom: 12,
  },
  menuFilterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  menuFilterButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuFilterButtonActive: {
    opacity: 1,
  },
  menuFilterButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: Colors.light.white,
  },
});

