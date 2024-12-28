import { Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, ActivationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { Store } from '@ngxs/store';
import { FoldersActions, FoldersState } from '@/core/store';
import { MatIcon } from '@angular/material/icon';
import { MatRipple } from '@angular/material/core';
import { AppFolderVm } from '@/core/utils';

@Component({
  selector: 'app-folders-explorer',
  imports: [
    MatRipple,
    MatIcon
  ],
  templateUrl: './folders-explorer.component.html',
  styleUrl: './folders-explorer.component.scss'
})
export class FoldersExplorerComponent {
  private readonly _activatedRoute = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _store = inject(Store);

  protected readonly _folderId$ = this._router.events.pipe(
    filter(e => e instanceof ActivationEnd),
    map((e) => {
      const { snapshot } = e;
      return snapshot.queryParamMap.get('folderId');
    }),
    startWith(this._activatedRoute.snapshot.queryParamMap.get('folderId'))
  );

  private readonly _folderId = toSignal(this._folderId$);

  protected readonly _folders = computed(() => {
    const parentId = this._folderId();
    const f = this._store.selectSignal(FoldersState.getFolders)();
    return f(parentId);
  });

  constructor() {
    effect(() => {
      const parentId = this._folderId();
      this._store.dispatch(new FoldersActions.FetchFolders(parentId));
    });
  }

  protected _openFolder(f: AppFolderVm): void {
    void this._router.navigate([], {
      relativeTo: this._activatedRoute,
      queryParams: {
        folderId: f.id
      }
    });
  }
}
