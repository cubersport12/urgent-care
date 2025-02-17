import { Injectable } from '@angular/core';
import { mergeMap, Observable, of } from 'rxjs';
import { AppFolderVm, folderSchema, NullableValue } from '@/core/utils';
import { BaseStorage } from './base-storage';

@Injectable({
  providedIn: 'root'
})
export class AppFoldersStorageService extends BaseStorage {
  protected override _getTableName(): string {
    return 'folders';
  }

  public createFolder(folder: AppFolderVm): Observable<void> {
    return this._add(folder);
  }

  public updateFolder(folder: AppFolderVm): Observable<void> {
    return this._update(folder);
  }

  public deleteFolder(folderId: string): Observable<void> {
    return this._delete(folderId);
  }

  public fetchPath(folderId: string): Observable<AppFolderVm[]> {
    return new Observable((obs) => {
      const array: AppFolderVm[] = [];
      const fetchFolder = (id: string): Observable<AppFolderVm[]> => {
        const obs = this._fetch(folderSchema, ref => ref.filter('id', 'eq', id)) satisfies Observable<AppFolderVm[]>;
        return obs.pipe(mergeMap((folders) => {
          const f = folders[0];
          if (f != null) {
            array.push(f);
          }
          return f != null ? fetchFolder(f.parentId ?? '') : of([]);
        }));
      };
      fetchFolder(folderId)
        .subscribe(() => {
          obs.next(array.reverse());
          obs.complete();
        });
    });
  }

  public fetchFolders(parentId?: NullableValue<string>): Observable<AppFolderVm[]> {
    return this._fetch(folderSchema, ref => parentId?.length ? ref.filter('parentId', 'eq', parentId) : ref.filter('parentId', 'is', null));
  }
}
