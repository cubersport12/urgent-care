import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppApi } from '@/core/utils';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="min-h-full flex items-center justify-center p-6">
      <form
        class="w-full max-w-sm rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow p-6 flex flex-col gap-4"
        (ngSubmit)="submit()"
      >
        <h1 class="text-xl font-semibold">Вход в конструктор</h1>

        <label class="flex flex-col gap-1 text-sm">
          Почта
          <input
            type="email"
            name="email"
            autocomplete="username"
            [(ngModel)]="email"
            required
            class="rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent px-3 py-2 outline-none focus:border-blue-500"
          />
        </label>

        <label class="flex flex-col gap-1 text-sm">
          Пароль
          <input
            type="password"
            name="password"
            autocomplete="current-password"
            [(ngModel)]="password"
            required
            class="rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent px-3 py-2 outline-none focus:border-blue-500"
          />
        </label>

        @if (error) {
          <p class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
        }

        <button
          type="submit"
          [disabled]="loading || !email || !password"
          class="rounded-lg bg-blue-600 px-4 py-2 text-white font-medium disabled:opacity-50 hover:bg-blue-700"
        >
          {{ loading ? 'Вход...' : 'Войти' }}
        </button>
      </form>
    </div>
  `
})
export class LoginComponent {
  private readonly _api = inject(AppApi);
  private readonly _router = inject(Router);

  protected email = '';
  protected password = '';
  protected error: string | null = null;
  protected loading = false;

  protected async submit(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      await this._api.login(this.email.trim(), this.password);
      await this._router.navigate(['/']);
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Не удалось войти';
    } finally {
      this.loading = false;
    }
  }
}
