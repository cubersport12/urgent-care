import { useAppTheme } from '@/hooks/use-theme-color';
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
  const { layout2, neutralSoft: descriptionColor, neutral: iconColor, border: borderColor, primaryContainer: filterButtonActiveBackground, onPrimary: whiteColor } = useAppTheme();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable 
        style={[styles.menuOverlay]}
        onPress={onClose}
      >
        <ThemedView 
          style={[styles.menuContainer, { backgroundColor: layout2 }]}
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
                    showFolders && { backgroundColor: filterButtonActiveBackground },
                  ]}
                >
                  <ThemedText 
                    style={[
                      styles.menuFilterButtonText, 
                      showFolders ? { color: whiteColor } : { color: descriptionColor }
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
                    showArticles && { backgroundColor: filterButtonActiveBackground },
                  ]}
                >
                  <ThemedText 
                    style={[
                      styles.menuFilterButtonText, 
                      showArticles ? { color: whiteColor } : { color: descriptionColor }
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
                    showTests && { backgroundColor: filterButtonActiveBackground },
                  ]}
                >
                  <ThemedText 
                    style={[
                      styles.menuFilterButtonText, 
                      showTests ? { color: whiteColor } : { color: descriptionColor }
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
    // Color will be set dynamically
  },
});

