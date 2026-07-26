import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AppSupabase } from '@/core/utils';
import { ZodObject } from 'zod';

const TABLE_TO_RESOURCE: Record<string, string> = {
  folders: 'folders',
  articles: 'articles',
  tests: 'tests',
  rescue: 'rescue'
};

type FetchFilter = {
  parentId?: string | null;
  id?: string;
  all?: boolean;
};

export abstract class BaseStorage {
  protected readonly _api = inject(AppSupabase);

  protected abstract _getTableName(): string;

  protected _resource(): string {
    return TABLE_TO_RESOURCE[this._getTableName()] ?? this._getTableName();
  }

  protected _add<T extends { id: string }>(what: T): Observable<void> {
    return new Observable((obs) => {
      void this._api
        .create(this._resource(), what)
        .then(() => {
          obs.next();
          obs.complete();
        })
        .catch((err: unknown) => obs.error(err));
    });
  }

  protected _update<T extends { id: string }>(what: T): Observable<void> {
    return new Observable((obs) => {
      void this._api
        .update(this._resource(), what.id, what)
        .then(() => {
          obs.next();
          obs.complete();
        })
        .catch((err: unknown) => obs.error(err));
    });
  }

  protected _delete(id: string): Observable<void> {
    return new Observable((obs) => {
      void this._api
        .delete(this._resource(), id)
        .then(() => {
          obs.next();
          obs.complete();
        })
        .catch((err: unknown) => obs.error(err));
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected _fetch<T>(zod: ZodObject<any>, filterCallback?: (f: FetchFilter) => FetchFilter): Observable<T[]> {
    return new Observable((obs) => {
      const filter = filterCallback ? filterCallback({}) : {};
      void this._api
        .list(this._resource(), filter)
        .then((data) => {
          obs.next(data?.map((d) => zod.parse(d) as T) ?? []);
          obs.complete();
        })
        .catch((err: unknown) => obs.error(err));
    });
  }
}
