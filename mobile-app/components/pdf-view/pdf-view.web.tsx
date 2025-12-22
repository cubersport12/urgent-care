import { useEffect, useRef } from 'react';

type PdfViewProps = {
  /**
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
};

/**
 * Компонент для отображения PDF на веб-платформе
 * Использует iframe для отображения PDF с поддержкой base64 data URL
 */
export function PdfView({ source, onLoad, onError, style }: PdfViewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!source) {
      return;
    }

    // Проверяем, что iframe загружен
    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }

    // Обработчик загрузки iframe
    const handleLoad = () => {
      if (onLoad) {
        onLoad();
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
    };
  }, [source, onLoad, onError]);

  if (!source) {
    return null;
  }

  // Добавляем параметры для скрытия toolbar и вписывания в экран
  // #toolbar=0 - скрывает toolbar
  // #zoom=page-fit - вписывает PDF в размер экрана
  let pdfUrl = source;
  if (source.startsWith('data:')) {
    // Для data URL параметры добавляются через # после base64 части
    if (source.includes('#')) {
      // Если уже есть параметры, добавляем к ним
      pdfUrl = `${source}&toolbar=0&zoom=page-fit`;
    } else {
      // Если параметров нет, добавляем новые
      pdfUrl = `${source}#toolbar=0&zoom=page-fit`;
    }
  } else {
    // Для обычных URL также добавляем параметры
    const separator = source.includes('?') ? '&' : '#';
    pdfUrl = `${source}${separator}toolbar=0&zoom=page-fit`;
  }

  return (
    <iframe
      ref={iframeRef}
      src={pdfUrl}
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

