import type { AppTestAccessablityCondition, AppTestAccessablityLogicalOperator } from '@/hooks/api/types';

/** Состояние попытки другого теста, нужное для условий активации. */
export type TestOutcomeSnapshot = {
  passed: boolean | null | undefined;
  totalScore: number;
};

export type TestActivationContext = {
  /** Прочитана ли статья (из статистики чтения). */
  isArticleRead: (articleId: string) => boolean;
  /** Итог последней попытки теста или null, если попыток не было. */
  getTestOutcome: (testId: string) => TestOutcomeSnapshot | null;
};

function evaluateCondition(
  condition: AppTestAccessablityCondition,
  ctx: TestActivationContext,
): boolean {
  if (condition.type === 'article') {
    // isReaded undefined трактуется как «непрочитанная» — так же показывает конструктор
    return ctx.isArticleRead(condition.articleId) === (condition.isReaded ?? false);
  }
  const outcome = ctx.getTestOutcome(condition.testId);
  if (condition.data.type === 'succedded') {
    return outcome != null && outcome.passed === condition.data.success;
  }
  // 'score': «должен иметь не менее N баллов»
  return outcome != null && outcome.totalScore >= condition.data.score;
}

/**
 * Правила активации теста (accessabilityConditions из конструктора).
 * Условия соединяются оператором каждого следующего элемента с предыдущими
 * («и» по умолчанию): c0 op1 c1 op2 c2...
 */
export function areTestActivationConditionsMet(
  conditions: AppTestAccessablityCondition[] | null | undefined,
  ctx: TestActivationContext,
): boolean {
  if (!conditions || conditions.length === 0) return true;
  let result = evaluateCondition(conditions[0], ctx);
  for (let i = 1; i < conditions.length; i++) {
    // Значения enum сравниваем строкой ('and' | 'or'): import type стирается при компиляции
    const op: string = conditions[i].logicalOperator ?? 'and';
    const value = evaluateCondition(conditions[i], ctx);
    result = op === 'and' ? result && value : result || value;
  }
  return result;
}
