import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToggleLightDarkButtonComponent } from '../toggle-light-dark-button';
import { filter } from 'rxjs';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-admin-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatIcon,
    MatButtonModule,
    MatTooltipModule,
    ToggleLightDarkButtonComponent
  ],
  template: `
    <div class="flex h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <!-- Mobile Backdrop -->
      @if (_isMobileOpen()) {
        <div
          class="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden transition-opacity"
          (click)="_closeMobileMenu()"
        ></div>
      }

      <!-- Sidebar -->
      <aside
        class="fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0"
        [class.-translate-x-full]="!_isMobileOpen()"
        [class.translate-x-0]="_isMobileOpen()"
      >
        <!-- App Brand Header -->
        <div class="flex items-center justify-between h-16 px-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <a routerLink="/dashboard" class="flex items-center gap-3 group">
            <img src="logo.png" alt="Urgent Care" class="w-9 h-9 rounded-xl object-contain shadow-sm group-hover:scale-105 transition-transform shrink-0" />
            <div>
              <div class="font-bold text-sm tracking-tight text-slate-900 dark:text-white leading-tight">
                Urgent Care
              </div>
              <div class="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Панель управления
              </div>
            </div>
          </a>

          <!-- Mobile Close Button -->
          <button
            type="button"
            mat-icon-button
            class="lg:hidden !w-8 !h-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            (click)="_closeMobileMenu()"
          >
            <mat-icon svgIcon="times" class="!w-4 !h-4" />
          </button>
        </div>

        <!-- Navigation Links Groups -->
        <nav class="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-6">
          @for (sec of _navSections; track sec.title) {
            <div>
              <div class="px-3 mb-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {{ sec.title }}
              </div>
              <div class="space-y-1">
                @for (item of sec.items; track item.route) {
                  <a
                    [routerLink]="item.route"
                    routerLinkActive="bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold shadow-sm"
                    [routerLinkActiveOptions]="{ exact: false }"
                    (click)="_closeMobileMenu()"
                    class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition-all group"
                  >
                    <div class="flex items-center gap-3">
                      <mat-icon
                        [svgIcon]="item.icon"
                        class="!w-4 !h-4 text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors"
                      />
                      <span>{{ item.label }}</span>
                    </div>
                    @if (item.badge) {
                      <span class="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                        {{ item.badge }}
                      </span>
                    }
                  </a>
                }
              </div>
            </div>
          }
        </nav>

        <!-- Sidebar Footer -->
        <div class="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div class="flex items-center justify-between p-2 rounded-xl">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-xs shrink-0">
                А
              </div>
              <div class="truncate">
                <p class="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">Администратор</p>
                <p class="text-[10px] text-slate-400 truncate">admin&#64;urgent-care.ru</p>
              </div>
            </div>

            <a
              routerLink="/login"
              mat-icon-button
              matTooltip="Выйти из системы"
              class="!w-8 !h-8 text-slate-400 hover:text-rose-500 transition-colors"
            >
              <mat-icon svgIcon="arrow-up" class="!w-4 !h-4 rotate-90" />
            </a>
          </div>
        </div>
      </aside>

      <!-- Main Area (Header + Routed Content) -->
      <div class="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <!-- Top App Header -->
        <header class="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 flex items-center justify-between shrink-0 z-10 shadow-xs">
          <div class="flex items-center gap-3">
            <button
              type="button"
              mat-icon-button
              class="lg:hidden text-slate-600 dark:text-slate-300 !w-8 !h-8 flex items-center justify-center"
              (click)="_toggleMobileMenu()"
            >
              <mat-icon svgIcon="bars" class="!w-5 !h-5" />
            </button>

            <!-- Page Title Breadcrumb -->
            <div class="flex items-center gap-2 leading-none">
              <span class="text-xs font-medium text-slate-400 dark:text-slate-500">Панель управления</span>
              <span class="text-slate-300 dark:text-slate-600 text-xs">/</span>
              <h2 class="text-sm font-bold text-slate-900 dark:text-white leading-none m-0">
                {{ _currentRouteTitle() }}
              </h2>
            </div>
          </div>

          <!-- Header Actions -->
          <div class="flex items-center gap-3">
            <app-toggle-light-dark-button />
          </div>
        </header>

        <!-- Main Routed Content View -->
        <main class="flex-1 min-h-0 flex flex-col overflow-auto bg-slate-50 dark:bg-slate-950">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminLayoutComponent {
  private readonly _router = inject(Router);

  protected readonly _isMobileOpen = signal(false);
  protected readonly _currentUrl = signal<string>(this._router.url);

  protected readonly _navSections: NavSection[] = [
    {
      title: 'Обзор',
      items: [
        { label: 'Дашборд и Аналитика', route: '/dashboard', icon: 'chart-line' }
      ]
    },
    {
      title: 'Обучение и контент',
      items: [
        { label: 'Файловый менеджер', route: '/content', icon: 'folder-open' }
      ]
    },
    {
      title: 'Пользователи',
      items: [
        { label: 'Управление пользователями', route: '/users', icon: 'users' }
      ]
    },
    {
      title: 'Монетизация',
      items: [
        { label: 'Тарифные планы', route: '/tariffs', icon: 'sliders' },
        { label: 'Промокоды', route: '/promo-codes', icon: 'tag' },
        { label: 'Возврат подписок', route: '/refunds', icon: 'credit-card' }
      ]
    },
    {
      title: 'Геймификация',
      items: [
        { label: 'Достижения', route: '/achievements', icon: 'trophy' },
        { label: 'Награды', route: '/rewards', icon: 'gift' },
        { label: 'Сброс статистики', route: '/stats-reset', icon: 'trash' }
      ]
    },
    {
      title: 'Система',
      items: [
        { label: 'Нормативные документы', route: '/legal-docs', icon: 'file-contract' },
        { label: 'Сертификаты', route: '/certificates', icon: 'certificate' },
        { label: 'Настройки платформы', route: '/settings', icon: 'gear' }
      ]
    }
  ];

  protected readonly _currentRouteTitle = computed(() => {
    const url = this._currentUrl();
    for (const sec of this._navSections) {
      for (const item of sec.items) {
        if (url.startsWith(item.route)) {
          return item.label;
        }
      }
    }
    return 'Панель управления';
  });

  constructor() {
    this._router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this._currentUrl.set(event.urlAfterRedirects);
        this._isMobileOpen.set(false);
      });
  }

  protected _toggleMobileMenu(): void {
    this._isMobileOpen.update((v) => !v);
  }

  protected _closeMobileMenu(): void {
    this._isMobileOpen.set(false);
  }
}
