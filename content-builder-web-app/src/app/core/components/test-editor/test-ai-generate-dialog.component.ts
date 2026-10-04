import { AppAIService } from '@/core/api';
import { AppTestQuestionVm, AppTestVm, generateGUID, NullableValue } from '@/core/utils';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIcon } from '@angular/material/icon';
import { take } from 'rxjs';
import { AppDialogWrapperComponent } from '../dialog-wrapper/dialog-wrapper.component';

import { AppButtonComponent, AppTextareaComponent } from '../ui';

export type TestAiGenerateDialogData = {
  parentId: NullableValue<string>;
};

export type TestAiGenerateDialogResult = Partial<AppTestVm>;

@Component({
  selector: 'app-test-ai-generate-dialog',
  imports: [
    MatProgressSpinnerModule,
    MatIcon,
    ReactiveFormsModule,
    AppDialogWrapperComponent,
    AppButtonComponent,
    AppTextareaComponent
  ],
  template: `
    <app-dialog-wrapper
      title="ИИ-генерация вопросов теста"
      subtitle="Автоматическое создание вопросов и вариантов ответа нейросетью"
      saveText="Сгенерировать тест"
      saveIcon="bolt"
      [saveDisabled]="_generating() || _prompt.invalid"
      [loading]="_generating()"
      (save)="_generate()"
      (close)="_cancel()"
    >
      <div class="relative flex flex-col gap-4 min-w-[min(100%,480px)]">
        <!-- Quick Starter Chips -->
        <div class="space-y-1.5">
          <div class="text-xs font-medium text-slate-500 dark:text-slate-400">
            Быстрые шаблоны тем:
          </div>
          <div class="flex flex-wrap gap-1.5">
            @for (chip of _sampleChips; track chip) {
              <app-button
                variant="secondary"
                size="sm"
                (clicked)="_setPromptSample(chip)"
              >
                {{ chip }}
              </app-button>
            }
          </div>
        </div>

        <app-textarea
          label="Промпт для генерации"
          [rows]="6"
          [formControl]="_prompt"
          placeholder="Например: 8 вопросов по неотложной помощи при анафилаксии, 4 варианта ответа, указать правильные..."
          class="w-full"
        />

        @if (_error(); as err) {
          <div class="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-xs border border-red-500/20">
            <mat-icon svgIcon="exclamation-circle" class="!w-4 !h-4 shrink-0" />
            <span>{{ err }}</span>
          </div>
        }

        @if (_generating()) {
          <div class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
            <mat-spinner diameter="36" />
            <span class="text-xs font-medium text-slate-600 dark:text-slate-300 animate-pulse">Генерация теста нейросетью…</span>
          </div>
        }
      </div>
    </app-dialog-wrapper>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TestAiGenerateDialogComponent {
  private readonly _ref = inject(
    MatDialogRef<TestAiGenerateDialogComponent, TestAiGenerateDialogResult | undefined>
  );
  private readonly _data = inject<TestAiGenerateDialogData>(MAT_DIALOG_DATA);
  private readonly _ai = inject(AppAIService);

  protected readonly _sampleChips = [
    'Анафилактический шок: симптомы и первая помощь',
    'Сердечно-легочная реанимация у взрослых',
    'Острый коронарный синдром и инфаркт',
    'Ожоги 1-3 степени: диагностика и ПМП'
  ];

  protected _setPromptSample(topic: string): void {
    this._prompt.setValue(`Создай 6-8 вопросов по теме «${topic}». 4 варианта ответов на каждый вопрос, один правильный. Вопросы должны проверять клиническое мышление и алгоритмы оказания неотложной помощи.`);
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
