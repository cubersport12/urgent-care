import { computed, inject, Injectable, signal } from '@angular/core';
import { ActionContext, Actions, ActionType } from '@ngxs/store';

@Injectable({
  providedIn: 'root'
})
export class AppLoading {
  private readonly _actions$ = inject(Actions);
  private readonly _loading = signal<Map<string, ActionContext>>(new Map<string, ActionContext>());

  constructor() {
    this._actions$.subscribe((r) => {
      const type = r.action.constructor.type as string;
      this._loading.update((map) => {
        map.set(type, r);
        return new Map<string, ActionContext>(map);
      });
    });
  }

  public isDispatched = (action: ActionType) => computed(() => {
    const data = this._loading();
    const type = action.type;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    return data.get(type)?.status === 'DISPATCHED';
  });
}
