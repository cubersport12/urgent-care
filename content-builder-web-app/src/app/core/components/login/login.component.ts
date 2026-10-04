import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppApi } from '@/core/utils';
import { AppButtonComponent, AppCheckboxComponent, AppInputComponent } from '@/core/components/ui';
import { ToggleLightDarkButtonComponent } from '../toggle-light-dark-button';

const REMEMBERED_EMAIL_KEY = 'cb_remembered_email';

@Component({
  selector: 'app-login',
  imports: [
    FormsModule,
    MatIcon,
    MatTooltipModule,
    AppButtonComponent,
    AppInputComponent,
    AppCheckboxComponent,
    ToggleLightDarkButtonComponent
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors selection:bg-blue-500 selection:text-white">
      <!-- Ambient Background Elements -->
      <div class="pointer-events-none absolute inset-0 overflow-hidden">
        <!-- Soft Top Radial Glow -->
        <div class="absolute -top-[25%] left-1/2 -translate-x-1/2 w-[700px] sm:w-[900px] h-[500px] rounded-full bg-gradient-to-b from-blue-500/15 via-cyan-400/10 to-transparent dark:from-blue-600/20 dark:via-cyan-500/10 dark:to-transparent blur-3xl"></div>
        <!-- Bottom Accent Radial Glow -->
        <div class="absolute -bottom-[20%] right-[10%] w-[500px] h-[400px] rounded-full bg-gradient-to-t from-indigo-500/10 to-transparent dark:from-indigo-900/20 blur-3xl"></div>
        <!-- Subtle Grid Pattern -->
        <div class="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e11f_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e11f_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#3341551a_1px,transparent_1px),linear-gradient(to_bottom,#3341551a_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      </div>

      <!-- Top Navigation / Status Header -->
      <header class="relative z-10 w-full px-6 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-500/15 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <mat-icon svgIcon="kit-medical" class="!w-4 !h-4" />
          </div>
          <div class="hidden sm:flex flex-col">
            <span class="text-xs font-bold tracking-tight text-slate-900 dark:text-white leading-none">Urgent Care Portal</span>
            <span class="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Система управления контентом</span>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- Server Status Indicator -->
          <div class="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 backdrop-blur-md text-[11px] font-medium text-slate-600 dark:text-slate-300 shadow-xs">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Сервис онлайн</span>
          </div>

          <!-- Light/Dark Toggle -->
          <div class="p-1 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 backdrop-blur-md shadow-xs">
            <app-toggle-light-dark-button />
          </div>
        </div>
      </header>

      <!-- Center Main Card Container -->
      <main class="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
        <div class="w-full max-w-[420px] transition-all duration-300">
          <!-- Outer Card with Elevation & Glass Effect -->
          <div class="relative rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-xl sm:shadow-2xl sm:shadow-slate-200/50 dark:shadow-blue-950/20 backdrop-blur-xl p-7 sm:p-9">
            
            <!-- Brand Badge & Heading -->
            <div class="flex flex-col items-center text-center mb-7">
              <div class="relative mb-4 group">
                <div class="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 opacity-25 blur transition-opacity group-hover:opacity-40"></div>
                <div class="relative w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-md flex items-center justify-center p-2.5">
                  <img src="logo.png" alt="Urgent Care" class="w-full h-full object-contain" />
                </div>
              </div>

              <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/60 mb-2">
                <mat-icon svgIcon="shield-halved" class="!w-3 !h-3" />
                <span>Панель администратора</span>
              </div>

              <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Вход в конструктор
              </h1>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[280px]">
                Введите учетные данные администратора для доступа к клиническим материалам
              </p>
            </div>

            <!-- Login Form -->
            <form (ngSubmit)="submit()" class="flex flex-col gap-4">
              <!-- Email Input -->
              <app-input
                label="Рабочая почта"
                type="email"
                name="email"
                icon="envelope"
                placeholder="admin@urgentcare.ru"
                autocomplete="username"
                [(ngModel)]="email"
                [required]="true"
                size="lg"
                [clearable]="true"
              />

              <!-- Password Input -->
              <div class="flex flex-col gap-1">
                <app-input
                  label="Пароль доступа"
                  type="password"
                  name="password"
                  icon="lock"
                  placeholder="••••••••••••"
                  autocomplete="current-password"
                  [(ngModel)]="password"
                  [required]="true"
                  size="lg"
                  [togglePassword]="true"
                />
              </div>

              <!-- Options Row: Remember Me & Forgot Password -->
              <div class="flex items-center justify-between text-xs pt-1">
                <app-checkbox
                  label="Запомнить меня"
                  [(ngModel)]="rememberMe"
                  name="rememberMe"
                />

                <button
                  type="button"
                  (click)="showForgotPasswordNotice.set(!showForgotPasswordNotice())"
                  class="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors focus:outline-none"
                >
                  Забыли пароль?
                </button>
              </div>

              <!-- Forgot Password Notice Box (Expandable) -->
              @if (showForgotPasswordNotice()) {
                <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
                  <mat-icon svgIcon="exclamation-circle" class="!w-4 !h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div class="flex-1 text-[11px] leading-relaxed">
                    Сброс пароля осуществляется супер-администратором платформы Urgent Care. Обратитесь к куратору вашей системы.
                  </div>
                  <button
                    type="button"
                    (click)="showForgotPasswordNotice.set(false)"
                    class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <mat-icon svgIcon="times" class="!w-3 !h-3" />
                  </button>
                </div>
              }

              <!-- Error Alert Box -->
              @if (error) {
                <div class="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                  <mat-icon svgIcon="exclamation-circle" class="!w-4 !h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div class="flex-1 leading-snug">
                    <div class="font-semibold text-rose-800 dark:text-rose-200">Ошибка авторизации</div>
                    <div class="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">{{ error }}</div>
                  </div>
                  <button
                    type="button"
                    (click)="error = null"
                    class="text-rose-400 hover:text-rose-600 dark:hover:text-rose-200 transition-colors"
                  >
                    <mat-icon svgIcon="times" class="!w-3 !h-3" />
                  </button>
                </div>
              }

              <!-- Submit Action Button -->
              <div class="pt-2">
                <app-button
                  type="submit"
                  variant="primary"
                  size="lg"
                  [disabled]="loading || !email.trim() || !password"
                  [loading]="loading"
                  [fullWidth]="true"
                  iconRight="arrow-right"
                >
                  {{ loading ? 'Авторизация...' : 'Войти в конструктор' }}
                </app-button>
              </div>
            </form>

            <!-- Card Bottom Trust Footer -->
            <div class="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
              <mat-icon svgIcon="shield-halved" class="!w-3.5 !h-3.5 text-slate-400 dark:text-slate-500" />
              <span>Шифрованное соединение TLS 1.3 • Доступ по ролям</span>
            </div>
          </div>
        </div>
      </main>

      <!-- Bottom Page Footer -->
      <footer class="relative z-10 w-full py-4 px-6 text-center text-xs text-slate-400 dark:text-slate-500">
        <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <div>&copy; {{ currentYear }} Urgent Care Medical Systems. Все права защищены.</div>
          <div class="flex items-center gap-4 text-slate-500 dark:text-slate-400">
            <span>Безопасность</span>
            <span>Конфиденциальность</span>
            <span class="font-mono text-[10px] text-slate-400">v2.4.0</span>
          </div>
        </div>
      </footer>
    </div>
  `
})
export class LoginComponent {
  private readonly _api = inject(AppApi);
  private readonly _router = inject(Router);

  protected email = localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? '';
  protected password = '';
  protected rememberMe = Boolean(localStorage.getItem(REMEMBERED_EMAIL_KEY));
  protected error: string | null = null;
  protected loading = false;
  protected showForgotPasswordNotice = signal<boolean>(false);
  protected readonly currentYear = new Date().getFullYear();

  protected async submit(): Promise<void> {
    if (!this.email.trim() || !this.password) return;

    this.loading = true;
    this.error = null;
    try {
      if (this.rememberMe) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, this.email.trim());
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      await this._api.login(this.email.trim(), this.password);
      await this._router.navigate(['/']);
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Не удалось войти в систему. Проверьте логин и пароль.';
    } finally {
      this.loading = false;
    }
  }
}
