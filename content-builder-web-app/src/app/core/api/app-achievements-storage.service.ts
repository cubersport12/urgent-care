import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import {
  achievementsCreateAchievement,
  achievementsDeleteAchievement,
  achievementsListAchievementsAdmin,
  achievementsUpdateAchievement
} from '@/core/api/generated/sdk.gen';
import type {
  AchievementCreate,
  AchievementOut,
  AchievementUpdate
} from '@/core/api/generated/types.gen';
import { apiCall } from './api-utils';

@Injectable({ providedIn: 'root' })
export class AppAchievementsStorageService {
  public listAll(): Observable<AchievementOut[]> {
    return from(apiCall(() => achievementsListAchievementsAdmin())).pipe(map((x) => x ?? []));
  }

  public create(body: AchievementCreate): Observable<AchievementOut> {
    return from(apiCall(() => achievementsCreateAchievement({ body })));
  }

  public update(id: string, body: AchievementUpdate): Observable<AchievementOut> {
    return from(
      apiCall(() => achievementsUpdateAchievement({ path: { achievement_id: id }, body }))
    );
  }

  public delete(id: string): Observable<void> {
    return from(
      apiCall(() => achievementsDeleteAchievement({ path: { achievement_id: id } }))
    ).pipe(map(() => undefined));
  }
}
