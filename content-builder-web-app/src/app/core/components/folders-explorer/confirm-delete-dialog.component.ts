import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { AppDialogWrapperComponent } from '../dialog-wrapper/dialog-wrapper.component';

export type ConfirmDeleteDialogData = {
  name: string;
  typeName: string;
  isFolder: boolean;
};

@Component({
  selector: 'app-confirm-delete-dialog',
  imports: [MatIcon, AppDialogWrapperComponent],
  template: `
    <app-dialog-wrapper
      title="Удалить объект?"
      [subtitle]="_data.name"
      saveText="Удалить"
      saveIcon="trash"
      saveColor="warn"
      (save)="_confirm()"
      (close)="_cancel()"
    >
      <div class="flex flex-col gap-4 min-w-[340px] max-w-md">
        <div class="flex items-start gap-3.5 p-4 rounded-xl bg-red-50/80 dark:bg-red-950/30 border border-red-200/80 dark:border-red-900/40 text-red-900 dark:text-red-200">
          <div class="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <mat-icon svgIcon="trash" class="!w-5 !h-5" />
          </div>
          <div class="text-xs leading-relaxed space-y-1.5">
            <div>
              Вы действительно хотите удалить {{ _data.typeName.toLowerCase() }}
              <strong class="font-semibold block text-slate-900 dark:text-white truncate mt-0.5">«{{ _data.name }}»</strong>?
            </div>
            @if (_data.isFolder) {
              <div class="text-[11px] text-red-700 dark:text-red-300 font-medium">
                Внимание: Все вложенные папки, документы, тесты и сценарии спасения внутри этой папки также будут удалены!
              </div>
            } @else {
              <div class="text-[11px] text-slate-500 dark:text-slate-400">
                Это действие необратимо и удалит связанные файлы и историю.
              </div>
            }
          </div>
        </div>
      </div>
    </app-dialog-wrapper>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmDeleteDialogComponent {
  protected readonly _data = inject<ConfirmDeleteDialogData>(MAT_DIALOG_DATA);
  private readonly _ref = inject(MatDialogRef<ConfirmDeleteDialogComponent, boolean>);

  protected _confirm(): void {
    this._ref.close(true);
  }

  protected _cancel(): void {
    this._ref.close(false);
  }
}
