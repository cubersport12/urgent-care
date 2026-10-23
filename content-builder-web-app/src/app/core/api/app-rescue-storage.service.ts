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
    return this._fetch<AppRescueItemVm>(rescueItemSchema, () => ({ all: true }));
  }

  public fetchRescueItems(parentId: NullableValue<string>): Observable<AppRescueItemVm[]> {
    return this._fetch<AppRescueItemVm>(rescueItemSchema, () =>
      parentId?.length ? { parentId } : { parentId: null }
    );
  }

  public createRescueItem(rescueItem: AppRescueItemVm, force = false): Observable<void> {
    if (!force) return this._add(rescueItem);
    return this._forceCall(() => this._api.create('rescue', rescueItem, { force: true }));
  }

  public updateRescueItem(rescueItem: AppRescueItemVm, force = false): Observable<void> {
    if (!force) return this._update(rescueItem);
    return this._forceCall(() => this._api.update('rescue', rescueItem.id, rescueItem, { force: true }));
  }

  /** Сохранение с force: тот же контракт, что у _add/_update, но с query-параметром */
  private _forceCall(op: () => Promise<unknown>): Observable<void> {
    return new Observable((obs) => {
      void op()
        .then(() => {
          obs.next();
          obs.complete();
        })
        .catch((err: unknown) => obs.error(err));
    });
  }

  public deleteRescueItem(rescueItemId: string): Observable<void> {
    return this._delete(rescueItemId);
  }
}
