import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';

export type AppBadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'indigo' | 'purple' | 'info';
export type AppBadgeSize = 'sm' | 'md';

@Component({
  selector: 'app-badge',
  imports: [MatIcon],
  template: `
    <span [class]="_computedClasses()">
      @if (dot()) {
        <span class="w-1.5 h-1.5 rounded-full" [class]="_dotColorClass()"></span>
      }

      @if (icon()) {
        <mat-icon [svgIcon]="icon()!" class="!w-3 !h-3 shrink-0" />
      }

      <span class="truncate">
        <ng-content></ng-content>
      </span>

      @if (removable()) {
        <span
          role="button"
          tabindex="0"
          (keydown.enter)="removed.emit()"
          (click)="removed.emit()"
          class="hover:opacity-75 cursor-pointer ml-0.5 inline-flex items-center"
        >
          <mat-icon svgIcon="times" class="!w-2.5 !h-2.5 block" />
        </span>
      }
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppBadgeComponent {
  public readonly variant = input<AppBadgeVariant>('neutral');
  public readonly size = input<AppBadgeSize>('sm');
  public readonly dot = input<boolean>(false);
  public readonly icon = input<string | undefined>(undefined);
  public readonly removable = input<boolean>(false);

  public readonly removed = output<void>();

  protected readonly _dotColorClass = computed(() => {
    switch (this.variant()) {
      case 'primary': return 'bg-blue-500';
      case 'info': return 'bg-sky-500';
      case 'success': return 'bg-emerald-500';
      case 'warning': return 'bg-amber-500';
      case 'danger': return 'bg-rose-500';
      case 'indigo': return 'bg-indigo-500';
      case 'purple': return 'bg-purple-500';
      case 'neutral':
      default: return 'bg-slate-400';
    }
  });

  protected readonly _computedClasses = computed(() => {
    const base = 'inline-flex items-center gap-1 font-semibold rounded-lg select-none whitespace-nowrap transition-colors';

    let sizeClass = 'px-2 py-0.5 text-[11px] leading-tight';
    if (this.size() === 'md') {
      sizeClass = 'px-2.5 py-1 text-xs leading-tight';
    }

    let colorClass = '';
    switch (this.variant()) {
      case 'primary':
        colorClass = 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900/60';
        break;
      case 'info':
        colorClass = 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-900/60';
        break;
      case 'success':
        colorClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900/60';
        break;
      case 'warning':
        colorClass = 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900/60';
        break;
      case 'danger':
        colorClass = 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900/60';
        break;
      case 'indigo':
        colorClass = 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-900/60';
        break;
      case 'purple':
        colorClass = 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-900/60';
        break;
      case 'neutral':
      default:
        colorClass = 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
        break;
    }

    return `${base} ${sizeClass} ${colorClass}`;
  });
}
