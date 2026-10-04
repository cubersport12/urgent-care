import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-card',
  imports: [MatIcon],
  template: `
    <div
      class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-150 shadow-xs"
      [class.hover:shadow-md]="hoverable()"
      [class.hover:border-slate-300]="hoverable()"
      [class.dark:hover:border-slate-700]="hoverable()"
    >
      @if (title() || subtitle() || icon()) {
        <div class="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <div class="flex items-center gap-3 min-w-0">
            @if (icon()) {
              <div class="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <mat-icon [svgIcon]="icon()!" class="!w-4 !h-4" />
              </div>
            }
            <div class="min-w-0">
              @if (title()) {
                <h3 class="text-sm font-bold text-slate-900 dark:text-white m-0 leading-tight truncate">
                  {{ title() }}
                </h3>
              }
              @if (subtitle()) {
                <p class="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5 truncate">
                  {{ subtitle() }}
                </p>
              }
            </div>
          </div>
          <ng-content select="[card-actions]"></ng-content>
        </div>
      }

      <div [class]="_paddingClass()">
        <ng-content></ng-content>
      </div>

      <ng-content select="[card-footer]"></ng-content>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppCardComponent {
  public readonly title = input<string | undefined>(undefined);
  public readonly subtitle = input<string | undefined>(undefined);
  public readonly icon = input<string | undefined>(undefined);
  public readonly padding = input<'none' | 'sm' | 'md' | 'lg'>('md');
  public readonly hoverable = input<boolean>(false);

  protected readonly _paddingClass = computed(() => {
    switch (this.padding()) {
      case 'none': return 'p-0';
      case 'sm': return 'p-3';
      case 'lg': return 'p-6';
      case 'md':
      default: return 'p-4 md:p-5';
    }
  });
}
