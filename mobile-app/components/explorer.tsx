import { useChromeBack } from '@/contexts/chrome-back-context';
import { useImmersiveMode } from '@/contexts/immersive-context';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useTest } from '@/contexts/test-context';
import {
  AppArticleVm,
  AppFolderMaterialCountVm,
  AppFolderVm,
  AppRescueItemVm,
  AppRescueStatsVm,
  type RescueScheneChoiceImplicationVm,
  AppTestStatsVm,
  AppTestVm,
} from '@/hooks/api/types';
import { fetchArticle, useArticles, useArticlesStats } from '@/hooks/api/useArticles';
import { useFolders, useFoldersMaterialCounts } from '@/hooks/api/useFolders';
import { useRescueItems } from '@/hooks/api/useRescueItems';
import { useAddOrUpdateRescueStats, useRescuesStats } from '@/hooks/api/useRescueStats';
import { useTests } from '@/hooks/api/useTests';
import { useAddOrUpdateTestStats, useTestsStats } from '@/hooks/api/useTestStats';
import { areTestActivationConditionsMet } from '@/lib/test-activation';
import { isSequenceBlocked, type SequenceContext, type SequenceItem } from '@/lib/sequence-gating';
import { pickRandomItem, randomOpenCandidates } from '@/lib/random-open';
import { apiFetchRelation } from '@/hooks/api/useApiFetch';
import { parseRescueItemDataVm, resolveRescueOutcome } from '@/lib/rescue-completion';
import { useDeviceId } from '@/hooks/use-device-id';
import { useAppTheme, useGlass } from '@/hooks/use-theme-color';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ArticleView } from './article-view';
import { LockedTariffSheet, type LockedTariffItem } from './billing/locked-tariff-sheet';
import { BackButton } from './explorer/back-button';
import { ExplorerItemComponent, rescueDisplayName } from './explorer/explorer-item';
import { StudyFolderCard } from './explorer/study-folder-card';
import { BreadcrumbItem, ExplorerItem, type LockReason } from './explorer/types';
import { RescueComplete } from './rescue/rescue-complete';
import { RescueStart } from './rescue/rescue-start';
import { RescueView } from './rescue/rescue-view';
import { TestTakingView } from './test-taking-view';
import { TestView } from './test-view';
import { ThemedText } from './themed-text';
import { LoadingOverlay } from './ui/loading-overlay';
import { Button } from './ui/button';
import { ProgressBar } from './ui/progress-bar';
import { ScreenBackground } from './ui/screen-background';
import { GlassCard } from './ui/glass-card';
import { IconSymbol } from './ui/icon-symbol';
import { useAccountOverallStats } from '@/hooks/api/useAccountOverallStats';
import { useTheme } from '@/contexts/theme-context';
import { BlurView } from 'expo-blur';
import { Spacing } from '@/constants/theme';
import { staggerEnter } from '@/hooks/use-enter-animation';

export function Explorer() {
  const router = useRouter();
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
  const [isOpeningRandom, setIsOpeningRandom] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  // Заблокированный тарифом материал — открытый диалог «какая подписка нужна»
  const [lockedTariffItem, setLockedTariffItem] = useState<LockedTariffItem | null>(null);
  // История навигации по статьям для определения hasPrevious
  const [articleNavigationHistory, setArticleNavigationHistory] = useState<string[]>([]);
  const previousFolderIdRef = useRef<string | undefined>(undefined);
  const randomOpenInFlight = useRef(false);
  const navigationVersion = useRef(0);
  const cancelRandomOpen = useCallback(() => {
    navigationVersion.current++;
    randomOpenInFlight.current = false;
    setIsOpeningRandom(false);
  }, []);
  useEffect(() => () => { navigationVersion.current++; }, []);
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

  const { neutralSoft: descriptionColor, layout1, primary } = useAppTheme();
  const { theme } = useTheme();
  const glass = useGlass();
  const overallStats = useAccountOverallStats();
  const { deviceId } = useDeviceId();
  const foldersResponse = useFolders(currentFolderId);
  const articlesResponse = useArticles(currentFolderId);
  const testsResponse = useTests(currentFolderId);
  const rescueItemsResponse = useRescueItems(currentFolderId);

  // Счётчики материалов корневых папок (descendants) и их завершённость — с API
  const folderMaterialCountsResponse = useFoldersMaterialCounts();
  const folderMaterialCountsMap = useMemo(() => {
    const map = new Map<string, AppFolderMaterialCountVm>();
    if (folderMaterialCountsResponse.data) {
      folderMaterialCountsResponse.data.forEach((fc) => map.set(fc.folderId, fc));
    }
    return map;
  }, [folderMaterialCountsResponse.data]);
  
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

  // После завершения материала перечитываем прогресс и списки: статья/награда,
  // открывшаяся после завершения, должна появиться без повторного входа в папку.
  const wasInListRef = useRef(true);
  useEffect(() => {
    const inList = !selectedArticle && !selectedTest && !selectedRescueItem && !isRescueStarted;
    if (inList && !wasInListRef.current) {
      void Promise.all([
        overallStats.fetchData(),
        folderMaterialCountsResponse.fetchData(),
        foldersResponse.fetchData(),
        articlesResponse.fetchData(),
        testsResponse.fetchData(),
        rescueItemsResponse.fetchData(),
        articlesStatsResponse.fetchData?.(),
        testsStatsResponse.fetchData?.(),
        rescueStatsList.fetchData(),
      ]).catch((error) => console.error('Failed to refresh progress:', error));
    }
    wasInListRef.current = inList;
  }, [
    selectedArticle,
    selectedTest,
    selectedRescueItem,
    isRescueStarted,
    overallStats.fetchData,
    folderMaterialCountsResponse.fetchData,
    foldersResponse.fetchData,
    articlesResponse.fetchData,
    testsResponse.fetchData,
    rescueItemsResponse.fetchData,
    articlesStatsResponse.fetchData,
    testsStatsResponse.fetchData,
    rescueStatsList.fetchData,
  ]);

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

  // Контекст последовательности папки: прочитана статья / сдан тест.
  const sequenceContext = useCallback((): SequenceContext => ({
    isArticleRead: (id) => readArticlesMap.get(id) === true,
    isTestPassed: (id) => testsStatsMap.get(id)?.passed === true,
  }), [readArticlesMap, testsStatsMap]);

  // Элементы папки в модели последовательности (см. lib/sequence-gating).
  const sequenceItems = useMemo((): SequenceItem[] =>
    items.map((it) => {
      if (it.type === 'article') {
        const a = it.data as AppArticleVm;
        return { type: 'article', id: a.id, includeToStatistics: a.includeToStatistics };
      }
      if (it.type === 'test') {
        const t = it.data as AppTestVm;
        return {
          type: 'test',
          id: t.id,
          hasActivationConditions: (t.accessabilityConditions ?? []).length > 0,
        };
      }
      return { type: it.type, id: it.data.id };
    }), [items]);

  // Функция для проверки, должен ли элемент быть скрыт
  const isItemHidden = useCallback((item: ExplorerItem, itemIndex: number): boolean => {
    if (item.type !== 'article') return false;
    // Флаг «Скрывать до завершения предыдущего»
    if (!(item.data as AppArticleVm).hideWhileNotPrevComplete) return false;
    return isSequenceBlocked(sequenceItems, itemIndex, sequenceContext());
  }, [sequenceItems, sequenceContext]);

  // Функция для проверки, должен ли элемент быть disabled
  const isItemDisabled = useCallback((item: ExplorerItem, itemIndex: number): boolean => {
    // Правила активации теста (accessabilityConditions из конструктора):
    // тест без своих правил — участник последовательности и ждёт предыдущий шаг
    // (документ прочитан / зачёт сдан) наравне с текстовыми документами.
    if (item.type === 'test') {
      const conditions = (item.data as AppTestVm).accessabilityConditions ?? [];
      if (conditions.length > 0) {
        return !areTestActivationConditionsMet(conditions, {
          isArticleRead: (articleId) => readArticlesMap.get(articleId) === true,
          getTestOutcome: (testId) => {
            const stat = testsStatsMap.get(testId);
            if (!stat) return null;
            const answers = Array.isArray((stat.data as { answers?: { score?: number }[] } | null)?.answers)
              ? ((stat.data as { answers: { score?: number }[] }).answers)
              : [];
            return {
              passed: stat.passed,
              totalScore: answers.reduce((sum, a) => sum + (a.score ?? 0), 0),
            };
          },
        });
      }
      return isSequenceBlocked(sequenceItems, itemIndex, sequenceContext());
    }

    if (item.type !== 'article') return false;
    // Флаг «Блокировать до завершения предыдущего»
    if (!(item.data as AppArticleVm).disableWhileNotPrevComplete) return false;
    return isSequenceBlocked(sequenceItems, itemIndex, sequenceContext());
  }, [sequenceItems, readArticlesMap, testsStatsMap, sequenceContext]);

  const randomCandidates = useMemo(() => currentFolderId
    ? randomOpenCandidates(items, currentFolderId, isItemHidden, isItemDisabled)
    : [], [currentFolderId, isItemDisabled, isItemHidden, items]);
  const randomLoadError = foldersResponse.error || articlesResponse.error || testsResponse.error ||
    rescueItemsResponse.error || articlesStatsResponse.error || testsStatsResponse.error;
  const randomLoading = isLoading || articlesStatsResponse.isLoading || testsStatsResponse.isLoading || isOpeningRandom;
  const showRandomOpen = currentFolderId !== undefined && breadcrumb.some(
    (entry) => entry.type === 'folder' && entry.id === currentFolderId && entry.showRandomOpen,
  );

  const handleItemPress = (item: ExplorerItem, startRescue = false) => {
    // Заблокировано тарифом/наградой: вместо открытия — диалог с нужным тарифом
    // (или достижения). Награда — корневой маршрут, чтобы «назад» вернул на этот же таб.
    if (item.data.isLocked) {
      if (item.data.lockedBy === 'reward') {
        router.push('/achievements');
      } else if (item.data.requiredTariffId) {
        setLockedTariffItem({ name: item.data.name, requiredTariffId: item.data.requiredTariffId });
      } else {
        // ponytail: не бывает — тариф-замок всегда несёт requiredTariffId; страховка ведёт на полный список
        router.push('/subscription');
      }
      return;
    }

    if (item.type === 'folder') {
      cancelRandomOpen();
      setIsNavigating(true);
      opacity.value = withTiming(0, { duration: 200 });
      setCurrentFolderId(item.data.id);
      setBreadcrumb(prev => [...prev, {
        id: item.data.id,
        name: item.data.name,
        type: 'folder',
        showRandomOpen: (item.data as AppFolderVm).showRandomOpen === true,
      }]);
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
      setIsRescueStarted(startRescue);
      setIsRescueCompleted(false);
      setRescueFinalParameters({});
      setRescueCollectedImplications([]);
      setBreadcrumb(prev => [...prev, { id: item.data.id, name: item.data.name, type: 'rescue' }]);
      setSelectedArticle(null);
      setSelectedTest(null);
    }
  };

  const handleRandomOpen = async () => {
    if (randomOpenInFlight.current || randomLoading || randomLoadError) return;
    const item = pickRandomItem(randomCandidates);
    if (!item) return;
    randomOpenInFlight.current = true;
    setIsOpeningRandom(true);
    const version = navigationVersion.current;

    if (item.type === 'rescue') {
      try {
        await rescueStatsMutation.addOrUpdate({ startedAt: new Date().toISOString() }, item.data.id);
      } catch (error) {
        console.error('rescue_stats start:', error);
      }
      if (navigationVersion.current !== version) return;
      void rescueStatsList.fetchData();
    }

    if (navigationVersion.current !== version) return;
    setIsOpeningRandom(false);
    handleItemPress(item, item.type === 'rescue');
  };


  // Обработчик возврата в папку (верхняя кнопка "Назад")
  const handleBackToFolder = () => {
    cancelRandomOpen();
    // Всегда выходим в папку, независимо от истории навигации
    if (selectedArticle) {
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
    // После завершения теста возвращаемся в папку, из которой он открывался
    handleBackToFolder();
  };

  const { isWide, contentPaddingBottom } = useNavRail();

  const handleBackFromFolder = () => {
    cancelRandomOpen();
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
    cancelRandomOpen();
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
    previousFolderIdRef.current = undefined;
    resetTest();
    opacity.value = withTiming(1, { duration: 300 });
  }, [cancelRandomOpen, resetTest, opacity]);

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
    // Название маскируется так же, как в списке: до первой попытки диагноз скрыт
    const rescueIndex = items.findIndex(
      (i) => i.type === 'rescue' && i.data.id === selectedRescueItem.id,
    );
    const rescueAttempted = rescueStatsMap.has(selectedRescueItem.id);
    return (
      <RescueStart
        rescueItem={selectedRescueItem}
        displayName={rescueDisplayName(
          selectedRescueItem.name,
          rescueAttempted,
          rescueIndex < 0 ? 0 : rescueIndex,
        )}
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
    const showOverallProgress = isRootView && folderOnlyItems.length > 0;

  // Единый рендер элемента списка: бейджи статуса (прочитано / пройден / не пройден)
  // строятся из статистики тестов и режимов спасения.
  const renderMaterialItem = (
    { item, index }: { item: ExplorerItem; index: number },
    listIndex: number,
  ) => {
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
        isHome={isRootView}
      />
    );
  };

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
            { paddingBottom: showOverallProgress ? Spacing.card : contentPaddingBottom },
          ]}
        >
          {isRootView && (
            <Animated.View entering={staggerEnter(0)}>
              <View style={styles.brandName}>
                <ThemedText type="title">Trouble</ThemedText>
                <ThemedText type="title" lightColor={primary} darkColor={primary}>Dent</ThemedText>
              </View>
              <ThemedText type="caption" style={[styles.pageSubtitle, { color: descriptionColor }]}>
                Неотложная помощь в стоматологии
              </ThemedText>
            </Animated.View>
          )}

          {showRandomOpen && (
            <View style={{ marginBottom: Spacing.card }}>
              <Button
                title={isOpeningRandom ? 'Открываем…' : 'Открыть случайно'}
                accessibilityRole="button"
                fullWidth
                disabled={randomLoading || !!randomLoadError || randomCandidates.length === 0}
                onPress={() => void handleRandomOpen()}
              />
              {!randomLoading && randomLoadError ? (
                <>
                  <ThemedText type="caption">Не удалось загрузить материалы или прогресс.</ThemedText>
                  <Button
                    title="Повторить"
                    accessibilityRole="button"
                    variant="ghost"
                    onPress={() => {
                      void Promise.all([
                        foldersResponse.fetchData(), articlesResponse.fetchData(), testsResponse.fetchData(),
                        rescueItemsResponse.fetchData(), articlesStatsResponse.fetchData(), testsStatsResponse.fetchData(),
                      ]);
                    }}
                  />
                </>
              ) : !randomLoading && randomCandidates.length === 0 ? (
                <ThemedText type="caption">Нет доступных материалов для случайного открытия.</ThemedText>
              ) : null}
            </View>
          )}

          {(() => {
            const filteredItems = items
              .map((item, index) => ({ item, index }))
              .filter(({ item, index }) => !isItemHidden(item, index));

            if (isRootView && folderOnlyItems.length > 0) {
              return (
                <>
                  <View style={styles.folderGrid}>
                    {folderOnlyItems.map((folderItem, i) => {
                      const folderId = folderItem.data.id;
                      // Счётчики (вся вложенность) и завершённость приходят с API
                      const counts = folderMaterialCountsMap.get(folderId);
                      const progressPercent =
                        counts && counts.total > 0
                          ? Math.round((counts.completed / counts.total) * 100)
                          : 0;

                      return (
                        <StudyFolderCard
                          key={folderId}
                          name={folderItem.data.name}
                          iconPath={(folderItem.data as AppFolderVm).iconPath}
                          backgroundPath={(folderItem.data as AppFolderVm).backgroundPath}
                          materialCount={counts?.total ?? 0}
                          progressPercent={progressPercent}
                          locked={(folderItem.data.lockedBy as LockReason | null) ?? undefined}
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
                          <Fragment key={`${item.type}-${item.data.id}`}>
                            {renderMaterialItem({ item, index }, listIndex)}
                          </Fragment>
                        ))}
                    </View>
                  )}
                </>
              );
            }

            if (filteredItems.length === 0) {
              return (
                <GlassCard padding={32} borderRadius={16} style={styles.emptyCard}>
                  <IconSymbol name="info.circle.fill" size={48} color={descriptionColor} style={styles.emptyIcon} />
                  <ThemedText style={styles.emptyText}>В этом разделе пока нет материалов</ThemedText>
                </GlassCard>
              );
            }

            return (
              <>
                {filteredItems.map(({ item, index }, listIndex) => (
                  <Fragment key={`${item.type}-${item.data.id}`}>
                    {renderMaterialItem({ item, index }, listIndex)}
                  </Fragment>
                ))}
              </>
            );
          })()}
        </ScrollView>
      </Animated.View>
      {showOverallProgress ? (
        <View style={[styles.overallProgressFooter, { paddingBottom: contentPaddingBottom }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Открыть статистику общего прогресса"
            onPress={() => router.navigate('/(tabs)/stats')}
          >
            <Animated.View entering={staggerEnter(4)}>
              <GlassCard padding={20} borderRadius={16}>
                <ThemedText type="subtitle">Общий прогресс</ThemedText>
                <View style={styles.overallBar}>
                  <ProgressBar
                    current={overallCompleted}
                    total={overallTotal || 1}
                    height={8}
                    shimmer
                  />
                </View>
              </GlassCard>
            </Animated.View>
          </Pressable>
        </View>
      ) : null}
      {/* Спиннер страницы — снаружи Animated.View, иначе гаснет вместе со списком (opacity → 0) */}
      {isLoading && <LoadingOverlay />}
      <LockedTariffSheet
        item={lockedTariffItem}
        onClose={() => setLockedTariffItem(null)}
        onUnlocked={() => {
          // Перезагружаем списки — замки на карточках исчезают без перезахода
          void foldersResponse.fetchData();
          void articlesResponse.fetchData();
          void testsResponse.fetchData();
          void rescueItemsResponse.fetchData();
          void folderMaterialCountsResponse.fetchData();
        }}
      />
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
  brandName: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.card / 2,
  },
  pageSubtitle: {
    marginTop: Spacing.card / 8,
  },
  folderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: Spacing.card,
  },
  rootMaterials: {
    marginTop: 16,
  },
  overallProgressFooter: {
    paddingHorizontal: Spacing.pageX,
    paddingTop: Spacing.card,
  },
  overallBar: {
    marginTop: 16,
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
});

