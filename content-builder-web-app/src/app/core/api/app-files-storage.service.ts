import { inject, Injectable } from '@angular/core';
import { AppSupabase } from '@/core/utils';
import { Observable } from 'rxjs';

const BACKET_ID = 'cubersport12';

@Injectable({
  providedIn: 'root'
})
export class AppFilesStorageService {
  private readonly _supabase = inject(AppSupabase);

  public uploadFile(fileName: string, blob: Blob): Observable<string> {
    return new Observable((obs) => {
      void this._supabase.client.storage.from(BACKET_ID).upload(`public/${fileName}`, blob, { upsert: true })
        .then(() => {
          obs.next(`public/${fileName}`);
          obs.complete();
        });
    });
  }

  public deleteFile(fileName: string): Observable<void> {
    return new Observable((obs) => {
      void this._supabase.client.storage.from(BACKET_ID).remove([`public/${fileName}`])
        .then(() => {
          obs.next();
          obs.complete();
        });
    });
  }

  public downloadFile(fileName: string): Observable<Blob> {
    return new Observable((obs) => {
      void this._supabase.client.storage.from(BACKET_ID).download(`public/${fileName}`)
        .then(({ data }) => {
          obs.next(data as Blob);
          obs.complete();
        });
    });
  }
}
