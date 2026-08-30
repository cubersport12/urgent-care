import type { TestAnswer, TestFinishReason } from '@/contexts/test-context';

export type TestCompletionType = 'full' | 'early' | 'maxErrors';

export type TestOutcome = {
  totalScore: number;
  totalErrors: number;
  allAnswered: boolean;
  isPassed: boolean;
  completionType: TestCompletionType;
};

/**
 * Единая точка расчёта итога теста.
 * Пройден = отвечены ВСЕ вопросы И (балл >= minScore) И (ошибок <= maxErrors).
 * Неотвеченные вопросы (answerIds пуст) засчитаны как ошибочные processSkippedQuestions.
 */
export function computeTestOutcome(params: {
  answers: TestAnswer[];
  minScore?: number | null;
  maxErrors?: number | null;
  finishReason?: TestFinishReason;
}): TestOutcome {
  const totalScore = params.answers.reduce((sum, a) => sum + a.score, 0);
  const totalErrors = params.answers.filter((a) => !a.isCorrect).length;
  const allAnswered =
    params.answers.length > 0 && params.answers.every((a) => a.answerIds.length > 0);
  const completionType: TestCompletionType =
    params.finishReason === 'autoMaxErrors' ? 'maxErrors' : allAnswered ? 'full' : 'early';
  const withinMaxErrors =
    params.maxErrors == null || totalErrors <= params.maxErrors;
  const isPassed =
    allAnswered &&
    (params.minScore == null || totalScore >= params.minScore) &&
    withinMaxErrors;
  return { totalScore, totalErrors, allAnswered, isPassed, completionType };
}
