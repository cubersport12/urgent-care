import { useFileContentString } from '@/hooks/api';
import { useLocalSearchParams } from 'expo-router';
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
  if (isNative) {
    return (
      <WebView
        useWebView2
        scalesPageToFit={false}
        injectedJavaScriptBeforeContentLoaded={`
          document.body.style.backgroundColor = 'transparent';
          const html = document.querySelector('html');
          html.style.backgroundColor = 'transparent';
          const head = document.querySelector('head');
      `}
        androidLayerType="hardware" // Для Android
        overScrollMode="never"
        style={{ flex: 1, backgroundColor: 'transparent', width: '100%', height: '100%', overflow: 'hidden' }}
        source={{ html: html ?? '' }}
      />
    );
  }
  return (
    <iframe
      className="flex bg-transparent w-full h-full overflow-hidden"
      src={URL.createObjectURL(new Blob([html
        ?.replace('<html', `<html style='background: rgb(1,1,1)'`)
        .replace('<body', `<body style='background: transparent'`) ?? ''], { type: 'text/html' }))}
    />
  );
}
