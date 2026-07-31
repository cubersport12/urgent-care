import { useArticlesStats, useFilePdf } from '@/hooks/api';
import { AppArticleStatsVm, AppArticleVm } from '@/hooks/api/types';
import { useAchievements } from '@/contexts/achievements-context';
import { useChromeBack } from '@/contexts/chrome-back-context';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useDeviceId } from '@/hooks/use-device-id';
import { useAppTheme } from '@/hooks/use-theme-color';
import { apiFetch } from '@/lib/api';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
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
  markAsReadRef,
  tintColorRef,
}: {
  pdfUri: string | null | undefined;
  isLoading: boolean;
  article: AppArticleVm;
  onBack: () => void;
  markAsReadRef: React.MutableRefObject<() => Promise<void>>;
  tintColorRef: React.MutableRefObject<string>;
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

  // Состояние для отслеживания прочтения PDF (legacy page API — не используется с WebView)
  const isMarkedAsReadRef = useRef(false);

  const markAsReadIfNeeded = useCallback(() => {
    if (!isMarkedAsReadRef.current) {
      isMarkedAsReadRef.current = true;
      void markAsReadRef.current();
    }
  }, [markAsReadRef]);

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
            onScrollToEnd={markAsReadIfNeeded}
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

  // Все остальные хуки - данные хранятся в refs, чтобы не вызывать перерисовку
  const { deviceId } = useDeviceId();
  const deviceIdRef = useRef(deviceId);
  useEffect(() => {
    deviceIdRef.current = deviceId;
  }, [deviceId]);

  const { checkUnlocks } = useAchievements();
  const checkUnlocksRef = useRef(checkUnlocks);
  useEffect(() => {
    checkUnlocksRef.current = checkUnlocks;
  }, [checkUnlocks]);

  const { primary: tintColor } = useAppTheme();
  
  const tintColorRef = useRef(tintColor);
  useEffect(() => {
    tintColorRef.current = tintColor;
  }, [tintColor]);

  // Используем useRef вместо useState, чтобы избежать перерисовки компонента
  const isMarkedAsReadRef = useRef(false);
  const isReadRef = useRef(false);
  
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

      // Устанавливаем флаг через ref, не вызывая перерисовку
      isMarkedAsReadRef.current = true;
      isReadRef.current = true;
      void checkUnlocksRef.current();
    } catch (error) {
      console.error('Error marking article as read:', error);
    }
  }, [article.id]);

  const markAsReadRef = useRef(markAsRead);
  useEffect(() => {
    markAsReadRef.current = markAsRead;
  }, [markAsRead]);

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

  const markAsReadRefWithUpdate = useRef(markAsReadWithUpdate);
  useEffect(() => {
    markAsReadRefWithUpdate.current = markAsReadWithUpdate;
  }, [markAsReadWithUpdate]);

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
        markAsReadRef={markAsReadRefWithUpdate}
        tintColorRef={tintColorRef}
      />
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
