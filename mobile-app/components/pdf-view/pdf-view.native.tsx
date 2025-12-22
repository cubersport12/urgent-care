import { useAppTheme } from '@/hooks/use-theme-color';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Pdf from 'react-native-pdf';

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
   * Callback, вызываемый при изменении страницы
   * @param page - номер текущей страницы (начинается с 1)
   * @param numberOfPages - общее количество страниц
   */
  onPageChanged?: (page: number, numberOfPages: number) => void;
  /**
   * Дополнительные стили для контейнера
   */
  style?: any;
  /**
   * Включить пагинацию (переключение страниц свайпом)
   */
  enablePaging?: boolean;
  /**
   * Горизонтальная прокрутка (true) или вертикальная (false)
   */
  horizontal?: boolean;
  /**
   * Расстояние между страницами
   */
  spacing?: number;
  /**
   * Номер начальной страницы (начинается с 1)
   */
  page?: number;
  /**
   * Политика масштабирования (0 = fit width, 1 = fit height, 2 = fit both)
   */
  fitPolicy?: 0 | 1 | 2;
};

/**
 * Компонент для отображения PDF на Android и iOS платформах
 * Использует react-native-pdf для нативного отображения PDF
 */
export function PdfView({
  source,
  onLoad,
  onError,
  onPageChanged,
  style,
  enablePaging = true,
  horizontal = false,
  spacing = 0,
  page = 1,
  fitPolicy = 2,
}: PdfViewProps) {
  const [totalPages, setTotalPages] = useState(0);
  const hasCalledOnLoadRef = useRef(false);
  const { page: bg } = useAppTheme();

  // Вызываем onLoad при первой загрузке
  useEffect(() => {
    if (totalPages > 0 && !hasCalledOnLoadRef.current && onLoad) {
      hasCalledOnLoadRef.current = true;
      onLoad();
    }
  }, [totalPages, onLoad]);

  if (!source) {
    return null;
  }

  // Нормализуем URI для react-native-pdf
  // react-native-pdf требует формат: "data:application/pdf;base64,JVBERi0xLjcKJc..."
  let normalizedUri = source;
  if (source.startsWith('data:')) {
    // Если уже data URL, проверяем формат
    if (!source.startsWith('data:application/pdf;base64,')) {
      // Если формат неправильный, пытаемся исправить
      const base64Match = source.match(/data:.*?;base64,(.+)/);
      if (base64Match) {
        normalizedUri = `data:application/pdf;base64,${base64Match[1]}`;
      }
    }
  } else {
    // Если это не data URL, предполагаем что это base64 строка без префикса
    normalizedUri = `data:application/pdf;base64,${source}`;
  }

  return (
    <Pdf
      source={{ uri: normalizedUri, cache: true }}
      onLoadComplete={(numberOfPages: number) => {
        setTotalPages(numberOfPages);
        // Если PDF состоит из одной страницы, вызываем onLoad сразу
        if (numberOfPages === 1 && !hasCalledOnLoadRef.current && onLoad) {
          hasCalledOnLoadRef.current = true;
          onLoad();
        }
      }}
      onPageChanged={(pageNumber: number, numberOfPages: number) => {
        setTotalPages(numberOfPages);
        if (onPageChanged) {
          onPageChanged(pageNumber, numberOfPages);
        }
      }}
      onError={(error: any) => {
        console.error('PDF error:', error);
        if (onError) {
          onError(new Error(error?.message || 'Failed to load PDF'));
        }
      }}
      style={[styles.pdf, style, { backgroundColor: bg }]}
      enablePaging={enablePaging}
      horizontal={horizontal}
      spacing={spacing}
      page={page}
      fitPolicy={fitPolicy}
    />
  );
}

const styles = StyleSheet.create({
  pdf: {
    flex: 1,
    width: '100%',
    height: '100%'
  },
});

