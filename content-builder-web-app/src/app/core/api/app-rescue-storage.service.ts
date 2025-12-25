import { Injectable } from '@angular/core';
import { BaseStorage } from './base-storage';
import { AppRescueItemVm, NullableValue, rescueItemSchema } from '@/core/utils';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppRescueStorageService extends BaseStorage {
  protected override _getTableName(): string {
    return 'rescue';
  }

  public fetchAllRescueItems(): Observable<AppRescueItemVm[]> {
    return this._fetch<AppRescueItemVm>(rescueItemSchema);
  }

  public fetchRescueItems(parentId: NullableValue<string>): Observable<AppRescueItemVm[]> {
    return this._fetch<AppRescueItemVm>(rescueItemSchema, ref => parentId?.length ? ref.filter('parentId', 'eq', parentId) : ref.filter('parentId', 'is', null));
  }

  public createRescueItem(rescueItem: AppRescueItemVm): Observable<void> {
    return this._add(rescueItem);
  }

  public updateRescueItem(rescueItem: AppRescueItemVm): Observable<void> {
    return this._update(rescueItem);
  }

  public deleteRescueItem(rescueItemId: string): Observable<void> {
    return this._delete(rescueItemId);
  }
}
