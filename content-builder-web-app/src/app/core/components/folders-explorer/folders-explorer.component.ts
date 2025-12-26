import { ChangeDetectionStrategy, Component, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { Store } from '@ngxs/store';
import { AppLoading, ArticlesActions, ArticlesState, FoldersActions, FoldersState, RescueActions, RescueState, TestsActions, TestsState } from '@/core/store';
import { MatIcon } from '@angular/material/icon';
import { MatRipple } from '@angular/material/core';
import { MatMenuModule } from '@angular/material/menu';
import { AppArticleVm, AppFolderVm, AppRescueItemVm, AppTestVm, BaseRoutedClass, FoldersExplorerService, NullableValue } from '@/core/utils';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TextEditableValueComponent } from '../text-editable-value';
import { SkeletonComponent } from '../skeleton';
import { ArticleEditorService } from '../article-editor';
import { Observable } from 'rxjs';
import { NgTemplateOutlet } from '@angular/common';
import { orderBy, random, range } from 'lodash';
import { CdkDropList, CdkDrag, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { TestsEditorService } from '../test-editor';
import { RescueEditorService } from '../rescue-editor';

// type OptionType = (AppFolderVm | AppArticleVm) & { type: 'folder' | 'article' };
type FolderOptionType = AppFolderVm & { type?: 'folder' };
type ArticleOptionType = AppArticleVm & { type?: 'article' };
type TestOptionType = AppTestVm & { type?: 'test' };
type RescueOptionType = AppRescueItemVm & { type?: 'rescue' };
type OptionType = FolderOptionType | ArticleOptionType | TestOptionType | RescueOptionType;

@Component({
  selector: 'app-folders-explorer',
  imports: [
    MatRipple,
    MatIcon,
    FormsModule,
    ReactiveFormsModule,
    TextEditableValueComponent,
    SkeletonComponent,
    MatMenuModule,
    NgTemplateOutlet,
    CdkDropList,
    CdkDrag
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './folders-explorer.component.html',
  styleUrl: './folders-explorer.component.scss'
})
export class FoldersExplorerComponent extends BaseRoutedClass {
  private readonly _explorer = inject(FoldersExplorerService);
  private readonly _store = inject(Store);
  private readonly _dispatched = inject(AppLoading);
  private readonly _articlesEditor = inject(ArticleEditorService);
  private readonly _testsEditor = inject(TestsEditorService);
  private readonly _rescueEditor = inject(RescueEditorService);
  protected readonly _getRandomArray = () => range(0, random(3, 10), 1);
  protected readonly _affectOptionId = signal<NullableValue<string>>(null);

  protected readonly _isPending = (folderId: string) => computed(() => {
    const renaming = this._affectOptionId();
    const dispatchedFolder = this._dispatched.isDispatched(FoldersActions.UpdateFolder)();
    const dispatchedArticle = this._dispatched.isDispatched(ArticlesActions.UpdateArticle)();
    const dispatchedTest = this._dispatched.isDispatched(TestsActions.UpdateTest)();
    const dispatchedRescue = this._dispatched.isDispatched(RescueActions.UpdateRescueItem)();
    const deletingFolder = this._dispatched.isDispatched(FoldersActions.DeleteFolder)();
    const deletingArticle = this._dispatched.isDispatched(ArticlesActions.DeleteArticle)();
    const deletingTest = this._dispatched.isDispatched(TestsActions.DeleteTest)();
    const deletingRescue = this._dispatched.isDispatched(RescueActions.DeleteRescueItem)();
    const dispatched = dispatchedFolder || dispatchedArticle || dispatchedTest || dispatchedRescue || deletingFolder || deletingArticle || deletingTest || deletingRescue;
    return renaming === folderId && dispatched;
  });

  protected readonly _fetching = computed(() =>
    this._dispatched.isDispatched(FoldersActions.FetchFolders)()
    || this._dispatched.isDispatched(ArticlesActions.FetchArticles)()
    || this._dispatched.isDispatched(TestsActions.FetchTests)()
    || this._dispatched.isDispatched(RescueActions.FetchRescueItems)()
  );

  protected readonly _options = linkedSignal<OptionType[]>(() => {
    const folders = this._folders() ?? [];
    const articles = this._articles() ?? [];
    const tests = this._tests() ?? [];
    const rescueItems = this._rescueItems() ?? [];
    return orderBy([
      ...folders.map(x => ({ ...x, type: 'folder' } satisfies OptionType)),
      ...articles.map(x => ({ ...x, type: 'article' } satisfies OptionType)),
      ...tests.map(x => ({ ...x, type: 'test' } satisfies OptionType)),
      ...rescueItems.map(x => ({ ...x, type: 'rescue' } satisfies OptionType))
    ], x => x.order);
  });

  protected readonly _folders = computed(() => {
    const parentId = this._folderId();
    const f = this._store.selectSignal(FoldersState.getFolders)()(parentId);
    return f;
  });

  protected readonly _articles = computed(() => {
    const parentId = this._folderId();
    const f = this._store.selectSignal(ArticlesState.getArticles)()(parentId);
    return f;
  });

  protected _isHidden(item: OptionType): boolean {
    return item.type === 'test' && item.hidden === true;
  }

  protected readonly _tests = computed(() => {
    const parentId = this._folderId();
    const f = this._store.selectSignal(TestsState.getTests)()(parentId);
    return f;
  });

  protected readonly _rescueItems = computed(() => {
    const parentId = this._folderId();
    const f = this._store.selectSignal(RescueState.getRescueItems)()(parentId);
    return f;
  });

  constructor() {
    super();
    effect(() => {
      const parentId = this._folderId();
      this._store.dispatch([
        new FoldersActions.FetchFolders(parentId),
        new ArticlesActions.FetchArticles(parentId),
        new TestsActions.FetchTests(parentId),
        new RescueActions.FetchRescueItems(parentId)
      ]);
    });

    effect(() => {
      const renaming = this._explorer.beginRename();
      if (renaming) {
        this._beginRename(renaming);
      }
    });
  }

  protected _open(f: OptionType): void {
    switch (f.type) {
      case 'folder':
        void this._router.navigate([], {
          relativeTo: this._activatedRoute,
          queryParams: {
            folderId: f.id
          }
        });
        break;
      case 'article':
        this._articlesEditor.openArticle(f);
        break;
      case 'test':
        this._testsEditor.openTest(f);
        break;
      case 'rescue':
        this._rescueEditor.openRescue(f);
        break;
      default:
        throw new Error('Unknown option type');
    }
  }

  protected _confirmRename(option: OptionType, name: NullableValue<string>): void {
    switch (option.type) {
      case 'folder':
        this._store.dispatch(new FoldersActions.UpdateFolder(option.id, { name: name ?? '' }))
          .subscribe(() => {
            this._affectOptionId.set(null);
          });
        break;
      case 'article':
        this._store.dispatch(new ArticlesActions.UpdateArticle(option.id, { name: name ?? '' }))
          .subscribe(() => {
            this._affectOptionId.set(null);
          });
        break;
      case 'test':
        this._store.dispatch(new TestsActions.UpdateTest(option.id, { name: name ?? '' }))
          .subscribe(() => {
            this._affectOptionId.set(null);
          });
        break;
      case 'rescue':
        this._store.dispatch(new RescueActions.UpdateRescueItem(option.id, { name: name ?? '' }))
          .subscribe(() => {
            this._affectOptionId.set(null);
          });
        break;
      default:
        throw new Error('Unknown option type');
    }
  }

  protected _getSvgIcon(option: OptionType): string {
    if (option.type === 'folder') {
      return 'folder';
    }

    if (option.type === 'article') {
      return 'file-contract';
    }

    if (option.type === 'test') {
      return 'sliders';
    }

    if (option.type === 'rescue') {
      return 'kit-medical';
    }
    throw new Error('Unknown option type');
  }

  protected _delete(option: OptionType): void {
    this._affectOptionId.set(option.id);
    let s: NullableValue<Observable<void>>;
    switch (option.type) {
      case 'folder':
        s = this._store.dispatch(new FoldersActions.DeleteFolder(option.id));
        break;
      case 'article':
        s = this._store.dispatch(new ArticlesActions.DeleteArticle(option.id));
        break;
      case 'test':
        s = this._store.dispatch(new TestsActions.DeleteTest(option.id));
        break;
      case 'rescue':
        s = this._store.dispatch(new RescueActions.DeleteRescueItem(option.id));
        break;
      default:
        throw new Error('Unknown option type');
    }
    s?.subscribe(() => {
      this._affectOptionId.set(null);
    });
  }

  protected _beginRename(folderId: string): void {
    this._affectOptionId.set(folderId);
  }

  protected _handleDrop(event: CdkDragDrop<OptionType[]>) {
    const options = this._options();
    moveItemInArray(options, event.previousIndex, event.currentIndex);
    const actions: Array<FoldersActions.UpdateFolder | ArticlesActions.UpdateArticle | TestsActions.UpdateTest | RescueActions.UpdateRescueItem> = [];
    options.forEach((option, index) => {
      const toUpdate = { ...option };
      delete toUpdate.type;
      toUpdate.order = index;
      if (option.type === 'folder') {
        actions.push(new FoldersActions.UpdateFolder(option.id, toUpdate));
      }
      else if (option.type === 'article') {
        actions.push(new ArticlesActions.UpdateArticle(option.id, toUpdate));
      }
      else if (option.type === 'test') {
        actions.push(new TestsActions.UpdateTest(option.id, toUpdate));
      }
      else if (option.type === 'rescue') {
        actions.push(new RescueActions.UpdateRescueItem(option.id, toUpdate));
      }
    });
    this._store.dispatch(actions);
  }
}
