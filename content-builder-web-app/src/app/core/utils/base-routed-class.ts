import { computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ActivationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

type QueryParams = Record<'folderId', string>;

export class BaseRoutedClass {
  protected readonly _router = inject(Router);
  protected readonly _activatedRoute = inject(ActivatedRoute);

  protected readonly _queryParams = toSignal(this._router.events.pipe(
    filter(e => e instanceof ActivationEnd),
    map((e) => {
      const { snapshot } = e;
      return snapshot.queryParams as QueryParams;
    }),
    startWith(this._activatedRoute.snapshot.queryParams as QueryParams)
  ));

  protected readonly _folderId = computed(() => {
    const params = this._queryParams();
    return params?.folderId;
  });
}
