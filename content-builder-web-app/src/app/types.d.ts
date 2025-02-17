declare module 'mammoth' {
  // Основные типы
  export interface DocumentElement {
    type: string;
    children?: DocumentElement[];
    value?: string;
    styleId?: string;
    styleName?: string;
    style?: { [key: string]: string };
    alignment?: 'left' | 'right' | 'center' | 'justify';
    classes?: string[];
  }

  export interface Image {
    src: string;
    altText?: string;
  }

  export interface Table {
    rows: TableRow[];
  }

  export interface TableRow {
    cells: TableCell[];
  }

  export interface TableCell {
    children: DocumentElement[];
  }

  export interface ConversionResult {
    value: string; // Итоговый HTML
    messages: Record<'type' | 'message', string>[]; // Сообщения (например, предупреждения)
  }

  // Функции для трансформации
  export interface Transform {
    (element: DocumentElement): DocumentElement;
  }

  export interface Transforms {
    paragraph: (transform: Transform) => Transform;
    table: (transform: Transform) => Transform;
    image: (transform: Transform) => Transform;
  }

  // Опции для конвертации
  export interface Options {
    styleMap?: string[] | string;
    transformDocument?: Transform;
    includeEmbeddedStyleMap?: boolean;
    includeDefaultStyleMap?: boolean;
    convertImage?: (image: Image) => Promise<string>;
  }

  // Основные функции
  export function convertToHtml(input: { path: string } | { arrayBuffer: ArrayBuffer }, options?: Options): Promise<ConversionResult>;
  export function convertToMarkdown(input: { path: string } | { arrayBuffer: ArrayBuffer }, options?: Options): Promise<ConversionResult>;
  export function extractRawText(input: { path: string } | { arrayBuffer: ArrayBuffer }): Promise<{ value: string }>;

  // Трансформации
  export const transforms: Transforms;
}
