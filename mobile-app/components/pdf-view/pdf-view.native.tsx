import { useAppTheme } from '@/hooks/use-theme-color';
import * as FileSystem from 'expo-file-system/legacy';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { PdfViewProps } from './pdf-view.types';
import { normalizePdfDataUri, pdfJsHtmlFromBase64 } from './pdf-view.types';

function extractBase64(dataUri: string): string {
  const match = dataUri.match(/base64,(.+)$/);
  return match ? match[1] : dataUri;
}

/**
 * PDF на iOS/Android: base64 → файл в cache → WebView.
 * iOS открывает file:// напрямую; Android — через HTML-обёртку (встроенный PDF-плагин убран).
 */
export function PdfView({
  source,
  onLoad,
  onError,
  style,
  onScrollToEnd,
}: PdfViewProps) {
  const { page: backgroundColor } = useAppTheme();
  const [webViewSource, setWebViewSource] = useState<{ uri: string } | { html: string; baseUrl?: string } | null>(
    null,
  );
  const [isPreparing, setIsPreparing] = useState(false);
  const filePathRef = useRef<string | null>(null);
  const hasCalledScrollEndRef = useRef(false);
  const hasCalledOnLoadRef = useRef(false);

  useEffect(() => {
    hasCalledScrollEndRef.current = false;
    hasCalledOnLoadRef.current = false;
  }, [source]);

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      if (!source) {
        setWebViewSource(null);
        return;
      }

      setIsPreparing(true);
      setWebViewSource(null);

      try {
        const normalized = normalizePdfDataUri(source);
        const base64 = extractBase64(normalized);
        const cacheDir = FileSystem.cacheDirectory;

        if (Platform.OS === 'android') {
          if (cancelled) return;
          setWebViewSource({ html: pdfJsHtmlFromBase64(base64) });
          return;
        }

        if (!cacheDir) {
          throw new Error('Cache directory is unavailable');
        }

        if (filePathRef.current) {
          await FileSystem.deleteAsync(filePathRef.current, { idempotent: true });
          filePathRef.current = null;
        }

        const filePath = `${cacheDir}pdf-${Date.now()}.pdf`;
        await FileSystem.writeAsStringAsync(filePath, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (cancelled) {
          await FileSystem.deleteAsync(filePath, { idempotent: true });
          return;
        }

        filePathRef.current = filePath;

        const fileUri = filePath.startsWith('file://') ? filePath : `file://${filePath}`;
        setWebViewSource({ uri: fileUri });
      } catch (error) {
        if (!cancelled) {
          console.error('PDF prepare error:', error);
          onError?.(error instanceof Error ? error : new Error('Failed to prepare PDF'));
          setWebViewSource(null);
        }
      } finally {
        if (!cancelled) {
          setIsPreparing(false);
        }
      }
    }

    void prepare();

    return () => {
      cancelled = true;
    };
  }, [source, onError]);

  useEffect(() => {
    return () => {
      if (filePathRef.current) {
        void FileSystem.deleteAsync(filePathRef.current, { idempotent: true });
        filePathRef.current = null;
      }
    };
  }, []);

  const handleLoadEnd = () => {
    if (!hasCalledOnLoadRef.current) {
      hasCalledOnLoadRef.current = true;
      onLoad?.();
    }
  };

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    const data = event.nativeEvent.data;
    if (data === 'loaded' && !hasCalledOnLoadRef.current) {
      hasCalledOnLoadRef.current = true;
      onLoad?.();
    }
    if (data === 'error') {
      onError?.(new Error('Failed to render PDF'));
    }
    if (data === 'end' && onScrollToEnd && !hasCalledScrollEndRef.current) {
      hasCalledScrollEndRef.current = true;
      onScrollToEnd();
    }
  };

  if (isPreparing || !webViewSource) {
    return (
      <View style={[styles.container, style, styles.centered, { backgroundColor }]}>
        {isPreparing ? <ActivityIndicator size="large" /> : null}
      </View>
    );
  }

  return (
    <View style={[styles.container, style, { backgroundColor }]}>
      <WebView
        source={webViewSource}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        nestedScrollEnabled
        setSupportMultipleWindows={false}
        mixedContentMode="always"
        onLoadEnd={Platform.OS === 'ios' ? handleLoadEnd : undefined}
        onError={(syntheticEvent) => {
          console.error('WebView PDF error:', syntheticEvent.nativeEvent);
          onError?.(new Error('Failed to load PDF'));
        }}
        onHttpError={(syntheticEvent) => {
          console.error('WebView PDF HTTP error:', syntheticEvent.nativeEvent);
          onError?.(new Error('Failed to load PDF'));
        }}
        onMessage={handleMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    overflow: 'hidden',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
