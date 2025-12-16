import { TestAnswer } from '@/contexts/test-context';
import { supabase } from '@/supabase';
import { PostgrestResponse } from '@supabase/supabase-js';

export type TestResult = {
  id?: string;
  testId: string;
  totalScore: number;
  totalErrors: number;
  isPassed: boolean;
  answers: TestAnswer[];
  completedAt?: string;
};

const RELATION_NAME = 'test_results';

export const saveTestResult = async (result: TestResult): Promise<PostgrestResponse<TestResult>> => {
  const dataToInsert = {
    testId: result.testId,
    totalScore: result.totalScore,
    totalErrors: result.totalErrors,
    isPassed: result.isPassed,
    answers: JSON.stringify(result.answers),
    completedAt: new Date().toISOString(),
  };

  const response = await supabase
    .from(RELATION_NAME)
    .insert(dataToInsert)
    .select();

  return response as PostgrestResponse<TestResult>;
};

export const getTestResults = async (testId?: string): Promise<PostgrestResponse<TestResult[]>> => {
  let query = supabase.from(RELATION_NAME).select('*');
  
  if (testId) {
    query = query.eq('testId', testId);
  }

  const response = await query.order('completedAt', { ascending: false });
  return response as PostgrestResponse<TestResult[]>;
};
