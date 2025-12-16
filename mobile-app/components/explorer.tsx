import { useTest } from '@/contexts/test-context';
import { AppArticleVm, AppFolderVm, AppTestVm } from '@/hooks/api/types';
import { useArticles } from '@/hooks/api/useArticles';
import { useFolders } from '@/hooks/api/useFolders';
import { useTests } from '@/hooks/api/useTests';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ArticleView } from './article-view';
import { TestTakingView } from './test-taking-view';
import { TestView } from './test-view';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { IconSymbol } from './ui/icon-symbol';

type ExplorerItem = {
  type: 'folder' | 'article' | 'test';
  data: AppFolderVm | AppArticleVm | AppTestVm;
};

type BreadcrumbItem = {
  id: string;
  name: string;
  type: 'folder' | 'article' | 'test';
};

export function Explorer() {
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [selectedArticle, setSelectedArticle] = useState<AppArticleVm | null>(null);
  const [selectedTest, setSelectedTest] = useState<AppTestVm | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const previousFolderIdRef = useRef<string | undefined>(undefined);
  const opacity = useSharedValue(1);
  const { isTestStarted, startTest, resetTest } = useTest();

  const tintColor = useThemeColor({}, 'tint');
  const foldersResponse = useFolders(currentFolderId);
  const articlesResponse = useArticles(currentFolderId);
  const testsResponse = useTests(currentFolderId);

  // Отслеживаем изменение currentFolderId для показа спиннера и анимации
  useEffect(() => {
    if (currentFolderId !== previousFolderIdRef.current) {
      setIsNavigating(true);
      previousFolderIdRef.current = currentFolderId;
      // Анимация исчезновения
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [currentFolderId, opacity]);

  // Сбрасываем флаг навигации когда данные загружены и анимируем появление
  useEffect(() => {
    const isDataLoading = foldersResponse.isLoading || articlesResponse.isLoading || testsResponse.isLoading;
    
    if (!isDataLoading && isNavigating) {
      setIsNavigating(false);
      // Анимация появления
      opacity.value = withTiming(1, { duration: 300 });
    }
  }, [foldersResponse.isLoading, articlesResponse.isLoading, testsResponse.isLoading, isNavigating, opacity]);

  // Определяем состояние загрузки
  const isLoading = useMemo(() => {
    const isDataLoading = foldersResponse.isLoading || articlesResponse.isLoading || testsResponse.isLoading;
    
    return isDataLoading || isNavigating;
  }, [foldersResponse.isLoading, articlesResponse.isLoading, testsResponse.isLoading, isNavigating]);

  // Формируем breadcrumb
  const displayBreadcrumb = useMemo(() => {
    return breadcrumb;
  }, [breadcrumb]);

  const items = useMemo(() => {
    const explorerItems: ExplorerItem[] = [];

    // Добавляем папки
    if (foldersResponse.data) {
      foldersResponse.data.forEach((folder) => {
        explorerItems.push({ type: 'folder', data: folder });
      });
    }

    // Добавляем статьи
    if (articlesResponse.data) {
      articlesResponse.data.forEach((article) => {
        explorerItems.push({ type: 'article', data: article });
      });
    }

    // Добавляем тесты
    if (testsResponse.data) {
      testsResponse.data.forEach((test) => {
        explorerItems.push({ type: 'test', data: test });
      });
    }

    // Сортируем по order
    return explorerItems.sort((a, b) => {
      const orderA = a.data.order ?? 0;
      const orderB = b.data.order ?? 0;
      return orderA - orderB;
    });
  }, [foldersResponse.data, articlesResponse.data, testsResponse.data]);

  const handleItemPress = (item: ExplorerItem) => {
    if (item.type === 'folder') {
      setIsNavigating(true);
      opacity.value = withTiming(0, { duration: 200 });
      setCurrentFolderId(item.data.id);
      setBreadcrumb(prev => [...prev, { id: item.data.id, name: item.data.name, type: 'folder' }]);
      setSelectedArticle(null);
      setSelectedTest(null);
    } else if (item.type === 'article') {
      opacity.value = withTiming(0, { duration: 200 });
      setSelectedArticle(item.data as AppArticleVm);
      setBreadcrumb(prev => [...prev, { id: item.data.id, name: item.data.name, type: 'article' }]);
      setSelectedTest(null);
    } else if (item.type === 'test') {
      opacity.value = withTiming(0, { duration: 200 });
      setSelectedTest(item.data as AppTestVm);
      setBreadcrumb(prev => [...prev, { id: item.data.id, name: item.data.name, type: 'test' }]);
      setSelectedArticle(null);
    }
  };

  const handleBreadcrumbPress = (index: number) => {
    const targetItem = displayBreadcrumb[index];
    // Кликабельны только папки
    if (targetItem.type === 'folder') {
      // Переходим к папке и обрезаем breadcrumb до этого элемента
      setIsNavigating(true);
      opacity.value = withTiming(0, { duration: 200 });
      setCurrentFolderId(targetItem.id);
      setBreadcrumb(breadcrumb.slice(0, index + 1));
      setSelectedArticle(null);
      setSelectedTest(null);
    }
  };

  const handleBackFromItem = () => {
    // Возврат из article/test - просто закрываем их, остаемся в текущей папке
    setSelectedArticle(null);
    setSelectedTest(null);
    resetTest();
    // Удаляем последний элемент из breadcrumb (article/test)
    setBreadcrumb(prev => prev.slice(0, -1));
    // Анимация появления списка
    opacity.value = withTiming(1, { duration: 300 });
  };

  const handleStartTest = () => {
    if (selectedTest) {
      startTest(selectedTest);
    }
  };

  const handleFinishTest = () => {
    resetTest();
    // Не сбрасываем selectedTest, чтобы вернуться к TestView
    // setSelectedTest(null);
    // setBreadcrumb(prev => prev.slice(0, -1));
    opacity.value = withTiming(1, { duration: 300 });
  };

  const handleBackFromFolder = () => {
    // Возврат из папки - идем на уровень выше
    setIsNavigating(true);
    opacity.value = withTiming(0, { duration: 200 });
    
    // Находим все папки в breadcrumb
    const folderBreadcrumb = breadcrumb.filter(b => b.type === 'folder');
    // Удаляем последнюю папку
    const newFolderBreadcrumb = folderBreadcrumb.slice(0, -1);
    
    // Обновляем breadcrumb, оставляя только папки до нового уровня
    const folderIndices = breadcrumb
      .map((b, i) => b.type === 'folder' ? i : -1)
      .filter(i => i !== -1);
    const lastFolderIndex = folderIndices[folderIndices.length - 1];
    const newBreadcrumb = breadcrumb.slice(0, lastFolderIndex);
    setBreadcrumb(newBreadcrumb);
    
    // Определяем новую текущую папку
    const lastFolder = newFolderBreadcrumb.pop();
    // Если нет папок, возвращаемся в корень
    setCurrentFolderId(lastFolder?.id);
    setSelectedArticle(null);
    setSelectedTest(null);
  };

  // Анимированный стиль для списка
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  // Если выбрана статья, показываем ArticleView
  if (selectedArticle) {
    return <ArticleView article={selectedArticle} onBack={handleBackFromItem} />;
  }

  // Если тест начат, показываем TestTakingView
  if (selectedTest && isTestStarted) {
    return <TestTakingView onBack={handleBackFromItem} onFinish={handleFinishTest} />;
  }

  // Если выбран тест, показываем TestView
  if (selectedTest) {
    return <TestView test={selectedTest} onBack={handleBackFromItem} onStart={handleStartTest} />;
  }

  // Показываем список элементов
  return (
    <ThemedView style={styles.container}>
      {displayBreadcrumb.length > 0 && (
        <ThemedView style={styles.header}>
          <ThemedView style={styles.headerContent}>
            {currentFolderId !== undefined && (
              <BackButton onPress={handleBackFromFolder} />
            )}
            <Breadcrumb 
              items={displayBreadcrumb} 
              onItemPress={handleBreadcrumbPress}
            />
          </ThemedView>
        </ThemedView>
      )}
      <Animated.View style={[styles.scrollViewContainer, animatedStyle]}>
        <ScrollView style={styles.scrollView}>
          {isLoading ? (
            <ThemedView style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={tintColor} />
              <ThemedText style={styles.loadingText}>Загрузка...</ThemedText>
            </ThemedView>
          ) : items.length === 0 ? (
            <ThemedView style={styles.emptyContainer}>
              <ThemedText>Нет элементов</ThemedText>
            </ThemedView>
          ) : (
            items.map((item) => (
              <ExplorerItemComponent
                key={`${item.type}-${item.data.id}`}
                item={item}
                onPress={() => handleItemPress(item)}
              />
            ))
          )}
        </ScrollView>
      </Animated.View>
    </ThemedView>
  );
}

type ExplorerItemComponentProps = {
  item: ExplorerItem;
  onPress: () => void;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
  onItemPress: (index: number) => void;
};

function Breadcrumb({ items, onItemPress }: BreadcrumbProps) {
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const separatorColor = useThemeColor({ light: '#999', dark: '#666' }, 'text');

  return (
    <ThemedView style={styles.breadcrumb}>
      {items.map((item, index) => (
        <ThemedView key={`${item.type}-${item.id}-${index}`} style={styles.breadcrumbItem}>
          {index > 0 && (
            <ThemedText style={[styles.breadcrumbSeparator, { color: separatorColor }]}>
              {' / '}
            </ThemedText>
          )}
          {item.type === 'folder' ? (
            <Pressable onPress={() => onItemPress(index)}>
              <ThemedText
                style={[
                  styles.breadcrumbText,
                  { color: index === items.length - 1 ? textColor : tintColor },
                  index === items.length - 1 && styles.breadcrumbTextActive,
                ]}
              >
                {item.name}
              </ThemedText>
            </Pressable>
          ) : (
            <ThemedText
              style={[
                styles.breadcrumbText,
                styles.breadcrumbTextActive,
                { color: textColor },
              ]}
            >
              {item.name}
            </ThemedText>
          )}
        </ThemedView>
      ))}
    </ThemedView>
  );
}

type BackButtonProps = {
  onPress: () => void;
};

function BackButton({ onPress }: BackButtonProps) {
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const pressedBackgroundColor = useThemeColor({ light: '#f0f0f0', dark: '#2a2a2a' }, 'background');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.backButton,
        {
          backgroundColor: pressed ? pressedBackgroundColor : backgroundColor,
        },
      ]}
    >
      <IconSymbol name="chevron.left" size={28} color={tintColor} />
    </Pressable>
  );
}

function ExplorerItemComponent({ item, onPress }: ExplorerItemComponentProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const pressedBackgroundColor = useThemeColor({ light: '#f0f0f0', dark: '#2a2a2a' }, 'background');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        {
          backgroundColor: pressed ? pressedBackgroundColor : backgroundColor,
        },
      ]}
    >
      <ThemedView style={styles.itemContent}>
        <ThemedText style={styles.itemIcon}>
          {item.type === 'folder' ? '📁' : item.type === 'article' ? '📄' : '📝'}
        </ThemedText>
        <ThemedText style={styles.itemName}>{item.data.name}</ThemedText>
        {item.type === 'folder' && <ThemedText style={styles.itemArrow}>→</ThemedText>}
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flexDirection: 'row',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    flexWrap: 'wrap',
  },
  backButton: {
    borderRadius: 8,
    paddingHorizontal: 12,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breadcrumb: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    // minHeight: 44,
    justifyContent: 'flex-start',
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbSeparator: {
    fontSize: 14,
    lineHeight: 20,
    marginHorizontal: 2,
  },
  breadcrumbText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  breadcrumbTextActive: {
    fontWeight: '600',
  },
  scrollViewContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  item: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  itemIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  itemName: {
    flex: 1,
    fontSize: 16,
  },
  itemArrow: {
    fontSize: 18,
    color: '#0a7ea4',
  },
});

