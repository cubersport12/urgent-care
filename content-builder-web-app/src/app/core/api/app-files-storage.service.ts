import { inject, Injectable } from '@angular/core';
import { AppSupabase } from '@/core/utils';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppFilesStorageService {
  private readonly _api = inject(AppSupabase);

  public uploadFile(fileName: string, blob: Blob): Observable<string> {
    return new Observable((obs) => {
      void this._api
        .uploadFile(fileName, blob)
        .then((path) => {
          obs.next(path);
          obs.complete();
        })
        .catch((err: unknown) => obs.error(err));
    });
  }

  public deleteFile(fileName: string): Observable<void> {
    return new Observable((obs) => {
      void this._api
        .deleteFile(fileName)
        .then(() => {
          obs.next();
          obs.complete();
        })
        .catch((err: unknown) => obs.error(err));
    });
  }

  public downloadFile(fileName: string): Observable<Blob> {
    return new Observable((obs) => {
      void this._api
        .downloadFile(fileName)
        .then((data) => {
          obs.next(data);
          obs.complete();
        })
        .catch((err: unknown) => obs.error(err));
    });
  }
}
