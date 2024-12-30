import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Store } from '@ngxs/store';
import { AppLoading, FoldersActions, FoldersState } from '@/core/store';
import { MatIcon } from '@angular/material/icon';
import { MatOption, MatRipple } from '@angular/material/core';
import { MatMenuModule } from '@angular/material/menu';
import { AppFolderVm, BaseRoutedClass, FoldersExplorerService, NullableValue } from '@/core/utils';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TextEditableValueComponent } from '../text-editable-value';
import { SkeletonComponent } from '../skeleton/skeleton.component';

@Component({
  selector: 'app-folders-explorer',
  imports: [
    MatRipple,
    MatIcon,
    FormsModule,
    ReactiveFormsModule,
    MatOption,
    TextEditableValueComponent,
    SkeletonComponent,
    MatMenuModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './folders-explorer.component.html',
  styleUrl: './folders-explorer.component.scss'
})
export class FoldersExplorerComponent extends BaseRoutedClass {
  private readonly _explorer = inject(FoldersExplorerService);
  private readonly _store = inject(Store);
  private readonly _dispatched = inject(AppLoading);
  protected readonly _renamingFolder = signal<NullableValue<string>>(null);

  protected readonly _isRenamePendingFolder = (folderId: string) => computed(() => {
    const renaming = this._renamingFolder();
    const dispatched = this._dispatched.isDispatched(FoldersActions.UpdateFolder)();
    return renaming === folderId && dispatched;
  });

  protected readonly _folders = computed(() => {
    const parentId = this._folderId();
    const f = this._store.selectSignal(FoldersState.getFolders)()(parentId);
    return f;
  });

  constructor() {
    super();
    effect(() => {
      const parentId = this._folderId();
      this._store.dispatch(new FoldersActions.FetchFolders(parentId));
    });

    effect(() => {
      const renaming = this._explorer.beginRename();
      if (renaming) {
        this._beginRename(renaming);
      }
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

  protected _confirmRename(folderId: string, name: NullableValue<string>): void {
    this._store.dispatch(new FoldersActions.UpdateFolder(folderId, { name: name ?? '' }))
      .subscribe(() => {
        this._renamingFolder.set(null);
      });
  }

  protected _deleteFolder(folderId: string): void {
    this._store.dispatch(new FoldersActions.DeleteFolder(folderId));
  }

  protected _beginRename(folderId: string): void {
    this._renamingFolder.set(folderId);
  }
}
