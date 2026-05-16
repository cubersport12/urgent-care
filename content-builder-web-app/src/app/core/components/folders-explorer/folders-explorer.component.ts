import { ChangeDetectionStrategy, Component, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { Store } from '@ngxs/store';
import { AppLoading, ArticlesActions, ArticlesState, FoldersActions, FoldersState, RescueActions, RescueState, TestsActions, TestsState } from '@/core/store';
import { MatIcon } from '@angular/material/icon';
import { MatRipple } from '@angular/material/core';
import { MatMenuModule } from '@angular/material/menu';
import {
  AppArticleVm,
  AppFolderVm,
  AppRescueItemVm,
  AppTestQuestionVm,
  AppTestVm,
  BaseRoutedClass,
  ExplorerClipboardEntry,
  FoldersExplorerService,
  generateGUID,
  NullableValue,
  RescueSceneVm
} from '@/core/utils';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TextEditableValueComponent } from '../text-editable-value';
import { SkeletonComponent } from '../skeleton';
import { ArticleEditorService } from '../article-editor';
import { catchError, forkJoin, map, mergeMap, Observable, of } from 'rxjs';
import { NgTemplateOutlet } from '@angular/common';
import { cloneDeep, orderBy, random, range } from 'lodash';
import { CdkDropList, CdkDrag, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { TestsEditorService } from '../test-editor';
import { RescueEditorService } from '../rescue-editor';
import { AppFilesStorageService } from '@/core/api';

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
  private readonly _filesStorage = inject(AppFilesStorageService);
  protected readonly _getRandomArray = () => range(0, random(3, 10), 1);
  protected readonly _affectOptionId = signal<NullableValue<string>>(null);

  protected readonly _clipboard = this._explorer.clipboard;
  protected readonly _selectedId = this._explorer.selectedId;
  protected readonly _canPaste = computed(() => {
    const clip = this._clipboard();
    if (clip == null) {
      return false;
    }
    if (clip.type === 'folder' && clip.mode === 'cut') {
      const targetParentId = this._folderId();
      return clip.item.id !== targetParentId;
    }
    return true;
  });

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
    const creatingFolder = this._dispatched.isDispatched(FoldersActions.CreateFolder)();
    const creatingArticle = this._dispatched.isDispatched(ArticlesActions.CreateArticle)();
    const creatingTest = this._dispatched.isDispatched(TestsActions.CreateTest)();
    const creatingRescue = this._dispatched.isDispatched(RescueActions.CreateRescueItem)();
    const dispatched = dispatchedFolder || dispatchedArticle || dispatchedTest || dispatchedRescue
      || deletingFolder || deletingArticle || deletingTest || deletingRescue
      || creatingFolder || creatingArticle || creatingTest || creatingRescue;
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

  protected _select(option: OptionType, event: MouseEvent): void {
    event.stopPropagation();
    this._explorer.selectedId.set(option.id);
  }

  protected _isCut(item: OptionType): boolean {
    const clip = this._clipboard();
    return clip?.mode === 'cut' && clip.item.id === item.id;
  }

  protected _copy(option: OptionType): void {
    this._explorer.selectedId.set(option.id);
    this._explorer.clipboard.set(this._toClipboardEntry(option, 'copy'));
  }

  protected _cut(option: OptionType): void {
    this._explorer.selectedId.set(option.id);
    this._explorer.clipboard.set(this._toClipboardEntry(option, 'cut'));
  }

  protected _paste(targetTolderId: string): void {
    const clip = this._clipboard();
    if (clip == null || !this._canPaste()) {
      return;
    }
    const order = this._getNextOrder();
    const action$ = clip.mode === 'cut'
      ? this._moveItem(clip, targetTolderId, order)
      : this._duplicateItem(clip, targetTolderId, order);
    action$.subscribe(() => {
      if (clip.mode === 'cut') {
        this._explorer.clipboard.set(null);
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
    if (this._clipboard()?.item.id === option.id) {
      this._explorer.clipboard.set(null);
    }
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

  private _isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    return target.closest('input, textarea, [contenteditable="true"]') != null;
  }

  private _getNextOrder(): number {
    const options = this._options();
    if (options.length === 0) {
      return 0;
    }
    return Math.max(...options.map(x => x.order ?? 0)) + 1;
  }

  private _toClipboardEntry(option: OptionType, mode: 'copy' | 'cut'): ExplorerClipboardEntry {
    switch (option.type) {
      case 'folder':
        return { type: 'folder', item: option, mode };
      case 'article':
        return { type: 'article', item: option, mode };
      case 'test':
        return { type: 'test', item: option, mode };
      case 'rescue':
        return { type: 'rescue', item: option, mode };
      default:
        throw new Error('Unknown option type');
    }
  }

  private _moveItem(clip: ExplorerClipboardEntry, parentId: NullableValue<string>, order: number): Observable<void> {
    const payload = { parentId: parentId ?? null, order };
    switch (clip.type) {
      case 'folder':
        return this._store.dispatch(new FoldersActions.MoveFolder(clip.item.id, parentId));
      case 'article':
        return this._store.dispatch(new ArticlesActions.UpdateArticle(clip.item.id, payload));
      case 'test':
        return this._store.dispatch(new TestsActions.UpdateTest(clip.item.id, payload));
      case 'rescue':
        return this._store.dispatch(new RescueActions.UpdateRescueItem(clip.item.id, payload));
      default:
        throw new Error('Unknown option type');
    }
  }

  private _duplicateItem(clip: ExplorerClipboardEntry, parentId: NullableValue<string>, order: number): Observable<void> {
    const copyName = `${clip.item.name} (копия)`;
    switch (clip.type) {
      case 'folder':
        return this._store.dispatch(new FoldersActions.CreateFolder(parentId, {
          id: generateGUID(),
          name: copyName,
          order
        }));
      case 'article':
        return this._duplicateArticle(clip.item as AppArticleVm, parentId, order, copyName);
      case 'test':
        return this._duplicateTest(clip.item as AppTestVm, parentId, order, copyName);
      case 'rescue':
        return this._duplicateRescue(clip.item as AppRescueItemVm, parentId, order, copyName);
      default:
        throw new Error('Unknown option type');
    }
  }

  private _duplicateArticle(article: AppArticleVm, parentId: NullableValue<string>, order: number, name: string): Observable<void> {
    const id = generateGUID();
    const payload: AppArticleVm & { type?: string } = {
      ...article,
      id,
      name,
      parentId: parentId ?? null,
      order
    };
    delete payload['type'];
    return this._copyStorageFile(`${article.id}.pdf`, `${id}.pdf`).pipe(
      mergeMap(() => this._store.dispatch(new ArticlesActions.CreateArticle(payload)))
    );
  }

  private _duplicateTest(test: AppTestVm, parentId: NullableValue<string>, order: number, name: string): Observable<void> {
    const id = generateGUID();
    const imagePaths = this._collectTestImagePaths(test);
    return this._copyStorageFiles(imagePaths).pipe(
      mergeMap((pathMap) => {
        const questions = (test.questions ?? []).map(q => this._remapTestQuestionImages(cloneDeep(q), pathMap));
        const payload: AppTestVm & { type?: string } = {
          ...test,
          id,
          name,
          parentId: parentId ?? null,
          order,
          questions
        };
        delete payload['type'];
        return this._store.dispatch(new TestsActions.CreateTest(payload));
      })
    );
  }

  private _duplicateRescue(rescue: AppRescueItemVm, parentId: NullableValue<string>, order: number, name: string): Observable<void> {
    const id = generateGUID();
    const data = cloneDeep(rescue.data);
    const imagePaths = this._collectRescueImagePaths(data.scenes, data.defaultBackground);
    return this._copyStorageFiles(imagePaths).pipe(
      mergeMap((pathMap) => {
        const scenes = (data.scenes ?? []).map(scene => ({
          ...scene,
          background: pathMap.get(scene.background) ?? scene.background
        }));
        const defaultBackground = data.defaultBackground
          ? (pathMap.get(data.defaultBackground) ?? data.defaultBackground)
          : data.defaultBackground;
        const payload: AppRescueItemVm & { type?: string } = {
          ...rescue,
          id,
          name,
          parentId: parentId ?? null,
          order,
          createdAt: new Date().toISOString(),
          data: {
            ...data,
            scenes,
            defaultBackground
          }
        };
        delete payload['type'];
        return this._store.dispatch(new RescueActions.CreateRescueItem(payload));
      })
    );
  }

  private _copyStorageFile(from: string, to: string): Observable<void> {
    return this._filesStorage.downloadFile(from).pipe(
      catchError(() => of(null)),
      mergeMap(blob => blob
        ? this._filesStorage.uploadFile(to, blob).pipe(map(() => undefined))
        : of(undefined))
    );
  }

  private _copyStorageFiles(paths: string[]): Observable<Map<string, string>> {
    const unique = [...new Set(paths.filter(p => p.length > 0))];
    if (unique.length === 0) {
      return of(new Map());
    }
    return forkJoin(unique.map(path => this._filesStorage.downloadFile(path).pipe(
      catchError(() => of(null)),
      mergeMap((blob) => {
        if (blob == null) {
          return of([path, path] as const);
        }
        const newPath = generateGUID();
        return this._filesStorage.uploadFile(newPath, blob).pipe(map(() => [path, newPath] as const));
      })
    ))).pipe(map(entries => new Map(entries)));
  }

  private _collectTestImagePaths(test: AppTestVm): string[] {
    const paths: string[] = [];
    for (const question of test.questions ?? []) {
      if (question.image) {
        paths.push(question.image);
      }
      for (const answer of question.answers ?? []) {
        if (answer.image) {
          paths.push(answer.image);
        }
      }
    }
    return paths;
  }

  private _remapTestQuestionImages(question: AppTestQuestionVm, pathMap: Map<string, string>): AppTestQuestionVm {
    return {
      ...question,
      image: question.image ? (pathMap.get(question.image) ?? question.image) : question.image,
      answers: question.answers?.map(answer => ({
        ...answer,
        image: answer.image ? (pathMap.get(answer.image) ?? answer.image) : answer.image
      }))
    };
  }

  private _collectRescueImagePaths(scenes: NullableValue<RescueSceneVm[]>, defaultBackground?: NullableValue<string>): string[] {
    const paths: string[] = [];
    if (defaultBackground) {
      paths.push(defaultBackground);
    }
    for (const scene of scenes ?? []) {
      if (scene.background) {
        paths.push(scene.background);
      }
    }
    return paths;
  }
}
