import { useAchievements } from '@/contexts/achievements-context';
import { useChromeBack } from '@/contexts/chrome-back-context';
import { useImmersiveMode } from '@/contexts/immersive-context';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useTest } from '@/contexts/test-context';
import {
  AppArticleVm,
  AppRescueItemVm,
  AppRescueStatsVm,
  type RescueScheneChoiceImplicationVm,
  AppTestStatsVm,
  AppTestVm,
} from '@/hooks/api/types';
import { fetchArticle, useArticles, useArticlesStats } from '@/hooks/api/useArticles';
import { useFolders } from '@/hooks/api/useFolders';
import { useRescueItems } from '@/hooks/api/useRescueItems';
import { useAddOrUpdateRescueStats, useRescuesStats } from '@/hooks/api/useRescueStats';
import { useTests } from '@/hooks/api/useTests';
import { useAddOrUpdateTestStats, useTestsStats } from '@/hooks/api/useTestStats';
import { apiFetchRelation } from '@/hooks/api/useApiFetch';
import { parseRescueItemDataVm, resolveRescueOutcome } from '@/lib/rescue-completion';
import { useDeviceId } from '@/hooks/use-device-id';
import { useAppTheme } from '@/hooks/use-theme-color';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ArticleView } from './article-view';
import { BackButton } from './explorer/back-button';
import { ExplorerItemComponent } from './explorer/explorer-item';
import { StudyFolderCard } from './explorer/study-folder-card';
import { BreadcrumbItem, ExplorerItem } from './explorer/types';
import { RescueComplete } from './rescue/rescue-complete';
import { RescueStart } from './rescue/rescue-start';
import { RescueView } from './rescue/rescue-view';
import { TestTakingView } from './test-taking-view';
import { TestView } from './test-view';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { FilterPills, type FilterKey } from './ui/filter-pills';
import { ProgressBar } from './ui/progress-bar';
import { ScreenBackground } from './ui/screen-background';
import { GlassCard } from './ui/glass-card';
import { IconSymbol } from './ui/icon-symbol';
import { useAccountOverallStats } from '@/hooks/api/useAccountOverallStats';
import { useGlow, useGlass } from '@/hooks/use-theme-color';
import { useTheme } from '@/contexts/theme-context';
import { BlurView } from 'expo-blur';
import { Spacing } from '@/constants/theme';
import { staggerEnter } from '@/hooks/use-enter-animation';

export function Explorer() {
  const { checkUnlocks } = useAchievements();
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [selectedArticle, setSelectedArticle] = useState<AppArticleVm | null>(null);
  const [selectedTest, setSelectedTest] = useState<AppTestVm | null>(null);
  const [selectedRescueItem, setSelectedRescueItem] = useState<AppRescueItemVm | null>(null);
  const [isRescueStarted, setIsRescueStarted] = useState(false);
  const [isRescueCompleted, setIsRescueCompleted] = useState(false);
  const [rescueFinalParameters, setRescueFinalParameters] = useState<Record<string, number>>({});
  const [rescueCollectedImplications, setRescueCollectedImplications] = useState<
    RescueScheneChoiceImplicationVm[]
  >([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  // История навигации по статьям для определения hasPrevious
  const [articleNavigationHistory, setArticleNavigationHistory] = useState<string[]>([]);
  // Состояния для toggle-кнопок фильтрации
  const [showFolders, setShowFolders] = useState(true);
  const [showArticles, setShowArticles] = useState(true);
  const [showTests, setShowTests] = useState(true);
  const [showRescue, setShowRescue] = useState(true);
  const [materialFilter, setMaterialFilter] = useState<FilterKey>('all');
  const previousFolderIdRef = useRef<string | undefined>(undefined);
  const opacity = useSharedValue(1);
  const { isTestStarted, startTest, resetTest } = useTest();
  const navigation = useNavigation();

  const [allArticles, setAllArticles] = useState<AppArticleVm[]>([]);
  const [allTests, setAllTests] = useState<AppTestVm[]>([]);
  const [allRescues, setAllRescues] = useState<AppRescueItemVm[]>([]);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [articlesRes, testsRes, rescuesRes] = await Promise.all([
          apiFetchRelation<AppArticleVm>('articles', { all: true }),
          apiFetchRelation<AppTestVm>('tests', { all: true }),
          apiFetchRelation<AppRescueItemVm>('rescue', { all: true }),
        ]);
        if (articlesRes.data) setAllArticles(articlesRes.data);
        if (testsRes.data) setAllTests(testsRes.data);
        if (rescuesRes.data) setAllRescues(rescuesRes.data);
      } catch (error) {
        console.error('Error fetching all materials:', error);
      }
    };
    void fetchAllData();
  }, []);

  const { primary: tintColor, border: borderColor, neutralSoft: descriptionColor, layout1 } = useAppTheme();
  const { theme } = useTheme();
  const glass = useGlass();
  const glow = useGlow();
  const overallStats = useAccountOverallStats();
  const { deviceId } = useDeviceId();
  const foldersResponse = useFolders(currentFolderId);
  const articlesResponse = useArticles(currentFolderId);
  const testsResponse = useTests(currentFolderId);
  const rescueItemsResponse = useRescueItems(currentFolderId);
  
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

  const rescueIds = useMemo(() => {
    return rescueItemsResponse.data?.map((r) => r.id) ?? [];
  }, [rescueItemsResponse.data]);

  const rescueStatsList = useRescuesStats(rescueIds);

  const rescueStatsMutation = useAddOrUpdateRescueStats({
    clientId: deviceId ?? '',
    rescueId: selectedRescueItem?.id ?? '',
  });

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

  const rescueStatsMap = useMemo(() => {
    const map = new Map<string, AppRescueStatsVm>();
    if (rescueStatsList.data) {
      rescueStatsList.data.forEach((stat) => {
        map.set(stat.rescueId, stat);
      });
    }
    return map;
  }, [rescueStatsList.data]);

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
    const isDataLoading = foldersResponse.isLoading || articlesResponse.isLoading || testsResponse.isLoading || rescueItemsResponse.isLoading;
    
    return isDataLoading || isNavigating;
  }, [foldersResponse.isLoading, articlesResponse.isLoading, testsResponse.isLoading, rescueItemsResponse.isLoading, isNavigating]);

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
    const rescueCount = rescueItemsResponse.data?.length || 0;
    return { foldersCount, articlesCount, testsCount, rescueCount };
  }, [foldersResponse.data, articlesResponse.data, testsResponse.data, rescueItemsResponse.data]);

  // Вычисляем количество скрытых элементов
  const hiddenStats = useMemo(() => {
    const hiddenFolders = !showFolders ? folderStats.foldersCount : 0;
    const hiddenArticles = !showArticles ? folderStats.articlesCount : 0;
    const hiddenTests = !showTests ? folderStats.testsCount : 0;
    const hiddenRescue = !showRescue ? folderStats.rescueCount : 0;
    const totalHidden = hiddenFolders + hiddenArticles + hiddenTests + hiddenRescue;
    return { hiddenFolders, hiddenArticles, hiddenTests, hiddenRescue, totalHidden };
  }, [showFolders, showArticles, showTests, showRescue, folderStats]);

  // Формируем текст о скрытых элементах
  const hiddenText = useMemo(() => {
    const parts: string[] = [];
    if (hiddenStats.hiddenFolders > 0) {
      parts.push(`Папки: ${hiddenStats.hiddenFolders}`);
    }
    if (hiddenStats.hiddenArticles > 0) {
      parts.push(`Статьи: ${hiddenStats.hiddenArticles}`);
    }
    if (hiddenStats.hiddenTests > 0) {
      parts.push(`Тесты: ${hiddenStats.hiddenTests}`);
    }
    if (hiddenStats.hiddenRescue > 0) {
      parts.push(`Спасение: ${hiddenStats.hiddenRescue}`);
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
    setShowRescue(true);
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

    // Добавляем rescue элементы
    if (rescueItemsResponse.data) {
      rescueItemsResponse.data.forEach((rescueItem) => {
        explorerItems.push({ type: 'rescue', data: rescueItem });
      });
    }

    // Сортируем по order
    return explorerItems.sort((a, b) => {
      const orderA = a.data.order ?? 0;
      const orderB = b.data.order ?? 0;
      return orderA - orderB;
    });
  }, [foldersResponse.data, articlesResponse.data, testsResponse.data, rescueItemsResponse.data]);

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
    } else if (item.type === 'rescue') {
      opacity.value = withTiming(0, { duration: 200 });
      setSelectedRescueItem(item.data as AppRescueItemVm);
      setIsRescueStarted(false);
      setIsRescueCompleted(false);
      setRescueFinalParameters({});
      setRescueCollectedImplications([]);
      setBreadcrumb(prev => [...prev, { id: item.data.id, name: item.data.name, type: 'rescue' }]);
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
    setSelectedRescueItem(null);
    setIsRescueStarted(false);
    setIsRescueCompleted(false);
    setRescueFinalParameters({});
    setRescueCollectedImplications([]);
    resetTest();
    // Удаляем все элементы article, test и rescue из breadcrumb
    setBreadcrumb(prev => prev.filter(b => b.type !== 'article' && b.type !== 'test' && b.type !== 'rescue'));
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

  const { isWide, contentPaddingBottom } = useNavRail();

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
    setSelectedRescueItem(null);
    setIsRescueStarted(false);
    setIsRescueCompleted(false);
    setRescueFinalParameters({});
    setRescueCollectedImplications([]);
  };

  const resetToRoot = useCallback(() => {
    setCurrentFolderId(undefined);
    setSelectedArticle(null);
    setSelectedTest(null);
    setSelectedRescueItem(null);
    setIsRescueStarted(false);
    setIsRescueCompleted(false);
    setRescueFinalParameters({});
    setRescueCollectedImplications([]);
    setIsNavigating(false);
    setBreadcrumb([]);
    setArticleNavigationHistory([]);
    setMaterialFilter('all');
    previousFolderIdRef.current = undefined;
    resetTest();
    opacity.value = withTiming(1, { duration: 300 });
  }, [resetTest, opacity]);

  useEffect(() => {
    // @ts-expect-error tabPress is emitted by bottom tab navigator
    const unsubscribe = navigation.addListener('tabPress', () => {
      resetToRoot();
    });
    return unsubscribe;
  }, [navigation, resetToRoot]);

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

  const showFolderChromeBack =
    currentFolderId !== undefined &&
    !selectedArticle &&
    !selectedTest &&
    !selectedRescueItem;

  useChromeBack(showFolderChromeBack ? handleBackFromFolder : null);

  // Hide global notification toast while reading / testing / rescue novel
  useImmersiveMode(!!(selectedArticle || selectedTest || selectedRescueItem));

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

  // Если выбран rescue элемент и он завершен, показываем экран завершения
  if (selectedRescueItem && isRescueCompleted) {
    return (
      <RescueComplete
        rescueItem={selectedRescueItem}
        parameterValues={rescueFinalParameters}
        selectedImplications={rescueCollectedImplications}
        onBack={() => {
          setIsRescueCompleted(false);
          setIsRescueStarted(false);
          setRescueFinalParameters({});
          setRescueCollectedImplications([]);
          void rescueStatsList.fetchData();
          handleBackFromItem();
        }}
      />
    );
  }

  // Если выбран rescue элемент и он начат, показываем RescueView
  if (selectedRescueItem && isRescueStarted) {
    return (
      <RescueView
        rescueItem={selectedRescueItem}
        onBack={async () => {
          try {
            await rescueStatsMutation.addOrUpdate({
              completedAt: new Date().toISOString(),
              passed: false,
            });
          } catch (e) {
            console.error('rescue_stats exit:', e);
          }
          void rescueStatsList.fetchData();
          setIsRescueStarted(false);
          handleBackFromItem();
        }}
        onComplete={async (finalParameters, collectedImplications) => {
          const data = parseRescueItemDataVm(selectedRescueItem.data);
          const outcome = resolveRescueOutcome(data.completion, finalParameters, data.parameters ?? []);
          const passed = outcome === 'passed';
          try {
            await rescueStatsMutation.addOrUpdate({
              completedAt: new Date().toISOString(),
              passed,
            });
            if (passed) void checkUnlocks();
          } catch (e) {
            console.error('rescue_stats complete:', e);
          }
          void rescueStatsList.fetchData();
          setRescueFinalParameters(finalParameters);
          setRescueCollectedImplications(collectedImplications);
          setIsRescueCompleted(true);
          setIsRescueStarted(false);
        }}
      />
    );
  }

  // Если выбран rescue элемент, показываем RescueStart
  if (selectedRescueItem) {
    return (
      <RescueStart
        rescueItem={selectedRescueItem}
        onBack={handleBackFromItem}
        onRescueSessionStarted={() => void rescueStatsList.fetchData()}
        onStart={() => {
          setRescueFinalParameters({});
          setRescueCollectedImplications([]);
          setIsRescueStarted(true);
        }}
      />
    );
  }

  // Показываем список элементов
  const isRootView = currentFolderId === undefined;
  const folderOnlyItems = items.filter((i) => i.type === 'folder');
  const overallTotal =
    (overallStats.data?.totals.documents ?? 0) +
    (overallStats.data?.totals.tests ?? 0) +
    (overallStats.data?.totals.rescues ?? 0);
  const overallCompleted =
    (overallStats.data?.counts.documentsRead ?? 0) +
    (overallStats.data?.counts.testsPassed ?? 0) +
    (overallStats.data?.counts.rescuesPassed ?? 0);

  return (
    <ScreenBackground variant={isRootView ? 'study' : 'default'} style={styles.container}>
      {currentFolderId !== undefined && (
        <View
          style={[
            styles.header,
            {
              borderBottomColor: glass.border,
              backgroundColor: theme === 'light' ? layout1 : glass.background,
            },
          ]}
        >
          {theme === 'dark' && Platform.OS !== 'web' ? (
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          ) : null}
          <View style={styles.headerContent}>
            {!isWide ? <BackButton onPress={handleBackFromFolder} /> : null}
            {currentFolderName ? (
              <ThemedText style={styles.currentFolderName} numberOfLines={1}>
                {currentFolderName}
              </ThemedText>
            ) : null}
          </View>
        </View>
      )}
      <Animated.View style={[styles.scrollViewContainer, animatedStyle]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollViewContent,
            { paddingBottom: contentPaddingBottom },
          ]}
        >
          {isRootView && (
            <Animated.View entering={staggerEnter(0)}>
              <ThemedText
                type="h1"
                style={[styles.pageTitle, { textShadowColor: glow.title, textShadowRadius: 20, textShadowOffset: { width: 0, height: 0 } }]}
              >
                Обучение
              </ThemedText>
              <ThemedText style={[styles.pageSubtitle, { color: descriptionColor }]}>
                Выберите раздел для изучения
              </ThemedText>
            </Animated.View>
          )}

          {currentFolderId !== undefined && (
            <View style={styles.filterRow}>
              <FilterPills
                value={materialFilter}
                onChange={(key) => {
                  setMaterialFilter(key);
                  setShowFolders(key === 'all');
                  setShowArticles(key === 'all' || key === 'article');
                  setShowTests(key === 'all' || key === 'test');
                  setShowRescue(key === 'all' || key === 'rescue');
                }}
              />
            </View>
          )}

          {isLoading ? (
            <ThemedView style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={tintColor} />
              <ThemedText style={styles.loadingText}>Загрузка...</ThemedText>
            </ThemedView>
          ) : (() => {
            const filteredItems = items
              .map((item, index) => ({ item, index }))
              .filter(({ item, index }) => {
                if (item.type === 'folder' && !showFolders) return false;
                if (item.type === 'article' && !showArticles) return false;
                if (item.type === 'test' && !showTests) return false;
                if (item.type === 'rescue' && !showRescue) return false;
                return !isItemHidden(item, index);
              });

            if (isRootView && folderOnlyItems.length > 0) {
              return (
                <>
                  <View style={styles.folderGrid}>
                    {folderOnlyItems.map((folderItem, i) => {
                      const folderId = folderItem.data.id;
                      
                      // Filter materials belonging to this folder
                      const folderArticles = allArticles.filter(a => a.parentId === folderId);
                      const folderTests = allTests.filter(t => t.parentId === folderId);
                      const folderRescues = allRescues.filter(r => r.parentId === folderId);
                      
                      const totalCount = folderArticles.length + folderTests.length + folderRescues.length;
                      
                      // Calculate completed materials
                      const completedArticles = folderArticles.filter(a => readArticlesMap.get(a.id)).length;
                      const completedTests = folderTests.filter(t => testsStatsMap.get(t.id)?.passed === true).length;
                      const completedRescues = folderRescues.filter(r => rescueStatsMap.get(r.id)?.passed === true).length;
                      
                      const completedCount = completedArticles + completedTests + completedRescues;
                      const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                      
                      return (
                        <StudyFolderCard
                          key={folderId}
                          name={folderItem.data.name}
                          materialCount={totalCount || 0}
                          progressPercent={progressPercent}
                          index={i}
                          onPress={() => handleItemPress(folderItem)}
                        />
                      );
                    })}
                  </View>
                  {filteredItems.filter(({ item }) => item.type !== 'folder').length > 0 && (
                    <View style={styles.rootMaterials}>
                      {filteredItems
                        .filter(({ item }) => item.type !== 'folder')
                        .map(({ item, index }, listIndex) => (
                          <ExplorerItemComponent
                            key={`${item.type}-${item.data.id}`}
                            item={item}
                            index={listIndex}
                            onPress={() => handleItemPress(item)}
                            isRead={item.type === 'article' ? readArticlesMap.get(item.data.id) || false : false}
                            isDisabled={isItemDisabled(item, index)}
                          />
                        ))}
                    </View>
                  )}
                  <Animated.View entering={staggerEnter(4)} style={styles.overallProgress}>
                    <GlassCard padding={20} borderRadius={16}>
                      <ThemedText type="h2">Общий прогресс</ThemedText>
                      <View style={styles.overallBar}>
                        <ProgressBar
                          current={overallCompleted}
                          total={overallTotal || 1}
                          height={8}
                          shimmer
                        />
                      </View>
                      <View style={styles.statRow}>
                        <ThemedText type="caption" style={{ color: descriptionColor }}>
                          Статьи: {overallStats.data?.counts.documentsRead ?? 0}/{overallStats.data?.totals.documents ?? 0}
                        </ThemedText>
                        <ThemedText type="caption" style={{ color: descriptionColor }}>
                          Тесты: {overallStats.data?.counts.testsPassed ?? 0}/{overallStats.data?.totals.tests ?? 0}
                        </ThemedText>
                        <ThemedText type="caption" style={{ color: descriptionColor }}>
                          Режимы: {overallStats.data?.counts.rescuesPassed ?? 0}/{overallStats.data?.totals.rescues ?? 0}
                        </ThemedText>
                      </View>
                    </GlassCard>
                  </Animated.View>
                </>
              );
            }

            if (filteredItems.length === 0) {
              return (
                <GlassCard padding={32} borderRadius={16} style={styles.emptyCard}>
                  <IconSymbol name="info.circle.fill" size={48} color={descriptionColor} style={styles.emptyIcon} />
                  <ThemedText style={styles.emptyText}>В этом разделе пока нет материалов</ThemedText>
                  {hiddenText && (
                    <Pressable onPress={handleResetFilters} style={styles.hiddenItemsContainer}>
                      <ThemedText style={[styles.hiddenItemsText, { color: tintColor }]}>
                        Показать скрытые ({hiddenText})
                      </ThemedText>
                    </Pressable>
                  )}
                </GlassCard>
              );
            }

            return (
              <>
                {hiddenText && (
                  <Pressable onPress={handleResetFilters} style={styles.hiddenItemsContainer}>
                    <ThemedText style={[styles.hiddenItemsText, { color: descriptionColor }]}>
                      {hiddenText}
                    </ThemedText>
                  </Pressable>
                )}
                {filteredItems.map(({ item, index }, listIndex) => {
                  const isRead = item.type === 'article' ? readArticlesMap.get(item.data.id) || false : false;
                  const isDisabled = isItemDisabled(item, index);
                  const testStats = item.type === 'test' ? testsStatsMap.get(item.data.id) : undefined;
                  const rescueStatsVm =
                    item.type === 'rescue' ? rescueStatsMap.get(item.data.id) : undefined;

                  let description: string | undefined;
                  if (item.type === 'test' && testStats) {
                    if (testStats.completedAt) {
                      description = new Date(testStats.completedAt).toLocaleString();
                    } else if (testStats.startedAt) {
                      description = new Date(testStats.startedAt).toLocaleString();
                    }
                  } else if (item.type === 'rescue' && rescueStatsVm) {
                    if (rescueStatsVm.completedAt) {
                      description = new Date(rescueStatsVm.completedAt).toLocaleString();
                    } else if (rescueStatsVm.startedAt) {
                      description = new Date(rescueStatsVm.startedAt).toLocaleString();
                    }
                  }

                  return (
                    <ExplorerItemComponent
                      key={`${item.type}-${item.data.id}`}
                      item={item}
                      index={listIndex}
                      onPress={() => handleItemPress(item)}
                      isRead={isRead}
                      isDisabled={isDisabled}
                      testStats={
                        testStats
                          ? {
                              passed: testStats.passed,
                              completedAt: testStats.completedAt,
                              startedAt: testStats.startedAt,
                            }
                          : undefined
                      }
                      rescueStats={
                        rescueStatsVm
                          ? {
                              passed: rescueStatsVm.passed,
                              completedAt: rescueStatsVm.completedAt,
                              startedAt: rescueStatsVm.startedAt,
                            }
                          : undefined
                      }
                      description={description}
                    />
                  );
                })}
              </>
            );
          })()}
        </ScrollView>
      </Animated.View>
    </ScreenBackground>
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
    overflow: 'hidden',
    position: 'relative',
  },
  headerContent: {
    flexDirection: 'row',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    overflow: 'hidden',
    zIndex: 2,
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
    fontSize: 16,
    fontWeight: '600',
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
  scrollViewContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingTop: 16,
    paddingHorizontal: Spacing.pageX,
  },
  pageTitle: {
    marginTop: 8,
  },
  pageSubtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  folderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 24,
  },
  rootMaterials: {
    marginTop: 16,
  },
  overallProgress: {
    marginTop: 32,
  },
  overallBar: {
    marginTop: 16,
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 12,
  },
  filterRow: {
    marginTop: 8,
    marginBottom: 8,
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
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 16,
  },
  emptyIcon: {
    opacity: 0.6,
  },
  emptyText: {
    fontSize: 15,
    opacity: 0.7,
    textAlign: 'center',
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

