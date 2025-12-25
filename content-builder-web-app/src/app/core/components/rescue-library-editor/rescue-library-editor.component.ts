import { AppLoading, RescueLibraryActions, RescueLibraryState } from '@/core/store';
import { RescueLibraryItemVm, RescueLibraryFolderVm, RescueLibraryTestVm, RescueLibraryQuestionVm, RescueLibraryMedicineVm, generateGUID, NullableValue } from '@/core/utils';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { Store } from '@ngxs/store';
import { orderBy } from 'lodash';
import { forkJoin } from 'rxjs';

interface FlatItem {
  item: RescueLibraryItemVm;
  level: number;
}

@Component({
  selector: 'app-rescue-library-editor',
  imports: [
    MatIcon,
    MatButton,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule
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
    .tree-container {
      width: 30%;
      border-right: 1px solid #e0e0e0;
      overflow-y: auto;
      flex: 0 0 auto;
    }
    .tree-container > div {
      display: flex;
      flex-direction: column;
    }
    .form-container {
      width: 80%;
      padding: 16px;
      overflow-y: auto;
      flex: 1 1 auto;
    }
  `
})
export class RescueLibraryEditorComponent {
  private readonly _store = inject(Store);
  private readonly _dispatched = inject(AppLoading);

  protected readonly _selectedItem = signal<NullableValue<RescueLibraryItemVm>>(null);
  protected readonly _flatItems = signal<FlatItem[]>([]);
  protected readonly _visibleItems = computed(() => {
    const flatItems = this._flatItems();
    const expandedIds = this._expandedIds();
    const visible: FlatItem[] = [];
    
    // Создаем карту для быстрого поиска элементов по ID
    const itemMap = new Map<string, FlatItem>();
    flatItems.forEach(item => itemMap.set(item.item.id, item));
    
    for (const item of flatItems) {
      // Если это корневой элемент (level 0), всегда показываем
      if (item.level === 0) {
        visible.push(item);
        continue;
      }
      
      // Для вложенных элементов проверяем, развернуты ли все родители до корня
      let isVisible = true;
      let currentParentId = item.item.parentId;
      
      // Проверяем всех родителей до корня
      while (currentParentId) {
        const parentExpanded = expandedIds.has(currentParentId);
        if (!parentExpanded) {
          isVisible = false;
          break;
        }
        
        // Находим родителя для следующей итерации
        const parent = itemMap.get(currentParentId);
        if (!parent) {
          break;
        }
        currentParentId = parent.item.parentId;
      }
      
      if (isVisible) {
        visible.push(item);
      }
    }
    
    return visible;
  });
  private readonly _expandedIds = signal<Set<string>>(new Set());
  private readonly _pendingSelectionId = signal<NullableValue<string>>(null);

  protected readonly _isPending = computed(() =>
    this._dispatched.isDispatched(RescueLibraryActions.CreateRescueLibraryItem)()
    || this._dispatched.isDispatched(RescueLibraryActions.UpdateRescueLibraryItem)()
    || this._dispatched.isDispatched(RescueLibraryActions.DeleteRescueLibraryItem)()
  );

  protected readonly _form = new FormGroup({
    name: new FormControl<string>('', Validators.required),
    description: new FormControl<string>('')
  });

  constructor() {
    effect(() => {
      const isPending = this._isPending();
      if (isPending) {
        this._form.disable();
      }
      else {
        this._form.enable();
      }
    });

    // Загружаем все элементы библиотеки
    this._store.dispatch(new RescueLibraryActions.FetchAllRescueLibraryItems());

    // Подписываемся на изменения элементов
    effect(() => {
      const items = this._store.selectSignal(RescueLibraryState.getAllRescueLibraryItems)();
      this._buildFlatList(items);

      // Если есть ожидаемый элемент для выбора, выбираем его после перестройки списка
      const pendingId = this._pendingSelectionId();
      if (pendingId) {
        const createdItem = items.find(x => x.id === pendingId);
        if (createdItem) {
          setTimeout(() => {
            const flatItem = this._flatItems().find(x => x.item.id === pendingId);
            if (flatItem) {
              this._selectItem(flatItem.item);
              this._pendingSelectionId.set(null);
            }
          }, 50);
        }
      }
    });
  }

  protected _getIconForType(type: string): string {
    switch (type) {
      case 'folder':
        return 'folder';
      case 'test':
        return 'file-circle-check';
      case 'question':
        return 'file-contract';
      case 'medicine':
        return 'kit-medical';
      default:
        return 'file-contract';
    }
  }

  private _calculateLevel(itemId: string, items: RescueLibraryItemVm[], visited: Set<string> = new Set()): number {
    // Защита от циклических ссылок
    if (visited.has(itemId)) {
      return 0;
    }
    visited.add(itemId);
    
    const item = items.find(x => x.id === itemId);
    if (!item || !item.parentId) {
      return 0;
    }
    return 1 + this._calculateLevel(item.parentId, items, visited);
  }

  private _buildFlatList(items: RescueLibraryItemVm[]): void {
    const itemMap = new Map<string, RescueLibraryItemVm>();
    items.forEach(item => itemMap.set(item.id, item));

    // Вычисляем level для каждого элемента
    const flatItems: FlatItem[] = items.map(item => ({
      item,
      level: this._calculateLevel(item.id, items)
    }));

    // Сортируем: сначала по level, потом по order
    const sortedItems = orderBy(flatItems, ['level', 'item.order'], ['asc', 'asc']);
    this._flatItems.set(sortedItems);
  }

  protected _hasChildren(itemId: string): boolean {
    return this._flatItems().some(x => x.item.parentId === itemId);
  }

  protected _isExpanded(itemId: string): boolean {
    return this._expandedIds().has(itemId);
  }

  protected _toggleExpand(itemId: string, event: Event): void {
    event.stopPropagation();
    const expanded = new Set(this._expandedIds());
    if (expanded.has(itemId)) {
      expanded.delete(itemId);
    } else {
      expanded.add(itemId);
    }
    this._expandedIds.set(expanded);
  }

  protected _selectItem(item: RescueLibraryItemVm): void {
    // Если элемент уже выбран, снимаем выбор (deselect)
    if (this._selectedItem()?.id === item.id) {
      this._selectedItem.set(null);
      this._form.reset();
      return;
    }
    this._selectedItem.set(item);
    const description = item.type !== 'unknown' ? item.description : '';
    this._form.reset({
      name: item.name ?? '',
      description
    });
  }

  protected _handleSubmit(): void {
    const selected = this._selectedItem();
    if (!selected) {
      return;
    }

    const { name, description } = this._form.value;
    this._store.dispatch(new RescueLibraryActions.UpdateRescueLibraryItem(selected.id, {
      name: name!,
      description: description ?? undefined
    } as Partial<RescueLibraryItemVm>));
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

  protected _handleCreate(type: 'folder' | 'test' | 'question' | 'medicine'): void {
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
      medicine: 'Новый медикамент'
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
    }
    
    // Устанавливаем ID для последующего выбора после создания
    this._pendingSelectionId.set(newId);
    this._store.dispatch(new RescueLibraryActions.CreateRescueLibraryItem(newItem));
    
    // Если создаем в папку, автоматически разворачиваем её
    if (parentId) {
      const expanded = new Set(this._expandedIds());
      expanded.add(parentId);
      this._expandedIds.set(expanded);
    }
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
      this._form.reset();
    });
  }
}
