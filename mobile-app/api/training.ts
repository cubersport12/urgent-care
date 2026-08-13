/** Training (work on mistakes) API facade. */
import { trainingTrainingMe } from '@/api/generated/sdk.gen';
import type { TrainingTopicOut } from '@/api/generated/types.gen';
import { apiCall } from '@/api/utils';

export type TrainingTopic = TrainingTopicOut;

export const trainingApi = {
  listMine: (): Promise<TrainingTopic[]> => apiCall(() => trainingTrainingMe()),
};
