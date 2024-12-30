import { inject, Injectable } from '@angular/core';
import { from, map, Observable, take, throwError } from 'rxjs';
import { AppFolderVm, folderSchema, NullableValue } from '@/core/utils';
import { AngularFirestore } from '@angular/fire/compat/firestore';

const TABLE_NAME = 'folders';

@Injectable({
  providedIn: 'root'
})
export class AppFoldersStorageService {
  private readonly _refs = new Map<string, string>(); // folderId - firestore document id
  private readonly _firestore = inject(AngularFirestore);

  public createFolder(folder: AppFolderVm): Observable<void> {
    return new Observable((observer) => {
      void this._firestore.collection(TABLE_NAME).add(folder).then((ref) => {
        this._refs.set(folder.id, ref.id);
        observer.next();
        observer.complete();
      });
    });
  }

  public updateFolder(folder: AppFolderVm): Observable<void> {
    const docId = this._refs.get(folder.id);
    if (docId == null) {
      return throwError(() => new Error('Folder not found'));
    }
    return from(this._firestore.collection(TABLE_NAME).doc(docId).update(folder)) as unknown as Observable<void>;
  }

  public deleteFolder(folderId: string): Observable<void> {
    const docId = this._refs.get(folderId);
    if (docId == null) {
      return throwError(() => new Error('Folder not found'));
    }
    return from(this._firestore.collection(TABLE_NAME).doc(docId).delete()) as unknown as Observable<void>;
  }

  public fetchFolders(parentId?: NullableValue<string>): Observable<AppFolderVm[]> {
    return this._firestore.collection(TABLE_NAME, ref => ref.where('parentId', '==', parentId))
      .snapshotChanges()
      .pipe(take(1))
      .pipe(map(actions => actions.map((action) => {
        const folderId = action.payload.doc.get('id');
        this._refs.set(folderId, action.payload.doc.ref.id);
        return folderSchema.parse({
          id: folderId,
          name: action.payload.doc.get('name'),
          parentId: action.payload.doc.get('parentId')
        });
      })));
  }
}
