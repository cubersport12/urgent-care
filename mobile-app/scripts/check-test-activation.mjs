/**
 * Самопроверка правил активации теста (areTestActivationConditionsMet).
 * Запуск: node scripts/check-test-activation.mjs
 */
import { areTestActivationConditionsMet } from '../lib/test-activation.ts';

const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
};

const And = 'and';
const Or = 'or';

const ctx = {
  isArticleRead: (id) => id === 'a1',
  getTestOutcome: (id) => (id === 't1' ? { passed: true, totalScore: 7 } : null),
};

// Статья прочитана → тест активен
assert(
  areTestActivationConditionsMet(
    [{ type: 'article', articleId: 'a1', isReaded: true }],
    ctx,
  ),
  'прочитанная статья активирует тест',
);

// Статья НЕ прочитана → тест неактивен (сценарий из багрепорта)
assert(
  !areTestActivationConditionsMet(
    [{ type: 'article', articleId: 'a2', isReaded: true }],
    ctx,
  ),
  'непрочитанная статья: тест неактивен',
);

// «должна быть непрочитанной», статья прочитана → неактивен
assert(
  !areTestActivationConditionsMet(
    [{ type: 'article', articleId: 'a1', isReaded: false }],
    ctx,
  ),
  'условие «непрочитана» при прочитанной статье',
);

// isReaded не задан — трактуется как «непрочитанная»
assert(
  areTestActivationConditionsMet([{ type: 'article', articleId: 'a2' }], ctx),
  'isReaded undefined = непрочитанная',
);

// И: обе выполнены → активен; одна нет → неактивен
assert(
  areTestActivationConditionsMet(
    [
      { type: 'article', articleId: 'a1', isReaded: true },
      { type: 'test', testId: 't1', logicalOperator: And, data: { type: 'succedded', success: true } },
    ],
    ctx,
  ),
  'И из выполненных условий',
);
assert(
  !areTestActivationConditionsMet(
    [
      { type: 'article', articleId: 'a1', isReaded: true },
      { type: 'article', articleId: 'a2', logicalOperator: And, isReaded: true },
    ],
    ctx,
  ),
  'И с невыполненным условием',
);

// ИЛИ: достаточно одного выполненного
assert(
  areTestActivationConditionsMet(
    [
      { type: 'article', articleId: 'a2', isReaded: true },
      { type: 'article', articleId: 'a1', logicalOperator: Or, isReaded: true },
    ],
    ctx,
  ),
  'ИЛИ: второй выполнен',
);

// Пустых правил нет → тест всегда активен
assert(areTestActivationConditionsMet([], ctx), 'нет правил → активен');
assert(areTestActivationConditionsMet(null, ctx), 'null правил → активен');

// Условия по тесту: succedded / score / нет попытки
assert(
  areTestActivationConditionsMet(
    [{ type: 'test', testId: 't1', data: { type: 'score', score: 7 } }],
    ctx,
  ),
  'score >= 7',
);
assert(
  !areTestActivationConditionsMet(
    [{ type: 'test', testId: 't1', data: { type: 'score', score: 8 } }],
    ctx,
  ),
  'score < 8',
);
assert(
  areTestActivationConditionsMet(
    [{ type: 'test', testId: 't1', data: { type: 'succedded', success: true } }],
    ctx,
  ),
  'тест t1 успешен',
);
assert(
  !areTestActivationConditionsMet(
    [{ type: 'test', testId: 't2', data: { type: 'succedded', success: true } }],
    ctx,
  ),
  'нет попытки теста t2 → условие не выполнено',
);

console.log('OK: все сценарии areTestActivationConditionsMet прошли');
