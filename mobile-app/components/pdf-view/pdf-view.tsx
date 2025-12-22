import { Platform } from 'react-native';
import { PdfView as PdfViewAndroid } from './pdf-view.native';
import { PdfView as PdfViewWeb } from './pdf-view.web';

// Объединяем типы из обеих версий
export type PdfViewProps = {
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
  /**
   * Callback, вызываемый при изменении страницы (только для нативных платформ)
   * @param page - номер текущей страницы (начинается с 1)
   * @param numberOfPages - общее количество страниц
   */
  onPageChanged?: (page: number, numberOfPages: number) => void;
  /**
   * Включить пагинацию (только для нативных платформ)
   */
  enablePaging?: boolean;
  /**
   * Горизонтальная прокрутка (только для нативных платформ)
   */
  horizontal?: boolean;
  /**
   * Расстояние между страницами (только для нативных платформ)
   */
  spacing?: number;
  /**
   * Номер начальной страницы (только для нативных платформ)
   */
  page?: number;
  /**
   * Политика масштабирования (только для нативных платформ)
   */
  fitPolicy?: 0 | 1 | 2;
};

/**
 * Универсальный компонент для отображения PDF
 * Автоматически выбирает правильную реализацию в зависимости от платформы
 */
export function PdfView(props: PdfViewProps) {
  return Platform.select({
    web: () => <PdfViewWeb {...props} />,
    default: () => <PdfViewAndroid {...props} />,
  })();
}

