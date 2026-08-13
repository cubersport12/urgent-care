import { statsCreateTestResult } from '@/api/generated/sdk.gen';
import { apiCall } from '@/api/utils';
import { TestAnswer } from '@/contexts/test-context';
import { apiGetList } from '@/lib/api';

export type TestResult = {
  id?: string;
  testId: string;
  totalScore: number;
  totalErrors: number;
  isPassed: boolean;
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
  onStats?: (patch: {
    completedAt: string;
    passed: boolean;
    data: { answers: TestAnswer[] };
  }) => Promise<unknown>;
}): Promise<void> {
  const key = `${params.testId}:${params.answers.map((a) => `${a.questionId}:${a.isCorrect}`).join('|')}`;
  if (_persistedKey === key) return;
  _persistedKey = key;
  const totalScore = params.answers.reduce((sum, a) => sum + a.score, 0);
  const totalErrors = params.answers.filter((a) => !a.isCorrect).length;
  const isPassed =
    (params.minScore == null || totalScore >= params.minScore) &&
    (params.maxErrors == null || totalErrors <= params.maxErrors);
  try {
    await saveTestResult({
      testId: params.testId,
      totalScore,
      totalErrors,
      isPassed,
      answers: params.answers,
    });
    await params.onStats?.({
      completedAt: new Date().toISOString(),
      passed: isPassed,
      data: { answers: params.answers },
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
