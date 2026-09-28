import { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { pdfJsHtmlFromBase64, pdfJsHtmlFromFile, type PdfViewProps } from './pdf-view.types';

/**
 * PDF на web: тот же pdf.js-HTML, что и на Android, внутри iframe (srcDoc).
 * Встроенный браузерный PDF-плагин не подходит: внутри iframe он не скроллится
 * колесом в Chrome и вообще не рендерится на iOS. pdf.js рисует обычный DOM —
 * скролл работает везде, прогресс приходит сообщениями 'progress:N' / 'end'.
 */
export function PdfView({
  source,
  onLoad,
  onError,
  style,
  onScrollToEnd,
  onScrollProgress,
}: PdfViewProps) {
  const html = useMemo(() => {
    if (!source) {
      return null;
    }
    const base64Match = source.match(/data:.*?;base64,(.+)/);
    return base64Match ? pdfJsHtmlFromBase64(base64Match[1]) : pdfJsHtmlFromFile(source);
  }, [source]);

  // Колбэки — через ref, чтобы слушатель message не переустанавливать на каждый рендер
  const callbacksRef = useRef({ onLoad, onError, onScrollToEnd, onScrollProgress });
  callbacksRef.current = { onLoad, onError, onScrollToEnd, onScrollProgress };

  const hasCalledOnLoadRef = useRef(false);
  const hasCalledOnScrollToEndRef = useRef(false);
  useEffect(() => {
    hasCalledOnLoadRef.current = false;
    hasCalledOnScrollToEndRef.current = false;
  }, [source]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (typeof data !== 'string') {
        return;
      }
      const callbacks = callbacksRef.current;
      if (data === 'loaded') {
        if (!hasCalledOnLoadRef.current) {
          hasCalledOnLoadRef.current = true;
          callbacks.onLoad?.();
        }
      } else if (data === 'end') {
        if (!hasCalledOnScrollToEndRef.current) {
          hasCalledOnScrollToEndRef.current = true;
          callbacks.onScrollToEnd?.();
        }
      } else if (data === 'error') {
        callbacks.onError?.(new Error('Failed to render PDF'));
      } else if (data.startsWith('progress:')) {
        const percent = parseInt(data.slice('progress:'.length), 10);
        if (!Number.isNaN(percent)) {
          callbacks.onScrollProgress?.(percent);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!html) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <iframe title="PDF Viewer" srcDoc={html} style={iframeCss} />
    </View>
  );
}

// CSS фрейма — веб-свойства (border/display), которых нет в RN-стилях
const iframeCss: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  border: 'none',
  display: 'block',
  backgroundColor: 'transparent',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { position: 'relative' as const } : {}),
  },
});
