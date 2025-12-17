import { useTest } from '@/contexts/test-context';
import { AppArticleVm, AppFolderVm, AppTestVm } from '@/hooks/api/types';
import { fetchArticle, useArticles, useArticlesStats } from '@/hooks/api/useArticles';
import { useFolders } from '@/hooks/api/useFolders';
import { useTests } from '@/hooks/api/useTests';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  // История навигации по статьям для определения hasPrevious
  const [articleNavigationHistory, setArticleNavigationHistory] = useState<string[]>([]);
  const previousFolderIdRef = useRef<string | undefined>(undefined);
  const opacity = useSharedValue(1);
  const { isTestStarted, startTest, resetTest } = useTest();

  const tintColor = useThemeColor({}, 'tint');
  const foldersResponse = useFolders(currentFolderId);
  const articlesResponse = useArticles(currentFolderId);
  const testsResponse = useTests(currentFolderId);
  
  // Получаем статистику для статей
  const articlesIds = useMemo(() => {
    return articlesResponse.data?.map(article => article.id) || [];
  }, [articlesResponse.data]);
  
  const articlesStatsResponse = useArticlesStats(articlesIds);
  
  // Создаем Map для быстрого поиска прочитанных статей
  const readArticlesMap = useMemo(() => {
    const map = new Map<string, boolean>();
    if (articlesStatsResponse.data) {
      articlesStatsResponse.data.forEach(stat => {
        if (stat.readed) {
          map.set(stat.articleId, true);
        }
      });
      console.log('Read articles map:', Array.from(map.entries()));
    }
    return map;
  }, [articlesStatsResponse.data]);

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

  // Функция для проверки, должен ли элемент быть скрыт
  const isItemHidden = useCallback((item: ExplorerItem, itemIndex: number): boolean => {
    // Проверяем только статьи и тесты
    if (item.type === 'folder') return false;

    // Проверяем флаг hideWhileNotPrevComplete
    const hideFlag = item.type === 'article' 
      ? (item.data as AppArticleVm).hideWhileNotPrevComplete 
      : false; // Для тестов пока не поддерживаем

    if (!hideFlag) return false;

    // Ищем предыдущий текстовый документ (статью)
    for (let i = itemIndex - 1; i >= 0; i--) {
      const prevItem = items[i];
      
      // Пропускаем папки
      if (prevItem.type === 'folder') continue;

      // Если нашли статью
      if (prevItem.type === 'article') {
        const prevArticle = prevItem.data as AppArticleVm;
        
        // Проверяем, включена ли статистика для предыдущей статьи
        if (prevArticle.includeToStatistics) {
          // Проверяем, прочитана ли предыдущая статья
          const isPrevRead = readArticlesMap.get(prevArticle.id) || false;
          // Если не прочитана, текущий элемент должен быть скрыт
          return !isPrevRead;
        }
      }
    }

    // Если предыдущего текстового документа нет или он не включен в статистику, не скрываем
    return false;
  }, [items, readArticlesMap]);

  // Функция для проверки, должен ли элемент быть disabled
  const isItemDisabled = useCallback((item: ExplorerItem, itemIndex: number): boolean => {
    // Проверяем только статьи и тесты
    if (item.type === 'folder') return false;

    // Проверяем флаг disableWhileNotPrevComplete
    const disableFlag = item.type === 'article' 
      ? (item.data as AppArticleVm).disableWhileNotPrevComplete 
      : false; // Для тестов пока не поддерживаем

    if (!disableFlag) return false;

    // Ищем предыдущий текстовый документ (статью)
    for (let i = itemIndex - 1; i >= 0; i--) {
      const prevItem = items[i];
      
      // Пропускаем папки
      if (prevItem.type === 'folder') continue;

      // Если нашли статью
      if (prevItem.type === 'article') {
        const prevArticle = prevItem.data as AppArticleVm;
        
        // Проверяем, включена ли статистика для предыдущей статьи
        if (prevArticle.includeToStatistics) {
          // Проверяем, прочитана ли предыдущая статья
          const isPrevRead = readArticlesMap.get(prevArticle.id) || false;
          // Если не прочитана, текущий элемент должен быть disabled
          return !isPrevRead;
        }
      }
    }

    // Если предыдущего текстового документа нет или он не включен в статистику, не блокируем
    return false;
  }, [items, readArticlesMap]);

  const handleItemPress = (item: ExplorerItem) => {
    // Не обрабатываем нажатия на disabled элементы
    // (это уже обрабатывается в Pressable, но на всякий случай)
    
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
      // При открытии статьи напрямую из списка - это первый элемент в очереди
      setArticleNavigationHistory([item.data.id]);
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

  // Обработчик возврата в папку (верхняя кнопка "Назад")
  const handleBackToFolder = () => {
    // Всегда выходим в папку, независимо от истории навигации
    if (selectedArticle) {
      // Перезапрашиваем статистику для обновления списка
      if (articlesStatsResponse.fetchData) {
        void articlesStatsResponse.fetchData();
      }
      setArticleNavigationHistory([]);
    }
    setSelectedArticle(null);
    setSelectedTest(null);
    resetTest();
    // Удаляем все элементы article из breadcrumb
    setBreadcrumb(prev => prev.filter(b => b.type !== 'article' && b.type !== 'test'));
    // Анимация появления списка
    opacity.value = withTiming(1, { duration: 300 });
  };

  // Обработчик перехода к предыдущему документу (нижняя кнопка "Назад")
  const handlePreviousArticle = useCallback(async () => {
    if (articleNavigationHistory.length > 1) {
      const previousArticleId = articleNavigationHistory[articleNavigationHistory.length - 2];
      try {
        // Запрашиваем предыдущую статью по ID через API
        const result = await fetchArticle(previousArticleId);
        const previousArticle = result.data;
        
        if (previousArticle) {
          opacity.value = withTiming(0, { duration: 200 });
          setSelectedArticle(previousArticle);
          setArticleNavigationHistory(prev => prev.slice(0, -1));
          setBreadcrumb(prev => {
            // Удаляем последний элемент article из breadcrumb
            const newBreadcrumb = [...prev];
            // Ищем последний индекс article с конца
            let lastArticleIndex = -1;
            for (let i = newBreadcrumb.length - 1; i >= 0; i--) {
              if (newBreadcrumb[i].type === 'article') {
                lastArticleIndex = i;
                break;
              }
            }
            if (lastArticleIndex !== -1) {
              newBreadcrumb.splice(lastArticleIndex, 1);
            }
            // Добавляем предыдущую статью
            return [...newBreadcrumb, { id: previousArticle.id, name: previousArticle.name, type: 'article' }];
          });
        }
      } catch (error) {
        console.error('Error fetching previous article:', error);
      }
    }
  }, [articleNavigationHistory, opacity]);

  // Обработчик возврата из article/test (для совместимости)
  const handleBackFromItem = handleBackToFolder;

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

  // Обработчик перехода к следующему документу
  const handleNextArticle = useCallback(async (nextArticleId: string) => {
    try {
      // Запрашиваем статью по ID через API
      const result = await fetchArticle(nextArticleId);
      const nextArticle = result.data;
      
      if (nextArticle) {
        opacity.value = withTiming(0, { duration: 200 });
        setSelectedArticle(nextArticle);
        setBreadcrumb(prev => [...prev, { id: nextArticle.id, name: nextArticle.name, type: 'article' }]);
        // Добавляем в историю навигации - теперь есть предыдущий элемент
        setArticleNavigationHistory(prev => [...prev, nextArticleId]);
      }
    } catch (error) {
      console.error('Error fetching article:', error);
    }
  }, [opacity]);

  // Анимированный стиль для списка
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  // Если выбрана статья, показываем ArticleView
  if (selectedArticle) {
    // Определяем, есть ли предыдущий документ в истории навигации
    // Если в истории больше одного элемента, значит мы перешли через "Далее"
    const hasPrevious = articleNavigationHistory.length > 1;
    
    return (
      <ArticleView 
        article={selectedArticle} 
        onBack={handleBackToFolder}
        onNext={handleNextArticle}
        onPrevious={handlePreviousArticle}
        hasPrevious={hasPrevious}
      />
    );
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
            items
              .map((item, index) => ({ item, index }))
              .filter(({ item, index }) => !isItemHidden(item, index))
              .map(({ item, index }) => {
                const isRead = item.type === 'article' ? readArticlesMap.get(item.data.id) || false : false;
                const isDisabled = isItemDisabled(item, index);
                if (item.type === 'article') {
                  console.log(`Article ${item.data.name} (${item.data.id}): isRead=${isRead}, map has: ${readArticlesMap.has(item.data.id)}`);
                }
                return (
                  <ExplorerItemComponent
                    key={`${item.type}-${item.data.id}`}
                    item={item}
                    onPress={() => handleItemPress(item)}
                    isRead={isRead}
                    isDisabled={isDisabled}
                  />
                );
              })
          )}
        </ScrollView>
      </Animated.View>
    </ThemedView>
  );
}

type ExplorerItemComponentProps = {
  item: ExplorerItem;
  onPress: () => void;
  isRead?: boolean;
  isDisabled?: boolean;
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

function ExplorerItemComponent({ item, onPress, isRead = false, isDisabled = false }: ExplorerItemComponentProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const pressedBackgroundColor = useThemeColor({ light: '#f0f0f0', dark: '#2a2a2a' }, 'background');
  const successColor = '#4CAF50';
  const disabledColor = useThemeColor({ light: '#cccccc', dark: '#666666' }, 'text');

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.item,
        {
          backgroundColor: pressed && !isDisabled ? pressedBackgroundColor : backgroundColor,
          opacity: isDisabled ? 0.5 : 1,
        },
      ]}
    >
      <ThemedView style={styles.itemContent}>
        <ThemedText style={styles.itemIcon}>
          {item.type === 'folder' ? '📁' : item.type === 'article' ? '📄' : '📝'}
        </ThemedText>
        <ThemedText 
          style={[
            styles.itemName,
            item.type === 'article' && isRead && !isDisabled && { color: successColor },
            isDisabled && { color: disabledColor },
          ]}
        >
          {item.data.name}
        </ThemedText>
        {item.type === 'article' && isRead && !isDisabled && (
          <IconSymbol name="checkmark" size={20} color={successColor} style={styles.itemCheckmark} />
        )}
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
  itemCheckmark: {
    marginLeft: 8,
  },
});

