import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import type { PdfViewProps } from './pdf-view.types';
/**
 * Компонент для отображения PDF на веб-платформе.
 * PDF отображается во iframe с корректной flex-вёрсткой для прокрутки.
 */
export function PdfView({ source, onLoad, onError, style, onScrollToEnd, onScrollProgress: _onScrollProgress }: PdfViewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const hasCalledOnScrollToEndRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!source) {
      setPdfUrl(null);
      return;
    }

    if (!source.startsWith('data:')) {
      setPdfUrl(source);
      return;
    }

    try {
      const base64Match = source.match(/data:.*?;base64,(.+)/);
      if (!base64Match) {
        throw new Error('Invalid data URL format');
      }

      const base64Data = base64Match[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: 'application/pdf' });

      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }

      const blobUrl = URL.createObjectURL(blob);
      blobUrlRef.current = blobUrl;
      setPdfUrl(blobUrl);
    } catch (error) {
      console.error('Error converting base64 to blob URL:', error);
      onError?.(error as Error);
      setPdfUrl(null);
    }

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [source, onError]);

  useEffect(() => {
    if (!pdfUrl) {
      return;
    }

    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }

    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    const handleLoad = () => {
      onLoad?.();

      if (onScrollToEnd) {
        hasCalledOnScrollToEndRef.current = false;

        let interactionStartTime: number | null = null;
        let lastInteractionTime = Date.now();
        let checkIntervalId: ReturnType<typeof setInterval> | null = null;
        let markAsReadTimeoutId: ReturnType<typeof setTimeout> | null = null;

        const handleInteraction = () => {
          lastInteractionTime = Date.now();
          if (interactionStartTime === null) {
            interactionStartTime = Date.now();
          }
        };

        const markAsReadIfNeeded = () => {
          const timeSinceLastInteraction = Date.now() - lastInteractionTime;
          const totalViewTime = interactionStartTime ? Date.now() - interactionStartTime : 0;

          if (
            !hasCalledOnScrollToEndRef.current &&
            totalViewTime >= 2000 &&
            (timeSinceLastInteraction >= 3000 || totalViewTime >= 10000)
          ) {
            hasCalledOnScrollToEndRef.current = true;
            onScrollToEnd();
          }
        };

        const interactionEvents = ['wheel', 'scroll', 'touchmove', 'mousemove', 'keydown'] as const;

        const attachListeners = (target: EventTarget) => {
          interactionEvents.forEach((eventType) => {
            target.addEventListener(eventType, handleInteraction, { passive: true });
          });
          return () => {
            interactionEvents.forEach((eventType) => {
              target.removeEventListener(eventType, handleInteraction);
            });
          };
        };

        let detachIframeListeners: (() => void) | undefined;
        let detachWindowListeners: (() => void) | undefined;

        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            detachIframeListeners = attachListeners(iframeDoc.documentElement);
          }
        } catch {
          // Cross-origin — слушаем только окно
        }

        detachWindowListeners = attachListeners(window);

        markAsReadTimeoutId = setTimeout(() => {
          checkIntervalId = setInterval(markAsReadIfNeeded, 500);
        }, 2000);

        cleanupRef.current = () => {
          if (markAsReadTimeoutId) {
            clearTimeout(markAsReadTimeoutId);
          }
          if (checkIntervalId) {
            clearInterval(checkIntervalId);
          }
          detachIframeListeners?.();
          detachWindowListeners?.();
        };
      }
    };

    const handleError = () => {
      onError?.(new Error('Failed to load PDF'));
    };

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [pdfUrl, onLoad, onError, onScrollToEnd]);

  if (!pdfUrl) {
    return null;
  }

  const finalPdfUrl = `${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`;

  const focusIframe = () => {
    iframeRef.current?.focus();
  };

  return (
    <View style={[styles.container, style]}>
      <iframe
        ref={iframeRef}
        src={finalPdfUrl}
        title="PDF Viewer"
        tabIndex={0}
        onMouseEnter={focusIframe}
        onTouchStart={focusIframe}
        // @ts-expect-error iframe styles for web
        style={styles.iframe}
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
    ...(Platform.OS === 'web' ? { position: 'relative' as const } : {}),
  },
  iframe: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    border: 'none',
    display: 'block',
    backgroundColor: 'transparent',
  },
});
