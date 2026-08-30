/** Training (work on mistakes) API facade. */
import { trainingTestRecommendations, trainingTrainingMe } from '@/api/generated/sdk.gen';
import type { RecommendedArticleOut, TrainingTopicOut } from '@/api/generated/types.gen';
import { apiCall } from '@/api/utils';

export type TrainingTopic = TrainingTopicOut;
export type RecommendedArticle = RecommendedArticleOut;

export const trainingApi = {
  listMine: (): Promise<TrainingTopic[]> => apiCall(() => trainingTrainingMe()),

  /** Документы для прочтения после теста — подбор по смыслу (embeddings). */
  testRecommendations: (
    testId: string,
    wrongQuestionIds?: string[],
  ): Promise<RecommendedArticle[]> =>
    apiCall(() =>
      trainingTestRecommendations({
        body: { testId, wrongQuestionIds: wrongQuestionIds?.length ? wrongQuestionIds : undefined },
      }),
    ),
};
