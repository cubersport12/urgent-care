/**
 * Последовательность внутри папки (флаги «Последовательность и ограничения»
 * из конструктора): элемент открывается, когда выполнен ближайший предыдущий
 * «шаг» цепочки — статья «Учитывать в статистике прогресса» прочитана или
 * тест пройден. Папки и режимы спасения для цепочки прозрачны, статьи без
 * включения в статистику пропускаются.
 *
 * Тест с настроенными правилами активации (accessabilityConditions) живёт по
 * своим правилам и общую цепочку не блокирует.
 */

export type SequenceItem = {
  type: 'folder' | 'article' | 'test' | 'rescue';
  id: string;
  /** Для статей: «Учитывать в статистике прогресса». */
  includeToStatistics?: boolean | null;
  /** Для тестов: есть ли настроенные правила активации. */
  hasActivationConditions?: boolean;
};

export type SequenceContext = {
  /** Статья прочитана (статистика чтения). */
  isArticleRead: (articleId: string) => boolean;
  /** Последняя попытка теста пройдена. */
  isTestPassed: (testId: string) => boolean;
};

export function isSequenceBlocked(
  items: SequenceItem[],
  itemIndex: number,
  ctx: SequenceContext,
): boolean {
  for (let i = itemIndex - 1; i >= 0; i--) {
    const prev = items[i];
    if (!prev) continue;
    if (prev.type === 'folder' || prev.type === 'rescue') continue;
    if (prev.type === 'article') {
      if (!prev.includeToStatistics) continue;
      return !ctx.isArticleRead(prev.id);
    }
    // test
    if (prev.hasActivationConditions) continue;
    return !ctx.isTestPassed(prev.id);
  }
  return false;
}
