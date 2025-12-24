import { useEffect, useRef, useState } from 'react';

type PdfViewProps = {
  /**`1`1234567890
   * Base64 data URL или обычный URL PDF файла
   */
  source: string | null | undefined;
  /**
   * Callback, вызываемый при загрузке PDF
   */
  onLoad?: () => void;
  /**
   * Callback, вызываемый при ошибке загрузки
   */
  onError?: (error: Error) => void;
  /**
   * Дополнительные стили для контейнера
   */
  style?: any;
  /**
   * Callback, вызываемый при прокрутке до конца документа
   */
  onScrollToEnd?: () => void;
};

/**
 * Компонент для отображения PDF на веб-платформе
 * Использует iframe для отображения PDF с поддержкой blob URL
 */
export function PdfView({ source, onLoad, onError, style, onScrollToEnd }: PdfViewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const hasCalledOnScrollToEndRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Преобразуем base64 в blob URL
  useEffect(() => {
    if (!source) {
      setPdfUrl(null);
      return;
    }

    // Если это уже обычный URL (не data URL), используем его напрямую
    if (!source.startsWith('data:')) {
      setPdfUrl(source);
      return;
    }

    // Преобразуем base64 data URL в Blob и создаем blob URL
    try {
      // Извлекаем base64 часть из data URL
      const base64Match = source.match(/data:.*?;base64,(.+)/);
      if (!base64Match) {
        throw new Error('Invalid data URL format');
      }

      const base64Data = base64Match[1];
      // Конвертируем base64 в бинарные данные
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Создаем Blob из бинарных данных
      const blob = new Blob([bytes], { type: 'application/pdf' });

      // Очищаем предыдущий blob URL, если он был
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }

      // Создаем новый blob URL
      const blobUrl = URL.createObjectURL(blob);
      blobUrlRef.current = blobUrl;
      setPdfUrl(blobUrl);
    } catch (error) {
      console.error('Error converting base64 to blob URL:', error);
      if (onError) {
        onError(error as Error);
      }
      setPdfUrl(null);
    }

    // Cleanup: освобождаем blob URL при размонтировании или изменении source
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

    // Проверяем, что iframe загружен
    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }

    // Очищаем предыдущие подписки
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    // Обработчик загрузки iframe
    const handleLoad = () => {
      if (onLoad) {
        onLoad();
      }

      // Вызываем onScrollToEnd при загрузке документа
      if (onScrollToEnd) {
        onScrollToEnd();
      }

      // После загрузки начинаем отслеживать прокрутку
      if (onScrollToEnd) {
        // Сбрасываем флаг при загрузке нового документа для дальнейшего отслеживания
        hasCalledOnScrollToEndRef.current = false;
        
        // Для PDF в iframe с data URL браузер блокирует доступ к содержимому из-за политики безопасности
        // Используем альтернативный подход: отслеживание через события на родительском окне
        // и таймер просмотра (для встроенного PDF viewer браузера)
        let interactionStartTime: number | null = null;
        let lastInteractionTime: number = Date.now();
        let checkIntervalId: ReturnType<typeof setInterval> | null = null;
        let markAsReadTimeoutId: ReturnType<typeof setTimeout> | null = null;

        const handleInteraction = () => {
          lastInteractionTime = Date.now();
          if (interactionStartTime === null) {
            interactionStartTime = Date.now();
          }
        };

        const markAsReadIfNeeded = () => {
          // Если прошло достаточно времени с момента последнего взаимодействия (3 секунды)
          // и пользователь взаимодействовал с документом (минимум 2 секунды просмотра)
          const timeSinceLastInteraction = Date.now() - lastInteractionTime;
          const totalViewTime = interactionStartTime ? Date.now() - interactionStartTime : 0;
          
          // Считаем документ прочитанным, если:
          // 1. Пользователь просматривал документ минимум 2 секунды
          // 2. И не было взаимодействия последние 3 секунды (вероятно, доскроллил до конца)
          // ИЛИ прошло 10 секунд с начала просмотра (для коротких документов)
          if (
            !hasCalledOnScrollToEndRef.current &&
            onScrollToEnd &&
            totalViewTime >= 2000 &&
            (timeSinceLastInteraction >= 3000 || totalViewTime >= 10000)
          ) {
            hasCalledOnScrollToEndRef.current = true;
            onScrollToEnd();
          }
        };

        // Отслеживаем взаимодействия пользователя с iframe
        const interactionEvents = ['wheel', 'scroll', 'touchmove', 'mousemove', 'keydown'];
        // Пытаемся получить доступ к содержимому iframe для отслеживания событий
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            interactionEvents.forEach(eventType => {
              iframeDoc.documentElement.addEventListener(eventType, handleInteraction, { passive: true });
            });
          } else {
            // Если доступ к содержимому заблокирован, используем события на родительском окне
            interactionEvents.forEach(eventType => {
              window.addEventListener(eventType, handleInteraction, { passive: true });
            });
          }
        } catch {
          // Cross-origin ограничения - используем события на родительском окне
          interactionEvents.forEach(eventType => {
            window.addEventListener(eventType, handleInteraction, { passive: true });
          });
        }

        // Начинаем проверку через 2 секунды после загрузки
        markAsReadTimeoutId = setTimeout(() => {
          // Проверяем каждые 500ms
          checkIntervalId = setInterval(markAsReadIfNeeded, 500);
        }, 2000);

        // Сохраняем cleanup функцию
        cleanupRef.current = () => {
          if (markAsReadTimeoutId) {
            clearTimeout(markAsReadTimeoutId);
          }
          if (checkIntervalId) {
            clearInterval(checkIntervalId);
          }
          // Очищаем подписки на события
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc) {
              interactionEvents.forEach(eventType => {
                iframeDoc.documentElement.removeEventListener(eventType, handleInteraction);
              });
            }
          } catch {
            // Игнорируем ошибки при очистке
          }
          interactionEvents.forEach(eventType => {
            window.removeEventListener(eventType, handleInteraction);
          });
        };
      }
    };

    // Обработчик ошибок
    const handleError = () => {
      if (onError) {
        onError(new Error('Failed to load PDF'));
      }
    };

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [pdfUrl, onLoad, onError, onScrollToEnd]);

  if (!pdfUrl) {
    return null;
  }

  // Добавляем параметры для скрытия toolbar и вписывания в экран
  // #toolbar=0 - скрывает toolbar
  // #zoom=page-fit - вписывает PDF в размер экрана
  const finalPdfUrl = `${pdfUrl}#toolbar=0&zoom=page-fit`;

  return (
    <iframe
      ref={iframeRef}
      src={finalPdfUrl}
      // @ts-ignore - iframe style для веб-платформы
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
        border: 'none',
        ...style,
      }}
      title="PDF Viewer"
    />
  );
}

