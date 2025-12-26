import { AppLoading, RescueLibraryActions, RescueLibraryState } from '@/core/store';
import { RescueLibraryItemVm, RescueLibraryFolderVm, RescueLibraryTestVm, RescueLibraryQuestionVm, RescueLibraryMedicineVm, RescueLibraryTriggerVm, generateGUID, NullableValue } from '@/core/utils';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Store } from '@ngxs/store';
import { AngularSplitModule } from 'angular-split';
import { forkJoin } from 'rxjs';
import { RescueLibraryFolderFormComponent } from './rescue-library-folder-form';
import { RescueLibraryTestFormComponent } from './rescue-library-test-form';
import { RescueLibraryQuestionFormComponent } from './rescue-library-question-form';
import { RescueLibraryMedicineFormComponent } from './rescue-library-medicine-form';
import { RescueLibraryTreeComponent } from './rescue-library-tree';
import { RescueLibraryTriggerFormComponent } from './rescue-library-trigger-form';

@Component({
  selector: 'app-rescue-library-editor',
  imports: [
    MatIcon,
    MatButton,
    MatMenuModule,
    AngularSplitModule,
    RescueLibraryTreeComponent,
    RescueLibraryFolderFormComponent,
    RescueLibraryTestFormComponent,
    RescueLibraryQuestionFormComponent,
    RescueLibraryMedicineFormComponent,
    RescueLibraryTriggerFormComponent
  ],
  templateUrl: './rescue-library-editor.component.html',
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    .form-container {
      padding: 16px;
      overflow-y: auto;
      height: 100%;
    }
  `
})
export class RescueLibraryEditorComponent {
  private readonly _store = inject(Store);
  private readonly _dispatched = inject(AppLoading);

  protected readonly _selectedItem = signal<NullableValue<RescueLibraryItemVm>>(null);
  private readonly _pendingSelectionId = signal<NullableValue<string>>(null);

  protected readonly _isPending = computed(() =>
    this._dispatched.isDispatched(RescueLibraryActions.CreateRescueLibraryItem)()
    || this._dispatched.isDispatched(RescueLibraryActions.UpdateRescueLibraryItem)()
    || this._dispatched.isDispatched(RescueLibraryActions.DeleteRescueLibraryItem)()
  );

  private readonly _pendingTestCreation = signal<NullableValue<string>>(null);
  private readonly _previousHiddenTestsCount = signal<number>(0);

  constructor() {
    // Загружаем все элементы библиотеки
    this._store.dispatch(new RescueLibraryActions.FetchAllRescueLibraryItems());

    // Подписываемся на изменения элементов для автоматического выбора созданного элемента
    effect(() => {
      const items = this._store.selectSignal(RescueLibraryState.getAllRescueLibraryItems)();
      const pendingId = this._pendingSelectionId();
      
      if (pendingId) {
        const createdItem = items.find(x => x.id === pendingId);
        if (createdItem) {
          setTimeout(() => {
            this._onItemSelect(createdItem);
            this._pendingSelectionId.set(null);
          }, 100);
        }
      }
    });
  }

  protected _onItemSelect(item: RescueLibraryItemVm): void {
    // Если элемент уже выбран, снимаем выбор (deselect)
    if (this._selectedItem()?.id === item.id) {
      this._selectedItem.set(null);
      return;
    }
    this._selectedItem.set(item);
  }

  protected _isFolder(item: RescueLibraryItemVm): item is RescueLibraryFolderVm {
    return item.type === 'folder';
  }

  protected _isTest(item: RescueLibraryItemVm): item is RescueLibraryTestVm {
    return item.type === 'test';
  }

  protected _isQuestion(item: RescueLibraryItemVm): item is RescueLibraryQuestionVm {
    return item.type === 'question';
  }

  protected _isMedicine(item: RescueLibraryItemVm): item is RescueLibraryMedicineVm {
    return item.type === 'medicine';
  }

  protected _isTrigger(item: RescueLibraryItemVm): item is RescueLibraryTriggerVm {
    return item.type === 'trigger';
  }


  protected _handleSubmit(payload: Partial<RescueLibraryItemVm>): void {
    const selected = this._selectedItem();
    if (!selected) {
      return;
    }

    this._store.dispatch(new RescueLibraryActions.UpdateRescueLibraryItem(selected.id, payload));
  }

  protected _handleTestCreatedOrEdited(): void {
    // Обновляем список элементов после создания/редактирования теста
    this._store.dispatch(new RescueLibraryActions.FetchAllRescueLibraryItems());
  }

  protected _handleQuestionCreatedOrEdited(): void {
    // Обновляем список элементов после создания/редактирования вопроса
    this._store.dispatch(new RescueLibraryActions.FetchAllRescueLibraryItems());
  }

  protected _canCreateChild(): boolean {
    const selected = this._selectedItem();
    // Если ничего не выбрано, можно создавать в корень
    if (!selected) {
      return true;
    }
    // Если выбран узел, можно создавать дочерние только если это папка
    return selected.type === 'folder';
  }

  protected _handleCreate(type: 'folder' | 'test' | 'question' | 'medicine' | 'trigger'): void {
    const selected = this._selectedItem();
    const newId = generateGUID();

    // Определяем parentId: если выбран узел и это папка, добавляем как дочерний, иначе в корень
    let parentId: NullableValue<string> = null;
    if (selected && selected.type === 'folder') {
      parentId = selected.id;
    }

    // Определяем имя по умолчанию в зависимости от типа
    const defaultNames: Record<typeof type, string> = {
      folder: 'Новая папка',
      test: 'Новый тест',
      question: 'Новый вопрос',
      medicine: 'Новый медикамент',
      trigger: 'Новый триггер'
    };

    let newItem: RescueLibraryItemVm;

    switch (type) {
      case 'folder':
        newItem = {
          id: newId,
          name: defaultNames.folder,
          type: 'folder',
          parentId,
          order: 0
        } as RescueLibraryFolderVm;
        break;
      case 'test':
        newItem = {
          id: newId,
          name: defaultNames.test,
          type: 'test',
          parentId,
          order: 0
        } as RescueLibraryTestVm;
        break;
      case 'question':
        newItem = {
          id: newId,
          name: defaultNames.question,
          type: 'question',
          parentId,
          order: 0
        } as RescueLibraryQuestionVm;
        break;
      case 'medicine':
        newItem = {
          id: newId,
          name: defaultNames.medicine,
          type: 'medicine',
          parentId,
          order: 0
        } as RescueLibraryMedicineVm;
        break;
      case 'trigger':
        newItem = {
          id: newId,
          name: defaultNames.trigger,
          type: 'trigger',
          parentId,
          order: 0
        } as RescueLibraryTriggerVm;
        break;
    }

    // Устанавливаем ID для последующего выбора после создания
    this._pendingSelectionId.set(newId);
    this._store.dispatch(new RescueLibraryActions.CreateRescueLibraryItem(newItem));
  }

  private _getAllChildrenIds(parentId: string, items: RescueLibraryItemVm[]): string[] {
    const childrenIds: string[] = [];
    const directChildren = items.filter(x => x.parentId === parentId);

    for (const child of directChildren) {
      childrenIds.push(child.id);
      // Рекурсивно получаем дочерние элементы
      const nestedChildren = this._getAllChildrenIds(child.id, items);
      childrenIds.push(...nestedChildren);
    }

    return childrenIds;
  }

  protected _handleDelete(): void {
    const selected = this._selectedItem();
    if (!selected) {
      return;
    }

    // Получаем все элементы для поиска дочерних
    const allItems = this._store.selectSignal(RescueLibraryState.getAllRescueLibraryItems)();

    // Находим все дочерние элементы рекурсивно
    const childrenIds = this._getAllChildrenIds(selected.id, allItems);

    // Создаем массив действий для удаления: сначала дочерние, потом родительский
    const deleteActions = [
      ...childrenIds.map(id => this._store.dispatch(new RescueLibraryActions.DeleteRescueLibraryItem(id))),
      this._store.dispatch(new RescueLibraryActions.DeleteRescueLibraryItem(selected.id))
    ];

    // Выполняем все удаления параллельно
    forkJoin(deleteActions).subscribe(() => {
      this._selectedItem.set(null);
    });
  }
}
