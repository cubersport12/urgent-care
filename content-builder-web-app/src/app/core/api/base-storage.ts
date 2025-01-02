import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AppSupabase } from '@/core/utils';
import { ZodObject } from 'zod';
import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

export abstract class BaseStorage {
  private readonly _supabase = inject(AppSupabase);

  protected abstract _getTableName(): string;

  protected _add<T extends { id: string }>(what: T): Observable<void> {
    return new Observable((obs) => {
      this._supabase.client.from(this._getTableName()).insert(what).then(() => {
        obs.next();
        obs.complete();
      });
    });
  }

  protected _update<T extends { id: string }>(what: T): Observable<void> {
    return new Observable((obs) => {
      this._supabase.client.from(this._getTableName()).update(what).filter('id', 'eq', what.id).then(() => {
        obs.next();
        obs.complete();
      });
    });
  }

  protected _delete(id: string): Observable<void> {
    return new Observable((obs) => {
      this._supabase.client.from(this._getTableName()).delete().eq('id', id).then(() => {
        obs.next();
        obs.complete();
      });
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected _fetch<T>(zod: ZodObject<any>, filterCallback?: (f: PostgrestFilterBuilder<any, any, any[], string>) => PostgrestFilterBuilder<any, any, any[], string>): Observable<T[]> {
    return new Observable((obs) => {
      const select = this._supabase.client.from(this._getTableName()).select('*');

      const r = filterCallback ? filterCallback(select) : select;
      r.then(({ data }) => {
        obs.next(data?.map(d => zod.parse(d) as T));
        obs.complete();
      });
    });
  }
}
