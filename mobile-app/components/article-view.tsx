import { useArticlesStats, useFileContentString } from '@/hooks/api';
import { AppArticleStatsVm, AppArticleVm } from '@/hooks/api/types';
import { useDeviceId } from '@/hooks/use-device-id';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/supabase';
import { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import WebView from 'react-native-webview';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { IconSymbol } from './ui/icon-symbol';

type ArticleViewProps = {
  article: AppArticleVm;
  onBack: () => void;
};

export function ArticleView({ article, onBack }: ArticleViewProps) {
  const isNative = Platform.select({ web: false, default: true });
  const { response: html, isLoading } = useFileContentString(`${article.id}.html`);
  const processedHtml = html?.replace(/color:#000000/g, 'color:white');
  const { deviceId } = useDeviceId();
  // Используем useRef вместо useState, чтобы избежать перерисовки компонента
  const isMarkedAsReadRef = useRef(false);
  
  // Проверяем, прочитана ли статья уже
  const articlesStatsResponse = useArticlesStats([article.id]);
  
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
    } catch (error) {
      console.error('Error marking article as read:', error);
    }
  }, [deviceId, article.id]);

  const injectedJavaScript = () => `
    ${isNative ? `document.body.style.opacity = '0';` : ''}
    
    (function() {
      'use strict';
      
      let isScaling = false;
      let timer = null;
      let isMarkedAsRead = false;
      const SCROLL_THRESHOLD = 50; // Порог в пикселях от конца документа
      
      function applyScale() {
        if (isScaling) return;
        isScaling = true;
        
        const container = document.getElementById('page-container');
        if (!container) {
          if (${isNative}) {
            document.body.style.opacity = '1';
          }
          isScaling = false;
          return;
        }
        
        const contentElement = container.firstElementChild;
        if (!contentElement) {
          if (${isNative}) {
            document.body.style.opacity = '1';
          }
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
        
        // Также применяем scale непосредственно к контейнеру для надежности
        // container.style.transform = 'scale(1)';
        // container.style.transformOrigin = 'top left';
        
        if (${isNative}) {
          document.body.style.opacity = '1';
        }
        
        setTimeout(() => {
          isScaling = false;
        }, 200);
      }
      
      function init() {
        // Даем время на загрузку контента и изображений
        setTimeout(applyScale, 200);
        
        // Также пробуем после полной загрузки
        if (document.readyState === 'complete') {
          setTimeout(applyScale, 300);
        } else {
          window.addEventListener('load', () => {
            setTimeout(applyScale, 300);
          });
        }
        
        const container = document.getElementById('page-container');
        
        window.addEventListener('resize', () => {
          if (!isScaling) {
          clearTimeout(timer);
            timer = setTimeout(applyScale, 50);
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
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
        setTimeout(checkScrollPosition, 500);
      }
    })();
  `;

  const injectedJavaScriptBeforeContent = (htmlBg: string = 'transparent') => `
    document.body.style.backgroundColor = 'transparent';
    const html = document.querySelector('html');
    html.style.backgroundColor = '${htmlBg}';
    const head = document.querySelector('head');

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
  const backgroundColor = useThemeColor({}, 'background');
  const pressedBackgroundColor = useThemeColor({ light: '#f0f0f0', dark: '#2a2a2a' }, 'background');

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <ThemedView style={styles.header}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor: pressed ? pressedBackgroundColor : backgroundColor,
            },
          ]}
        >
          <IconSymbol name="chevron.left" size={28} color={tintColor} />
          <ThemedText style={styles.backButtonText}>Назад</ThemedText>
        </Pressable>
      </ThemedView>
      {isLoading ? (
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tintColor} />
          <ThemedText style={styles.loadingText}>Загрузка...</ThemedText>
        </ThemedView>
      ) : (
        isNative ? <WebView 
          useWebView2
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
                    void markAsRead();
                  }
                } catch {
                  // Игнорируем ошибки парсинга
                }
              });
            }
          }}
        />
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
});

