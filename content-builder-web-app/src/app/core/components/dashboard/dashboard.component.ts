import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { analyticsAnalyticsRecentEvents, analyticsAnalyticsSummary } from '@/core/api/generated/sdk.gen';
import { apiCall } from '@/core/api/api-utils';
import type { ActivityEventOut, AnalyticsSummaryOut } from '@/core/api/generated/types.gen';
import { AppIconButtonComponent, AppButtonComponent } from '../ui';

interface MetricCard {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: string;
  color: string;
  bgLight: string;
  bgDark: string;
}

interface ActivityRow {
  id: string;
  user: string;
  action: string;
  time: string;
  badgeColor: string;
}

const WEEKDAY_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

type Period = 'week' | 'month' | 'year';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, MatIcon, MatButtonModule, MatTooltipModule, AppIconButtonComponent, AppButtonComponent],
  template: `
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <!-- Welcome Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Панель управления Urgent Care
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Сводка активности пользователей, метрик монетизации и обучающего контента
          </p>
        </div>
        <div class="flex items-center gap-2">
          <a
            routerLink="/content"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 inline-flex items-center gap-2 transition-colors"
          >
            <mat-icon svgIcon="folder-open" class="!w-4 !h-4" />
            <span>Конструктор контента</span>
          </a>
          <app-icon-button
            icon="rotate-right"
            variant="outline"
            tooltip="Обновить данные"
            (clicked)="_reload()"
          />
        </div>
      </div>

      <!-- Period Filter -->
      <div class="flex items-center gap-2">
        <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Период:</span>
        <div class="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium gap-1">
          @for (p of _periods; track p.value) {
            <app-button
              [variant]="_period() === p.value ? 'secondary' : 'ghost'"
              size="sm"
              (click)="_setPeriod(p.value)"
            >
              {{ p.label }}
            </app-button>
          }
        </div>
      </div>

      <!-- Metrics Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        @for (m of _metrics(); track m.title) {
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {{ m.title }}
              </span>
              <div [class]="'w-10 h-10 rounded-xl flex items-center justify-center ' + m.bgLight + ' ' + m.bgDark">
                <mat-icon [svgIcon]="m.icon" [class]="'!w-5 !h-5 ' + m.color" />
              </div>
            </div>
            <div class="mt-4 flex items-baseline justify-between">
              <span class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {{ m.value }}
              </span>
              @if (m.change) {
                <span class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ m.change }}</span>
              }
            </div>
          </div>
        }
      </div>

      <!-- Main Analytics Row -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Interactive Chart / Activity Stats -->
        <div class="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-base font-bold text-slate-900 dark:text-white">
                Динамика прохождения обучающих материалов
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Завершенные тесты и симуляции спасения за последние 7 дней
              </p>
            </div>
          </div>

          <!-- Chart Visual Bars -->
          <div class="pt-6 pb-2">
            <div class="h-44 flex items-end justify-between gap-3 px-2">
              @for (day of _weeklyStats(); track day.day) {
                <div class="flex-1 flex flex-col items-center gap-2 group">
                  <div class="w-full flex items-end justify-center gap-1 h-36">
                    <!-- Tests bar -->
                    <div
                      class="w-3/5 bg-blue-500 hover:bg-blue-600 rounded-t-md transition-all group-hover:scale-105"
                      [style.height.%]="day.testsPercentage"
                      [matTooltip]="day.day + ': Тесты — ' + day.tests"
                    ></div>
                    <!-- Rescues bar -->
                    <div
                      class="w-2/5 bg-emerald-500 hover:bg-emerald-600 rounded-t-md transition-all group-hover:scale-105"
                      [style.height.%]="day.rescuesPercentage"
                      [matTooltip]="day.day + ': Спасения — ' + day.rescues"
                    ></div>
                  </div>
                  <span class="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {{ day.day }}
                  </span>
                </div>
              }
            </div>

            <!-- Legend -->
            <div class="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-sm bg-blue-500"></span>
                <span class="text-slate-600 dark:text-slate-300">Тесты</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-sm bg-emerald-500"></span>
                <span class="text-slate-600 dark:text-slate-300">Сценарии спасения</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Tariff Distribution Card -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between">
              <h2 class="text-base font-bold text-slate-900 dark:text-white">
                Тарифные планы
              </h2>
              <a routerLink="/tariffs" class="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                Все тарифы
              </a>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Активные подписчики по тарифам
            </p>

            <div class="mt-5 space-y-3">
              @for (t of _tariffsSummary(); track t.id) {
                <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-semibold text-slate-800 dark:text-slate-200">{{ t.title }}</span>
                    <span class="font-bold text-slate-900 dark:text-white">{{ t.priceRub }} ₽</span>
                  </div>
                  <div class="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      class="bg-blue-600 h-full rounded-full"
                      [style.width.%]="t.percentage"
                    ></div>
                  </div>
                  <div class="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                    <span>{{ t.usersCount }} пользователей</span>
                    <span>{{ t.percentage }}%</span>
                  </div>
                </div>
              } @empty {
                <p class="text-xs text-slate-400 dark:text-slate-500">Пока нет активных подписок</p>
              }
            </div>
          </div>

          <div class="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <span class="text-xs text-slate-500 dark:text-slate-400">Конверсия в платную подписку</span>
            <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {{ _summary()?.conversionPercent ?? '—' }}%
            </span>
          </div>
        </div>
      </div>

      <!-- Quick Actions and Recent Activity -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Quick Actions Panel -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <h2 class="text-base font-bold text-slate-900 dark:text-white">Быстрые действия</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
            Часто используемые административные операции
          </p>

          <div class="grid grid-cols-2 gap-3">
            <a
              routerLink="/content"
              class="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-center transition-all group"
            >
              <div class="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <mat-icon svgIcon="folder-open" class="!w-4 !h-4" />
              </div>
              <span class="text-xs font-medium text-slate-700 dark:text-slate-200">Создать контент</span>
            </a>

            <a
              routerLink="/users"
              class="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-center transition-all group"
            >
              <div class="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <mat-icon svgIcon="users" class="!w-4 !h-4" />
              </div>
              <span class="text-xs font-medium text-slate-700 dark:text-slate-200">Пользователи</span>
            </a>

            <a
              routerLink="/promo-codes"
              class="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 text-center transition-all group"
            >
              <div class="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <mat-icon svgIcon="tag" class="!w-4 !h-4" />
              </div>
              <span class="text-xs font-medium text-slate-700 dark:text-slate-200">Промокоды</span>
            </a>

            <a
              routerLink="/certificates"
              class="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 text-center transition-all group"
            >
              <div class="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <mat-icon svgIcon="certificate" class="!w-4 !h-4" />
              </div>
              <span class="text-xs font-medium text-slate-700 dark:text-slate-200">Сертификаты</span>
            </a>
          </div>
        </div>

        <!-- Recent Activity Feed -->
        <div class="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-base font-bold text-slate-900 dark:text-white">Лента активности</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Последние действия пользователей: обучение, оплаты, регистрации
              </p>
            </div>
            <a routerLink="/users" class="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              Все пользователи →
            </a>
          </div>

          @if (_activity().length === 0) {
            <p class="text-xs text-slate-400 dark:text-slate-500 py-4">Событий пока нет</p>
          }
          <div class="divide-y divide-slate-100 dark:divide-slate-800">
            @for (event of _activity(); track event.id) {
              <div class="py-3 flex items-center justify-between gap-3 text-xs">
                <div class="flex items-center gap-3 min-w-0">
                  <div [class]="'w-2 h-2 rounded-full shrink-0 ' + event.badgeColor"></div>
                  <div class="truncate">
                    <span class="font-semibold text-slate-900 dark:text-white">{{ event.user }}</span>
                    <span class="text-slate-600 dark:text-slate-300 ml-1.5">{{ event.action }}</span>
                  </div>
                </div>
                <span class="text-slate-400 dark:text-slate-500 shrink-0">{{ event.time }}</span>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  protected readonly _periods: Array<{ value: Period; label: string }> = [
    { value: 'week', label: 'Неделя' },
    { value: 'month', label: 'Месяц' },
    { value: 'year', label: 'Год' }
  ];

  protected readonly _period = signal<Period>('month');
  protected readonly _summary = signal<AnalyticsSummaryOut | null>(null);
  protected readonly _recentEvents = signal<ActivityEventOut[]>([]);

  private readonly _periodLabels: Record<Period, string> = {
    week: 'неделю',
    month: 'месяц',
    year: 'год'
  };

  protected readonly _metrics = computed<MetricCard[]>(() => {
    const s = this._summary();
    const periodLabel = this._periodLabels[this._period()];
    const fmt = (n: number | undefined) => (n ?? 0).toLocaleString('ru-RU');
    return [
      {
        title: 'Всего пользователей',
        value: s ? fmt(s.usersTotal) : '…',
        change: s ? `+${fmt(s.usersNew)} за ${periodLabel}` : '',
        isPositive: true,
        icon: 'users',
        color: 'text-blue-600 dark:text-blue-400',
        bgLight: 'bg-blue-50',
        bgDark: 'dark:bg-blue-950/40'
      },
      {
        title: 'Активные подписки',
        value: s ? fmt(s.activeSubscriptions) : '…',
        change: s ? `конверсия ${s.conversionPercent}%` : '',
        isPositive: true,
        icon: 'credit-card',
        color: 'text-emerald-600 dark:text-emerald-400',
        bgLight: 'bg-emerald-50',
        bgDark: 'dark:bg-emerald-950/40'
      },
      {
        title: `Выручка за ${periodLabel}`,
        value: s ? `${Math.round(s.revenueRub ?? 0).toLocaleString('ru-RU')} ₽` : '…',
        change: '',
        isPositive: true,
        icon: 'coins',
        color: 'text-amber-600 dark:text-amber-400',
        bgLight: 'bg-amber-50',
        bgDark: 'dark:bg-amber-950/40'
      },
      {
        title: `Пройдено тестов за ${periodLabel}`,
        value: s ? fmt(s.testsFinished) : '…',
        change: '',
        isPositive: true,
        icon: 'sliders',
        color: 'text-purple-600 dark:text-purple-400',
        bgLight: 'bg-purple-50',
        bgDark: 'dark:bg-purple-950/40'
      }
    ];
  });

  protected readonly _weeklyStats = computed(() => {
    const series = this._summary()?.series ?? [];
    const max = Math.max(1, ...series.map(d => Math.max(d.tests ?? 0, d.rescues ?? 0)));
    return series.map(d => ({
      day: WEEKDAY_RU[new Date(d.date).getDay()],
      tests: d.tests ?? 0,
      testsPercentage: Math.round((d.tests ?? 0) / max * 100),
      rescues: d.rescues ?? 0,
      rescuesPercentage: Math.round((d.rescues ?? 0) / max * 100)
    }));
  });

  protected readonly _tariffsSummary = computed(() => {
    const tariffs = this._summary()?.tariffs ?? [];
    const total = tariffs.reduce((sum, t) => sum + t.count, 0);
    return tariffs.map(t => ({
      id: t.tariffId,
      title: t.title,
      priceRub: t.priceRub ?? 0,
      usersCount: t.count,
      percentage: total > 0 ? Math.round(t.count / total * 100) : 0
    }));
  });

  protected readonly _activity = computed<ActivityRow[]>(() =>
    this._recentEvents().map((e) => ({
      id: e.id,
      user: e.userName || e.title,
      action: this._describeEvent(e),
      time: this._timeAgo(e.createdAt),
      badgeColor: this._badgeColor(e.kind)
    }))
  );

  constructor() {
    this._reload();
  }

  protected _setPeriod(period: Period): void {
    if (this._period() === period) return;
    this._period.set(period);
    void this._loadSummary();
  }

  protected _reload(): void {
    void this._loadSummary();
    void this._loadActivity();
  }

  private async _loadSummary(): Promise<void> {
    try {
      const summary = await apiCall(() => analyticsAnalyticsSummary({ query: { period: this._period() } }));
      this._summary.set(summary);
    } catch {
      // держим предыдущие данные / «…» при первом неудачном запросе
    }
  }

  private async _loadActivity(): Promise<void> {
    try {
      const events = await apiCall(() => analyticsAnalyticsRecentEvents({ query: { limit: 20 } }));
      this._recentEvents.set(events ?? []);
    } catch {
      // держим предыдущие данные
    }
  }

  private _describeEvent(e: ActivityEventOut): string {
    const subject = e.title ? `«${e.title}»` : '';
    const suffix = e.score != null && e.kind === 'test' && e.event === 'finished' ? ` (${Math.round(e.score)} балл.)` : '';
    switch (e.kind) {
      case 'test':
        return e.event === 'finished' ? `завершение теста ${subject}${suffix}` : `начало теста ${subject}`;
      case 'rescue':
        return e.event === 'finished' ? `симуляция спасения завершена ${subject}` : `начата симуляция спасения ${subject}`;
      case 'article':
        return e.event === 'completed' ? `прочитана статья ${subject}` : `открыта статья ${subject}`;
      case 'payment':
        return `оплата тарифа ${subject} — ${Math.round(e.score ?? 0).toLocaleString('ru-RU')} ₽`;
      case 'registration':
        return 'зарегистрировался в системе';
    }
  }

  private _badgeColor(kind: ActivityEventOut['kind']): string {
    switch (kind) {
      case 'test':
        return 'bg-blue-500';
      case 'rescue':
        return 'bg-emerald-500';
      case 'article':
        return 'bg-indigo-400';
      case 'payment':
        return 'bg-amber-500';
      case 'registration':
        return 'bg-slate-400';
    }
  }

  private _timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'только что';
    if (min < 60) return `${min} мин. назад`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} ч. назад`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d} дн. назад`;
    return new Date(iso).toLocaleDateString('ru-RU');
  }
}
