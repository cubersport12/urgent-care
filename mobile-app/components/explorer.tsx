import { Colors } from '@/constants/theme';
import { useTest } from '@/contexts/test-context';
import { AppArticleVm, AppTestStatsVm, AppTestVm } from '@/hooks/api/types';
import { fetchArticle, useArticles, useArticlesStats } from '@/hooks/api/useArticles';
import { useFolders } from '@/hooks/api/useFolders';
import { useTests } from '@/hooks/api/useTests';
import { useAddOrUpdateTestStats, useTestsStats } from '@/hooks/api/useTestStats';
import { useDeviceId } from '@/hooks/use-device-id';
import { useAppTheme } from '@/hooks/use-theme-color';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ArticleView } from './article-view';
import { BackButton } from './explorer/back-button';
import { ExplorerItemComponent } from './explorer/explorer-item';
import { FolderMenu } from './explorer/folder-menu';
import { BreadcrumbItem, ExplorerItem } from './explorer/types';
import { TestTakingView } from './test-taking-view';
import { TestView } from './test-view';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export function Explorer() {
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [selectedArticle, setSelectedArticle] = useState<AppArticleVm | null>(null);
  const [selectedTest, setSelectedTest] = useState<AppTestVm | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  // История навигации по статьям для определения hasPrevious
  const [articleNavigationHistory, setArticleNavigationHistory] = useState<string[]>([]);
  // Состояния для toggle-кнопок фильтрации
  const [showFolders, setShowFolders] = useState(true);
  const [showArticles, setShowArticles] = useState(true);
  const [showTests, setShowTests] = useState(true);
  // Состояние для меню папки
  const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false);
  const previousFolderIdRef = useRef<string | undefined>(undefined);
  const opacity = useSharedValue(1);
  const { isTestStarted, startTest, resetTest } = useTest();

  const { primary: tintColor, border: borderColor, layout1: currentFolderButtonBackground, neutralSoft: descriptionColor } = useAppTheme();
  const { deviceId } = useDeviceId();
  const foldersResponse = useFolders(currentFolderId);
  const articlesResponse = useArticles(currentFolderId);
  const testsResponse = useTests(currentFolderId);
  
  // Получаем статистику для статей
  const articlesIds = useMemo(() => {
    return articlesResponse.data?.map(article => article.id) || [];
  }, [articlesResponse.data]);
  
  const articlesStatsResponse = useArticlesStats(articlesIds);
  
  // Получаем статистику для тестов
  const testsIds = useMemo(() => {
    return testsResponse.data?.map(test => test.id) || [];
  }, [testsResponse.data]);
  
  const testsStatsResponse = useTestsStats(testsIds);
  
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

  // Создаем Map для быстрого поиска статистики тестов
  const testsStatsMap = useMemo(() => {
    const map = new Map<string, AppTestStatsVm>();
    if (testsStatsResponse.data) {
      testsStatsResponse.data.forEach(stat => {
        map.set(stat.testId, stat);
      });
    }
    return map;
  }, [testsStatsResponse.data]);

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

  // Определяем название родительской папки для кнопки "Назад"
  const parentFolderName = useMemo(() => {
    const folderItems = displayBreadcrumb.filter(item => item.type === 'folder');
    if (folderItems.length > 0) {
      // Берем предпоследнюю папку (последняя - текущая)
      const parentFolder = folderItems[folderItems.length - 2];
      return parentFolder?.name || 'Назад';
    }
    return 'Назад';
  }, [displayBreadcrumb]);

  // Определяем имя текущей папки
  const currentFolderName = useMemo(() => {
    // Если мы в корневой папке (currentFolderId === undefined), возвращаем "Обучение"
    if (currentFolderId === undefined) {
      return 'Обучение';
    }
    const folderItems = displayBreadcrumb.filter(item => item.type === 'folder');
    if (folderItems.length > 0) {
      // Берем последнюю папку (текущая)
      return folderItems[folderItems.length - 1]?.name || '';
    }
    return '';
  }, [displayBreadcrumb, currentFolderId]);

  // Статистика по текущей папке
  const folderStats = useMemo(() => {
    const foldersCount = foldersResponse.data?.length || 0;
    const articlesCount = articlesResponse.data?.length || 0;
    const testsCount = testsResponse.data?.length || 0;
    return { foldersCount, articlesCount, testsCount };
  }, [foldersResponse.data, articlesResponse.data, testsResponse.data]);

  // Вычисляем количество скрытых элементов
  const hiddenStats = useMemo(() => {
    const hiddenFolders = !showFolders ? folderStats.foldersCount : 0;
    const hiddenArticles = !showArticles ? folderStats.articlesCount : 0;
    const hiddenTests = !showTests ? folderStats.testsCount : 0;
    const totalHidden = hiddenFolders + hiddenArticles + hiddenTests;
    return { hiddenFolders, hiddenArticles, hiddenTests, totalHidden };
  }, [showFolders, showArticles, showTests, folderStats]);

  // Формируем текст о скрытых элементах
  const hiddenText = useMemo(() => {
    const parts: string[] = [];
    if (hiddenStats.hiddenFolders > 0) {
      parts.push(`📁 ${hiddenStats.hiddenFolders}`);
    }
    if (hiddenStats.hiddenArticles > 0) {
      parts.push(`📄 ${hiddenStats.hiddenArticles}`);
    }
    if (hiddenStats.hiddenTests > 0) {
      parts.push(`📝 ${hiddenStats.hiddenTests}`);
    }
    if (parts.length > 0) {
      return `Скрыто: ${parts.join(', ')}`;
    }
    return '';
  }, [hiddenStats]);

  // Функция для сброса всех фильтров
  const handleResetFilters = () => {
    setShowFolders(true);
    setShowArticles(true);
    setShowTests(true);
  };

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

  // Хук для сохранения статистики теста (вызываем всегда, но используем только когда нужно)
  const testStatsHook = useAddOrUpdateTestStats({
    clientId: deviceId || '',
    testId: selectedTest?.id || '',
    startedAt: new Date().toISOString(),
  });

  const handleStartTest = async () => {
    if (selectedTest && deviceId) {
      const startedAt = new Date().toISOString();
      startTest(selectedTest);
      // Сохраняем startedAt в статистику
      try {
        await testStatsHook.addOrUpdate({ startedAt });
      } catch (error) {
        console.error('Error saving test start time:', error);
        // Не блокируем запуск теста при ошибке сохранения статистики
      }
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
      {(displayBreadcrumb.length > 0 || currentFolderId === undefined) && (
        <ThemedView style={[styles.header, { borderBottomColor: borderColor }]}>
          <ThemedView style={styles.headerContent}>
            {currentFolderId !== undefined && (
              <BackButton onPress={handleBackFromFolder} label={parentFolderName} />
            )}
            {currentFolderName && (
              <>
                <Pressable
                  onPress={() => setIsFolderMenuOpen(true)}
                  style={[styles.currentFolderButton, { flexGrow: 1, backgroundColor: currentFolderButtonBackground }]}
                >
                  <ThemedText>
                    📁
                  </ThemedText>
                  <ThemedText 
                    style={styles.currentFolderName}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {currentFolderName}
                  </ThemedText>
                </Pressable>
                <FolderMenu
                  visible={isFolderMenuOpen}
                  onClose={() => setIsFolderMenuOpen(false)}
                  folderStats={folderStats}
                  showFolders={showFolders}
                  showArticles={showArticles}
                  showTests={showTests}
                  onToggleFolders={() => setShowFolders(!showFolders)}
                  onToggleArticles={() => setShowArticles(!showArticles)}
                  onToggleTests={() => setShowTests(!showTests)}
                />
              </>
            )}
          </ThemedView>
        </ThemedView>
      )}
      <Animated.View style={[styles.scrollViewContainer, animatedStyle]}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
          {isLoading ? (
            <ThemedView style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={tintColor} />
              <ThemedText style={styles.loadingText}>Загрузка...</ThemedText>
            </ThemedView>
          ) : (() => {
            // Фильтруем элементы
            const filteredItems = items
              .map((item, index) => ({ item, index }))
              .filter(({ item, index }) => {
                // Фильтрация по типу элемента в зависимости от состояния toggle-кнопок
                if (item.type === 'folder' && !showFolders) return false;
                if (item.type === 'article' && !showArticles) return false;
                if (item.type === 'test' && !showTests) return false;
                return !isItemHidden(item, index);
              });

            // Если нет элементов для отображения
            if (filteredItems.length === 0) {
              // Если применены фильтры, показываем сначала "Ничего нет", потом надпись о скрытых элементах
              if (hiddenText) {
                return (
                  <ThemedView style={styles.emptyContainer}>
                    <ThemedText style={styles.emptyText}>Ничего нет</ThemedText>
                    <Pressable onPress={handleResetFilters} style={styles.hiddenItemsContainer}>
                      <ThemedText style={[styles.hiddenItemsText, { color: descriptionColor }]}>
                        {hiddenText}
                      </ThemedText>
                    </Pressable>
                  </ThemedView>
                );
              }
              // Если фильтры не применены, показываем только "Ничего нет"
              return (
                <ThemedView style={styles.emptyContainer}>
                  <ThemedText style={styles.emptyText}>Ничего нет</ThemedText>
                </ThemedView>
              );
            }

            // Если есть скрытые элементы, показываем надпись
            return (
              <>
                {hiddenText && (
                  <Pressable onPress={handleResetFilters} style={styles.hiddenItemsContainer}>
                    <ThemedText style={[styles.hiddenItemsText, { color: descriptionColor }]}>
                      {hiddenText}
                    </ThemedText>
                  </Pressable>
                )}
                {filteredItems.map(({ item, index }) => {
                  const isRead = item.type === 'article' ? readArticlesMap.get(item.data.id) || false : false;
                  const isDisabled = isItemDisabled(item, index);
                  
                  // Получаем статистику теста, если это тест
                  const testStats = item.type === 'test' ? testsStatsMap.get(item.data.id) : undefined;
                  
                  // Формируем описание для теста с датой
                  let description: string | undefined;
                  if (item.type === 'test' && testStats) {
                    if (testStats.completedAt) {
                      // Если есть время завершения, выводим только его
                      const completedDate = new Date(testStats.completedAt);
                      description = completedDate.toLocaleString();
                    } else if (testStats.startedAt) {
                      // Если нет времени завершения, но есть время начала, выводим его
                      const startedDate = new Date(testStats.startedAt);
                      description = startedDate.toLocaleString();
                    }
                  }

                  return (
                    <ExplorerItemComponent
                      key={`${item.type}-${item.data.id}`}
                      item={item}
                      onPress={() => handleItemPress(item)}
                      isRead={isRead}
                      isDisabled={isDisabled}
                      testStats={testStats ? {
                        passed: testStats.passed,
                        completedAt: testStats.completedAt,
                        startedAt: testStats.startedAt,
                      } : undefined}
                      description={description}
                    />
                  );
                })}
              </>
            );
          })()}
        </ScrollView>
      </Animated.View>
    </ThemedView>
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
  },
  headerContent: {
    flexDirection: 'row',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    overflow: 'hidden'
    // flexWrap: 'wrap',
  },
  currentFolderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  currentFolderName: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
    flexShrink: 1,
  },
  filterButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 'auto',
  },
  filterButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minHeight: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    opacity: 1,
  },
  filterButtonText: {
    fontSize: 11,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: Colors.light.white,
  },
  scrollViewContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingTop: 16,
    paddingBottom: 16,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.7,
  },
  hiddenItemsContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  hiddenItemsText: {
    fontSize: 14,
    fontStyle: 'italic',
    textDecorationLine: 'underline',
    textAlign: 'right'
  },
});

