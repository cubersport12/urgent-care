import { API_BASE_URL, authFetch } from '@/api/client';
import type { TestAnswer } from '@/contexts/test-context';
import type { AppTestQuestionVm } from '@/hooks/api/types';
import { getSessionId } from '@/lib/auth-storage';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type TrainingHistory = {
  id: string;
  difficulty: Difficulty;
  completedAt: string;
  correct: number;
  total: number;
  items: { testName?: string; question: AppTestQuestionVm | null; answer?: { answerIds: number[]; isCorrect: boolean } }[];
};
export type TrainingEvent =
  | { type: 'progress'; count: number; total: number; testName: string }
  | { type: 'ready'; id: string; questions: AppTestQuestionVm[] }
  | { type: 'insufficient'; available: number }
  | { type: 'error'; message: string };

export function openTrainingSocket(difficulty: Difficulty): WebSocket {
  const session = getSessionId();
  if (!session) throw new Error('Сессия истекла');
  return new WebSocket(`${API_BASE_URL.replace(/^http/, 'ws')}/api/v1/training/random/ws?session_id=${encodeURIComponent(session)}&difficulty=${difficulty}`);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await authFetch(`${API_BASE_URL}/api/v1/training/random${path}`, init);
  if (!response.ok) throw new Error('Не удалось связаться с сервером');
  return response.json() as Promise<T>;
}

export const randomTrainingHistory = () => request<TrainingHistory[]>('/history');
export const completeRandomTraining = (id: string, answers: TestAnswer[]) => request<{ id: string }>(`/${encodeURIComponent(id)}/complete`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ answers: answers.map((answer) => ({ questionId: answer.questionId, answerIds: answer.answerIds.map(Number) })) }),
});
