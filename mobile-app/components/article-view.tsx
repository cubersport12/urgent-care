import { useArticlesStats, useFileContentString } from '@/hooks/api';
import { AppArticleStatsVm, AppArticleVm } from '@/hooks/api/types';
import { useDeviceId } from '@/hooks/use-device-id';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/supabase';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import WebView from 'react-native-webview';
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

// Внутренний компонент, который перерисовывается только при изменении html/isLoading
const ArticleViewContent = memo(({ 
  html, 
  isLoading, 
  article, 
  onBack, 
  markAsReadRef,
  tintColorRef,
}: {
  html: string | null | undefined;
  isLoading: boolean;
  article: AppArticleVm;
  onBack: () => void;
  markAsReadRef: React.MutableRefObject<() => Promise<void>>;
  tintColorRef: React.MutableRefObject<string>;
}) => {
  const isNative = Platform.select({ web: false, default: true });
  const processedHtml = html?.replace(/color:#000000/g, 'color:white');
  
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const injectedJavaScript = () => `
    (function() {
      'use strict';
      
      let isScaling = false;
      let timer = null;
      let throttleTimer = null;
      let isMarkedAsRead = false;
      const SCROLL_THRESHOLD = 50; // Порог в пикселях от конца документа
      const THROTTLE_DELAY = 100; // Задержка throttle в миллисекундах
      
      // Устанавливаем opacity в 0 в начале
      // document.documentElement.style.opacity = '0';
      document.documentElement.style.transition = 'opacity 0.3s ease-in-out';

      function applyScale() {
        if (isScaling) return;
        isScaling = true;
        const container = document.getElementById('page-container');
        if (!container) {
          // document.documentElement.style.opacity = '1';
          isScaling = false;
          return;
        }
        
        const contentElement = container.firstElementChild;
        if (!contentElement) {
          // document.body.style.opacity = '1';
          isScaling = false;
          return;
        }
        
        container.style.margin = '0';
        container.style.padding = '0';
        
        // Получаем ширину контейнера (всегда на всю страницу)
        const containerWidth = container.getBoundingClientRect().width || container.clientWidth || container.offsetWidth || window.innerWidth;
        // Получаем реальную ширину содержимого через getBoundingClientRect для точности
        const contentRect = contentElement.getBoundingClientRect();
        const contentWidth = contentRect.width || contentElement.scrollWidth || contentElement.offsetWidth || contentElement.clientWidth;
        
        if (containerWidth === 0 || contentWidth === 0) {
          isScaling = false;
          return;
        }
        
        // Вычисляем scale: во сколько раз нужно увеличить содержимое
        const scale = 'calc(100vw / ' + (contentElement.clientWidth + 10) +'px)';
        
        // Применяем scale к body для масштабирования всего содержимого
        document.body.style.transform = 'scale(' + scale + ')';
        document.body.style.transformOrigin = 'top left';
        document.body.style.margin = '-1px';
        document.body.style.padding = '0';
        document.body.style.width = 'calc(100vw /' + scale + ' )';
        document.body.style.height = 'calc(100vh /' + scale + ' )';
        document.body.style.overflow = 'hidden';
        
        // Устанавливаем opacity в 1 после скейла с анимацией
        setTimeout(() => {
          // document.documentElement.style.opacity = '1';
        }, 50);
        
        setTimeout(() => {
          isScaling = false;
          // После применения масштабирования проверяем, не стал ли контент полностью виден
          checkScrollPosition();
        }, 200);
      }
      
      // Throttled версия applyScale
      function throttledApplyScale() {
        // Если уже есть запланированный вызов, игнорируем текущий
        if (throttleTimer !== null) {
          return;
        }
        
        // Выполняем сразу
        applyScale();
        
        // Устанавливаем таймер для следующего возможного вызова
        throttleTimer = setTimeout(() => {
          throttleTimer = null;
        }, THROTTLE_DELAY);
      }
      
      function init() {
        // Даем время на загрузку контента и изображений
        setTimeout(throttledApplyScale, 200);
        
        // Также пробуем после полной загрузки
        if (document.readyState === 'complete') {
          setTimeout(throttledApplyScale, 300);
        } else {
          window.addEventListener('load', () => {
            setTimeout(throttledApplyScale, 300);
          });
        }
        
        const container = document.getElementById('page-container');
        
        window.addEventListener('resize', () => {
          if (!isScaling) {
            clearTimeout(timer);
            timer = setTimeout(throttledApplyScale, 100);
          }
        });
      }
      
      function findScrollableElement() {
        // Сначала проверяем наличие page-container
        const pageContainer = document.getElementById('page-container');
        if (pageContainer) {
          return pageContainer;
        }
        
        // Если page-container нет, ищем прокручиваемый элемент
        // Проверяем body
        const body = document.body;
        if (body && (body.scrollHeight > body.clientHeight || body.style.overflow === 'auto' || body.style.overflow === 'scroll')) {
          return body;
        }
        
        // Проверяем html
        const html = document.documentElement;
        if (html && (html.scrollHeight > html.clientHeight || html.style.overflow === 'auto' || html.style.overflow === 'scroll')) {
          return html;
        }
        
        // Проверяем все элементы с overflow
        const elementsWithOverflow = document.querySelectorAll('[style*="overflow"]');
        for (let i = 0; i < elementsWithOverflow.length; i++) {
          const el = elementsWithOverflow[i];
          if (el.scrollHeight > el.clientHeight) {
            return el;
          }
        }
        
        // По умолчанию используем window (для прокрутки всей страницы)
        return null;
      }
      
      function checkScrollPosition() {
        if (isMarkedAsRead) return;
        
        const scrollableElement = findScrollableElement();
        let scrollTop = 0;
        let scrollHeight = 0;
        let clientHeight = 0;
        
        if (scrollableElement) {
          // Если это конкретный элемент
          scrollTop = scrollableElement.scrollTop || 0;
          scrollHeight = scrollableElement.scrollHeight || 0;
          clientHeight = scrollableElement.clientHeight || 0;
        } else {
          // Если прокручивается window
          scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
          scrollHeight = Math.max(
            document.body.scrollHeight || 0,
            document.documentElement.scrollHeight || 0
          );
          clientHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight || 0;
        }
        
        // Проверяем, нет ли прокрутки вообще (контент полностью виден)
        const hasNoScroll = scrollHeight <= clientHeight;
        
        // Проверяем, доскроллил ли пользователь до конца (с учетом порога)
        const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
        
        // Если прокрутки нет или доскроллили до конца - считаем прочитанным
        if (hasNoScroll || distanceFromBottom <= SCROLL_THRESHOLD) {
          isMarkedAsRead = true;
          // Отправляем сообщение в React Native
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'scrollToEnd' }));
          } else if (window.parent) {
            window.parent.postMessage(JSON.stringify({ type: 'scrollToEnd' }), '*');
          }
        }
      }
      
      // Добавляем обработчик прокрутки на правильный элемент
      let scrollTimer = null;
      const scrollableElement = findScrollableElement();
      
      if (scrollableElement) {
        // Если найден конкретный элемент, слушаем его прокрутку
        scrollableElement.addEventListener('scroll', () => {
          if (scrollTimer) {
            clearTimeout(scrollTimer);
          }
          scrollTimer = setTimeout(checkScrollPosition, 100);
        }, { passive: true });
      } else {
        // Если прокручивается window, слушаем его
        window.addEventListener('scroll', () => {
          if (scrollTimer) {
            clearTimeout(scrollTimer);
          }
          scrollTimer = setTimeout(checkScrollPosition, 100);
        }, { passive: true });
      }
      
      // Также проверяем при загрузке, если контент уже виден полностью
      // Проверяем несколько раз с разными задержками, чтобы поймать случай, когда контент уже полностью виден
      function checkOnLoad() {
        checkScrollPosition();
        // Проверяем еще раз через небольшую задержку, чтобы убедиться, что все загрузилось
        setTimeout(checkScrollPosition, 100);
        setTimeout(checkScrollPosition, 300);
        setTimeout(checkScrollPosition, 500);
      }
      
      window.addEventListener('load', checkOnLoad);
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          init();
          checkOnLoad();
        });
      } else {
        init();
        checkOnLoad();
      }
    })();
  `;

  const injectedJavaScriptBeforeContent = (htmlBg: string = 'transparent') => `
    // document.body.style.backgroundColor = 'transparent';
    // const html = document.querySelector('html');
    // html.style.backgroundColor = '${htmlBg}';
    // const head = document.querySelector('head');
    document.querySelectorAll('a[href*="#uc:article"]').forEach(a => {
      a.onclick = (e) => { 
        e.preventDefault();
        const href = a.getAttribute('href');
        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(href);
        } else {
          window.top.postMessage(href);
        }
      };
    });
    ${injectedJavaScript()}
  `;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <ThemedView style={styles.header}>
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
      {isLoading ? (
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tintColorRef.current} />
          <ThemedText style={styles.loadingText}>Загрузка...</ThemedText>
        </ThemedView>
      ) : (
        <>
          {isNative ? <WebView 
            useWebView2
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === 'scrollToEnd') {
                  void markAsReadRef.current();
                }
              } catch {
                // Игнорируем ошибки парсинга для других сообщений
              }
            }}
            injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContent()}
            injectedJavaScript={injectedJavaScript()}
            androidLayerType="hardware" // Для Android
            overScrollMode="never"
            style={{ flex: 1, backgroundColor: 'transparent', width: '100%', height: '100%', overflow: 'hidden' }}
            source={{ html: processedHtml ?? '' }}
          /> : <iframe 
            style={{ flex: 1, backgroundColor: 'transparent', width: '100%', height: '100%', overflow: 'hidden' }}
            src={URL.createObjectURL(new Blob([processedHtml?.replace('</body>', `<script>${injectedJavaScriptBeforeContent('rgb(1,1,1)')}</script></body>`) ?? ''], { type: 'text/html' }))}
            onLoad={() => {
              // Для веб-версии добавляем обработчик через postMessage
              if (typeof window !== 'undefined') {
                window.addEventListener('message', (event) => {
                  try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'scrollToEnd') {
                      void markAsReadRef.current();
                    }
                  } catch {
                    // Игнорируем ошибки парсинга
                  }
                });
              }
            }}
          />}
        </>
      )}
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  // Перерисовываем только при изменении html или isLoading
  return prevProps.html === nextProps.html && prevProps.isLoading === nextProps.isLoading;
});

ArticleViewContent.displayName = 'ArticleViewContent';

export function ArticleView({ article, onBack, onNext, onPrevious, hasPrevious = false }: ArticleViewProps) {
  // Единственный хук, который должен вызывать перерисовку
  const { response: html, isLoading } = useFileContentString(`${article.id}.html`);
  
  // Все остальные хуки - данные хранятся в refs, чтобы не вызывать перерисовку
  const { deviceId } = useDeviceId();
  const deviceIdRef = useRef(deviceId);
  useEffect(() => {
    deviceIdRef.current = deviceId;
  }, [deviceId]);

  const tintColor = useThemeColor({}, 'tint');
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

      // Используем upsert для добавления или обновления записи
      // Конфликт определяется по комбинации clientId и articleId
      await supabase
        .from('articles_stats')
        .upsert(dataToUpsert, {
          onConflict: 'clientId,articleId',
        })
        .select()
        .single();

      // Устанавливаем флаг через ref, не вызывая перерисовку
      isMarkedAsReadRef.current = true;
      isReadRef.current = true;
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
    <Animated.View style={styles.container}>
      <ArticleViewContent
        html={html}
        isLoading={isLoading}
        article={article}
        onBack={onBack}
        markAsReadRef={markAsReadRefWithUpdate}
        tintColorRef={tintColorRef}
      />
      <NavigationButtons
        isRead={isRead}
        hasPrevious={hasPrevious}
        article={article}
        onNext={onNext}
        onPrevious={onPrevious}
      />
    </Animated.View>
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
});
