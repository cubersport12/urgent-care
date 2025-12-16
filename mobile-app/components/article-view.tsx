import { useFileContentString } from '@/hooks/api';
import { AppArticleVm } from '@/hooks/api/types';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useEffect } from 'react';
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

  const injectedJavaScript = () => `
    ${isNative ? `document.body.style.opacity = '0';` : ''}
    
    (function() {
      'use strict';
      
      let isScaling = false;
      let timer = null;
      
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
        
        console.info('scaling....')
        const contentElement = container.firstElementChild;
        if (!contentElement) {
          if (${isNative}) {
            document.body.style.opacity = '1';
          }
          isScaling = false;
          return;
        }
        
        // Убеждаемся, что контейнер занимает всю ширину
        // container.style.width = '100%';
        // container.style.maxWidth = '100%';
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
        // if (container) {
        //   const resizeObserver = new ResizeObserver(() => {
        //     if (!isScaling) {
        //       setTimeout(applyScale, 50);
        //     }
        //   });
          
        //   resizeObserver.observe(container);
          
        //   const contentElement = container.firstElementChild;
        //   if (contentElement) {
        //     resizeObserver.observe(contentElement);
        //   }
        // }
        
        window.addEventListener('resize', () => {
          if (!isScaling) {
          clearTimeout(timer);
            timer = setTimeout(applyScale, 50);
          }
        });
      }
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
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
        isNative ? <WebView useWebView2
          // onMessage={event => handleHref(event.nativeEvent.data)}
          injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContent()}
          injectedJavaScript={injectedJavaScript()}
          androidLayerType="hardware" // Для Android
          overScrollMode="never"
          style={{ flex: 1, backgroundColor: 'transparent', width: '100%', height: '100%', overflow: 'hidden' }}
          source={{ html: processedHtml ?? '' }}
        /> : <iframe 
          style={{ flex: 1, backgroundColor: 'transparent', width: '100%', height: '100%', overflow: 'hidden' }}
          src={URL.createObjectURL(new Blob([processedHtml?.replace('</body>', `<script>${injectedJavaScriptBeforeContent('rgb(1,1,1)')}</script></body>`) ?? ''], { type: 'text/html' }))} />
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

