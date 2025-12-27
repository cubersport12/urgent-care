import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIcon } from '@angular/material/icon';
import { RescueStoryVm, RescueStoryDataVm, generateGUID, NullableValue } from '@/core/utils';
import { RescueStoryItemFormComponent } from '../rescue-story-item-form';
import { Store } from '@ngxs/store';
import { RescueStoriesActions, RescueStoriesState, AppLoading } from '@/core/store';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { AppFilesStorageService } from '@/core/api';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-rescue-stories-builder',
  imports: [
    MatIcon,
    MatButton,
    MatExpansionModule,
    MatChipsModule,
    RescueStoryItemFormComponent
  ],
  templateUrl: './rescue-stories-builder.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .story-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      gap: 5px;
    }
    .story-info {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
    }
  `
})
export class RescueStoriesBuilderComponent {
  private readonly _store = inject(Store);
  private readonly _dispatched = inject(AppLoading);
  private readonly _filesStorage = inject(AppFilesStorageService);

  rescueId = input<NullableValue<string>>(null);

  protected readonly _expandedIndex = signal<number | null>(null);
  protected readonly _storiesArray = signal<RescueStoryVm[]>([]);
  private readonly _pendingImageFiles = signal<Map<string, File>>(new Map());
  private readonly _newStoryIds = signal<Set<string>>(new Set());

  protected readonly _stories = computed(() => {
    const rescueId = this.rescueId();
    return this._store.selectSignal(RescueStoriesState.getRescueStories)()(rescueId);
  });

  protected readonly _isPending = computed(() =>
    this._dispatched.isDispatched(RescueStoriesActions.CreateRescueStory)()
    || this._dispatched.isDispatched(RescueStoriesActions.UpdateRescueStory)()
    || this._dispatched.isDispatched(RescueStoriesActions.DeleteRescueStory)()
  );

  constructor() {
    effect(() => {
      const rescueId = this.rescueId();
      if (rescueId && rescueId.length > 0) {
        this._store.dispatch(new RescueStoriesActions.FetchRescueStories(rescueId));
      }
    });

    effect(() => {
      const rescueId = this.rescueId();
      const stories = this._stories();

      // Инициализируем только если rescueId существует и данные изменились
      if (rescueId && rescueId.length > 0) {
        const array = untracked(this._storiesArray);
        if (stories.length !== array.length
          || stories.some((s, i) => s.id !== array[i]?.id)) {
          this._initializeStories();
        }
      }
      else {
        // Если rescueId нет, очищаем массив
        this._storiesArray.set([]);
      }
    });
  }

  private _initializeStories(): void {
    const stories = this._stories();
    this._storiesArray.set([...stories]);
    // Очищаем список новых сцен при инициализации (загруженные сцены уже сохранены)
    this._newStoryIds.set(new Set());
    // FormArray больше не нужен, так как форма находится в дочернем компоненте
  }

  protected _addStory(): void {
    const rescueId = this.rescueId();

    const newStoryId = generateGUID();
    const newStory: RescueStoryVm = {
      id: newStoryId,
      name: `Сюжет ${this._storiesArray().length + 1}`,
      order: this._storiesArray().length,
      rescueId: rescueId!,
      data: {
        scene: {
          backgroundImage: '',
          items: [],
          restritions: []
        }
      }
    };

    // Помечаем сцену как новую
    const newIds = new Set(this._newStoryIds());
    newIds.add(newStoryId);
    this._newStoryIds.set(newIds);

    const updatedStories = [...this._storiesArray(), newStory];
    this._storiesArray.set(updatedStories);

    // FormArray больше не нужен, форма находится в дочернем компоненте

    // Раскрываем новый аккордеон
    this._expandedIndex.set(this._storiesArray().length - 1);
  }

  protected _deleteStory(index: number): void {
    const story = this._storiesArray()[index];
    if (!story) {
      return;
    }

    // Проверяем, является ли сцена новой
    const isNew = this._newStoryIds().has(story.id);

    // Удаляем из списка новых сцен, если она там была
    if (isNew) {
      const newIds = new Set(this._newStoryIds());
      newIds.delete(story.id);
      this._newStoryIds.set(newIds);
    }

    // Если история уже сохранена (не новая), удаляем через store
    if (!isNew && story.id) {
      this._store.dispatch(new RescueStoriesActions.DeleteRescueStory(story.id));
    }

    const updatedStories = this._storiesArray().filter((_, i) => i !== index);
    this._storiesArray.set(updatedStories);

    if (this._expandedIndex() === index) {
      this._expandedIndex.set(null);
    }
    else if (this._expandedIndex() !== null && this._expandedIndex()! > index) {
      this._expandedIndex.set(this._expandedIndex()! - 1);
    }
  }

  protected _onPanelOpened(index: number): void {
    this._expandedIndex.set(index);
  }

  protected _onPanelClosed(): void {
    this._expandedIndex.set(null);
  }

  protected _onStoryChange(index: number, payload: { name: string; data: RescueStoryDataVm }): void {
    const story = this._storiesArray()[index];
    if (!story) {
      return;
    }

    const updatedStory: RescueStoryVm = {
      ...story,
      name: payload.name,
      data: payload.data
    };

    this._updateStory(index, updatedStory);
  }

  private _updateStory(index: number, story: RescueStoryVm): void {
    const updatedStories = [...this._storiesArray()];
    updatedStories[index] = story;
    this._storiesArray.set(updatedStories);
  }

  protected _onImageFileEvent(storyIndex: number, event: { storyId: string; file: File }): void {
    const pendingFiles = new Map(this._pendingImageFiles());
    pendingFiles.set(event.storyId, event.file);
    this._pendingImageFiles.set(pendingFiles);
  }

  protected _handleSave(): void {
    const stories = this._storiesArray();
    const rescueId = this.rescueId();
    const pendingFiles = this._pendingImageFiles();

    if (!rescueId || rescueId.length === 0) {
      return; // Нельзя сохранить без rescueId
    }

    // Загружаем все изображения перед сохранением историй
    const imageUploads = Array.from(pendingFiles.entries()).map(([storyId, file]) => {
      const fileName = file.name;
      return this._filesStorage.uploadFile(fileName, file).pipe(
        map(imagePath => ({ storyId, imagePath }))
      );
    });

    if (imageUploads.length > 0) {
      forkJoin(imageUploads).subscribe({
        next: () => {
          // Обновляем пути к изображениям в историях
          const updatedStories = [...stories];

          // Сохраняем истории
          this._saveStories(updatedStories, rescueId);
          // Очищаем pending файлы
          this._pendingImageFiles.set(new Map());
        },
        error: (err) => {
          console.error('Ошибка загрузки изображений:', err);
        }
      });
    }
    else {
      // Нет изображений для загрузки, просто сохраняем истории
      this._saveStories(stories, rescueId);
    }
  }

  private _saveStories(stories: RescueStoryVm[], rescueId: string): void {
    const newIds = this._newStoryIds();

    stories.forEach((story) => {
      // Убеждаемся, что rescueId установлен
      const storyToSave: RescueStoryVm = {
        ...story,
        rescueId: rescueId
      };

      // Проверяем, является ли сцена новой
      const isNew = newIds.has(story.id);

      if (isNew) {
        // Создаем новую историю
        this._store.dispatch(new RescueStoriesActions.CreateRescueStory(storyToSave));
      }
      else {
        // Обновляем существующую историю
        this._store.dispatch(new RescueStoriesActions.UpdateRescueStory(story.id, storyToSave));
      }
    });

    // Очищаем список новых сцен после сохранения
    this._newStoryIds.set(new Set());
  }
}
