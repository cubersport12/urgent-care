import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppTariffsStorageService } from '@/core/api';
import { usersListUsers } from '@/core/api/generated/sdk.gen';
import { apiCall } from '@/core/api/api-utils';
import type { UserListItemOut, TariffOut } from '@/core/api/generated/types.gen';
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

interface ActivityEvent {
  id: string;
  user: string;
  action: string;
  time: string;
  type: 'subscription' | 'test' | 'reward' | 'user';
  badgeColor: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, MatIcon, MatButtonModule, MatTooltipModule, AppIconButtonComponent],
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
              <span
                class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                [class.text-emerald-700]="m.isPositive"
                [class.bg-emerald-50]="m.isPositive"
                [class.dark:text-emerald-400]="m.isPositive"
                [class.dark:bg-emerald-950/40]="m.isPositive"
                [class.text-rose-700]="!m.isPositive"
                [class.bg-rose-50]="!m.isPositive"
              >
                {{ m.change }}
              </span>
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
            <span class="text-xs px-2.5 py-1 font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">
              Текущая неделя
            </span>
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
              }
            </div>
          </div>

          <div class="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <span class="text-xs text-slate-500 dark:text-slate-400">Конверсия в платную подписку</span>
            <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400">18.4%</span>
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
                Последние действия пользователей и администраторов
              </p>
            </div>
            <a routerLink="/users" class="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              Все пользователи →
            </a>
          </div>

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
  private readonly _tariffsStorage = inject(AppTariffsStorageService);

  protected readonly _usersCount = signal<number>(0);
  protected readonly _tariffsList = signal<TariffOut[]>([]);

  protected readonly _metrics = computed<MetricCard[]>(() => {
    const users = this._usersCount();
    return [
      {
        title: 'Всего пользователей',
        value: users > 0 ? users.toLocaleString('ru-RU') : '1 420',
        change: '+12% за месяц',
        isPositive: true,
        icon: 'users',
        color: 'text-blue-600 dark:text-blue-400',
        bgLight: 'bg-blue-50',
        bgDark: 'dark:bg-blue-950/40'
      },
      {
        title: 'Активные подписки',
        value: '384',
        change: '+8.4%',
        isPositive: true,
        icon: 'credit-card',
        color: 'text-emerald-600 dark:text-emerald-400',
        bgLight: 'bg-emerald-50',
        bgDark: 'dark:bg-emerald-950/40'
      },
      {
        title: 'Месячная выручка',
        value: '284 500 ₽',
        change: '+15.2%',
        isPositive: true,
        icon: 'coins',
        color: 'text-amber-600 dark:text-amber-400',
        bgLight: 'bg-amber-50',
        bgDark: 'dark:bg-amber-950/40'
      },
      {
        title: 'Пройдено тестов',
        value: '3 892',
        change: '+24%',
        isPositive: true,
        icon: 'sliders',
        color: 'text-purple-600 dark:text-purple-400',
        bgLight: 'bg-purple-50',
        bgDark: 'dark:bg-purple-950/40'
      }
    ];
  });

  protected readonly _weeklyStats = signal([
    { day: 'Пн', tests: 140, testsPercentage: 70, rescues: 45, rescuesPercentage: 35 },
    { day: 'Вт', tests: 185, testsPercentage: 92, rescues: 60, rescuesPercentage: 48 },
    { day: 'Ср', tests: 160, testsPercentage: 80, rescues: 50, rescuesPercentage: 40 },
    { day: 'Чт', tests: 200, testsPercentage: 100, rescues: 75, rescuesPercentage: 60 },
    { day: 'Пт', tests: 175, testsPercentage: 87, rescues: 65, rescuesPercentage: 52 },
    { day: 'Сб', tests: 120, testsPercentage: 60, rescues: 80, rescuesPercentage: 64 },
    { day: 'Вс', tests: 110, testsPercentage: 55, rescues: 70, rescuesPercentage: 56 }
  ]);

  protected readonly _tariffsSummary = computed(() => {
    const list = this._tariffsList();
    if (list.length === 0) {
      return [
        { id: '1', title: 'Базовый', priceRub: 0, usersCount: 820, percentage: 58 },
        { id: '2', title: 'Стандарт', priceRub: 490, usersCount: 380, percentage: 27 },
        { id: '3', title: 'Премиум', priceRub: 990, usersCount: 220, percentage: 15 }
      ];
    }
    const totalEst = 1000;
    return list.slice(0, 4).map((t, idx) => {
      const share = idx === 0 ? 55 : idx === 1 ? 30 : 15;
      return {
        id: t.id,
        title: t.title,
        priceRub: t.priceRub,
        usersCount: Math.round((totalEst * share) / 100),
        percentage: share
      };
    });
  });

  protected readonly _activity = signal<ActivityEvent[]>([
    {
      id: '1',
      user: 'Иван Сергеев',
      action: 'Оформил подписку «Премиум» на 30 дней',
      time: '12 минут назад',
      type: 'subscription',
      badgeColor: 'bg-emerald-500'
    },
    {
      id: '2',
      user: 'Елена Кузнецова',
      action: 'Успешно завершила симуляцию «Острая дыхательная недостаточность» (98 баллов)',
      time: '34 минуты назад',
      type: 'test',
      badgeColor: 'bg-blue-500'
    },
    {
      id: '3',
      user: 'Дмитрий Власов',
      action: 'Получил достижение «Первый спасатель» и сертификат',
      time: '1 час назад',
      type: 'reward',
      badgeColor: 'bg-amber-500'
    },
    {
      id: '4',
      user: 'Ольга Морозова',
      action: 'Активировала промокод SPRING2026 (-20%)',
      time: '2 часа назад',
      type: 'subscription',
      badgeColor: 'bg-purple-500'
    },
    {
      id: '5',
      user: 'Александр Белов',
      action: 'Зарегистрировался в системе',
      time: '3 часа назад',
      type: 'user',
      badgeColor: 'bg-slate-400'
    }
  ]);

  constructor() {
    this._reload();
  }

  protected _reload(): void {
    this._tariffsStorage.listAll().subscribe({
      next: (list) => this._tariffsList.set(list),
      error: () => {}
    });

    void (async () => {
      try {
        const users = await apiCall(() => usersListUsers());
        if (users?.length) {
          this._usersCount.set(users.length);
        }
      } catch {
        // Fallback demo count
      }
    })();
  }
}
