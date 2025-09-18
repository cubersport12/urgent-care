import { Injectable } from '@angular/core';
import { BaseStorage } from './base-storage';
import { AppTestVm, NullableValue, testSchema } from '@/core/utils';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppTestsStorageService extends BaseStorage {
  protected override _getTableName(): string {
    return 'tests';
  }

  public fetchAllTests(): Observable<AppTestVm[]> {
    return this._fetch<AppTestVm>(testSchema);
  }

  public fetchTests(parentId: NullableValue<string>): Observable<AppTestVm[]> {
    return this._fetch<AppTestVm>(testSchema, ref => parentId?.length ? ref.filter('parentId', 'eq', parentId) : ref.filter('parentId', 'is', null));
  }

  public createTest(test: AppTestVm): Observable<void> {
    return this._add(test);
  }

  public updateTest(test: AppTestVm): Observable<void> {
    return this._update(test);
  }

  public deleteTest(testId: string): Observable<void> {
    return this._delete(testId);
  }
}
