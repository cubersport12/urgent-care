import { useArticlesStats, useFileContentString } from '@/hooks/api';
import { AppArticleStatsVm, AppArticleVm } from '@/hooks/api/types';
import { useDeviceId } from '@/hooks/use-device-id';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/supabase';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

export function ArticleView({ article, onBack, onNext, onPrevious, hasPrevious = false }: ArticleViewProps) {
  const isNative = Platform.select({ web: false, default: true });
  const { response: html, isLoading } = useFileContentString(`${article.id}.html`);
  const processedHtml = html?.replace(/color:#000000/g, 'color:white');
  const { deviceId } = useDeviceId();
  // Используем useRef вместо useState, чтобы избежать перерисовки компонента
  const isMarkedAsReadRef = useRef(false);
  
  // Мемоизируем массив article.id, чтобы избежать бесконечных запросов
  const articleIds = useMemo(() => [article.id], [article.id]);
  
  const injectedJavaScript = () => `
    (function() {
      'use strict';
      let timer = null;
      let throttleTimer = null;
      let isMarkedAsRead = false;
      const SCROLL_THRESHOLD = 50; // Порог в пикселях от конца документа
      const THROTTLE_DELAY = 100; // Задержка throttle в миллисекундах
      
      
      function findScrollableElement() {
        return document.body;
      }
      
      function checkScrollPosition() {
        if (isMarkedAsRead) return;

        document.body.style.height = '100%';
        document.body.style.overflow = 'auto';
        document.documentElement.style.height = '100%';
        document.documentElement.style.overflow = 'auto';
        
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
        
        // Проверяем, доскроллил ли пользователь до конца (с учетом порога)
        const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
        
        if (distanceFromBottom <= SCROLL_THRESHOLD) {
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
      window.addEventListener('load', () => {
        setTimeout(checkScrollPosition, 500);
      });
    })();
  `;

  // Проверяем, прочитана ли статья уже
  const articlesStatsResponse = useArticlesStats(articleIds);
  
  // Устанавливаем флаг, если статья уже прочитана
  useEffect(() => {
    if (articlesStatsResponse.data && articlesStatsResponse.data.length > 0) {
      const articleStat = articlesStatsResponse.data.find(stat => stat.articleId === article.id);
      if (articleStat?.readed) {
        isMarkedAsReadRef.current = true;
      }
    }
  }, [articlesStatsResponse.data, article.id]);

  // Создаем функцию напрямую, минуя хук, чтобы избежать перерисовки
  const markAsRead = useCallback(async () => {
    // Проверяем через ref, чтобы не вызывать перерисовку
    if (isMarkedAsReadRef.current || !deviceId) return;
    
    try {
      // Подготавливаем данные для вставки/обновления
      const dataToUpsert = {
        clientId: deviceId,
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
      // Обновляем состояние для показа кнопок навигации
      setIsRead(true);
    } catch (error) {
      console.error('Error marking article as read:', error);
    }
  }, [deviceId, article.id]);

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

  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const tintColor = useThemeColor({}, 'tint');
  
  // Отслеживаем, прочитан ли документ, для показа кнопок навигации
  const [isRead, setIsRead] = useState(false);
  
  // Обновляем состояние isRead при изменении статистики
  useEffect(() => {
    if (articlesStatsResponse.data && articlesStatsResponse.data.length > 0) {
      const articleStat = articlesStatsResponse.data.find(stat => stat.articleId === article.id);
      setIsRead(articleStat?.readed || false);
    }
  }, [articlesStatsResponse.data, article.id]);
  
  // Обновляем isRead при пометке как прочитанного
  // Используем отдельный эффект для отслеживания изменений через markAsRead
  useEffect(() => {
    // Проверяем ref периодически или при изменении article.id
    const checkReadStatus = () => {
      if (isMarkedAsReadRef.current) {
        setIsRead(true);
      }
    };
    checkReadStatus();
  }, [article.id]);
  
  const handleNext = useCallback(() => {
    if (article.nextRunArticle && onNext) {
      onNext(article.nextRunArticle);
    }
  }, [article.nextRunArticle, onNext]);

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
          <ActivityIndicator size="large" color={tintColor} />
          <ThemedText style={styles.loadingText}>Загрузка...</ThemedText>
        </ThemedView>
      ) : (
        <>
          {isNative ? <WebView 
            useWebView2
            injectedJavaScript={injectedJavaScript()}
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === 'scrollToEnd') {
                  void markAsRead();
                }
              } catch {
                // Игнорируем ошибки парсинга для других сообщений
              }
            }}
            injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContent()}
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
                      void markAsRead();
                    }
                  } catch {
                    // Игнорируем ошибки парсинга
                  }
                });
              }
            }}
          />}
          {/* Кнопки навигации поверх WebView - показываются только после прочтения */}
          {isRead && (hasPrevious || article.nextRunArticle) && (
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
          )}
        </>
      )}
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

