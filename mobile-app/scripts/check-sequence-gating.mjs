/**
 * Самопроверка последовательности папки (isSequenceBlocked).
 * Запуск: node scripts/check-sequence-gating.mjs
 */
import { isSequenceBlocked } from '../lib/sequence-gating.ts';

const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
};

const art = (id, includeToStatistics = true) => ({ type: 'article', id, includeToStatistics });
const test = (id, hasActivationConditions = false) => ({ type: 'test', id, hasActivationConditions });
const folder = (id) => ({ type: 'folder', id });
const rescue = (id) => ({ type: 'rescue', id });

// Чейн как в жалобе: документы → зачёт (тест) → следующий тест → документ.
// Прочитан только a1; тесты не сдавались.
const noPass = { isArticleRead: (id) => id === 'a1', isTestPassed: () => false };
const items = [
  art('a1'),   // 0 — прочитана
  art('a2'),   // 1 — не прочитана
  test('exam'),// 2 — зачёт
  test('t2'),  // 3 — следующий тестовый файл
  art('a3'),   // 4 — после тестов
];

assert(!isSequenceBlocked(items, 0, noPass), 'первый элемент открыт');
assert(!isSequenceBlocked(items, 1, noPass), 'a2 открыта: a1 прочитана');
assert(isSequenceBlocked(items, 2, noPass), 'зачёт закрыт: a2 не прочитана');
assert(
  !isSequenceBlocked(items, 3, { ...noPass, isTestPassed: (id) => id === 'exam' }),
  'после сдачи зачёта следующий тестовый файл открыт',
);
assert(
  isSequenceBlocked(items, 3, noPass),
  'следующий тестовый файл закрыт, пока зачёт не сдан (раньше тесты пропускались)',
);
assert(
  !isSequenceBlocked(items, 4, { ...noPass, isTestPassed: () => true }),
  'документ после тестов открыт, когда предыдущий тест сдан',
);
assert(
  isSequenceBlocked(items, 4, { ...noPass, isTestPassed: (id) => id === 'exam' }),
  'документ после двух тестов ждёт сдачи ближайшего (t2)',
);

// Тест со своими правилами активации прозрачен для цепочки:
// файл после него ждёт предыдущий шаг, а не этот тест
const withConds = [art('a1'), test('tX', true), art('a2')];
assert(
  !isSequenceBlocked(withConds, 2, { isArticleRead: () => true, isTestPassed: () => false }),
  'тест с условиями не блокирует: a2 ждёт прочитанную a1',
);

// Статьи не из статистики пропускаются, папки/спасения прозрачны:
// walk от a2 доходит до a1 и ждёт именно её
const mixed = [art('a1'), art('a0', false), rescue('r1'), folder('f1'), art('a2')];
assert(
  isSequenceBlocked(mixed, 4, { isArticleRead: () => false, isTestPassed: () => true }),
  'a2 ждёт a1: не-статистическая статья, спасение и папка прозрачны',
);
assert(
  !isSequenceBlocked(mixed, 4, { isArticleRead: (id) => id === 'a1', isTestPassed: () => true }),
  'a2 открыта, когда a1 прочитана',
);

console.log('OK: sequence gating');
