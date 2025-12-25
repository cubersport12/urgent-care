/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';
import { BaseStorage } from './base-storage';
import { RescueLibraryItemVm, NullableValue, rescueLibraryItemSchema } from '@/core/utils';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppRescueLibraryStorageService extends BaseStorage {
  protected override _getTableName(): string {
    return 'rescue_library';
  }

  public fetchAllRescueLibraryItems(): Observable<RescueLibraryItemVm[]> {
    return this._fetch<RescueLibraryItemVm>(rescueLibraryItemSchema as any);
  }

  public fetchRescueLibraryItems(parentId: NullableValue<string>): Observable<RescueLibraryItemVm[]> {
    return this._fetch<RescueLibraryItemVm>(rescueLibraryItemSchema as any, ref => parentId?.length ? ref.filter('parentId', 'eq', parentId) : ref.filter('parentId', 'is', null));
  }

  public createRescueLibraryItem(rescueLibraryItem: RescueLibraryItemVm): Observable<void> {
    return this._add(rescueLibraryItem);
  }

  public updateRescueLibraryItem(rescueLibraryItem: RescueLibraryItemVm): Observable<void> {
    return this._update(rescueLibraryItem);
  }

  public deleteRescueLibraryItem(rescueLibraryItemId: string): Observable<void> {
    return this._delete(rescueLibraryItemId);
  }
}
