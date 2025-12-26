import { Component, computed, effect, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RescueStoryDataVm, RescueStorySceneTriggerVm, RescueLibraryItemVm, generateGUID } from '@/core/utils';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { RescueLibraryTreeComponent } from '@/core/components/rescue-library-editor/rescue-library-tree';
import { CommonModule } from '@angular/common';
import { Store } from '@ngxs/store';
import { RescueLibraryState } from '@/core/store';
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
      border: 2px solid #2196f3;
      background: rgba(33, 150, 243, 0.1);
      cursor: move;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 40px;
      min-height: 40px;
      user-select: none;
      touch-action: none;
    }
    .scene-element.selected {
      border-color: #ff9800;
      background: rgba(255, 152, 0, 0.2);
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
  startAtDisabled = input<boolean>(false);
  maxDurationMinutes = input<number>(0);
  totalDurationMinutes = input<number>(0);
  submitEvent = output<{ name: string; data: RescueStoryDataVm }>();
  imageFileEvent = output<{ storyId: string; file: File }>();

  protected readonly _form = new FormGroup({
    name: new FormControl<string>('', Validators.required),
    startAt: new FormControl<string>('', Validators.required),
    endAt: new FormControl<string>('', Validators.required)
  });

  private readonly _formValues = signal<{ name: string; startAt: string; endAt: string }>({ name: '', startAt: '', endAt: '' });

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

  protected readonly _duration = computed(() => {
    const { startAt, endAt } = this._formValues();
    if (!startAt || !endAt) {
      return 0;
    }
    const start = this._parseTimeToMinutes(startAt);
    const end = this._parseTimeToMinutes(endAt);
    return end - start;
  });

  protected readonly _isValidDuration = computed(() => {
    const duration = this._duration();
    const maxDuration = this.maxDurationMinutes();
    const totalDuration = this.totalDurationMinutes();
    return duration > 0 && (totalDuration + duration - this._getCurrentStoryDuration()) <= maxDuration;
  });

  constructor() {
    // Отслеживаем изменения формы
    this._form.valueChanges.subscribe(() => {
      this._formValues.set({
        name: this._form.value.name ?? '',
        startAt: this._form.value.startAt ?? '',
        endAt: this._form.value.endAt ?? ''
      });
    });

    // Автоматически эмитим изменения в родительский компонент с debounce
    this._form.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((prev, curr) =>
          prev.name === curr.name
          && prev.startAt === curr.startAt
          && prev.endAt === curr.endAt
        )
      )
      .subscribe(() => {
        // Эмитим изменения при валидной форме
        if (this._form.valid && this._isValidDuration()) {
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
        const startAtFormatted = this._formatTime(data.startAt);
        const endAtFormatted = this._formatTime(data.endAt);

        // Обновляем только если значения изменились, чтобы не сбрасывать форму при вводе
        if (this._form.value.startAt !== startAtFormatted
          || this._form.value.endAt !== endAtFormatted
          || this._form.value.name !== name) {
          this._form.patchValue({
            name: name,
            startAt: startAtFormatted,
            endAt: endAtFormatted
          }, { emitEvent: true });
        }
      }
    });

    effect(() => {
      const disabled = this.startAtDisabled();
      if (disabled) {
        this._form.controls.startAt.disable({ emitEvent: false });
      }
      else {
        this._form.controls.startAt.enable({ emitEvent: false });
      }
    });
  }

  private _formatTime(minutes: string): string {
    // Преобразуем минуты (строку) в "HH:mm:ss"
    const totalSeconds = parseInt(minutes, 10) * 60 || 0;
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  private _parseTime(timeString: string): string {
    // Преобразуем "HH:mm:ss" в минуты (строку)
    const parts = timeString.split(':');
    const hours = parseInt(parts[0] || '0', 10);
    const minutes = parseInt(parts[1] || '0', 10);
    const seconds = parseInt(parts[2] || '0', 10);
    const totalMinutes = hours * 60 + minutes + Math.round(seconds / 60);
    return String(totalMinutes);
  }

  private _parseTimeToMinutes(timeString: string): number {
    // Преобразуем "HH:mm:ss" в минуты (число)
    const parts = timeString.split(':');
    const hours = parseInt(parts[0] || '0', 10);
    const minutes = parseInt(parts[1] || '0', 10);
    const seconds = parseInt(parts[2] || '0', 10);
    return hours * 60 + minutes + Math.round(seconds / 60);
  }

  private _getCurrentStoryDuration(): number {
    const data = this.storyData();
    if (!data) {
      return 0;
    }
    // data.startAt и data.endAt уже в формате минут (строка)
    const start = parseInt(data.startAt, 10) || 0;
    const end = parseInt(data.endAt, 10) || 0;
    return end - start;
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
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  protected _onImageContainerDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    // Если перетаскивается существующий элемент, обновляем его позицию
    const draggedElement = this._draggedElement();
    if (draggedElement && this._imageContainer()) {
      const container = this._imageContainer()!.nativeElement;
      const rect = container.getBoundingClientRect();
      const offset = this._dragOffset();
      
      let x = ((event.clientX - rect.left) / rect.width) * 100;
      let y = ((event.clientY - rect.top) / rect.height) * 100;
      
      if (offset) {
        x -= (offset.x / rect.width) * 100;
        y -= (offset.y / rect.height) * 100;
      }

      const updatedTrigger: RescueStorySceneTriggerVm = {
        ...draggedElement,
        position: { 
          x: Math.max(0, Math.min(100, x)), 
          y: Math.max(0, Math.min(100, y)) 
        }
      };

      const currentScene = this.storyData().scene;
      const updatedTriggers = currentScene.triggers.map(t => 
        t.triggerId === draggedElement.triggerId ? updatedTrigger : t
      );

      this._updateScene({ ...currentScene, triggers: updatedTriggers });
      this._selectedElement.set(updatedTrigger);
      this._updateElementParamsForm(updatedTrigger);
      this._onElementDragEnd(event);
      return;
    }

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
        } else {
          // Fallback: получаем ID из text/plain
          const itemId = event.dataTransfer.getData('text/plain');
          if (itemId) {
            const items = this._store.selectSignal(RescueLibraryState.getAllRescueLibraryItems)();
            draggedItem = items.find(i => i.id === itemId) || null;
          }
        }
      } catch (e) {
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
      size: { width: 10, height: 10 }
    };

    const currentScene = this.storyData().scene;
    const updatedTriggers = [...currentScene.triggers, newTrigger];

    this._updateScene({ ...currentScene, triggers: updatedTriggers });
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

  protected _onElementDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  protected _onElementDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const draggedElement = this._draggedElement();
    if (!draggedElement || !this._imageContainer()) {
      this._onElementDragEnd(event);
      return;
    }

    const container = this._imageContainer()!.nativeElement;
    const rect = container.getBoundingClientRect();
    const offset = this._dragOffset();
    
    // Вычисляем новую позицию с учетом смещения
    let x = ((event.clientX - rect.left) / rect.width) * 100;
    let y = ((event.clientY - rect.top) / rect.height) * 100;
    
    if (offset) {
      // Корректируем позицию с учетом смещения от точки клика
      x -= (offset.x / rect.width) * 100;
      y -= (offset.y / rect.height) * 100;
    }

    const updatedTrigger: RescueStorySceneTriggerVm = {
      ...draggedElement,
      position: { 
        x: Math.max(0, Math.min(100, x)), 
        y: Math.max(0, Math.min(100, y)) 
      }
    };

    const currentScene = this.storyData().scene;
    const updatedTriggers = currentScene.triggers.map(t => 
      t.triggerId === draggedElement.triggerId ? updatedTrigger : t
    );

    this._updateScene({ ...currentScene, triggers: updatedTriggers });
    this._selectedElement.set(updatedTrigger);
    this._updateElementParamsForm(updatedTrigger);
    this._onElementDragEnd(event);
  }

  protected _onElementDragEnd(event: DragEvent): void {
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
    const updatedTriggers = currentScene.triggers.filter(t => t.triggerId !== selected.triggerId);
    this._updateScene({ ...currentScene, triggers: updatedTriggers });
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
      size: { width: width!, height: height! }
    };

    const currentScene = this.storyData().scene;
    const updatedTriggers = currentScene.triggers.map(t =>
      t.triggerId === selected.triggerId ? updatedTrigger : t
    );

    this._updateScene({ ...currentScene, triggers: updatedTriggers });
    this._selectedElement.set(updatedTrigger);
  }

  private _updateScene(scene: RescueStoryDataVm['scene']): void {
    const { name, startAt, endAt } = this._form.value;
    this.submitEvent.emit({
      name: name!,
      data: {
        startAt: this._parseTime(startAt!),
        endAt: this._parseTime(endAt!),
        scene
      }
    });
  }

  private _emitFormData(): void {
    const { name, startAt, endAt } = this._form.value;
    const imageFile = this._imageFile();

    // Если есть новое изображение, эмитим событие для загрузки в родительском компоненте
    // Пока используем временный путь для preview
    const backgroundImage = imageFile
      ? `pending_${generateGUID()}_${imageFile.name}`
      : this.storyData().scene.backgroundImage;

    // Эмитим файл изображения отдельно для загрузки при сохранении
    if (imageFile) {
      // Используем переданный storyId или генерируем временный
      const storyId = this.storyId() || generateGUID();
      this.imageFileEvent.emit({ storyId, file: imageFile });
    }

    this.submitEvent.emit({
      name: name!,
      data: {
        startAt: this._parseTime(startAt!),
        endAt: this._parseTime(endAt!),
        scene: {
          ...this.storyData().scene,
          backgroundImage
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
}
