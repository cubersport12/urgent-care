import { API_BASE_URL } from '@/api/client';

/** Нормативные документы. Файлы (PDF) загружаются в конструкторе,
 *  ключи совпадают с backend/app/api/v1/legal.py. */
export const LEGAL_DOCUMENTS = [
  { id: 'offer', title: 'Пользовательское соглашение (оферта)' },
  { id: 'pdn', title: 'Политика обработки персональных данных' },
  { id: 'consent', title: 'Согласие на обработку персональных данных' },
  { id: 'cookies', title: 'Правила использования cookie' },
] as const;

export type LegalDocId = (typeof LEGAL_DOCUMENTS)[number]['id'];

export const legalDocTitle = (id: string): string =>
  LEGAL_DOCUMENTS.find((d) => d.id === id)?.title ?? id;

/** Публичный URL файла (без авторизации — документы доступны до регистрации). */
export const legalDocFileUrl = (id: LegalDocId): string =>
  `${API_BASE_URL}/api/v1/legal/documents/${id}/file`;
