import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export type AppIconButtonVariant = 'ghost' | 'secondary' | 'outline' | 'primary' | 'danger';
export type AppIconButtonSize = 'xs' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-icon-button',
  imports: [MatIcon, MatTooltipModule],
  template: `
    <button
      [type]="type()"
      [disabled]="disabled() || loading()"
      [matTooltip]="tooltip() || ''"
      (click)="onClick($event)"
      [class]="_computedClasses()"
    >
      @if (loading()) {
        <mat-icon svgIcon="spinner" class="animate-spin !w-3.5 !h-3.5 shrink-0" />
      } @else {
        <mat-icon [svgIcon]="icon()" [class]="_iconSizeClass()" class="shrink-0" />
      }

      @if (badge() !== undefined && badge() !== null) {
        @if (badge() === true || badge() === '') {
          <!-- Dot badge -->
          <span
            class="absolute top-1 right-1 w-2 h-2 rounded-full ring-2 ring-white dark:ring-slate-900"
            [class]="badgeColor()"
          ></span>
        } @else {
          <!-- Number/text badge -->
          <span
            class="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white ring-2 ring-white dark:ring-slate-900"
            [class]="badgeColor()"
          >
            {{ badge() }}
          </span>
        }
      }
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
      vertical-align: middle;
    }
  `,
  host: {
    '[class.pointer-events-none]': 'disabled() || loading()',
    '[class.cursor-not-allowed]': 'disabled() || loading()'
  },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppIconButtonComponent {
  public readonly icon = input.required<string>();
  public readonly variant = input<AppIconButtonVariant>('ghost');
  public readonly size = input<AppIconButtonSize>('sm');
  public readonly tooltip = input<string | undefined>(undefined);
  public readonly disabled = input<boolean>(false);
  public readonly loading = input<boolean>(false);
  public readonly badge = input<string | number | boolean | undefined>(undefined);
  public readonly badgeColor = input<string>('bg-blue-500');
  public readonly type = input<'button' | 'submit'>('button');

  public readonly clicked = output<MouseEvent>();

  protected readonly _iconSizeClass = computed(() => {
    switch (this.size()) {
      case 'xs':
        return '!w-3 !h-3';
      case 'lg':
        return '!w-5 !h-5';
      case 'md':
        return '!w-4 !h-4';
      case 'sm':
      default:
        return '!w-3.5 !h-3.5';
    }
  });

  protected readonly _computedClasses = computed(() => {
    const base = 'relative inline-flex items-center justify-center transition-all duration-150 select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 active:scale-95 disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed';

    // Size variants
    let sizeClass = '';
    switch (this.size()) {
      case 'xs':
        sizeClass = 'w-6 h-6 rounded-md';
        break;
      case 'md':
        sizeClass = 'w-9 h-9 rounded-xl';
        break;
      case 'lg':
        sizeClass = 'w-10 h-10 rounded-xl';
        break;
      case 'sm':
      default:
        sizeClass = 'w-8 h-8 rounded-lg';
        break;
    }

    // Color variants
    let variantClass = '';
    switch (this.variant()) {
      case 'secondary':
        variantClass = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700';
        break;
      case 'outline':
        variantClass = 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700';
        break;
      case 'primary':
        variantClass = 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs';
        break;
      case 'danger':
        variantClass = 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40';
        break;
      case 'ghost':
      default:
        variantClass = 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white';
        break;
    }

    return `${base} ${sizeClass} ${variantClass}`;
  });

  protected onClick(event: MouseEvent): void {
    if (!this.disabled() && !this.loading()) {
      this.clicked.emit(event);
    }
  }
}
