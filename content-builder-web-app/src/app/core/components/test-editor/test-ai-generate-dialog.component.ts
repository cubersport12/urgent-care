import { AppAIService } from '@/core/api';
import { AppTestQuestionVm, AppTestVm, generateGUID, NullableValue } from '@/core/utils';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { take } from 'rxjs';

export type TestAiGenerateDialogData = {
  parentId: NullableValue<string>;
};

export type TestAiGenerateDialogResult = Partial<AppTestVm>;

@Component({
  selector: 'app-test-ai-generate-dialog',
  imports: [
    MatDialogModule,
    MatButton,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule
  ],
  template: `
    <h2 mat-dialog-title>Генерация теста через ИИ</h2>
    <mat-dialog-content class="relative flex flex-col gap-4 min-w-[min(100%,480px)]">
      <p class="text-sm text-slate-600 dark:text-slate-400 m-0">
        Опишите тему и уровень сложности. ИИ сформирует черновик вопросов для редактирования.
      </p>
      <mat-form-field class="w-full" appearance="outline">
        <mat-label>Промпт</mat-label>
        <textarea
          matInput
          rows="8"
          [formControl]="_prompt"
          placeholder="Например: 8 вопросов по неотложной помощи при анафилаксии, 4 варианта ответа..."
        ></textarea>
      </mat-form-field>
      @if (_error(); as err) {
        <p class="text-sm text-red-600 dark:text-red-400 m-0 p-2 rounded bg-red-500/10">{{ err }}</p>
      }
      @if (_generating()) {
        <div
          class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded bg-white/80 dark:bg-slate-900/80"
        >
          <mat-spinner diameter="40" />
          <span class="text-sm text-slate-600 dark:text-slate-300">Генерация вопросов…</span>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="flex flex-wrap gap-2">
      <button type="button" mat-button [disabled]="_generating()" (click)="_cancel()">Отмена</button>
      <button
        type="button"
        mat-flat-button
        color="primary"
        [disabled]="_generating() || _prompt.invalid"
        (click)="_generate()"
      >
        Сгенерировать
      </button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TestAiGenerateDialogComponent {
  private readonly _ref = inject(
    MatDialogRef<TestAiGenerateDialogComponent, TestAiGenerateDialogResult | undefined>
  );
  private readonly _data = inject<TestAiGenerateDialogData>(MAT_DIALOG_DATA);
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
    if (this._prompt.invalid || this._generating()) return;
    this._error.set(null);
    this._generating.set(true);
    this._ref.disableClose = true;
    const promptText = this._prompt.value.trim();
    this._ai
      .generateTestQuestions(promptText)
      .pipe(take(1))
      .subscribe({
        next: (data) => {
          this._generating.set(false);
          this._ref.disableClose = false;
          this._ref.close(this._toDraft(promptText, data.questions));
        },
        error: (err: unknown) => {
          this._generating.set(false);
          this._ref.disableClose = false;
          this._error.set(err instanceof Error ? err.message : 'Не удалось сгенерировать вопросы');
        }
      });
  }

  private _toDraft(
    promptText: string,
    raw: { questionText: string; name?: string; answers: { answerText: string; isCorrect: boolean; score?: number | null }[] }[]
  ): TestAiGenerateDialogResult {
    const firstLine = promptText.split('\n').map((x) => x.trim()).find((x) => x.length > 0) ?? '';
    const name = firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine;
    const questions: AppTestQuestionVm[] = raw.map((q, index) => ({
      id: generateGUID(),
      order: index,
      parentId: null,
      name: q.name?.trim() || `№${index + 1}`,
      questionText: q.questionText,
      image: null,
      answers: q.answers.map((a) => ({
        answerText: a.answerText,
        isCorrect: a.isCorrect,
        score: a.score ?? (a.isCorrect ? 1 : 0),
        image: null
      }))
    }));
    return {
      parentId: this._data.parentId ?? null,
      name: name || 'Новый тест',
      questions
    };
  }
}
