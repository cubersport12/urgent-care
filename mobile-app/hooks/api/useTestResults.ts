import { statsCreateTestResult } from '@/api/generated/sdk.gen';
import { apiCall } from '@/api/utils';
import { TestAnswer, TestFinishReason } from '@/contexts/test-context';
import { computeTestOutcome } from '@/lib/test-outcome';
import type { TestCompletionType } from '@/lib/test-outcome';
import { apiGetList } from '@/lib/api';

export type { TestCompletionType, TestOutcome } from '@/lib/test-outcome';
export { computeTestOutcome } from '@/lib/test-outcome';

export type TestResult = {
  id?: string;
  testId: string;
  totalScore: number;
  totalErrors: number;
  isPassed: boolean;
  completionType?: TestCompletionType | null;
  answers: TestAnswer[];
  completedAt?: string;
};

export const saveTestResult = async (result: TestResult) => {
  return apiCall(() =>
    statsCreateTestResult({
      body: {
        testId: result.testId,
        totalScore: result.totalScore,
        totalErrors: result.totalErrors,
        isPassed: result.isPassed,
        completionType: result.completionType ?? null,
        answers: result.answers,
        completedAt: new Date().toISOString(),
      },
    }),
  );
};

let _persistedKey: string | null = null;

export function resetTestCompletionGuard(): void {
  _persistedKey = null;
}

export async function persistTestCompletion(params: {
  testId: string;
  minScore?: number | null;
  maxErrors?: number | null;
  answers: TestAnswer[];
  finishReason?: TestFinishReason;
  onStats?: (patch: {
    completedAt: string;
    passed: boolean;
    data: { answers: TestAnswer[]; completionType: TestCompletionType };
  }) => Promise<unknown>;
}): Promise<void> {
  const key = `${params.testId}:${params.answers.map((a) => `${a.questionId}:${a.isCorrect}`).join('|')}`;
  if (_persistedKey === key) return;
  _persistedKey = key;
  const outcome = computeTestOutcome({
    answers: params.answers,
    minScore: params.minScore,
    maxErrors: params.maxErrors,
    finishReason: params.finishReason,
  });
  try {
    await saveTestResult({
      testId: params.testId,
      totalScore: outcome.totalScore,
      totalErrors: outcome.totalErrors,
      isPassed: outcome.isPassed,
      completionType: outcome.completionType,
      answers: params.answers,
    });
    await params.onStats?.({
      completedAt: new Date().toISOString(),
      passed: outcome.isPassed,
      data: { answers: params.answers, completionType: outcome.completionType },
    });
  } catch (e) {
    _persistedKey = null;
    throw e;
  }
}

export const getTestResults = async (testId?: string) => {
  const qs = testId ? `?testId=${encodeURIComponent(testId)}` : '';
  return apiGetList<TestResult>(`/api/v1/test-results${qs}`);
};
