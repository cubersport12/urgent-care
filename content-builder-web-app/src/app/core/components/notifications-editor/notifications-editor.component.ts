import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

import { apiCall } from '@/core/api/api-utils';
import { AppFilesStorageService } from '@/core/api';
import {
  adminNotificationsCreateSchedule, adminNotificationsCreateTemplate, adminNotificationsDeleteTemplate,
  adminNotificationsHistory,
  adminNotificationsListSchedules, adminNotificationsListTemplates, adminNotificationsRepeat,
  adminNotificationsSendCampaign, adminNotificationsStopSchedule, adminNotificationsUpdateTemplate,
  adminNotificationsUploadIcon, usersListUsers
} from '@/core/api/generated/sdk.gen';
import type { DispatchInput, DispatchOut, ScheduleOut, TemplateOut, UserListItemOut } from '@/core/api/generated/types.gen';
import { AppButtonComponent, AppInputComponent, AppSelectComponent, AppTextareaComponent } from '../ui';

@Component({
  selector: 'app-notifications-editor',
  imports: [DatePipe, ReactiveFormsModule, AppButtonComponent, AppInputComponent, AppSelectComponent, AppTextareaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto w-full max-w-7xl p-4 md:p-8 text-slate-900 dark:text-slate-100">
      <header class="mb-7">
        <h1 class="text-2xl font-bold tracking-tight">Уведомления</h1>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">Создавайте сообщения, управляйте расписаниями и смотрите историю отправок.</p>
      </header>

      @if (error()) {
        <div role="alert" class="mb-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">{{ error() }}</div>
      }
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
        <section class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 md:p-6" aria-labelledby="compose-title">
          <div class="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div><h2 id="compose-title" class="text-lg font-semibold">Сообщение</h2><p class="mt-1 text-sm text-slate-600 dark:text-slate-300">Заполните форму или выберите сохранённый шаблон.</p></div>
            @if (editingId()) { <app-button variant="ghost" (clicked)="reset()">Новый шаблон</app-button> }
          </div>
          <form [formGroup]="form" (ngSubmit)="send()" class="space-y-4">
            <app-input label="Название шаблона" formControlName="name" [required]="true" />
            <app-input label="Заголовок уведомления" formControlName="title" [required]="true" />
            <app-textarea label="Текст сообщения" formControlName="body" [rows]="4" />
            <p class="text-xs text-slate-600 dark:text-slate-300">Используйте {{ nameToken }} для обращения по имени. Если имя не указано, появится «коллега».</p>
            <div>
              <label for="notification-icon" class="block text-xs font-semibold text-slate-700 dark:text-slate-200">Иконка сообщения</label>
              <p class="mt-1 text-xs text-slate-600 dark:text-slate-300">PNG, JPEG или WebP, до 2 МиБ и 1024 × 1024 пикселей.</p>
              <div class="mt-2 flex flex-wrap items-center gap-3">
                @if (form.controls.icon_path.value; as path) { <img [src]="files.getFileUrl(path)" alt="Выбранная иконка" class="h-12 w-12 rounded-lg object-cover" /> }
                <input id="notification-icon" type="file" accept="image/png,image/jpeg,image/webp" (change)="upload($event)" class="block max-w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-slate-800 dark:file:bg-slate-700 dark:file:text-white" />
                @if (form.controls.icon_path.value) { <app-button variant="ghost" (clicked)="form.controls.icon_path.setValue(null)">Убрать</app-button> }
              </div>
            </div>
            <app-select label="Получатели" formControlName="audience" [options]="audienceOptions" />
            @if (form.controls.audience.value === 'selected') {
              <div class="space-y-2">
                <app-input label="Поиск пользователей" [formControl]="search" placeholder="Имя или email" />
                <p class="text-xs text-slate-600 dark:text-slate-300">Выбрано: {{ selectedIds().length }}</p>
                <div class="max-h-48 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700" role="group" aria-label="Выберите пользователей">
                  @for (user of filteredUsers(); track user.id) {
                    <label class="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                      <input type="checkbox" [checked]="selectedIds().includes(user.id)" (change)="toggleUser(user.id, $event)" />
                      <span class="min-w-0 break-all">{{ user.fullName || user.email }} <span class="text-slate-500 dark:text-slate-400">{{ user.email }}</span></span>
                    </label>
                  } @empty { <p class="p-3 text-sm text-slate-600 dark:text-slate-300">Пользователи не найдены.</p> }
                </div>
              </div>
            }
            <app-select label="Способ отправки" formControlName="mode" [options]="modeOptions" />
            @if (form.controls.mode.value === 'schedule') {
              <app-input label="Расписание cron (UTC)" formControlName="cron" placeholder="0 9 * * *" />
              <p class="text-xs text-slate-600 dark:text-slate-300">Пять полей cron. Например, 0 9 * * * — каждый день в 09:00 UTC.</p>
            }
            <div class="flex flex-wrap gap-2 pt-2">
              <app-button type="submit" [loading]="busy()" [disabled]="!canSubmit()">{{ form.controls.mode.value === 'schedule' ? 'Включить расписание' : 'Отправить сейчас' }}</app-button>
              <app-button variant="outline" [disabled]="busy() || form.invalid" (clicked)="saveTemplate()">{{ editingId() ? 'Сохранить шаблон' : 'Создать шаблон' }}</app-button>
            </div>
          </form>
        </section>

        <div class="space-y-6 min-w-0">
          <section class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900" aria-labelledby="templates-title">
            <h2 id="templates-title" class="text-lg font-semibold">Шаблоны</h2>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">Выберите шаблон, чтобы заполнить форму.</p>
            <div class="mt-4 divide-y divide-slate-200 dark:divide-slate-700">
              @for (item of templates(); track item.id) {
                <div class="flex flex-wrap items-center justify-between gap-3 py-3"><div class="min-w-0"><p class="break-words text-sm font-semibold">{{ item.name }}</p><p class="break-words text-xs text-slate-600 dark:text-slate-300">{{ item.title }}</p></div><div class="flex items-center gap-2"><app-button variant="outline" (clicked)="loadTemplate(item)">Выбрать</app-button><app-button variant="danger" [disabled]="busy()" (clicked)="deleteTemplate(item)">Удалить</app-button></div></div>
              } @empty { <p class="py-4 text-sm text-slate-600 dark:text-slate-300">Шаблонов пока нет.</p> }
            </div>
          </section>
          <section class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900" aria-labelledby="schedules-title">
            <h2 id="schedules-title" class="text-lg font-semibold">Активные расписания</h2>
            <div class="mt-4 divide-y divide-slate-200 dark:divide-slate-700">
              @for (item of schedules(); track item.id) {
                <div class="flex flex-wrap items-center justify-between gap-3 py-3"><div><p class="text-sm font-semibold">{{ item.snapshot['name'] }}</p><p class="text-xs text-slate-600 dark:text-slate-300">{{ item.cron }} · {{ item.next_run_at | date:'dd.MM.yyyy HH:mm':'UTC' }} UTC</p></div><app-button variant="outline" [disabled]="busy()" (clicked)="stop(item.id)">Остановить</app-button></div>
              } @empty { <p class="py-4 text-sm text-slate-600 dark:text-slate-300">Активных расписаний нет.</p> }
            </div>
          </section>
        </div>
      </div>
      <section class="mt-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 md:p-6" aria-labelledby="history-title">
        <h2 id="history-title" class="text-lg font-semibold">История отправок</h2>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">Количество push показывает сообщения, принятые Expo.</p>
        <div class="mt-4 divide-y divide-slate-200 dark:divide-slate-700">
          @for (item of history(); track item.id) {
            <article class="py-4">
              <div class="mb-3 flex flex-wrap items-center justify-between gap-2"><time class="text-xs text-slate-600 dark:text-slate-300">{{ item.created_at | date:'dd.MM.yyyy HH:mm' }} · {{ sourceLabel(item.source) }}</time><app-button variant="outline" [disabled]="busy() || item.recipient_count === 0" (clicked)="repeat(item.id)">Повторить отправку</app-button></div>
              <div class="flex gap-3">@if (item.icon_path) { <img [src]="files.getFileUrl(item.icon_path)" alt="" class="h-10 w-10 shrink-0 rounded-lg object-cover" /> }<div class="min-w-0"><h3 class="break-words text-sm font-semibold">{{ item.title }}</h3><p class="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700 dark:text-slate-200">{{ item.body }}</p></div></div>
              <p class="mt-3 text-xs text-slate-600 dark:text-slate-300">{{ item.audience === 'all' ? 'Все активные' : 'Выбранные пользователи' }} · Получателей: {{ item.recipient_count }} · {{ statusLabel(item.status) }} · Push принято: {{ item.push_accepted }} · Ошибки: {{ item.push_failed }}</p>
            </article>
          } @empty { <p class="py-4 text-sm text-slate-600 dark:text-slate-300">{{ loading() ? 'Загрузка истории…' : 'Отправок пока нет.' }}</p> }
        </div>
        @if (hasMore()) { <app-button variant="outline" (clicked)="loadMore()">Показать ещё</app-button> }
      </section>
    </div>
  `
})
export class NotificationsEditorComponent {
  protected readonly files = inject(AppFilesStorageService);
  private readonly snack = inject(MatSnackBar);
  protected readonly nameToken = '{{name}}';
  protected readonly busy = signal(false);
  protected readonly loading = signal(true);
  protected readonly hasMore = signal(false);
  protected readonly error = signal('');
  protected readonly templates = signal<TemplateOut[]>([]);
  protected readonly schedules = signal<ScheduleOut[]>([]);
  protected readonly history = signal<DispatchOut[]>([]);
  protected readonly users = signal<UserListItemOut[]>([]);
  protected readonly selectedIds = signal<string[]>([]);
  protected readonly searchText = signal('');
  protected readonly editingId = signal<string | null>(null);
  protected readonly filteredUsers = computed(() => {
    const query = this.searchText().trim().toLocaleLowerCase();
    return this.users().filter(user => user.status === 'active' && `${user.fullName} ${user.email}`.toLocaleLowerCase().includes(query));
  });
  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly audienceOptions = [{ value: 'all', label: 'Все активные пользователи' }, { value: 'selected', label: 'Выбранные пользователи' }];
  protected readonly modeOptions = [{ value: 'manual', label: 'Отправить вручную' }, { value: 'schedule', label: 'По расписанию' }];
  protected readonly form = new FormGroup({
    name: new FormControl('Рассылка', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
    body: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(5000)] }),
    icon_path: new FormControl<string | null>(null),
    audience: new FormControl<'all' | 'selected'>('all', { nonNullable: true }),
    mode: new FormControl<'manual' | 'schedule'>('manual', { nonNullable: true }),
    cron: new FormControl('', { nonNullable: true })
  });

  constructor() {
    const searchSubscription = this.search.valueChanges.subscribe(value => this.searchText.set(value));
    const refreshTimer = window.setInterval(() => void this.refreshHistory(), 5000);
    inject(DestroyRef).onDestroy(() => { searchSubscription.unsubscribe(); window.clearInterval(refreshTimer); });
    void this.refresh();
  }

  protected canSubmit(): boolean {
    const value = this.form.getRawValue();
    return !this.busy() && this.form.valid && !!value.name.trim() && !!value.title.trim()
      && (value.audience !== 'selected' || this.selectedIds().length > 0)
      && (value.mode !== 'schedule' || !!value.cron.trim());
  }

  private payload(): DispatchInput {
    const value = this.form.getRawValue();
    return { name: value.name.trim(), title: value.title.trim(), body: value.body,
      icon_path: value.icon_path, audience: value.audience, user_ids: this.selectedIds(),
      cron: value.mode === 'schedule' ? value.cron.trim() : null, template_id: this.editingId() };
  }

  private async refresh(): Promise<void> {
    try {
      const [templates, schedules, history, users] = await Promise.all([
        apiCall(() => adminNotificationsListTemplates()), apiCall(() => adminNotificationsListSchedules()),
        apiCall(() => adminNotificationsHistory({ query: { offset: 0, limit: 30 } })), apiCall(() => usersListUsers())
      ]);
      this.templates.set(templates); this.schedules.set(schedules); this.history.set(history); this.users.set(users); this.hasMore.set(history.length === 30);
    } catch (error) { this.showError(error); }
    finally { this.loading.set(false); }
  }

  private async refreshHistory(): Promise<void> {
    if (this.busy() || !this.history().some(item => item.status === 'pending' || item.status === 'processing')) return;
    try {
      const count = Math.max(30, this.history().length);
      const items = await apiCall(() => adminNotificationsHistory({ query: { offset: 0, limit: Math.min(count, 100) } }));
      this.history.update(current => [...items, ...current.slice(items.length)]);
    } catch { /* The next refresh or a user action will retry. */ }
  }

  private showError(error: unknown): void { this.error.set(error instanceof Error ? error.message : 'Не удалось выполнить действие'); }
  private async run(action: () => Promise<unknown>, message: string): Promise<boolean> {
    if (this.busy()) return false;
    this.busy.set(true); this.error.set('');
    try { await action(); this.snack.open(message, 'Закрыть', { duration: 4000 }); await this.refresh(); return true; }
    catch (error) { this.showError(error); return false; }
    finally { this.busy.set(false); }
  }

  protected async send(): Promise<void> {
    if (!this.canSubmit()) return;
    const body = this.payload();
    if (body.audience === 'all' && !window.confirm(body.cron ? 'Включить расписание для всех активных пользователей?' : 'Отправить уведомление всем активным пользователям?')) return;
    const key = crypto.randomUUID();
    await this.run(() => body.cron
      ? apiCall(() => adminNotificationsCreateSchedule({ body }))
      : apiCall(() => adminNotificationsSendCampaign({ body, headers: { 'Idempotency-Key': key } })),
      body.cron ? 'Расписание включено' : 'Уведомление поставлено в очередь');
  }

  protected async saveTemplate(): Promise<void> {
    if (this.form.invalid || !this.form.controls.name.value.trim() || !this.form.controls.title.value.trim()) return;
    const body = this.payload();
    if (body.audience === 'selected' && !body.user_ids?.length) { this.error.set('Выберите хотя бы одного пользователя'); return; }
    const id = this.editingId();
    await this.run(() => id ? apiCall(() => adminNotificationsUpdateTemplate({ path: { template_id: id }, body }))
      : apiCall(() => adminNotificationsCreateTemplate({ body })), 'Шаблон сохранён');
  }

  protected loadTemplate(item: TemplateOut): void {
    this.editingId.set(item.id); this.selectedIds.set(item.user_ids ?? []);
    this.form.patchValue({ name: item.name, title: item.title, body: item.body ?? '', icon_path: item.icon_path ?? null,
      audience: item.audience, mode: item.cron ? 'schedule' : 'manual', cron: item.cron ?? '' });
  }
  protected async deleteTemplate(item: TemplateOut): Promise<void> {
    if (!window.confirm(`Удалить шаблон «${item.name}»?`)) return;
    const deleted = await this.run(() => apiCall(() => adminNotificationsDeleteTemplate({ path: { template_id: item.id } })), 'Шаблон удалён');
    if (deleted && this.editingId() === item.id) this.reset();
  }
  protected reset(): void { this.editingId.set(null); this.selectedIds.set([]); this.form.reset({ name: 'Рассылка', title: '', body: '', icon_path: null, audience: 'all', mode: 'manual', cron: '' }); }
  protected toggleUser(id: string, event: Event): void { const checked = (event.target as HTMLInputElement).checked; this.selectedIds.update(ids => checked ? [...ids, id] : ids.filter(value => value !== id)); }
  protected async upload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    await this.run(async () => { const result = await apiCall(() => adminNotificationsUploadIcon({ body: { file } })); this.form.controls.icon_path.setValue(result['path']); }, 'Иконка загружена');
    input.value = '';
  }
  protected async stop(id: string): Promise<void> { await this.run(() => apiCall(() => adminNotificationsStopSchedule({ path: { schedule_id: id } })), 'Расписание остановлено'); }
  protected async repeat(id: string): Promise<void> { const key = crypto.randomUUID(); await this.run(() => apiCall(() => adminNotificationsRepeat({ path: { dispatch_id: id }, headers: { 'Idempotency-Key': key } })), 'Повторная отправка поставлена в очередь'); }
  protected async loadMore(): Promise<void> { try { const items = await apiCall(() => adminNotificationsHistory({ query: { offset: this.history().length, limit: 30 } })); this.history.update(current => [...current, ...items]); this.hasMore.set(items.length === 30); } catch (error) { this.showError(error); } }
  protected sourceLabel(source: string): string { return ({ manual: 'Вручную', schedule: 'По расписанию', repeat: 'Повтор' } as Record<string, string>)[source] ?? source; }
  protected statusLabel(status: string): string { return ({ pending: 'В очереди', processing: 'Отправляется', completed: 'Обработано', partial: 'Частичная ошибка', interrupted: 'Результат отправки неизвестен', empty: 'Нет получателей' } as Record<string, string>)[status] ?? status; }
}
