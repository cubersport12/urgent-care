import { TestAnswer } from '@/contexts/test-context';
import { apiFetch, apiGetList } from '@/lib/api';

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
  try {
    const data = await apiFetch<TestResult>('/api/v1/test-results', {
      method: 'POST',
      body: JSON.stringify({
        testId: result.testId,
        totalScore: result.totalScore,
        totalErrors: result.totalErrors,
        isPassed: result.isPassed,
        answers: result.answers,
        completedAt: new Date().toISOString(),
      }),
    });
    return { data: [data], error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
};

export const getTestResults = async (testId?: string) => {
  const qs = testId ? `?testId=${encodeURIComponent(testId)}` : '';
  return apiGetList<TestResult>(`/api/v1/test-results${qs}`);
};
