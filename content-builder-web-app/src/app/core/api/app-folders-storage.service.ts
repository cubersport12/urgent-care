import { inject, Injectable } from '@angular/core';
import { from, map, Observable, skip, take } from 'rxjs';
import { AppFolderVm, folderSchema, NullableValue } from '@/core/utils';
import { AngularFirestore } from '@angular/fire/compat/firestore';

const TABLE_NAME = 'folders';

@Injectable({
  providedIn: 'root'
})
export class AppFoldersStorageService {
  private readonly _firestore = inject(AngularFirestore);

  public createFolder(folder: AppFolderVm): Observable<void> {
    return from(this._firestore.collection(TABLE_NAME).add(folder)) as unknown as Observable<void>;
  }

  public deleteFolder(folderId: string): Observable<void> {
    return this._firestore.collection(TABLE_NAME).doc(folderId).delete() as unknown as Observable<void>;
  }

  public fetchFolders(parentId?: NullableValue<string>): Observable<AppFolderVm[]> {
    return this._firestore.collection(TABLE_NAME, ref => ref.where('parentId', '==', parentId))
      .snapshotChanges()
      .pipe(take(1))
      .pipe(map(actions => actions.map(action => folderSchema.parse({
        id: action.payload.doc.get('id'),
        name: action.payload.doc.get('name'),
        parentId: action.payload.doc.get('parentId')
      }))));
  }
}
