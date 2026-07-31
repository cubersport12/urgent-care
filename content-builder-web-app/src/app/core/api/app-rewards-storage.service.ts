import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import {
  achievementsCreateReward,
  achievementsDeleteReward,
  achievementsListRewardsAdmin,
  achievementsUpdateReward
} from '@/core/api/generated/sdk.gen';
import type { RewardCreate, RewardOut, RewardUpdate } from '@/core/api/generated/types.gen';
import { apiCall } from './api-utils';

@Injectable({ providedIn: 'root' })
export class AppRewardsStorageService {
  public listAll(): Observable<RewardOut[]> {
    return from(apiCall(() => achievementsListRewardsAdmin())).pipe(map((x) => x ?? []));
  }

  public create(body: RewardCreate): Observable<RewardOut> {
    return from(apiCall(() => achievementsCreateReward({ body })));
  }

  public update(id: string, body: RewardUpdate): Observable<RewardOut> {
    return from(apiCall(() => achievementsUpdateReward({ path: { reward_id: id }, body })));
  }

  public delete(id: string): Observable<void> {
    return from(apiCall(() => achievementsDeleteReward({ path: { reward_id: id } }))).pipe(
      map(() => undefined)
    );
  }
}
