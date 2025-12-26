import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIcon } from '@angular/material/icon';
import { RescueStoryVm, RescueStoryDataVm, generateGUID, NullableValue } from '@/core/utils';
import { RescueStoryItemFormComponent } from '../rescue-story-item-form';
import { Store } from '@ngxs/store';
import { RescueStoriesActions, RescueStoriesState, AppLoading } from '@/core/store';

@Component({
  selector: 'app-rescue-stories-builder',
  imports: [
    MatIcon,
    MatButton,
    MatExpansionModule,
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

  rescueId = input<NullableValue<string>>(null);
  maxDurationMinutes = input.required<number>();

  protected readonly _expandedIndex = signal<number | null>(null);
  protected readonly _storiesArray = signal<RescueStoryVm[]>([]);

  protected readonly _stories = computed(() => {
    const rescueId = this.rescueId();
    return this._store.selectSignal(RescueStoriesState.getRescueStories)()(rescueId);
  });

  protected readonly _isPending = computed(() =>
    this._dispatched.isDispatched(RescueStoriesActions.CreateRescueStory)()
    || this._dispatched.isDispatched(RescueStoriesActions.UpdateRescueStory)()
    || this._dispatched.isDispatched(RescueStoriesActions.DeleteRescueStory)()
  );

  protected readonly _totalDuration = computed(() => {
    return this._storiesArray().reduce((total, story) => {
      const start = this._parseTimeToMinutes(story.data.startAt);
      const end = this._parseTimeToMinutes(story.data.endAt);
      return total + (end - start);
    }, 0);
  });

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
    // FormArray больше не нужен, так как форма находится в дочернем компоненте
  }

  protected _addStory(): void {
    const nextStartTime = this._getNextStartTime();
    const rescueId = this.rescueId();
    const isFirstStory = true;

    // Для первого сюжета устанавливаем длительность 5 минут
    const endTime = isFirstStory
      ? String(parseInt(nextStartTime, 10) + 5)
      : nextStartTime;

    const newStory: RescueStoryVm = {
      id: generateGUID(),
      name: `Сюжет ${this._storiesArray().length + 1}`,
      order: this._storiesArray().length,
      rescueId: rescueId!,
      data: {
        startAt: nextStartTime,
        endAt: endTime,
        scene: {
          backgroundImage: '',
          triggers: []
        }
      }
    };

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

    // Если история уже сохранена (есть id), удаляем через store
    if (story.id) {
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

    // Обновляем время начала следующего сюжета
    if (index < updatedStories.length) {
      const prevStory = updatedStories[index - 1];
      if (prevStory) {
        updatedStories[index].data.startAt = prevStory.data.endAt;
        this._updateStory(index, updatedStories[index]);
      }
    }
  }

  protected _onPanelOpened(index: number): void {
    this._expandedIndex.set(index);
  }

  protected _onPanelClosed(): void {
    this._expandedIndex.set(null);
  }

  protected _isStartAtDisabled(index: number): boolean {
    return index > 0;
  }

  protected _getStoryStartTime(index: number): string {
    const story = this._storiesArray()[index];
    if (!story) {
      return '00:00';
    }
    if (index === 0) {
      return this._formatTimeFromMinutes(this._parseTimeToMinutes(story.data.startAt));
    }
    const prevStory = this._storiesArray()[index - 1];
    return this._formatTimeFromMinutes(this._parseTimeToMinutes(prevStory?.data.endAt ?? '0'));
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

    // Обновляем время начала следующего сюжета
    if (index < this._storiesArray().length - 1) {
      const nextStory = this._storiesArray()[index + 1];
      if (nextStory) {
        const updatedNextStory: RescueStoryVm = {
          ...nextStory,
          data: {
            ...nextStory.data,
            startAt: payload.data.endAt
          }
        };
        this._updateStory(index + 1, updatedNextStory);
      }
    }
  }

  private _updateStory(index: number, story: RescueStoryVm): void {
    const updatedStories = [...this._storiesArray()];
    updatedStories[index] = story;
    this._storiesArray.set(updatedStories);
  }

  protected _handleSave(): void {
    const stories = this._storiesArray();
    const rescueId = this.rescueId();

    if (!rescueId || rescueId.length === 0) {
      return; // Нельзя сохранить без rescueId
    }

    stories.forEach((story) => {
      // Убеждаемся, что rescueId установлен
      const storyToSave: RescueStoryVm = {
        ...story,
        rescueId: rescueId
      };

      if (story.id && story.id.length > 0) {
        // Обновляем существующую историю
        this._store.dispatch(new RescueStoriesActions.UpdateRescueStory(story.id, storyToSave));
      }
      else {
        // Создаем новую историю
        this._store.dispatch(new RescueStoriesActions.CreateRescueStory(storyToSave));
      }
    });
  }

  private _getNextStartTime(): string {
    const stories = this._storiesArray();
    if (stories.length === 0) {
      return '0';
    }
    const lastStory = stories[stories.length - 1];
    return lastStory.data.endAt;
  }

  protected _parseTimeToMinutes(timeString: string): number {
    // Если это уже число в строковом формате (минуты), возвращаем как число
    if (!timeString.includes(':')) {
      return parseInt(timeString, 10) || 0;
    }
    // Преобразуем "HH:mm:ss" в минуты
    const parts = timeString.split(':');
    const hours = parseInt(parts[0] || '0', 10);
    const minutes = parseInt(parts[1] || '0', 10);
    const seconds = parseInt(parts[2] || '0', 10);
    return hours * 60 + minutes + Math.round(seconds / 60);
  }

  protected _formatTimeFromMinutes(minutes: number): string {
    const totalSeconds = minutes * 60;
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  protected _getStoryDuration(index: number): number {
    const story = this._storiesArray()[index];
    if (!story) {
      return 0;
    }
    const start = this._parseTimeToMinutes(story.data.startAt);
    const end = this._parseTimeToMinutes(story.data.endAt);
    return end - start;
  }

  protected _getTotalDurationUpTo(index: number): number {
    let total = 0;
    for (let i = 0; i <= index; i++) {
      total += this._getStoryDuration(i);
    }
    return total;
  }
}
