import { recordLearningEvent } from '@/api/learning-events';
import { useArticlesStats, useFilePdf } from '@/hooks/api';
import { AppArticleStatsVm, AppArticleVm } from '@/hooks/api/types';
import { useChromeBack } from '@/contexts/chrome-back-context';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useDeviceId } from '@/hooks/use-device-id';
import { useAppTheme } from '@/hooks/use-theme-color';
import { apiFetch } from '@/lib/api';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PdfView } from './pdf-view/pdf-view';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Button } from './ui/button';

type ArticleViewProps = {
  article: AppArticleVm;
  onBack: () => void;
  onNext?: (articleId: string) => void;
  onPrevious?: () => void;
  hasPrevious?: boolean;
};

// Компонент для кнопок навигации, который обновляется отдельно
const NavigationButtons = memo(({
  isRead,
  hasPrevious,
  article,
  onNext,
  onPrevious,
}: {
  isRead: boolean;
  hasPrevious: boolean;
  article: AppArticleVm;
  onNext?: (articleId: string) => void;
  onPrevious?: () => void;
}) => {
  const handleNext = useCallback(() => {
    if (article.nextRunArticle && onNext) {
      onNext(article.nextRunArticle);
    }
  }, [article.nextRunArticle, onNext]);

  if (!isRead || (!hasPrevious && !article.nextRunArticle)) {
    return null;
  }

  return (
    <>
      {/* Кнопка "Назад" - переход к предыдущему документу */}
      {hasPrevious && onPrevious && (
        <Button
          title="Назад"
          onPress={onPrevious}
          variant="primary"
          icon="chevron.left"
          iconPosition="left"
          style={[styles.navButton, styles.navButtonBack]}
        />
      )}
      {/* Кнопка "Далее" - переход к следующему документу */}
      {article.nextRunArticle && (
        <Button
          title="Далее"
          onPress={handleNext}
          variant="primary"
          icon="chevron.right"
          iconPosition="right"
          style={[styles.navButton, styles.navButtonNext]}
        />
      )}
    </>
  );
});

NavigationButtons.displayName = 'NavigationButtons';

// Внутренний компонент, который перерисовывается только при изменении pdfUri/isLoading
const ArticleViewContent = memo(({ 
  pdfUri, 
  isLoading, 
  article, 
  onBack, 
  onScrolledToEndRef,
  tintColorRef,
  onScrollProgressRef,
}: {
  pdfUri: string | null | undefined;
  isLoading: boolean;
  article: AppArticleVm;
  onBack: () => void;
  onScrolledToEndRef: React.MutableRefObject<() => void>;
  tintColorRef: React.MutableRefObject<string>;
  onScrollProgressRef: React.MutableRefObject<(percent: number) => void>;
}) => {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const { border: borderColor } = useAppTheme();
  const { isWide } = useNavRail();
  useChromeBack(onBack);

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {!isWide ? (
        <ThemedView style={[styles.header, { borderBottomColor: borderColor }]}>
          <Button
            title="Назад"
            onPress={onBack}
            variant="default"
            icon="chevron.left"
            iconPosition="left"
            size="medium"
            style={styles.backButton}
          />
        </ThemedView>
      ) : null}
      {isLoading ? (
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tintColorRef.current} />
          <ThemedText style={styles.loadingText}>Загрузка...</ThemedText>
        </ThemedView>
      ) : pdfUri ? (
        <View style={styles.pdfContainer}>
          <PdfView
            key={pdfUri}
            source={pdfUri}
            onScrollToEnd={() => onScrolledToEndRef.current()}
            onScrollProgress={(pct) => onScrollProgressRef.current(pct)}
            onError={(error) => {
              console.error('PDF error:', error);
            }}
            style={styles.pdf}
          />
        </View>
      ) : (
        <ThemedView style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText}>Не удалось загрузить документ</ThemedText>
        </ThemedView>
      )}
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  // Перерисовываем только при изменении pdfUri или isLoading
  return prevProps.pdfUri === nextProps.pdfUri && prevProps.isLoading === nextProps.isLoading;
});

ArticleViewContent.displayName = 'ArticleViewContent';

export function ArticleView({ article, onBack, onNext, onPrevious, hasPrevious = false }: ArticleViewProps) {
  // Единственный хук, который должен вызывать перерисовку
  const { response: pdfUri, isLoading } = useFilePdf(`${article.id}.pdf`);
  const insets = useSafeAreaInsets();
  const { isWide, contentPaddingLeft } = useNavRail();
  // Высота нижнего таб-бара (он absolute и перекрывает контент); на широком лейауте — боковой рельс
  const tabBarHeight = useBottomTabBarHeight();

  // Все остальные хуки - данные хранятся в refs, чтобы не вызывать перерисовку
  const { deviceId } = useDeviceId();
  const deviceIdRef = useRef(deviceId);
  useEffect(() => {
    deviceIdRef.current = deviceId;
  }, [deviceId]);

  const { primary: tintColor } = useAppTheme();
  
  const tintColorRef = useRef(tintColor);
  useEffect(() => {
    tintColorRef.current = tintColor;
  }, [tintColor]);

  // Используем useRef вместо useState, чтобы избежать перерисовки компонента
  const isMarkedAsReadRef = useRef(false);
  const isReadRef = useRef(false);
  const progressSentRef = useRef<Set<number>>(new Set());

  // Кнопка «Я все прочитал»: появляется после доскролла до конца.
  // Пока пользователь на конце документа — сверху; начал скроллить — уезжает вниз.
  const [reachedEnd, setReachedEnd] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  const [buttonLayerHeight, setButtonLayerHeight] = useState(0);
  useEffect(() => {
    setReachedEnd(false);
    setAtEnd(false);
  }, [article.id]);

  const onScrolledToEndRef = useRef<() => void>(() => {});
  useEffect(() => {
    onScrolledToEndRef.current = () => {
      setReachedEnd(true);
      setAtEnd(true);
    };
  }, []);

  useEffect(() => {
    progressSentRef.current = new Set();
    void recordLearningEvent({
      entityType: 'article',
      entityId: article.id,
      event: 'opened',
    });
  }, [article.id]);

  const onScrollProgressRef = useRef((percent: number) => {
    if (progressSentRef.current.has(percent)) return;
    progressSentRef.current.add(percent);
    void recordLearningEvent({
      entityType: 'article',
      entityId: article.id,
      event: 'progress',
      payload: { percent },
    });
  });
  useEffect(() => {
    onScrollProgressRef.current = (percent: number) => {
      if (progressSentRef.current.has(percent)) return;
      progressSentRef.current.add(percent);
      void recordLearningEvent({
        entityType: 'article',
        entityId: article.id,
        event: 'progress',
        payload: { percent },
      });
      // Позиция кнопки: на конце документа — сверху, отскроллил вниз-обратно — снизу
      if (!reachedEnd) return;
      setAtEnd((prev) => (percent >= 98 ? true : percent <= 90 ? false : prev));
    };
  }, [article.id, reachedEnd]);
  
  // Мемоизируем массив article.id, чтобы избежать бесконечных запросов
  const articleIds = useMemo(() => [article.id], [article.id]);
  
  // Проверяем, прочитана ли статья уже
  const articlesStatsResponse = useArticlesStats(articleIds);
  
  // Устанавливаем флаг, если статья уже прочитана
  useEffect(() => {
    if (articlesStatsResponse.data && articlesStatsResponse.data.length > 0) {
      const articleStat = articlesStatsResponse.data.find(stat => stat.articleId === article.id);
      if (articleStat?.readed) {
        isMarkedAsReadRef.current = true;
        isReadRef.current = true;
      }
    }
  }, [articlesStatsResponse.data, article.id]);

  // Создаем функцию напрямую, минуя хук, чтобы избежать перерисовки
  const markAsRead = useCallback(async () => {
    // Проверяем через ref, чтобы не вызывать перерисовку
    if (isMarkedAsReadRef.current || !deviceIdRef.current) return;
    
    try {
      // Подготавливаем данные для вставки/обновления
      const dataToUpsert = {
        clientId: deviceIdRef.current,
        articleId: article.id,
        readed: true,
        createdAt: new Date().toISOString(),
      } as Omit<AppArticleStatsVm, 'id'>;

      await apiFetch('/api/v1/articles-stats', {
        method: 'PUT',
        body: JSON.stringify({
          articleId: dataToUpsert.articleId,
          readed: dataToUpsert.readed,
          createdAt: dataToUpsert.createdAt,
        }),
      });
      void recordLearningEvent({
        entityType: 'article',
        entityId: article.id,
        event: 'progress',
        payload: { percent: 100 },
      });

      // Устанавливаем флаг через ref, не вызывая перерисовку
      isMarkedAsReadRef.current = true;
      isReadRef.current = true;
    } catch (error) {
      console.error('Error marking article as read:', error);
    }
  }, [article.id]);

  // Состояние для кнопок навигации - обновляется отдельно
  // Кнопки показываются, если документ прочитан (из БД) или прокручен до конца
  const [isRead, setIsRead] = useState(false);

  // Обновляем isRead при изменении статистики (если документ уже был прочитан ранее)
  useEffect(() => {
    if (articlesStatsResponse.data && articlesStatsResponse.data.length > 0) {
      const articleStat = articlesStatsResponse.data.find(stat => stat.articleId === article.id);
      const readStatus = articleStat?.readed || false;
      setIsRead(readStatus);
      isReadRef.current = readStatus;
    }
  }, [articlesStatsResponse.data, article.id]);

  // Обновляем markAsRead, чтобы он обновлял состояние isRead
  // Устанавливаем isRead сразу, чтобы кнопки появились немедленно при прокрутке до конца
  const markAsReadWithUpdate = useCallback(async () => {
    // Сразу обновляем состояние, чтобы кнопки появились немедленно
    setIsRead(true);
    isReadRef.current = true;
    // Затем помечаем как прочитанное в базе данных
    await markAsRead();
  }, [markAsRead]);

  // «Я все прочитал»: отметить прочитанным и автоматически закрыть документ
  const handleMarkReadPressed = useCallback(async () => {
    await markAsReadWithUpdate();
    onBack();
  }, [markAsReadWithUpdate, onBack]);

  // Позиция кнопки «Я все прочитал»: анимированный переезд верх ↔ низ
  const READ_BUTTON_HEIGHT = 52;
  const readButtonTop = useSharedValue(0);
  const readButtonOpacity = useSharedValue(0);
  useEffect(() => {
    if (buttonLayerHeight <= 0) return;
    // Верхняя позиция — сразу под шапкой с кнопкой «Назад» (высота шапки ~68 + safe-area)
    const topPos = insets.top + (isWide ? 0 : 68) + 12;
    const bottomPos = Math.max(
      topPos,
      buttonLayerHeight -
        (isWide ? 0 : tabBarHeight) -
        Math.max(insets.bottom, 0) +
        4 -
        READ_BUTTON_HEIGHT,
    );
    readButtonTop.value = withSpring(atEnd ? topPos : bottomPos, {
      damping: 18,
      stiffness: 170,
    });
  }, [atEnd, buttonLayerHeight, isWide, tabBarHeight, insets.top, insets.bottom]);
  useEffect(() => {
    readButtonOpacity.value = withTiming(reachedEnd ? 1 : 0, { duration: 200 });
  }, [reachedEnd]);
  const readButtonAnimatedStyle = useAnimatedStyle(() => ({
    top: readButtonTop.value,
    opacity: readButtonOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingLeft: isWide ? contentPaddingLeft : insets.left,
          paddingRight: insets.right,
        },
      ]}
      pointerEvents="box-none"
    >
      <ArticleViewContent
        key={article.id}
        pdfUri={pdfUri}
        isLoading={isLoading}
        article={article}
        onBack={onBack}
        onScrolledToEndRef={onScrolledToEndRef}
        tintColorRef={tintColorRef}
        onScrollProgressRef={onScrollProgressRef}
      />
      {!isRead && reachedEnd ? (
        <View
          pointerEvents="box-none"
          style={styles.readButtonLayer}
          onLayout={(e) => setButtonLayerHeight(e.nativeEvent.layout.height)}
        >
          <Animated.View
            pointerEvents="auto"
            style={[styles.readButtonWrap, readButtonAnimatedStyle]}
          >
            <Button
              title="Я все прочитал"
              onPress={handleMarkReadPressed}
              fullWidth
              size="large"
            />
          </Animated.View>
        </View>
      ) : null}
      <View pointerEvents="box-none" style={styles.navButtonsLayer}>
        <NavigationButtons
          isRead={isRead}
          hasPrevious={hasPrevious}
          article={article}
          onNext={onNext}
          onPrevious={onPrevious}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...(Platform.OS === 'web' ? { minHeight: 0, height: '100%' } : {}),
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    // borderBottomColor will be set dynamically
    alignItems: 'flex-start',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '400',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    marginBottom: 16,
  },
  meta: {
    marginBottom: 8,
    fontSize: 14,
    opacity: 0.7,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  linkItem: {
    marginBottom: 8,
    paddingLeft: 8,
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
  navButton: {
    position: 'absolute',
    bottom: Platform.select({ ios: 20, default: 12 }),
    zIndex: 10,
  },
  navButtonBack: {
    left: 16,
  },
  navButtonNext: {
    right: 16,
  },
  navButtonsLayer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
  },
  readButtonLayer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
    justifyContent: 'flex-end',
  },
  readButtonWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  pdfContainer: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  pdf: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
