import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AppAIService } from '@/core/api';
import { AppRescueItemDataVm, AppRescueItemVm, NullableValue } from '@/core/utils';
import { take } from 'rxjs';

export type RescueAiGenerateDialogData = {
  parentId: NullableValue<string>;
};

export type RescueAiGenerateDialogResult = Partial<AppRescueItemVm>;

@Component({
  selector: 'app-rescue-ai-generate-dialog',
  imports: [
    MatDialogModule,
    MatButton,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule
  ],
  templateUrl: './rescue-ai-generate-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RescueAiGenerateDialogComponent {
  private readonly _ref = inject(MatDialogRef<RescueAiGenerateDialogComponent, RescueAiGenerateDialogResult | undefined>);
  private readonly _data = inject<RescueAiGenerateDialogData>(MAT_DIALOG_DATA);
  private readonly _ai = inject(AppAIService);

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
