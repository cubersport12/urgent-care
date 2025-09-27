import { fetchArticle, useArticle, useFileContentString } from '@/hooks/api';
import { useLocalSearchParams, router } from 'expo-router';
import { useCallback } from 'react';
import { Platform } from 'react-native';
import WebView from 'react-native-webview';

export default function Article() {
  const { articleId } = useLocalSearchParams<{ articleId: string }>();
  const isNative = Platform.select({
    web: false,
    default: true
  });
  const html = useFileContentString(`${articleId}.html`)
    ?.replace(/color:#000000/g, 'color:white');
  const article = useArticle(articleId);

  const handleHref = useCallback(async (href: string) => {
    const link = href.match(/(#uc:article:[^'"]*)/ig)?.[0];
    if (link == null) {
      return;
    }
    const l = article.data?.linksToArticles?.find(x => x.key === link);
    if (l?.articleId == null) {
      return;
    }
    const a = await fetchArticle(l.articleId);
    router.navigate({ pathname: '/folders/[folderId]/documents/[articleId]', params: { articleId: l.articleId, folderId: a.data?.parentId ?? '' } });
  }, [article?.data]);

  const injectedJavaScript = () => `
      ${isNative ? `document.body.style.opacity = '0';` : ''}
      function scaleToFit() {
        var element = document.getElementById("page-container");
        if (element == null) {
          element = document.body;
        } else {
          document.body.style.overflow = 'hidden';  
        }
        var scale = element.clientWidth/element.scrollWidth;
        console.log(scale);
        document.body.style.transform = 'scale(' + scale + ')';
        document.body.style.margin = '0';
        document.body.style.padding = '0';
        document.body.style.transformOrigin = 'top left';
        document.body.style.width = 100.1/scale + 'vw';
        document.body.style.height = 100.1/scale + 'vh';
      }
      window.addEventListener('load', scaleToFit);
      window.addEventListener('resize', scaleToFit);
      ${isNative
        ? `
        scaleToFit();
        document.body.style.opacity = '1';
        `
        : ''}
      
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

  if (isNative) {
    return (
      <WebView
        useWebView2
        onMessage={event => handleHref(event.nativeEvent.data)}
        injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContent()}
        injectedJavaScript={injectedJavaScript()}
        androidLayerType="hardware" // Для Android
        overScrollMode="never"
        style={{ flex: 1, backgroundColor: 'transparent', width: '100%', height: '100%', overflow: 'hidden' }}
        source={{ html: html ?? '' }}
      />
    );
  }
  window.onmessage = (e) => {
    void handleHref(e.data);
  };
  return (
    <iframe
      className="flex bg-transparent w-full h-full overflow-hidden"
      src={URL.createObjectURL(new Blob([html?.replace('</body>', `<script>${injectedJavaScriptBeforeContent('rgb(1,1,1)')}</script></body>`) ?? ''], { type: 'text/html' }))}
    />
  );
}
