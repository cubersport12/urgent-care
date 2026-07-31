/** Achievements / rewards API facade. */
import {
  achievementsListAchievementsMe,
  achievementsListRewardsMe,
} from '@/api/generated/sdk.gen';
import type { AchievementMeOut, RewardMeOut } from '@/api/generated/types.gen';
import { apiCall } from '@/api/utils';

export type AchievementMe = AchievementMeOut;
export type RewardMe = RewardMeOut;

export const achievementsApi = {
  listMine: (): Promise<AchievementMe[]> =>
    apiCall(() => achievementsListAchievementsMe()),

  listRewardsMine: (): Promise<RewardMe[]> =>
    apiCall(() => achievementsListRewardsMe()),
};
