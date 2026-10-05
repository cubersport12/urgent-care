import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { AppButtonComponent } from '../button/app-button.component';

@Component({
  selector: 'app-pagination',
  imports: [AppButtonComponent],
  template: `
    @if (_visible()) {
      <div class="flex items-center justify-between gap-3 pt-3 mt-1 border-t border-slate-100 dark:border-slate-800">
        <span class="text-[11px] text-slate-400 dark:text-slate-500">
          Показано {{ _rangeStart() }}–{{ _rangeEnd() }} из {{ total() }}
        </span>
        <div class="flex items-center gap-2">
          <app-button
            variant="outline"
            size="sm"
            icon="chevron-left"
            [disabled]="_prevDisabled()"
            (clicked)="_goTo(page() - 1)"
          >
            Назад
          </app-button>
          <span class="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
            Стр. {{ page() }} из {{ _totalPages() }}
          </span>
          <app-button
            variant="outline"
            size="sm"
            iconRight="chevron-right"
            [disabled]="_nextDisabled()"
            (clicked)="_goTo(page() + 1)"
          >
            Вперёд
          </app-button>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppPaginationComponent {
  public readonly page = input.required<number>();
  public readonly pageSize = input.required<number>();
  public readonly total = input.required<number>();

  public readonly pageChange = output<number>();

  protected readonly _totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

  protected readonly _visible = computed(() => this.total() > 0);

  protected readonly _rangeStart = computed(() => (this.page() - 1) * this.pageSize() + 1);

  protected readonly _rangeEnd = computed(() => Math.min(this.page() * this.pageSize(), this.total()));

  protected readonly _prevDisabled = computed(() => this.page() <= 1);

  protected readonly _nextDisabled = computed(() => this.page() >= this._totalPages());

  protected _goTo(page: number): void {
    if (page < 1 || page > this._totalPages() || page === this.page()) return;
    this.pageChange.emit(page);
  }
}
