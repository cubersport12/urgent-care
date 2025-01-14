import { AppLoading, FoldersActions } from '@/core/store';
import { BaseRoutedClass, FoldersExplorerService, generateGUID } from '@/core/utils';
import { Component, computed, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Store } from '@ngxs/store';
import { ArticleEditorService } from '../article-editor';

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
  private readonly _articlesEditor = inject(ArticleEditorService);
  private readonly _explorer = inject(FoldersExplorerService);
  private readonly _dispatched = inject(AppLoading);

  protected readonly _isCreating = computed(() => this._dispatched.isDispatched(FoldersActions.CreateFolder)());

  protected _createNewFolder(): void {
    const parentId = this._folderId();
    const id = generateGUID();
    this._store.dispatch(new FoldersActions.CreateFolder(parentId, { name: 'New Folder', id }))
      .subscribe(() => {
        this._explorer.beginRename.set(id);
      });
  }

  protected _createArticle() {
    this._articlesEditor.openArticle({ parentId: this._folderId() });
  }
}
