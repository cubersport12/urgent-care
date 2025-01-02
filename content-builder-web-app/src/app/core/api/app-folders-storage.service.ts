import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AppFolderVm, folderSchema, NullableValue } from '@/core/utils';
import { BaseFirebaseStorage } from './base-storage';

@Injectable({
  providedIn: 'root'
})
export class AppFoldersStorageService extends BaseFirebaseStorage {
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

  public fetchFolders(parentId?: NullableValue<string>): Observable<AppFolderVm[]> {
    return this._fetch(doc => folderSchema.parse({
      id: doc.get('id'),
      name: doc.get('name'),
      parentId: doc.get('parentId')
    }), ref => ref.where('parentId', '==', parentId));
  }
}
