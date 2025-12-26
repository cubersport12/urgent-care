/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';
import { BaseStorage } from './base-storage';
import { RescueStoryVm, rescueStorySchema, NullableValue } from '@/core/utils';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppRescueStoriesStorageService extends BaseStorage {
  protected override _getTableName(): string {
    return 'rescue_stories';
  }

  public fetchAllRescueStories(): Observable<RescueStoryVm[]> {
    return this._fetch<RescueStoryVm>(rescueStorySchema as any);
  }

  public fetchRescueStories(rescueId: NullableValue<string>): Observable<RescueStoryVm[]> {
    return this._fetch<RescueStoryVm>(rescueStorySchema as any, ref => rescueId?.length ? ref.filter('rescueId', 'eq', rescueId) : ref);
  }

  public createRescueStory(rescueStory: RescueStoryVm): Observable<void> {
    return this._add(rescueStory);
  }

  public updateRescueStory(rescueStory: RescueStoryVm): Observable<void> {
    return this._update(rescueStory);
  }

  public deleteRescueStory(rescueStoryId: string): Observable<void> {
    return this._delete(rescueStoryId);
  }
}
