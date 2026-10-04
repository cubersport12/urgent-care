import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppApi } from '@/core/utils';
import { AppButtonComponent, AppInputComponent } from '@/core/components/ui';

@Component({
  selector: 'app-login',
  imports: [FormsModule, AppButtonComponent, AppInputComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="min-h-full flex items-center justify-center p-6">
      <form
        class="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-6 flex flex-col gap-4"
        (ngSubmit)="submit()"
      >
        <h1 class="text-xl font-bold text-slate-900 dark:text-white">Вход в конструктор</h1>

        <app-input
          label="Почта"
          type="email"
          name="email"
          [(ngModel)]="email"
          [required]="true"
        />

        <app-input
          label="Пароль"
          type="password"
          name="password"
          [(ngModel)]="password"
          [required]="true"
        />

        @if (error) {
          <p class="text-xs text-rose-600 dark:text-rose-400">{{ error }}</p>
        }

        <app-button
          type="submit"
          variant="primary"
          [disabled]="loading || !email || !password"
          [loading]="loading"
          [fullWidth]="true"
        >
          Войти
        </app-button>
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
