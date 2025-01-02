import { inject } from '@angular/core';
import { AngularFirestore, QueryDocumentSnapshot, QueryFn } from '@angular/fire/compat/firestore';
import { from, map, Observable, take, throwError } from 'rxjs';

export abstract class BaseFirebaseStorage {
  private readonly _refs = new Map<string, string>(); // folderId - firestore document id
  private readonly _firestore = inject(AngularFirestore);

  protected abstract _getTableName(): string;

  protected _add<T extends { id: string }>(what: T): Observable<void> {
    return new Observable((observer) => {
      void this._firestore.collection(this._getTableName()).add(what).then((ref) => {
        this._refs.set(what.id, ref.id);
        observer.next();
        observer.complete();
      });
    });
  }

  protected _update<T extends { id: string }>(what: T): Observable<void> {
    const docId = this._refs.get(what.id);
    if (docId == null) {
      return throwError(() => new Error('Folder not found'));
    }
    return new Observable((observer) => {
      void this._firestore.collection(this._getTableName()).doc(docId).update(what).then(() => {
        observer.next();
        observer.complete();
      });
    });
  }

  protected _delete(id: string): Observable<void> {
    const docId = this._refs.get(id);
    if (docId == null) {
      return throwError(() => new Error('Folder not found'));
    }
    return from(this._firestore.collection(this._getTableName()).doc(docId).delete()) as unknown as Observable<void>;
  }

  protected _fetch<T>(mapper: (doc: QueryDocumentSnapshot<unknown>) => T, query?: QueryFn): Observable<T[]> {
    return this._firestore.collection(this._getTableName(), query)
      .snapshotChanges()
      .pipe(take(1))
      .pipe(map(actions => actions.map((action) => {
        const id = action.payload.doc.get('id');
        this._refs.set(id, action.payload.doc.ref.id);
        return mapper(action.payload.doc);
      })));
  }
}
