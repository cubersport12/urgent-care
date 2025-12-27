import { Component, computed, effect, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTableModule } from '@angular/material/table';
import { RescueStoryDataVm, RescueStorySceneTriggerVm, RescueLibraryItemVm, generateGUID, RescueStorySceneRestrictionParamVm, RescueStorySceneRestrictionsVm, RescueLibraryTriggerVm, RescueStorySceneTriggerParamVm } from '@/core/utils';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { RescueLibraryTreeComponent } from '@/core/components/rescue-library-editor/rescue-library-tree';
import { CommonModule } from '@angular/common';
import { Store } from '@ngxs/store';
import { RescueLibraryState, RescueState } from '@/core/store';
import { AppFilesStorageService } from '@/core/api';

@Component({
  selector: 'app-rescue-story-item-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButton,
    MatIcon,
    MatExpansionModule,
    MatTableModule,
    RescueLibraryTreeComponent
  ],
  templateUrl: './rescue-story-item-form.component.html',
  styles: `
    .scene-editor {
      display: flex;
      gap: 16px;
      width: 100%;
    }
    .tree-panel {
      width: 450px;
      min-width: 300px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 8px;
      // background: #f5f5f5;
    }
    .image-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .image-container {
      position: relative;
      width: 100%;
      aspect-ratio: 9 / 20;
      border: 2px dashed #ccc;
      border-radius: 4px;
      text-align: center;
      overflow: hidden;
      // background: #fafafa;
    }
    .image-container.has-image {
      border: 2px solid #4caf50;
    }
    .scene-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #fff;
    }
    .scene-element {
      position: absolute;
      background: var(--mat-sys-surface-container);
      opacity: 0.7;
      border-radius: 5px;
      padding: 5px;
      cursor: move;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
      touch-action: none;
      overflow: hidden;
    }
    .scene-element span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      min-width: 0;
    }
    .scene-element.selected {
      opacity: 1;
      background: var(--mat-sys-primary-container);
      // background: rgba(255, 152, 0, 0.2);
      z-index: 10;
    }
    .scene-element.dragging {
      opacity: 0.5;
    }
    .params-panel {
      width: 450px;
      min-width: 300px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 16px;
      // background: #f5f5f5;
    }
    table {
      width: 100%;
    }
    .mat-mdc-form-field {
      width: 100%;
    }
    td, th {
      max-width: 150px;
      min-width: 100px;
    }
    td input {
      padding: 2px;
      width: 100%;
    }
    .upload-button {
      margin-bottom: 8px;
    }
  `
})
export class RescueStoryItemFormComponent {
  private readonly _filesStorage = inject(AppFilesStorageService);
  private readonly _store = inject(Store);

  storyData = input.required<RescueStoryDataVm>();
  storyName = input.required<string>();
  storyId = input<string>('');
  rescueId = input<string>('');
  submitEvent = output<{ name: string; data: RescueStoryDataVm }>();
  imageFileEvent = output<{ storyId: string; file: File }>();

  protected readonly _form = new FormGroup({
    name: new FormControl<string>('', Validators.required)
  });

  private readonly _formValues = signal<{ name: string }>({ name: '' });

  // Scene editor state
  protected readonly _imageFile = signal<File | null>(null);
  protected readonly _imagePreviewUrl = signal<string | null>(null);
  protected readonly _selectedElement = signal<RescueStorySceneTriggerVm | null>(null);
  protected readonly _draggedItem = signal<RescueLibraryItemVm | null>(null);
  protected readonly _draggedElement = signal<RescueStorySceneTriggerVm | null>(null);
  protected readonly _dragOffset = signal<{ x: number; y: number } | null>(null);

  protected readonly _imageContainer = viewChild<ElementRef<HTMLDivElement>>('imageContainer');
  protected readonly _fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly _elementParamsForm = new FormGroup({
    positionX: new FormControl<number>(0, [Validators.required, Validators.min(0), Validators.max(100)]),
    positionY: new FormControl<number>(0, [Validators.required, Validators.min(0), Validators.max(100)]),
    width: new FormControl<number>(10, [Validators.required, Validators.min(1), Validators.max(100)]),
    height: new FormControl<number>(10, [Validators.required, Validators.min(1), Validators.max(100)])
  });

  // Форма для параметров триггера (Map: itemId_parameterId -> FormControl)
  protected readonly _triggerParameterControls = new Map<string, FormControl<string | number>>();

  // Форма для visibleParams триггера (Map: parameterId -> FormControl)
  protected readonly _triggerVisibleParamControls = new Map<string, FormControl<string | number>>();
  protected readonly _elementParameterControls = new Map<string, FormControl<string | number>>();

  // Получаем параметры из rescue item
  protected readonly _availableParameters = computed(() => {
    const rescueId = this.rescueId();
    if (!rescueId) {
      return [];
    }
    const items = this._store.selectSignal(RescueState.getAllRescueItems)();
    const rescueItem = items.find(item => item.id === rescueId);
    return rescueItem?.data?.parameters || [];
  });

  // Получаем текущие restrictions из scene
  protected readonly _currentRestrictions = computed(() => {
    return this.storyData().scene.restritions || [];
  });

  // Форма для restrictions (один restriction с массивом params)
  // Используем Map для хранения FormControl для каждого параметра
  protected readonly _restrictionParamControls = new Map<string, FormControl<string | number>>();

  constructor() {
    // Отслеживаем изменения формы
    this._form.valueChanges.subscribe(() => {
      this._formValues.set({
        name: this._form.value.name ?? ''
      });
    });

    // Автоматически эмитим изменения в родительский компонент с debounce
    this._form.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((prev, curr) =>
          prev.name === curr.name
        )
      )
      .subscribe(() => {
        // Эмитим изменения при валидной форме
        if (this._form.valid) {
          this._emitFormData();
        }
      });

    // Отслеживаем изменения параметров элемента
    this._elementParamsForm.valueChanges.subscribe(() => {
      if (this._elementParamsForm.valid && this._selectedElement()) {
        this._updateSelectedElement();
      }
    });

    // Инициализация изображения из storyData
    effect(() => {
      const scene = this.storyData().scene;
      if (scene.backgroundImage && !scene.backgroundImage.startsWith('pending_')) {
        // Если есть URL изображения и это не временный путь, загружаем его для preview
        this._filesStorage.downloadFile(scene.backgroundImage).subscribe({
          next: (blob) => {
            const url = URL.createObjectURL(blob);
            this._imagePreviewUrl.set(url);
          },
          error: (err) => {
            console.error('Ошибка загрузки изображения:', err);
            // Если не удалось загрузить, пробуем использовать как прямой URL
            this._imagePreviewUrl.set(scene.backgroundImage);
          }
        });
      }
    });

    effect(() => {
      const data = this.storyData();
      const name = this.storyName();
      if (data) {
        // Обновляем только если значение изменилось, чтобы не сбрасывать форму при вводе
        if (this._form.value.name !== name) {
          this._form.patchValue({
            name: name
          }, { emitEvent: true });
        }
      }

      // Инициализируем restrictions форму
      const restrictions = data?.scene.restritions || [];
      const params = restrictions.length > 0 ? restrictions[0].params || [] : [];

      // Очищаем старые контролы
      this._restrictionParamControls.clear();

      // Создаем FormControl для каждого параметра в restrictions
      params.forEach((param: RescueStorySceneRestrictionParamVm) => {
        const control = new FormControl<string | number | null>(param.value, Validators.required);
        control.valueChanges.subscribe(() => {
          this._emitFormData();
        });
        this._restrictionParamControls.set(param.id, control as FormControl<string | number>);
      });
    });
  }

  // Scene editor methods
  protected _onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file && file.type.startsWith('image/')) {
      this._imageFile.set(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        this._imagePreviewUrl.set(e.target?.result as string);
        this._emitFormData();
      };
      reader.readAsDataURL(file);
    }
  }

  protected _triggerFileInput(): void {
    this._fileInput()?.nativeElement.click();
  }

  protected _onTreeItemSelect(item: RescueLibraryItemVm): void {
    // При выборе элемента в дереве, устанавливаем его как перетаскиваемый
    this._draggedItem.set(item);
  }

  protected _onTreeItemDragStart(event: DragEvent, item: RescueLibraryItemVm): void {
    this._draggedItem.set(item);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('text/plain', item.id);
    }
  }

  protected _onImageContainerDragOver(event: DragEvent): void {
    // Запрещаем drop, если изображение не загружено
    if (!this._imagePreviewUrl()) {
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'none';
      }
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      // Если перетаскивается существующий элемент, используем 'move', иначе 'copy'
      const draggedElement = this._draggedElement();
      event.dataTransfer.dropEffect = draggedElement ? 'move' : 'copy';
    }
  }

  protected _onImageContainerDrop(event: DragEvent): void {
    // Запрещаем drop, если изображение не загружено
    if (!this._imagePreviewUrl()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    // Если перетаскивается существующий элемент, обновляем его позицию
    const draggedElement = this._draggedElement();
    if (draggedElement && this._imageContainer()) {
      const container = this._imageContainer()!.nativeElement;
      const rect = container.getBoundingClientRect();
      const offset = this._dragOffset();

      // Вычисляем новую позицию относительно контейнера
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      // Преобразуем в проценты
      let x = (mouseX / rect.width) * 100;
      let y = (mouseY / rect.height) * 100;

      // Корректируем позицию с учетом смещения от точки клика (если есть)
      if (offset) {
        x -= (offset.x / rect.width) * 100;
        y -= (offset.y / rect.height) * 100;
      }

      // Ограничиваем значения в пределах 0-100%
      x = Math.max(0, Math.min(100, x));
      y = Math.max(0, Math.min(100, y));

      const updatedTrigger: RescueStorySceneTriggerVm = {
        ...draggedElement,
        position: { x, y }
      };

      const currentScene = this.storyData().scene;
      const updatedTriggers = currentScene.items.map(t =>
        t.triggerId === draggedElement.triggerId ? updatedTrigger : t
      );

      this._updateScene({ ...currentScene, items: updatedTriggers });
      this._selectedElement.set(updatedTrigger);
      this._updateElementParamsForm(updatedTrigger);
      this._onElementDragEnd();
      return;
    }

    // Если перетаскивается новый элемент из дерева
    let draggedItem = this._draggedItem();

    // Если элемент не установлен через событие, пытаемся получить из dataTransfer
    if (!draggedItem && event.dataTransfer) {
      try {
        const jsonData = event.dataTransfer.getData('application/json');
        if (jsonData) {
          const itemData = JSON.parse(jsonData);
          // Получаем полный элемент из store
          const items = this._store.selectSignal(RescueLibraryState.getAllRescueLibraryItems)();
          draggedItem = items.find(i => i.id === itemData.id) || null;
        }
        else {
          // Fallback: получаем ID из text/plain
          const itemId = event.dataTransfer.getData('text/plain');
          if (itemId) {
            const items = this._store.selectSignal(RescueLibraryState.getAllRescueLibraryItems)();
            draggedItem = items.find(i => i.id === itemId) || null;
          }
        }
      }
      catch (e) {
        console.error('Ошибка при получении данных из drag event:', e);
      }
    }

    if (!draggedItem || !this._imageContainer()) {
      console.warn('Не удалось получить элемент для drop или контейнер изображения не найден');
      return;
    }

    const container = this._imageContainer()!.nativeElement;
    const rect = container.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    const newTrigger: RescueStorySceneTriggerVm = {
      triggerId: draggedItem.id,
      position: { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) },
      size: { width: 20, height: 10 },
      parameters: [],
      visibleParams: []
    };

    const currentScene = this.storyData().scene;
    const updatedTriggers = [...currentScene.items, newTrigger];

    this._updateScene({ ...currentScene, items: updatedTriggers });
    this._selectedElement.set(newTrigger);
    this._updateElementParamsForm(newTrigger);

    this._draggedItem.set(null);
  }

  protected _onElementClick(trigger: RescueStorySceneTriggerVm, event: MouseEvent): void {
    event.stopPropagation();
    this._selectedElement.set(trigger);
    this._updateElementParamsForm(trigger);
  }

  protected _onElementDragStart(event: DragEvent, trigger: RescueStorySceneTriggerVm): void {
    // Запрещаем перетаскивание, если изображение не загружено
    if (!this._imagePreviewUrl()) {
      event.preventDefault();
      return;
    }

    event.stopPropagation();
    this._draggedElement.set(trigger);

    if (!this._imageContainer()) {
      return;
    }

    const container = this._imageContainer()!.nativeElement;
    const rect = container.getBoundingClientRect();
    const elementX = (trigger.position.x / 100) * rect.width;
    const elementY = (trigger.position.y / 100) * rect.height;

    // Вычисляем смещение от начала элемента до точки клика
    const offsetX = event.clientX - rect.left - elementX;
    const offsetY = event.clientY - rect.top - elementY;

    this._dragOffset.set({ x: offsetX, y: offsetY });

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', trigger.triggerId);
    }
  }

  protected _onElementDragEnd(): void {
    this._draggedElement.set(null);
    this._dragOffset.set(null);
  }

  protected _onImageContainerClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const container = this._imageContainer()?.nativeElement;

    // Проверяем, что клик был именно по контейнеру или по изображению, но не по элементу
    if (container && (target === container || target.classList.contains('scene-image'))) {
      this._selectedElement.set(null);
      this._elementParamsForm.reset();
    }
  }

  protected _deleteSelectedElement(): void {
    const selected = this._selectedElement();
    if (!selected) {
      return;
    }

    const currentScene = this.storyData().scene;
    const updatedTriggers = currentScene.items.filter(t => t.triggerId !== selected.triggerId);
    this._updateScene({ ...currentScene, items: updatedTriggers });
    this._selectedElement.set(null);
    this._elementParamsForm.reset();
  }

  private _updateElementParamsForm(trigger: RescueStorySceneTriggerVm): void {
    this._elementParamsForm.patchValue({
      positionX: trigger.position.x,
      positionY: trigger.position.y,
      width: trigger.size.width,
      height: trigger.size.height
    }, { emitEvent: false });

    // Инициализируем форму параметров триггера (только для триггеров)
    if (this._isSelectedTrigger()) {
      this._initializeTriggerParameters(trigger);
    }

    // Инициализируем visibleParams для всех элементов
    this._initializeElementVisibleParams(trigger);
    
    // Инициализируем parameters для не-триггеров
    if (!this._isSelectedTrigger()) {
      this._initializeElementParameters(trigger);
    }
  }

  private _initializeTriggerParameters(trigger: RescueStorySceneTriggerVm): void {
    // Очищаем старые контролы
    this._triggerParameterControls.clear();

    // Получаем триггер из библиотеки
    const libraryItems = this._store.selectSignal(RescueLibraryState.getAllRescueLibraryItems)();
    const triggerItem = libraryItems.find(i => i.id === trigger.triggerId) as RescueLibraryTriggerVm | undefined;

    if (!triggerItem || triggerItem.type !== 'trigger' || !triggerItem.data?.rescueLibraryItemId) {
      return;
    }

    // Получаем элементы для таблицы
    const tableItems = this._getTableItems(triggerItem.data.rescueLibraryItemId, libraryItems);
    const parameters = this._availableParameters();

    // Создаем FormControl для каждой комбинации itemId + parameterId
    // Для всех строк используем одинаковое значение из trigger.parameters (если есть)
    tableItems.forEach(item => {
      parameters.forEach(param => {
        const key = `${item.id}_${param.id}`;
        // Берем значение из существующих параметров триггера (если есть)
        const existingParam = trigger.parameters?.find(p => p.id === param.id);
        const defaultValue = existingParam?.value ?? (param.category === 'duration' ? '00:00:00' : 0);
        
        const control = new FormControl<string | number | null>(defaultValue);
        control.valueChanges.subscribe(() => {
          this._updateSelectedElementParameters();
        });
        this._triggerParameterControls.set(key, control as FormControl<string | number>);
      });
    });

  }

  private _initializeElementVisibleParams(trigger: RescueStorySceneTriggerVm): void {
    // Очищаем старые контролы
    this._triggerVisibleParamControls.clear();

    const parameters = this._availableParameters();

    // Создаем FormControl только для параметров, которые есть в visibleParams
    if (trigger.visibleParams && trigger.visibleParams.length > 0) {
      trigger.visibleParams.forEach(visibleParam => {
        const param = parameters.find(p => p.id === visibleParam.id);
        if (param) {
          const defaultValue = visibleParam.value ?? (param.category === 'duration' ? '00:00:00' : 0);
          const control = new FormControl<string | number | null>(defaultValue);
          control.valueChanges.subscribe(() => {
            this._updateSelectedElementVisibleParams();
          });
          this._triggerVisibleParamControls.set(param.id, control as FormControl<string | number>);
        }
      });
    }
  }

  private _initializeElementParameters(trigger: RescueStorySceneTriggerVm): void {
    // Очищаем старые контролы
    this._elementParameterControls.clear();

    const parameters = this._availableParameters();

    // Создаем FormControl только для параметров, которые есть в parameters
    if (trigger.parameters && trigger.parameters.length > 0) {
      trigger.parameters.forEach(param => {
        const availableParam = parameters.find(p => p.id === param.id);
        if (availableParam) {
          const defaultValue = param.value ?? (availableParam.category === 'duration' ? '00:00:00' : 0);
          const control = new FormControl<string | number | null>(defaultValue);
          control.valueChanges.subscribe(() => {
            this._updateElementParameters();
          });
          this._elementParameterControls.set(availableParam.id, control as FormControl<string | number>);
        }
      });
    }
  }

  private _getTableItems(rescueLibraryItemId: string, allItems: RescueLibraryItemVm[]): RescueLibraryItemVm[] {
    const item = allItems.find(i => i.id === rescueLibraryItemId);
    if (!item) {
      return [];
    }

    // Если это папка, получаем все вложенные элементы (кроме папок и триггеров)
    if (item.type === 'folder') {
      return this._getNestedItems(item.id, allItems, []);
    }

    // Если не папка, возвращаем сам элемент
    return [item];
  }

  private _getNestedItems(folderId: string, allItems: RescueLibraryItemVm[], result: RescueLibraryItemVm[]): RescueLibraryItemVm[] {
    const children = allItems.filter(i => i.parentId === folderId);
    
    children.forEach(child => {
      if (child.type === 'folder') {
        // Рекурсивно получаем элементы из вложенных папок
        this._getNestedItems(child.id, allItems, result);
      }
      else if (child.type !== 'trigger') {
        // Добавляем элемент, если это не триггер
        result.push(child);
      }
    });

    return result;
  }

  private _updateSelectedElementParameters(): void {
    const selected = this._selectedElement();
    if (!selected) {
      return;
    }

    const parameters: RescueStorySceneTriggerParamVm[] = [];
    const libraryItems = this._store.selectSignal(RescueLibraryState.getAllRescueLibraryItems)();
    const triggerItem = libraryItems.find(i => i.id === selected.triggerId) as RescueLibraryTriggerVm | undefined;

    if (!triggerItem || triggerItem.type !== 'trigger' || !triggerItem.data?.rescueLibraryItemId) {
      return;
    }

    const tableItems = this._getTableItems(triggerItem.data.rescueLibraryItemId, libraryItems);
    const availableParams = this._availableParameters();

    // Собираем все значения параметров из формы
    // Для каждого параметра берем значение из первой строки (первого элемента)
    availableParams.forEach(param => {
      if (tableItems.length > 0) {
        const firstItem = tableItems[0];
        const key = `${firstItem.id}_${param.id}`;
        const control = this._triggerParameterControls.get(key);
        if (control && control.value !== null && control.value !== undefined) {
          parameters.push({
            id: param.id,
            value: control.value
          });
        }
      }
    });

    // Обновляем элемент с новыми параметрами
    const currentScene = this.storyData().scene;
    const updatedTriggers = currentScene.items.map(t =>
      t.triggerId === selected.triggerId 
        ? { ...selected, parameters, visibleParams: selected.visibleParams || [] }
        : t
    );

    this._updateScene({ ...currentScene, items: updatedTriggers });
    this._selectedElement.set({ ...selected, parameters, visibleParams: selected.visibleParams || [] });
  }

  private _updateSelectedElementVisibleParams(): void {
    const selected = this._selectedElement();
    if (!selected) {
      return;
    }

    const visibleParams: RescueStorySceneTriggerParamVm[] = [];
    const availableParams = this._availableParameters();

    // Собираем все значения visibleParams из формы
    availableParams.forEach(param => {
      const control = this._triggerVisibleParamControls.get(param.id);
      if (control && control.value !== null && control.value !== undefined) {
        visibleParams.push({
          id: param.id,
          value: control.value
        });
      }
    });

    // Обновляем элемент с новыми visibleParams
    const currentScene = this.storyData().scene;
    const updatedTriggers = currentScene.items.map(t =>
      t.triggerId === selected.triggerId 
        ? { 
            ...selected, 
            visibleParams, 
            parameters: selected.parameters || [] 
          }
        : t
    );

    this._updateScene({ ...currentScene, items: updatedTriggers });
    this._selectedElement.set({ 
      ...selected, 
      visibleParams, 
      parameters: selected.parameters || [] 
    });
  }

  // Computed для проверки, является ли выбранный элемент триггером
  protected readonly _isSelectedTrigger = computed(() => {
    const selected = this._selectedElement();
    if (!selected) {
      return false;
    }
    const libraryItems = this._store.selectSignal(RescueLibraryState.getAllRescueLibraryItems)();
    const item = libraryItems.find(i => i.id === selected.triggerId);
    return item?.type === 'trigger';
  });

  // Computed для получения элементов таблицы
  protected readonly _triggerTableItems = computed(() => {
    const selected = this._selectedElement();
    if (!selected) {
      return [];
    }
    const libraryItems = this._store.selectSignal(RescueLibraryState.getAllRescueLibraryItems)();
    const triggerItem = libraryItems.find(i => i.id === selected.triggerId) as RescueLibraryTriggerVm | undefined;
    
    if (!triggerItem || triggerItem.type !== 'trigger' || !triggerItem.data?.rescueLibraryItemId) {
      return [];
    }

    return this._getTableItems(triggerItem.data.rescueLibraryItemId, libraryItems);
  });

  // Получение FormControl для ячейки таблицы
  protected _getTriggerParameterControl(itemId: string, parameterId: string): FormControl<string | number> | null {
    const key = `${itemId}_${parameterId}`;
    return this._triggerParameterControls.get(key) || null;
  }

  // Получение значения параметра для ячейки
  protected _getTriggerParameterValue(itemId: string, parameterId: string): string | number {
    const control = this._getTriggerParameterControl(itemId, parameterId);
    if (control) {
      return control.value ?? (this._getParameterCategory(parameterId) === 'duration' ? '00:00:00' : 0);
    }
    return this._getParameterCategory(parameterId) === 'duration' ? '00:00:00' : 0;
  }

  // Обновление значения параметра
  protected _updateTriggerParameter(itemId: string, parameterId: string, value: string | number): void {
    const key = `${itemId}_${parameterId}`;
    let control = this._triggerParameterControls.get(key);

    if (!control) {
      const newControl = new FormControl<string | number | null>(value);
      newControl.valueChanges.subscribe(() => {
        this._updateSelectedElementParameters();
      });
      control = newControl as FormControl<string | number>;
      this._triggerParameterControls.set(key, control);
    }
    else {
      control.setValue(value, { emitEvent: true });
    }
  }

  private _updateSelectedElement(): void {
    const selected = this._selectedElement();
    if (!selected || !this._elementParamsForm.valid) {
      return;
    }

    const { positionX, positionY, width, height } = this._elementParamsForm.value;
    const updatedTrigger: RescueStorySceneTriggerVm = {
      ...selected,
      position: { x: positionX!, y: positionY! },
      size: { width: width!, height: height! },
      parameters: selected.parameters || [],
      visibleParams: selected.visibleParams || []
    };

    const currentScene = this.storyData().scene;
    const updatedTriggers = currentScene.items.map(t =>
      t.triggerId === selected.triggerId ? updatedTrigger : t
    );

    this._updateScene({ ...currentScene, items: updatedTriggers });
    this._selectedElement.set(updatedTrigger);
  }

  private _updateScene(scene: RescueStoryDataVm['scene']): void {
    const { name } = this._form.value;

    // Получаем restrictions из формы
    const restrictions = this._getRestrictionsFromControls();

    this.submitEvent.emit({
      name: name!,
      data: {
        scene: {
          ...scene,
          restritions: restrictions
        }
      }
    });
  }

  private _emitFormData(): void {
    const { name } = this._form.value;
    const imageFile = this._imageFile();

    // Если есть новое изображение, эмитим событие для загрузки в родительском компоненте
    // Пока используем временный путь для preview
    const backgroundImage = imageFile
      ? imageFile.name
      : this.storyData().scene.backgroundImage;

    // Эмитим файл изображения отдельно для загрузки при сохранении
    if (imageFile) {
      // Используем переданный storyId или генерируем временный
      const storyId = this.storyId() || generateGUID();
      this.imageFileEvent.emit({ storyId, file: imageFile });
    }

    // Получаем restrictions из формы
    const restrictions = this._getRestrictionsFromControls();

    this.submitEvent.emit({
      name: name!,
      data: {
        scene: {
          ...this.storyData().scene,
          backgroundImage,
          restritions: restrictions
        }
      }
    });
  }

  protected _getElementStyle(trigger: RescueStorySceneTriggerVm): Record<string, string> {
    return {
      left: `${trigger.position.x}%`,
      top: `${trigger.position.y}%`,
      width: `${trigger.size.width}%`,
      height: `${trigger.size.height}%`
    };
  }

  protected _isElementSelected(trigger: RescueStorySceneTriggerVm): boolean {
    return this._selectedElement()?.triggerId === trigger.triggerId;
  }

  protected _getItemName(triggerId: string): string {
    const items = this._store.selectSignal(RescueLibraryState.getAllRescueLibraryItems)();
    const item = items.find(i => i.id === triggerId);
    return item?.name || triggerId;
  }

  protected _getItemIcon(triggerId: string): string {
    const items = this._store.selectSignal(RescueLibraryState.getAllRescueLibraryItems)();
    const item = items.find(i => i.id === triggerId);
    if (!item) return 'file-contract';

    switch (item.type) {
      case 'folder': return 'folder';
      case 'test': return 'file-circle-check';
      case 'question': return 'file-contract';
      case 'medicine': return 'kit-medical';
      case 'trigger': return 'bolt';
      default: return 'file-contract';
    }
  }

  protected _getSelectedElementType(): string | null {
    const selected = this._selectedElement();
    if (!selected) {
      return null;
    }
    const items = this._store.selectSignal(RescueLibraryState.getAllRescueLibraryItems)();
    const item = items.find(i => i.id === selected.triggerId);
    return item?.type || null;
  }

  protected _isTestOrQuestion(): boolean {
    const type = this._getSelectedElementType();
    return type === 'test' || type === 'question';
  }

  // Методы для работы с restrictions
  protected _getParameterCategory(parameterId: string): 'number' | 'duration' {
    const parameter = this._availableParameters().find(p => p.id === parameterId);
    return parameter?.category || 'number';
  }

  protected _getParameterLabel(parameterId: string): string {
    const parameter = this._availableParameters().find(p => p.id === parameterId);
    return parameter?.label || parameterId;
  }

  protected _getRestrictionParamValue(parameterId: string): string | number {
    const control = this._restrictionParamControls.get(parameterId);
    if (control) {
      return control.value ?? (this._getParameterCategory(parameterId) === 'duration' ? '00:00:00' : 0);
    }
    return this._getParameterCategory(parameterId) === 'duration' ? '00:00:00' : 0;
  }

  protected _getRestrictionParamControl(parameterId: string): FormControl<string | number> | null {
    return this._restrictionParamControls.get(parameterId) || null;
  }

  protected _updateRestrictionParam(parameterId: string, value: string | number): void {
    let control = this._restrictionParamControls.get(parameterId);

    if (!control) {
      // Создаем новый контрол
      const newControl = new FormControl<string | number | null>(value, Validators.required);
      newControl.valueChanges.subscribe(() => {
        this._emitFormData();
      });
      control = newControl as FormControl<string | number>;
      this._restrictionParamControls.set(parameterId, control);
    }
    else {
      // Обновляем существующий контрол
      control.setValue(value, { emitEvent: true });
    }
  }

  protected _removeRestrictionParam(parameterId: string): void {
    const control = this._restrictionParamControls.get(parameterId);
    if (control) {
      this._restrictionParamControls.delete(parameterId);
      this._emitFormData();
    }
  }

  protected _isParameterInRestrictions(parameterId: string): boolean {
    return this._restrictionParamControls.has(parameterId);
  }

  protected _onRestrictionInputKeyDown(event: KeyboardEvent): void {
    // Предотвращаем закрытие поля при нажатии минуса или других специальных клавиш
    event.stopPropagation();
    // Разрешаем ввод минуса для отрицательных чисел
    if (event.key === '-' || event.key === 'Minus') {
      event.stopImmediatePropagation();
    }
  }

  // Получение колонок для таблицы
  protected _getTableDisplayedColumns(): string[] {
    const columns = ['itemName'];
    const parameters = this._availableParameters();
    parameters.forEach(param => {
      columns.push('param_' + param.id);
    });
    return columns;
  }

  // Методы для работы с visibleParams
  protected _getVisibleParamControl(parameterId: string): FormControl<string | number> | null {
    return this._triggerVisibleParamControls.get(parameterId) || null;
  }

  protected _getVisibleParamValue(parameterId: string): string | number {
    const control = this._triggerVisibleParamControls.get(parameterId);
    if (control) {
      return control.value ?? (this._getParameterCategory(parameterId) === 'duration' ? '00:00:00' : 0);
    }
    return this._getParameterCategory(parameterId) === 'duration' ? '00:00:00' : 0;
  }

  protected _updateVisibleParam(parameterId: string, value: string | number): void {
    let control = this._triggerVisibleParamControls.get(parameterId);
    
    if (!control) {
      const newControl = new FormControl<string | number | null>(value);
      newControl.valueChanges.subscribe(() => {
        this._updateSelectedElementVisibleParams();
      });
      control = newControl as FormControl<string | number>;
      this._triggerVisibleParamControls.set(parameterId, control);
    }
    else {
      control.setValue(value, { emitEvent: true });
    }
  }

  protected _removeVisibleParam(parameterId: string): void {
    const control = this._triggerVisibleParamControls.get(parameterId);
    if (control) {
      this._triggerVisibleParamControls.delete(parameterId);
      this._updateSelectedElementVisibleParams();
    }
  }

  protected _isParameterInVisibleParams(parameterId: string): boolean {
    return this._triggerVisibleParamControls.has(parameterId);
  }

  // Методы для работы с parameters (для не-триггеров)
  protected _getElementParameterControl(parameterId: string): FormControl<string | number> | null {
    return this._elementParameterControls.get(parameterId) || null;
  }

  protected _getElementParameterValue(parameterId: string): string | number {
    const control = this._elementParameterControls.get(parameterId);
    if (control) {
      return control.value ?? (this._getParameterCategory(parameterId) === 'duration' ? '00:00:00' : 0);
    }
    return this._getParameterCategory(parameterId) === 'duration' ? '00:00:00' : 0;
  }

  protected _updateElementParameter(parameterId: string, value: string | number): void {
    let control = this._elementParameterControls.get(parameterId);
    
    if (!control) {
      const newControl = new FormControl<string | number | null>(value);
      newControl.valueChanges.subscribe(() => {
        this._updateElementParameters();
      });
      control = newControl as FormControl<string | number>;
      this._elementParameterControls.set(parameterId, control);
    }
    else {
      control.setValue(value, { emitEvent: true });
    }
  }

  protected _removeElementParameter(parameterId: string): void {
    const control = this._elementParameterControls.get(parameterId);
    if (control) {
      this._elementParameterControls.delete(parameterId);
      this._updateElementParameters();
    }
  }

  protected _isParameterInElementParameters(parameterId: string): boolean {
    return this._elementParameterControls.has(parameterId);
  }

  private _updateElementParameters(): void {
    const selected = this._selectedElement();
    if (!selected) {
      return;
    }

    const parameters: RescueStorySceneTriggerParamVm[] = [];
    const availableParams = this._availableParameters();

    // Собираем все значения parameters из формы
    availableParams.forEach(param => {
      const control = this._elementParameterControls.get(param.id);
      if (control && control.value !== null && control.value !== undefined) {
        parameters.push({
          id: param.id,
          value: control.value
        });
      }
    });

    // Обновляем элемент с новыми parameters
    const currentScene = this.storyData().scene;
    const updatedTriggers = currentScene.items.map(t =>
      t.triggerId === selected.triggerId 
        ? { 
            ...selected, 
            parameters, 
            visibleParams: selected.visibleParams || [] 
          }
        : t
    );

    this._updateScene({ ...currentScene, items: updatedTriggers });
    this._selectedElement.set({ 
      ...selected, 
      parameters, 
      visibleParams: selected.visibleParams || [] 
    });
  }

  private _getRestrictionsFromControls(): RescueStorySceneRestrictionsVm[] {
    const restrictions: RescueStorySceneRestrictionsVm[] = [];
    const restrictionParams: RescueStorySceneRestrictionParamVm[] = [];
    this._restrictionParamControls.forEach((control, parameterId) => {
      if (control.valid && control.value !== null && control.value !== undefined) {
        restrictionParams.push({
          id: parameterId,
          value: control.value
        });
      }
    });
    if (restrictionParams.length > 0) {
      restrictions.push({ params: restrictionParams });
    }
    return restrictions;
  }
}
