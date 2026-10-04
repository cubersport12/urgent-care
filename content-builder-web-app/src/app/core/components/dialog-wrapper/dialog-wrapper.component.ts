import {
  Component,
  ChangeDetectionStrategy,
  input,
  output
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-dialog-wrapper',
  imports: [MatButtonModule, MatIcon, MatTooltipModule],
  template: `
    <div class="flex flex-col bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-w-full">
      <!-- Dialog Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
        <div class="min-w-0 pr-4">
          <h2 class="text-base font-bold text-slate-900 dark:text-white leading-tight m-0 truncate">
            {{ title() }}
          </h2>
          @if (subtitle()) {
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 m-0 truncate">
              {{ subtitle() }}
            </p>
          }
        </div>
        <button
          type="button"
          class="table-icon-btn text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors shrink-0"
          (click)="close.emit()"
          matTooltip="Закрыть"
        >
          <mat-icon svgIcon="times" class="!w-4 !h-4" />
        </button>
      </div>

      <!-- Dialog Body (Content) -->
      <div class="p-6 overflow-y-auto max-h-[75vh]">
        <ng-content></ng-content>
      </div>

      <!-- Dialog Footer -->
      @if (showFooter()) {
        <div class="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 shrink-0">
          <button
            type="button"
            mat-button
            class="!rounded-xl !px-4 !py-2 !text-slate-600 dark:!text-slate-300"
            (click)="close.emit()"
          >
            {{ closeText() }}
          </button>
          @if (showSave()) {
            <button
              type="button"
              mat-flat-button
              [color]="saveColor()"
              class="!rounded-xl !px-5 !py-2 !shadow-sm flex items-center gap-1.5"
              [disabled]="saveDisabled() || loading()"
              (click)="save.emit()"
            >
              <mat-icon [svgIcon]="saveIcon()" class="!w-4 !h-4 mr-1" />
              {{ loading() ? 'Сохранение…' : saveText() }}
            </button>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppDialogWrapperComponent {
  public readonly title = input<string>('');
  public readonly subtitle = input<string | undefined>(undefined);
  public readonly saveText = input<string>('Сохранить');
  public readonly closeText = input<string>('Отмена');
  public readonly saveIcon = input<string>('check');
  public readonly saveColor = input<string>('primary');
  public readonly saveDisabled = input<boolean>(false);
  public readonly loading = input<boolean>(false);
  public readonly showSave = input<boolean>(true);
  public readonly showFooter = input<boolean>(true);

  public readonly save = output<void>();
  public readonly close = output<void>();
}
