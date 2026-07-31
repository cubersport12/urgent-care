import { afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, linkedSignal, signal, viewChild } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Store } from '@ngxs/store';
import { AppLoading, ArticlesActions, ArticlesState, FoldersActions, FoldersState, RescueActions, RescueState, TestsActions, TestsState } from '@/core/store';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatDivider } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  AppArticleVm,
  AppFolderVm,
  AppRescueItemVm,
  AppTestQuestionVm,
  AppTestVm,
  ExplorerClipboardEntry,
  FoldersExplorerService,
  generateGUID,
  NullableValue,
  RescueSceneVm
} from '@/core/utils';
import type { TariffOut } from '@/core/api/generated/types.gen';
import { notificationsBroadcastNotification } from '@/core/api/generated/sdk.gen';
import { ApiError, apiCall } from '@/core/api/api-utils';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TextEditableValueComponent } from '../text-editable-value';
import { SkeletonComponent } from '../skeleton';
import { ArticleEditorService } from '../article-editor';
import { catchError, forkJoin, from, map, mergeMap, Observable, of } from 'rxjs';
import { NgTemplateOutlet } from '@angular/common';
import { cloneDeep, orderBy, random, range } from 'lodash';
import { CdkDropList, CdkDrag, CdkDragDrop, CdkDropListGroup, moveItemInArray } from '@angular/cdk/drag-drop';
import { TestsEditorService } from '../test-editor';
import { RescueEditorService } from '../rescue-editor';
import { TariffsEditorService } from '../tariffs-editor';
import { AchievementsEditorService } from '../achievements-editor';
import { RewardsEditorService } from '../rewards-editor';
import { FolderPropertiesService } from '../folder-properties/folder-properties.component';
import { SetItemTariffService } from '../set-item-tariff/set-item-tariff.component';
import { AppFilesStorageService, AppFoldersStorageService, AppTariffsStorageService } from '@/core/api';
import { AngularSplitModule } from 'angular-split';

type FolderOptionType = AppFolderVm & { type?: 'folder' };
type ArticleOptionType = AppArticleVm & { type?: 'article' };
type TestOptionType = AppTestVm & { type?: 'test' };
type RescueOptionType = AppRescueItemVm & { type?: 'rescue' };
type OptionType = FolderOptionType | ArticleOptionType | TestOptionType | RescueOptionType;
type PanelSide = 'left' | 'right';

@Component({
  selector: 'app-folders-explorer',
  imports: [
    MatIcon,
    MatIconButton,
    MatTooltip,
    MatDivider,
    MatSnackBarModule,
    FormsModule,
    ReactiveFormsModule,
    TextEditableValueComponent,
    SkeletonComponent,
    MatMenuModule,
    NgTemplateOutlet,
    CdkDropList,
    CdkDrag,
    CdkDropListGroup,
    AngularSplitModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './folders-explorer.component.html',
  styleUrl: './folders-explorer.component.scss',
  host: {
    class: 'flex flex-col flex-1 min-h-0 overflow-hidden outline-none',
    tabindex: '0'
  }
})
export class FoldersExplorerComponent {
  private readonly _host = inject(ElementRef<HTMLElement>);
  private readonly _document = inject(DOCUMENT);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _explorer = inject(FoldersExplorerService);
  private readonly _store = inject(Store);
  private readonly _dispatched = inject(AppLoading);
  private readonly _articlesEditor = inject(ArticleEditorService);
  private readonly _testsEditor = inject(TestsEditorService);
  private readonly _rescueEditor = inject(RescueEditorService);
  private readonly _tariffsEditor = inject(TariffsEditorService);
  private readonly _achievementsEditor = inject(AchievementsEditorService);
  private readonly _rewardsEditor = inject(RewardsEditorService);
  private readonly _folderProperties = inject(FolderPropertiesService);
  private readonly _setItemTariff = inject(SetItemTariffService);
  private readonly _tariffsStorage = inject(AppTariffsStorageService);
  private readonly _filesStorage = inject(AppFilesStorageService);
  private readonly _foldersService = inject(AppFoldersStorageService);
  private readonly _snack = inject(MatSnackBar);
  private readonly _getFolders = this._store.selectSignal(FoldersState.getFolders);
  private readonly _getArticles = this._store.selectSignal(ArticlesState.getArticles);
  private readonly _getTests = this._store.selectSignal(TestsState.getTests);
  private readonly _getRescueItems = this._store.selectSignal(RescueState.getRescueItems);
  private readonly _contextMenuTrigger = viewChild<MatMenuTrigger>('contextMenuTrigger');

  protected readonly _getRandomArray = () => range(0, random(5, 12), 1);
  protected readonly _affectOptionId = signal<NullableValue<string>>(null);
  protected readonly _affectOptionPanel = signal<NullableValue<PanelSide>>(null);

  protected readonly _activePanel = signal<PanelSide>('left');
  protected readonly _leftFolderId = signal<NullableValue<string>>(null);
  protected readonly _rightFolderId = signal<NullableValue<string>>(null);
  protected readonly _leftFetching = signal(false);
  protected readonly _rightFetching = signal(false);
  protected readonly _leftSelectedId = signal<NullableValue<string>>(null);
  protected readonly _rightSelectedId = signal<NullableValue<string>>(null);
  protected readonly _leftPath = signal<AppFolderVm[]>([]);
  protected readonly _rightPath = signal<AppFolderVm[]>([]);
  protected readonly _contextMenuItem = signal<NullableValue<OptionType>>(null);
  protected readonly _contextMenuPanel = signal<PanelSide>('left');

  /** null = показать все тарифы */
  protected readonly _filterTariffId = signal<string | null>(null);
  protected readonly _tariffs = signal<TariffOut[]>([]);
  protected readonly _defaultTariffId = computed(
    () => this._tariffs().find((t) => t.isDefault)?.id ?? null
  );
  protected readonly _tariffById = computed(() => {
    const map = new Map<string, TariffOut>();
    for (const t of this._tariffs()) map.set(t.id, t);
    return map;
  });

  protected readonly _clipboard = this._explorer.clipboard;

  protected readonly _leftOptions = linkedSignal<OptionType[]>(() => this._computeOptions(this._leftFolderId()));
  protected readonly _rightOptions = linkedSignal<OptionType[]>(() => this._computeOptions(this._rightFolderId()));

  protected readonly _statusText = computed(() => {
    const side = this._activePanel();
    const path = this._getPanelPath(side);
    const pathText = path.length === 0 ? 'Корневая папка' : path.map(f => f.name).join(' / ');
    const count = this._getPanelOptions(side).length;
    const clip = this._clipboard();
    if (clip != null) {
      const mode = clip.mode === 'copy' ? 'Копирование' : 'Перемещение';
      return `${pathText} · ${count} эл. · ${mode}: ${clip.item.name}`;
    }
    const selectedId = this._getSelectedId(side);
    if (selectedId == null) {
      return `${pathText} · ${count} эл.`;
    }
    const item = this._getPanelOptions(side).find(x => x.id === selectedId);
    return item
      ? `${pathText} · ${count} эл. · ${this._getTypeLabel(item)}: ${item.name}`
      : `${pathText} · ${count} эл.`;
  });

  protected readonly _hasSelection = computed(() => this._getActionPanel() != null);
  protected readonly _isCreating = computed(() => this._dispatched.isDispatched(FoldersActions.CreateFolder)());

  constructor() {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!this._shouldHandleKeyboard(event)) {
        return;
      }
      this._onKeyDown(event);
    };
    this._document.addEventListener('keydown', onKeyDown, true);
    this._destroyRef.onDestroy(() => this._document.removeEventListener('keydown', onKeyDown, true));

    afterNextRender(() => this._focusHost());
    this._loadTariffs();

    effect(() => {
      const folderId = this._leftFolderId();
      this._fetchPanelData(folderId, 'left');
      if (folderId != null) {
        this._foldersService.fetchPath(folderId).subscribe(path => this._leftPath.set(path));
      } else {
        this._leftPath.set([]);
      }
    });

    effect(() => {
      const folderId = this._rightFolderId();
      this._fetchPanelData(folderId, 'right');
      if (folderId != null) {
        this._foldersService.fetchPath(folderId).subscribe(path => this._rightPath.set(path));
      } else {
        this._rightPath.set([]);
      }
    });

    effect(() => {
      const renaming = this._explorer.beginRename();
      if (renaming) {
        this._beginRename(renaming, this._activePanel());
      }
    });
  }

  protected _getActionPanel(): NullableValue<PanelSide> {
    const active = this._activePanel();
    if (this._getSelectedId(active) != null) {
      return active;
    }
    if (this._leftSelectedId() != null) {
      return 'left';
    }
    if (this._rightSelectedId() != null) {
      return 'right';
    }
    return null;
  }

  protected _isRenaming(side: PanelSide, itemId: string): boolean {
    return this._affectOptionId() === itemId && this._affectOptionPanel() === side;
  }

  protected _isPending(side: PanelSide, itemId: string): boolean {
    const renaming = this._affectOptionId();
    if (renaming !== itemId || this._affectOptionPanel() !== side) {
      return false;
    }
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
    return renaming === itemId && dispatched;
  }

  protected _getPanelOptions(side: PanelSide): OptionType[] {
    return side === 'left' ? this._leftOptions() : this._rightOptions();
  }

  protected _getPanelPath(side: PanelSide): AppFolderVm[] {
    return side === 'left' ? this._leftPath() : this._rightPath();
  }

  protected _getPanelFolderId(side: PanelSide): NullableValue<string> {
    return side === 'left' ? this._leftFolderId() : this._rightFolderId();
  }

  protected _isPanelActive(side: PanelSide): boolean {
    return this._activePanel() === side;
  }

  protected _getSelectedId(side: PanelSide): NullableValue<string> {
    return side === 'left' ? this._leftSelectedId() : this._rightSelectedId();
  }

  protected _isSelected(side: PanelSide, item: OptionType): boolean {
    return this._getSelectedId(side) === item.id;
  }

  protected _activatePanel(side: PanelSide): void {
    this._activePanel.set(side);
    this._focusHost();
  }

  protected _clearSelection(side: PanelSide): void {
    if (side === 'left') {
      this._leftSelectedId.set(null);
      this._explorer.selectedId.set(null);
    } else {
      this._rightSelectedId.set(null);
    }
  }

  protected _select(side: PanelSide, option: OptionType, event: MouseEvent): void {
    event.stopPropagation();
    this._selectItem(side, option);
  }

  private _selectItem(side: PanelSide, option: OptionType): void {
    this._activePanel.set(side);
    this._leftSelectedId.set(side === 'left' ? option.id : null);
    this._rightSelectedId.set(side === 'right' ? option.id : null);
    if (side === 'left') {
      this._explorer.selectedId.set(option.id);
    }
    this._focusHost();
  }

  protected _handleItemSelect(side: PanelSide, item: OptionType, event: MouseEvent): void {
    if (this._isRenaming(side, item.id)) {
      return;
    }
    this._select(side, item, event);
  }

  protected _handleItemOpen(side: PanelSide, item: OptionType, event: MouseEvent): void {
    if (this._isRenaming(side, item.id)) {
      return;
    }
    event.stopPropagation();
    this._select(side, item, event);
    this._open(side, item);
  }

  protected _renameSelected(): void {
    const panel = this._getActionPanel();
    if (panel == null) {
      return;
    }
    const selectedId = this._getSelectedId(panel);
    if (selectedId != null) {
      this._beginRename(selectedId, panel);
    }
  }

  protected _canPasteTo(targetFolderId: NullableValue<string>): boolean {
    const clip = this._clipboard();
    if (clip == null) {
      return false;
    }
    if (clip.type === 'folder' && clip.mode === 'cut') {
      return clip.item.id !== targetFolderId;
    }
    return true;
  }

  protected _isCut(item: OptionType): boolean {
    const clip = this._clipboard();
    return clip?.mode === 'cut' && clip.item.id === item.id;
  }

  protected _copy(option: OptionType, side: PanelSide): void {
    this._select(side, option, new MouseEvent('click'));
    this._explorer.clipboard.set(this._toClipboardEntry(option, 'copy'));
  }

  protected _cut(option: OptionType, side: PanelSide): void {
    this._select(side, option, new MouseEvent('click'));
    this._explorer.clipboard.set(this._toClipboardEntry(option, 'cut'));
  }

  protected _paste(targetFolderId: NullableValue<string>): void {
    const clip = this._clipboard();
    if (clip == null || !this._canPasteTo(targetFolderId)) {
      return;
    }
    const order = this._getNextOrder(targetFolderId);
    const action$ = clip.mode === 'cut'
      ? this._moveItem(clip, targetFolderId, order)
      : this._duplicateItem(clip, targetFolderId, order);
    action$.subscribe(() => {
      if (clip.mode === 'cut') {
        this._explorer.clipboard.set(null);
      }
    });
  }

  protected _pasteToActivePanel(): void {
    const side = this._activePanel();
    this._paste(this._getPanelFolderId(side));
  }

  protected _copySelected(): void {
    const item = this._getSelectedItem();
    if (item == null) {
      return;
    }
    const panel = this._getActionPanel();
    if (panel != null) {
      this._explorer.clipboard.set(this._toClipboardEntry(item, 'copy'));
    }
  }

  protected _cutSelected(): void {
    const panel = this._getActionPanel();
    const item = this._getSelectedItem();
    if (panel == null || item == null) {
      return;
    }
    this._explorer.clipboard.set(this._toClipboardEntry(item, 'cut'));
  }

  protected _getDropListId(side: PanelSide): string {
    return side === 'left' ? 'drop-list-left' : 'drop-list-right';
  }

  protected _getConnectedDropLists(side: PanelSide): string[] {
    return [this._getDropListId(side === 'left' ? 'right' : 'left')];
  }

  protected _deleteSelected(): void {
    const side = this._getActionPanel();
    if (side == null) {
      return;
    }
    const selectedId = this._getSelectedId(side);
    const item = this._getPanelOptions(side).find(x => x.id === selectedId);
    if (item != null) {
      this._delete(item, side);
    }
  }

  protected _open(side: PanelSide, item: OptionType): void {
    switch (item.type) {
      case 'folder':
        this._navigatePanel(side, item.id);
        break;
      case 'article':
        this._articlesEditor.openArticle(item);
        break;
      case 'test':
        this._testsEditor.openTest(item);
        break;
      case 'rescue':
        this._rescueEditor.openRescue(item);
        break;
      default:
        throw new Error('Unknown option type');
    }
  }

  protected _navigatePanel(side: PanelSide, folderId: NullableValue<string>): void {
    if (side === 'left') {
      this._leftFolderId.set(folderId ?? null);
    } else {
      this._rightFolderId.set(folderId ?? null);
    }
  }

  protected _canGoUp(side: PanelSide): boolean {
    return this._getPanelFolderId(side) != null;
  }

  protected _handleGoUpClick(side: PanelSide, event: MouseEvent): void {
    event.stopPropagation();
    this._activatePanel(side);
    this._goUp(side);
  }

  protected _goUp(side: PanelSide): void {
    const path = this._getPanelPath(side);
    if (path.length > 1) {
      this._navigatePanel(side, path[path.length - 2].id);
      return;
    }
    this._navigatePanel(side, null);
  }

  protected _createNewFolder(): void {
    const parentId = this._getPanelFolderId(this._activePanel());
    const id = generateGUID();
    this._store.dispatch(new FoldersActions.CreateFolder(parentId, { name: 'New Folder', id }))
      .subscribe(() => {
        this._explorer.beginRename.set(id);
      });
  }

  protected _createArticle(): void {
    this._articlesEditor.openArticle({ parentId: this._getPanelFolderId(this._activePanel()) });
  }

  protected _createTest(): void {
    this._testsEditor.openTest({ parentId: this._getPanelFolderId(this._activePanel()) });
  }

  protected _createRescueManual(): void {
    this._rescueEditor.openRescueManual(this._getPanelFolderId(this._activePanel()));
  }

  protected _createRescueWithAi(): void {
    this._rescueEditor.openRescueWithAi(this._getPanelFolderId(this._activePanel()));
  }

  protected _openTariffs(): void {
    this._tariffsEditor.open().afterClosed().subscribe(() => this._loadTariffs());
  }

  protected _openAchievements(): void {
    this._achievementsEditor.open();
  }

  protected _openRewards(): void {
    this._rewardsEditor.open();
  }

  protected _sendTestNotification(): void {
    from(
      apiCall(() =>
        notificationsBroadcastNotification({
          body: {
            title: 'Тестовое уведомление',
            body: 'Проверка системы уведомлений из Content Builder'
          }
        })
      )
    ).subscribe({
      next: (r) =>
        this._snack.open(`Отправлено всем (${r.created})`, 'OK', { duration: 3000 }),
      error: (e: unknown) =>
        this._snack.open(e instanceof ApiError ? e.detail : 'Не удалось отправить', 'OK', {
          duration: 5000
        })
    });
  }

  protected _openFolderProperties(folder: AppFolderVm): void {
    this._folderProperties.open(folder);
  }

  protected _onFilterTariffChange(value: string | null): void {
    this._filterTariffId.set(value && value.length > 0 ? value : null);
  }

  protected _onFilterSelectChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this._onFilterTariffChange(value || null);
  }

  protected _setTariffOnSelected(): void {
    const item = this._getSelectedItem();
    if (item == null) return;
    this._setTariffOnItem(item);
  }

  protected _setTariffOnItem(item: OptionType): void {
    const currentId = item.requiredTariffId ?? this._defaultTariffId();
    this._setItemTariff
      .open({ itemName: item.name, requiredTariffId: currentId })
      .afterClosed()
      .subscribe((tariffId) => {
        if (tariffId == null) return;
        this._applyTariff(item, tariffId);
      });
  }

  protected _itemTariffId(item: OptionType): string | null {
    return item.requiredTariffId ?? this._defaultTariffId();
  }

  protected _itemTariffRank(item: OptionType): number {
    const id = this._itemTariffId(item);
    if (id == null) return 0;
    return this._tariffById().get(id)?.rank ?? 0;
  }

  protected _getTariffLabel(item: OptionType): string {
    const id = this._itemTariffId(item);
    if (id == null) return '—';
    const t = this._tariffById().get(id);
    return t?.title ?? '—';
  }

  protected _isFilterActive(): boolean {
    return this._filterTariffId() != null;
  }

  private _loadTariffs(): void {
    this._tariffsStorage.listAll().subscribe({
      next: (list) => {
        this._tariffs.set([...list].sort((a, b) => a.sortOrder - b.sortOrder || a.rank - b.rank));
      },
      error: () => this._tariffs.set([])
    });
  }

  private _applyTariff(item: OptionType, requiredTariffId: string): void {
    const panel = this._getActionPanel() ?? this._activePanel();
    this._affectOptionId.set(item.id);
    this._affectOptionPanel.set(panel);
    let obs: Observable<void>;
    switch (item.type) {
      case 'folder':
        obs = this._store.dispatch(new FoldersActions.UpdateFolder(item.id, { requiredTariffId }));
        break;
      case 'article':
        obs = this._store.dispatch(new ArticlesActions.UpdateArticle(item.id, { requiredTariffId }));
        break;
      case 'test':
        obs = this._store.dispatch(new TestsActions.UpdateTest(item.id, { requiredTariffId }));
        break;
      case 'rescue':
        obs = this._store.dispatch(new RescueActions.UpdateRescueItem(item.id, { requiredTariffId }));
        break;
      default:
        return;
    }
    obs.subscribe({
      next: () => this._clearAffectOption(),
      error: () => this._clearAffectOption()
    });
  }

  protected _refreshActivePanel(): void {
    const side = this._activePanel();
    this._fetchPanelData(this._getPanelFolderId(side), side);
  }

  protected _onRowContextMenu(event: MouseEvent, side: PanelSide, item: OptionType): void {
    event.preventDefault();
    event.stopPropagation();
    this._contextMenuItem.set(item);
    this._contextMenuPanel.set(side);
    this._select(side, item, event);
    this._contextMenuTrigger()?.openMenu();
  }

  protected _confirmRename(option: OptionType, name: NullableValue<string>): void {
    switch (option.type) {
      case 'folder':
        this._store.dispatch(new FoldersActions.UpdateFolder(option.id, { name: name ?? '' }))
          .subscribe(() => this._clearAffectOption());
        break;
      case 'article':
        this._store.dispatch(new ArticlesActions.UpdateArticle(option.id, { name: name ?? '' }))
          .subscribe(() => this._clearAffectOption());
        break;
      case 'test':
        this._store.dispatch(new TestsActions.UpdateTest(option.id, { name: name ?? '' }))
          .subscribe(() => this._clearAffectOption());
        break;
      case 'rescue':
        this._store.dispatch(new RescueActions.UpdateRescueItem(option.id, { name: name ?? '' }))
          .subscribe(() => this._clearAffectOption());
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

  protected _getTypeLabel(option: OptionType): string {
    switch (option.type) {
      case 'folder':
        return 'Папка';
      case 'article':
        return 'Документ';
      case 'test':
        return 'Тест';
      case 'rescue':
        return 'Спасение';
      default:
        return '';
    }
  }

  protected _isHidden(item: OptionType): boolean {
    return item.type === 'test' && item.hidden === true;
  }

  protected _delete(option: OptionType, side: PanelSide): void {
    if (this._clipboard()?.item.id === option.id) {
      this._explorer.clipboard.set(null);
    }
    this._affectOptionId.set(option.id);
    this._affectOptionPanel.set(side);
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
    s?.subscribe(() => this._clearAffectOption());
  }

  protected _beginRename(itemId: string, side: PanelSide): void {
    this._affectOptionId.set(itemId);
    this._affectOptionPanel.set(side);
  }

  private _clearAffectOption(): void {
    this._affectOptionId.set(null);
    this._affectOptionPanel.set(null);
  }

  protected _handleDrop(side: PanelSide, event: CdkDragDrop<OptionType[]>): void {
    const draggedItem = event.item.data as OptionType;
    if (event.previousContainer !== event.container) {
      const targetFolderId = this._resolveDropTargetFolderId(side, event);
      if (!this._canMoveItemTo(draggedItem, targetFolderId)) {
        return;
      }
      const order = this._getNextOrder(targetFolderId);
      this._moveItem(this._toClipboardEntry(draggedItem, 'cut'), targetFolderId, order).subscribe();
      return;
    }

    // Reorder only when showing all tariffs — filtered list would corrupt global order
    if (this._isFilterActive()) {
      return;
    }

    const options = [...this._getPanelOptions(side)];
    moveItemInArray(options, event.previousIndex, event.currentIndex);
    if (side === 'left') {
      this._leftOptions.set(options);
    } else {
      this._rightOptions.set(options);
    }
    const actions: Array<FoldersActions.UpdateFolder | ArticlesActions.UpdateArticle | TestsActions.UpdateTest | RescueActions.UpdateRescueItem> = [];
    options.forEach((option, index) => {
      const toUpdate = { ...option };
      delete toUpdate.type;
      toUpdate.order = index;
      if (option.type === 'folder') {
        actions.push(new FoldersActions.UpdateFolder(option.id, toUpdate));
      } else if (option.type === 'article') {
        actions.push(new ArticlesActions.UpdateArticle(option.id, toUpdate));
      } else if (option.type === 'test') {
        actions.push(new TestsActions.UpdateTest(option.id, toUpdate));
      } else if (option.type === 'rescue') {
        actions.push(new RescueActions.UpdateRescueItem(option.id, toUpdate));
      }
    });
    this._store.dispatch(actions);
  }

  protected _onKeyDown(event: KeyboardEvent): void {
    if (this._isEditableTarget(event.target)) {
      return;
    }
    if (event.ctrlKey || event.metaKey) {
      switch (event.code) {
        case 'KeyC':
          event.preventDefault();
          this._copySelected();
          return;
        case 'KeyX':
          event.preventDefault();
          this._cutSelected();
          return;
        case 'KeyV':
          event.preventDefault();
          this._pasteToActivePanel();
          return;
      }
    }
    switch (event.key) {
      case 'F5':
        event.preventDefault();
        this._copySelected();
        break;
      case 'F6':
        event.preventDefault();
        this._cutSelected();
        break;
      case 'F2':
        event.preventDefault();
        this._renameSelected();
        break;
      case 'Delete':
        event.preventDefault();
        this._deleteSelected();
        break;
      case 'Backspace':
        event.preventDefault();
        this._goUp(this._activePanel());
        break;
      case 'Enter': {
        const side = this._activePanel();
        const selectedId = this._getSelectedId(side);
        const item = this._getPanelOptions(side).find(x => x.id === selectedId);
        if (item != null) {
          event.preventDefault();
          this._open(side, item);
        }
        break;
      }
      case 'ArrowUp':
        event.preventDefault();
        this._navigateSelection(-1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this._navigateSelection(1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this._switchPanel('left');
        break;
      case 'ArrowRight':
        event.preventDefault();
        this._switchPanel('right');
        break;
    }
  }

  private _navigateSelection(delta: -1 | 1): void {
    const side = this._activePanel();
    const options = this._getPanelOptions(side);
    if (options.length === 0) {
      return;
    }
    const currentId = this._getSelectedId(side);
    let index = currentId != null ? options.findIndex(x => x.id === currentId) : -1;
    if (index === -1) {
      index = delta > 0 ? 0 : options.length - 1;
    } else {
      index = Math.max(0, Math.min(options.length - 1, index + delta));
    }
    const item = options[index];
    this._selectItem(side, item);
    this._scrollSelectedIntoView(side, item.id);
  }

  private _switchPanel(side: PanelSide): void {
    this._activePanel.set(side);
    const options = this._getPanelOptions(side);
    if (this._getSelectedId(side) == null && options.length > 0) {
      this._selectItem(side, options[0]);
      this._scrollSelectedIntoView(side, options[0].id);
      return;
    }
    this._focusHost();
  }

  private _scrollSelectedIntoView(side: PanelSide, itemId: string): void {
    requestAnimationFrame(() => {
      const row = this._host.nativeElement.querySelector(
        `tr[data-tc-item-id="${itemId}"][data-tc-side="${side}"]`
      );
      row?.scrollIntoView({ block: 'nearest' });
    });
  }

  private _computeOptions(parentId: NullableValue<string>): OptionType[] {
    const folders = this._getFolders()(parentId) ?? [];
    const articles = this._getArticles()(parentId) ?? [];
    const tests = this._getTests()(parentId) ?? [];
    const rescueItems = this._getRescueItems()(parentId) ?? [];
    const filterId = this._filterTariffId();
    // touch tariffs so filter labels/default id invalidate options when tariffs load
    void this._defaultTariffId();
    let list = orderBy([
      ...folders.map(x => ({ ...x, type: 'folder' } satisfies OptionType)),
      ...articles.map(x => ({ ...x, type: 'article' } satisfies OptionType)),
      ...tests.map(x => ({ ...x, type: 'test' } satisfies OptionType)),
      ...rescueItems.map(x => ({ ...x, type: 'rescue' } satisfies OptionType))
    ], x => x.order);
    if (filterId != null) {
      const maxRank = this._tariffById().get(filterId)?.rank;
      if (maxRank != null) {
        // Same rule as mobile access: tariff rank N sees required ranks <= N
        list = list.filter((item) => this._itemTariffRank(item) <= maxRank);
      }
    }
    return list;
  }

  private _fetchPanelData(parentId: NullableValue<string>, side: PanelSide): void {
    const fetching = side === 'left' ? this._leftFetching : this._rightFetching;
    fetching.set(true);
    this._store.dispatch([
      new FoldersActions.FetchFolders(parentId),
      new ArticlesActions.FetchArticles(parentId),
      new TestsActions.FetchTests(parentId),
      new RescueActions.FetchRescueItems(parentId)
    ]).subscribe({
      complete: () => fetching.set(false),
      error: () => fetching.set(false)
    });
  }

  private _focusHost(): void {
    this._host.nativeElement.focus({ preventScroll: true });
  }

  private _shouldHandleKeyboard(event: KeyboardEvent): boolean {
    if (this._isEditableTarget(event.target)) {
      return false;
    }
    if (!(event.target instanceof HTMLElement)) {
      return true;
    }
    if (event.target.closest('.mat-mdc-dialog-container, .mat-mdc-menu-panel')) {
      return false;
    }
    return true;
  }

  private _isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    return target.closest('input, textarea, select, [contenteditable="true"]') != null;
  }

  private _getSelectedItem(): NullableValue<OptionType> {
    const panel = this._getActionPanel();
    if (panel == null) {
      return null;
    }
    const selectedId = this._getSelectedId(panel);
    return this._getPanelOptions(panel).find(x => x.id === selectedId) ?? null;
  }

  private _resolveDropTargetFolderId(side: PanelSide, event: CdkDragDrop<OptionType[]>): NullableValue<string> {
    const panelFolderId = this._getPanelFolderId(side);
    const options = this._getPanelOptions(side);
    const targetItem = options[event.currentIndex];
    if (targetItem?.type === 'folder') {
      return targetItem.id;
    }
    return panelFolderId;
  }

  private _canMoveItemTo(item: OptionType, targetFolderId: NullableValue<string>): boolean {
    if (item.type === 'folder' && item.id === targetFolderId) {
      return false;
    }
    const clip = this._toClipboardEntry(item, 'cut');
    if (clip.type === 'folder' && clip.mode === 'cut' && clip.item.id === targetFolderId) {
      return false;
    }
    return true;
  }

  private _getNextOrder(parentId: NullableValue<string>): number {
    const options = this._computeOptions(parentId);
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
          background: scene.background
            ? (pathMap.get(scene.background) ?? scene.background)
            : scene.background
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
