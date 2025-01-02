import { AppLoading, FoldersActions } from '@/core/store';
import { BaseRoutedClass, FoldersExplorerService } from '@/core/utils';
import { Component, computed, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Store } from '@ngxs/store';
import uniqid from 'uniqid';

@Component({
  selector: 'app-navbar',
  imports: [
    MatIcon,
    MatButton
  ],
  templateUrl: './app-navbar.component.html'
})
export class AppNavbarComponent extends BaseRoutedClass {
  private readonly _store = inject(Store);
  private readonly _explorer = inject(FoldersExplorerService);
  private readonly _dispatched = inject(AppLoading);

  protected readonly _isCreating = computed(() => this._dispatched.isDispatched(FoldersActions.CreateFolder)());

  protected _createNewFolder(): void {
    const parentId = this._folderId();
    const id = uniqid();
    this._store.dispatch(new FoldersActions.CreateFolder(parentId, { name: 'New Folder', id }))
      .subscribe(() => {
        this._explorer.beginRename.set(id);
      });
  }

  protected _createArticle() {
  }
}
