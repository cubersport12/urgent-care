import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export type AppButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type AppButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
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
      } @else if (icon()) {
        <mat-icon [svgIcon]="icon()!" class="!w-3.5 !h-3.5 shrink-0" />
      }

      <span class="truncate inline-flex items-center">
        <ng-content></ng-content>
      </span>

      @if (iconRight() && !loading()) {
        <mat-icon [svgIcon]="iconRight()!" class="!w-3 !h-3 shrink-0 ml-0.5" />
      }
    </button>
  `,
  styles: `
    :host {
      display: inline-block;
    }
    :host([fullWidth="true"]) {
      display: block;
      width: 100%;
    }
  `,
  host: {
    '[class.pointer-events-none]': 'disabled() || loading()',
    '[class.cursor-not-allowed]': 'disabled() || loading()'
  },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppButtonComponent {
  public readonly variant = input<AppButtonVariant>('primary');
  public readonly size = input<AppButtonSize>('md');
  public readonly icon = input<string | undefined>(undefined);
  public readonly iconRight = input<string | undefined>(undefined);
  public readonly loading = input<boolean>(false);
  public readonly disabled = input<boolean>(false);
  public readonly type = input<'button' | 'submit' | 'reset'>('button');
  public readonly fullWidth = input<boolean>(false);
  public readonly tooltip = input<string | undefined>(undefined);

  public readonly clicked = output<MouseEvent>();

  protected readonly _computedClasses = computed(() => {
    const base = 'inline-flex items-center justify-center font-medium transition-all duration-150 select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed';

    // Width
    const widthClass = this.fullWidth() ? 'w-full' : '';

    // Size variants
    let sizeClass = '';
    switch (this.size()) {
      case 'sm':
        sizeClass = 'h-8 px-2.5 text-xs rounded-lg gap-1.5';
        break;
      case 'lg':
        sizeClass = 'h-10 px-5 text-sm font-semibold rounded-xl gap-2.5';
        break;
      case 'md':
      default:
        sizeClass = 'h-9 px-3.5 text-xs font-semibold rounded-xl gap-2 shadow-xs';
        break;
    }

    // Color variants
    let variantClass = '';
    switch (this.variant()) {
      case 'secondary':
        variantClass = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700';
        break;
      case 'outline':
        variantClass = 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-700';
        break;
      case 'ghost':
        variantClass = 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white';
        break;
      case 'danger':
        variantClass = 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20 shadow-sm border border-transparent';
        break;
      case 'primary':
      default:
        variantClass = 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 shadow-sm border border-transparent';
        break;
    }

    return `${base} ${sizeClass} ${variantClass} ${widthClass}`;
  });

  protected onClick(event: MouseEvent): void {
    if (!this.disabled() && !this.loading()) {
      this.clicked.emit(event);
    }
  }
}
