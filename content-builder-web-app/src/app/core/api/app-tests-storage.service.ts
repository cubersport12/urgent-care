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
    return this._fetch<AppTestVm>(testSchema, () => ({ all: true }));
  }

  public fetchTests(parentId: NullableValue<string>): Observable<AppTestVm[]> {
    return this._fetch<AppTestVm>(testSchema, () =>
      parentId?.length ? { parentId } : { parentId: null }
    );
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
