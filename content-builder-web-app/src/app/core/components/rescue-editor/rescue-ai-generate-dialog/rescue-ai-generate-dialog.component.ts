import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIcon } from '@angular/material/icon';
import { AppAIService } from '@/core/api';
import { AppRescueItemDataVm, AppRescueItemVm, NullableValue } from '@/core/utils';
import { take } from 'rxjs';
import { AppButtonComponent, AppTextareaComponent } from '@/core/components/ui';
import { AppDialogWrapperComponent } from '../../dialog-wrapper/dialog-wrapper.component';

export type RescueAiGenerateDialogData = {
  parentId: NullableValue<string>;
};

export type RescueAiGenerateDialogResult = Partial<AppRescueItemVm>;

@Component({
  selector: 'app-rescue-ai-generate-dialog',
  imports: [
    AppButtonComponent,
    AppTextareaComponent,
    MatProgressSpinnerModule,
    MatIcon,
    ReactiveFormsModule,
    AppDialogWrapperComponent
  ],
  templateUrl: './rescue-ai-generate-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RescueAiGenerateDialogComponent {
  private readonly _ref = inject(MatDialogRef<RescueAiGenerateDialogComponent, RescueAiGenerateDialogResult | undefined>);
  private readonly _data = inject<RescueAiGenerateDialogData>(MAT_DIALOG_DATA);
  private readonly _ai = inject(AppAIService);

  protected readonly _sampleChips = [
    'Отек Квинке и анафилаксия в общественном месте',
    'ДТП: открытый перелом и артериальное кровотечение',
    'Потеря сознания и судорожный припадок на улице',
    'Термический ожог кипятком у ребенка'
  ];

  protected _setPromptSample(topic: string): void {
    this._prompt.setValue(`Клинический случай неотложной помощи: «${topic}». Включи начальное состояние пациента, развилки действий спасателя, критические ошибки и успешный исход.`);
    this._prompt.markAsDirty();
  }

  protected readonly _prompt = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(10)]
  });
  protected readonly _generating = signal(false);
  protected readonly _error = signal<string | null>(null);

  protected _cancel(): void {
    this._ref.close();
  }

  protected _generate(): void {
    if (this._prompt.invalid || this._generating()) {
      return;
    }
    this._error.set(null);
    this._generating.set(true);
    this._ref.disableClose = true;

    const promptText = this._prompt.value.trim();
    this._ai.generateRescue(promptText).pipe(take(1)).subscribe({
      next: (data) => {
        this._generating.set(false);
        this._ref.disableClose = false;
        this._ref.close(this._toRescueDraft(promptText, data));
      },
      error: (err: unknown) => {
        this._generating.set(false);
        this._ref.disableClose = false;
        this._error.set(err instanceof Error ? err.message : 'Не удалось сгенерировать сценарий');
      }
    });
  }

  private _toRescueDraft(promptText: string, data: unknown): RescueAiGenerateDialogResult {
    const firstLine = promptText.split('\n').map(x => x.trim()).find(x => x.length > 0) ?? '';
    const name = firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine;
    return {
      parentId: this._data.parentId ?? null,
      name: name || 'Новый режим спасения',
      description: promptText,
      data: data as AppRescueItemDataVm
    };
  }
}
