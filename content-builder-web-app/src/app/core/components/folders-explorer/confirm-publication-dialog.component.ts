import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { AppDialogWrapperComponent } from '../dialog-wrapper/dialog-wrapper.component';
import type { AppPublicationStatus } from '@/core/utils';

export type ConfirmPublicationDialogData = {
  name: string;
  typeName: string;
  isFolder: boolean;
  targetStatus: AppPublicationStatus;
};

@Component({
  selector: 'app-confirm-publication-dialog',
  imports: [MatIcon, AppDialogWrapperComponent],
  template: `
    <app-dialog-wrapper
      [title]="_data.targetStatus === 'published' ? 'Опубликовать элемент?' : 'Перевести в черновик?'"
      [subtitle]="_data.name"
      [saveText]="_data.targetStatus === 'published' ? 'Опубликовать' : 'В черновик'"
      [saveIcon]="_data.targetStatus === 'published' ? 'check' : 'exclamation-circle'"
      [saveColor]="_data.targetStatus === 'published' ? 'primary' : 'warn'"
      (save)="_confirm()"
      (close)="_cancel()"
    >
      <div class="flex min-w-[320px] max-w-md items-start gap-3 rounded-xl border p-4"
        [class.border-amber-200]="_data.targetStatus === 'draft'"
        [class.bg-amber-50]="_data.targetStatus === 'draft'"
        [class.text-amber-950]="_data.targetStatus === 'draft'"
        [class.dark:border-amber-900]="_data.targetStatus === 'draft'"
        [class.dark:bg-amber-950/30]="_data.targetStatus === 'draft'"
        [class.dark:text-amber-100]="_data.targetStatus === 'draft'"
        [class.border-emerald-200]="_data.targetStatus === 'published'"
        [class.bg-emerald-50]="_data.targetStatus === 'published'"
        [class.text-emerald-950]="_data.targetStatus === 'published'"
        [class.dark:border-emerald-900]="_data.targetStatus === 'published'"
        [class.dark:bg-emerald-950/30]="_data.targetStatus === 'published'"
        [class.dark:text-emerald-100]="_data.targetStatus === 'published'"
      >
        <mat-icon
          [svgIcon]="_data.targetStatus === 'published' ? 'check' : 'exclamation-circle'"
          class="!mt-0.5 !h-5 !w-5 shrink-0"
        />
        <div class="text-xs leading-relaxed">
          <div>
            Перевести {{ _data.typeName.toLowerCase() }}
            <strong>«{{ _data.name }}»</strong>
            {{ _data.targetStatus === 'published' ? 'в статус «Опубликовано»?' : 'в статус «Черновик»?' }}
          </div>
          @if (_data.isFolder && _data.targetStatus === 'draft') {
            <div class="mt-2 font-medium">
              Папка и всё её содержимое перестанут отображаться в мобильном приложении.
            </div>
          }
        </div>
      </div>
    </app-dialog-wrapper>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmPublicationDialogComponent {
  protected readonly _data = inject<ConfirmPublicationDialogData>(MAT_DIALOG_DATA);
  private readonly _ref = inject(MatDialogRef<ConfirmPublicationDialogComponent, boolean>);

  protected _confirm(): void {
    this._ref.close(true);
  }

  protected _cancel(): void {
    this._ref.close(false);
  }
}
