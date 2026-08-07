import { apiFetch } from '@/lib/api';

export type LearningEntityType = 'article' | 'test' | 'rescue';
export type LearningEventName = 'opened' | 'progress' | 'completed' | 'started' | 'finished';

export async function recordLearningEvent(input: {
  entityType: LearningEntityType;
  entityId: string;
  event: LearningEventName;
  payload?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await apiFetch('/api/v1/learning-events', {
      method: 'POST',
      body: JSON.stringify({
        entityType: input.entityType,
        entityId: input.entityId,
        event: input.event,
        payload: input.payload ?? null,
      }),
    });
  } catch {
    // Analytics must not block UX
  }
}
