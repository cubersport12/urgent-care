import {
  Component,
  ChangeDetectionStrategy,
  computed,
  input,
  output
} from '@angular/core';
import { AppButtonComponent, AppIconButtonComponent, AppButtonVariant } from '../ui';

@Component({
  selector: 'app-dialog-wrapper',
  imports: [AppButtonComponent, AppIconButtonComponent],
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
        <app-icon-button
          icon="times"
          size="sm"
          variant="ghost"
          tooltip="Закрыть"
          (clicked)="close.emit()"
        />
      </div>

      <!-- Dialog Body (Content) -->
      <div class="p-6 overflow-y-auto max-h-[75vh]">
        <ng-content></ng-content>
      </div>

      <!-- Dialog Footer -->
      @if (showFooter()) {
        <div class="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 shrink-0">
          <app-button
            variant="ghost"
            size="md"
            (clicked)="close.emit()"
          >
            {{ _effectiveCancelText() }}
          </app-button>
          @if (showSave()) {
            <app-button
              [variant]="_saveVariant()"
              size="md"
              [icon]="saveIcon()"
              [disabled]="saveDisabled()"
              [loading]="loading()"
              (clicked)="save.emit()"
            >
              {{ loading() ? 'Сохранение…' : saveText() }}
            </app-button>
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
  public readonly cancelText = input<string | undefined>(undefined);
  public readonly saveIcon = input<string>('check');
  public readonly saveColor = input<string>('primary');
  public readonly saveVariant = input<AppButtonVariant | undefined>(undefined);
  public readonly saveDisabled = input<boolean>(false);
  public readonly loading = input<boolean>(false);
  public readonly showSave = input<boolean>(true);
  public readonly showFooter = input<boolean>(true);

  public readonly save = output<void>();
  public readonly close = output<void>();

  protected readonly _effectiveCancelText = computed(() => this.cancelText() ?? this.closeText());

  protected readonly _saveVariant = computed<AppButtonVariant>(() => {
    if (this.saveVariant()) {
      return this.saveVariant()!;
    }
    if (this.saveColor() === 'warn' || this.saveColor() === 'danger') {
      return 'danger';
    }
    return 'primary';
  });
}
