import { AppLoading, FoldersActions } from '@/core/store';
import { AppFolderVm, BaseRoutedClass, FoldersExplorerService, generateGUID } from '@/core/utils';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Store } from '@ngxs/store';
import { ArticleEditorService } from '../article-editor';
import { AppFoldersStorageService } from '@/core/api';
import { AppBreadcrumbsComponent } from '../app-breadcrumbs';
import { TestsEditorService } from '../test-editor';

@Component({
  selector: 'app-navbar',
  imports: [
    MatIcon,
    MatButton,
    AppBreadcrumbsComponent
  ],
  templateUrl: './app-navbar.component.html'
})
export class AppNavbarComponent extends BaseRoutedClass {
  private readonly _store = inject(Store);
  private readonly _testsEditor = inject(TestsEditorService);
  private readonly _articlesEditor = inject(ArticleEditorService);
  private readonly _explorer = inject(FoldersExplorerService);
  private readonly _dispatched = inject(AppLoading);
  private readonly _service = inject(AppFoldersStorageService);
  protected readonly _path = signal<AppFolderVm[]>([]);
  protected readonly _isCreating = computed(() => this._dispatched.isDispatched(FoldersActions.CreateFolder)());

  constructor() {
    super();
    effect(() => {
      const folderId = this._folderId();
      if (folderId != null) {
        this._service.fetchPath(folderId).subscribe((r) => {
          this._path.set(r);
        });
      }
    });
  }

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

  protected _createTest() {
    this._testsEditor.openTest({ parentId: this._folderId() });
  }

  protected _navigate(folderId: string): void {
    void this._router.navigate([], {
      relativeTo: this._activatedRoute,
      queryParams: {
        folderId: folderId
      }
    });
  }
}
