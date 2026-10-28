import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { API_BASE, authFetch } from '@/core/api/api-client';
import {
  AppBadgeComponent,
  AppButtonComponent,
  AppIconButtonComponent,
  AppSelectComponent,
  AppSelectOption
} from '../ui';

type Kind = 'article' | 'test' | 'rescue';
type TrashItem = { id: string; kind: Kind; name: string; parentId: string; reason: 'missing_parent' | 'cycle' };
type Folder = { id: string; name: string; parentId: string | null };
type TrashSnapshot = { items: TrashItem[]; folders: Folder[] };

@Component({
  selector: 'app-content-trash',
  imports: [MatIcon, AppBadgeComponent, AppButtonComponent, AppIconButtonComponent, AppSelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="p-6 max-w-7xl w-full mx-auto space-y-6">
      <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Корзина</h1>
            <span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {{ items().length }}
            </span>
          </div>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Материалы, недоступные в файловом менеджере
          </p>
        </div>

        <app-button
          variant="danger"
          icon="trash"
          [disabled]="busy() || items().length === 0"
          [loading]="busy()"
          (clicked)="deleteAll()"
        >
          Удалить всё
        </app-button>
      </header>

      @if (error()) {
        <div role="alert" class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-4 text-sm text-rose-700 dark:text-rose-300">
          <span>{{ error() }}</span>
          <app-button variant="outline" size="sm" [disabled]="busy()" (clicked)="load()">
            Повторить
          </app-button>
        </div>
      }

      @if (loading()) {
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
          <mat-icon svgIcon="spinner" class="!w-8 !h-8 animate-spin mx-auto text-blue-600" />
          <p class="text-sm">Загрузка корзины…</p>
        </div>
      } @else if (!error() && items().length === 0) {
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
          <mat-icon svgIcon="trash" class="!w-10 !h-10 mx-auto text-slate-300 dark:text-slate-600" />
          <p class="text-sm font-medium text-slate-700 dark:text-slate-300">Корзина пуста</p>
          <p class="text-xs">Здесь появятся материалы, которые потеряли доступную папку</p>
        </div>
      } @else if (items().length > 0) {
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div class="flex items-center justify-between gap-3 p-4 border-b border-slate-200 dark:border-slate-800">
            <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Недоступные материалы</h2>
            <span class="text-xs text-slate-500 dark:text-slate-400">{{ items().length }} объектов</span>
          </div>

          <div class="app-table-container overflow-auto max-h-[calc(100vh-340px)]">
            <table class="w-full min-w-[980px] text-left border-collapse text-xs">
              <thead>
                <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium">
                  <th scope="col" class="py-3.5 px-4">Материал</th>
                  <th scope="col" class="py-3.5 px-4">Тип</th>
                  <th scope="col" class="py-3.5 px-4">Причина</th>
                  <th scope="col" class="py-3.5 px-4 w-72">Восстановить в папку</th>
                  <th scope="col" class="py-3.5 px-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80">
                @for (item of items(); track item.kind + ':' + item.id) {
                  <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td class="py-3 px-4">
                      <p class="font-semibold text-slate-900 dark:text-white truncate max-w-[300px]">
                        {{ item.name || 'Без названия' }}
                      </p>
                      <p class="mt-1 text-[11px] font-mono text-slate-400 dark:text-slate-500 truncate max-w-[300px]">
                        {{ item.id }}
                      </p>
                    </td>
                    <td class="py-3 px-4">
                      <app-badge [variant]="kindVariants[item.kind]" size="sm">{{ labels[item.kind] }}</app-badge>
                    </td>
                    <td class="py-3 px-4">
                      @if (item.reason === 'cycle') {
                        <app-badge variant="warning" size="sm">Цикл в дереве папок</app-badge>
                      } @else {
                        <app-badge variant="danger" size="sm">Папка или родитель отсутствует</app-badge>
                      }
                    </td>
                    <td class="py-3 px-4">
                      <app-select
                        label="Папка восстановления"
                        [options]="folderOptions()"
                        [value]="selectedDestination(item)"
                        [disabled]="busy()"
                        [allowEmpty]="true"
                        emptyLabel="В корень"
                        emptyValue=""
                        size="sm"
                        (valueChange)="setDestination(item, $event)"
                      />
                    </td>
                    <td class="py-3 px-4">
                      <div class="flex items-center justify-end gap-2">
                        <app-icon-button
                          icon="arrow-up"
                          variant="ghost"
                          size="sm"
                          [disabled]="busy()"
                          (clicked)="restore(item, selectedDestination(item))"
                          tooltip="Восстановить материал"
                        />
                        <app-icon-button
                          icon="trash"
                          variant="danger"
                          size="sm"
                          [disabled]="busy()"
                          (clicked)="deleteOne(item)"
                          tooltip="Удалить материал"
                        />
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </section>
  `
})
export class ContentTrashComponent {
  protected readonly items = signal<TrashItem[]>([]);
  protected readonly folders = signal<Folder[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly destinations = signal<Record<string, string>>({});
  protected readonly labels: Record<Kind, string> = { article: 'Документ', test: 'Тест', rescue: 'Режим спасения' };
  protected readonly kindVariants: Record<Kind, 'primary' | 'indigo' | 'purple'> = {
    article: 'primary',
    test: 'indigo',
    rescue: 'purple'
  };
  protected readonly folderOptions = computed<AppSelectOption[]>(() =>
    this.folders().map((folder) => ({ value: folder.id, label: this.folderPath(folder) }))
  );

  constructor() { void this.load(); }

  protected folderPath(folder: Folder): string {
    const byId = new Map(this.folders().map((f) => [f.id, f]));
    const parts: string[] = [];
    let current: Folder | undefined = folder;
    while (current) {
      parts.unshift(current.name);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return parts.join(' / ');
  }

  protected selectedDestination(item: TrashItem): string {
    return this.destinations()[this.destinationKey(item)] ?? '';
  }

  protected setDestination(item: TrashItem, value: string): void {
    this.destinations.update((current) => ({ ...current, [this.destinationKey(item)]: value }));
  }

  private destinationKey(item: TrashItem): string {
    return `${item.kind}:${item.id}`;
  }

  private async request(path: string, body?: unknown): Promise<any> {
    const response = await authFetch(`${API_BASE}/api/v1/content-trash${path}`, body === undefined ? undefined : {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(typeof data.detail === 'string' ? data.detail : `Ошибка HTTP ${response.status}`);
    }
    return response.json();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const data: TrashSnapshot = await this.request('');
      this.items.set(data.items);
      this.folders.set(data.folders);
      this.destinations.set({});
    } catch (e) { this.error.set(e instanceof Error ? e.message : 'Не удалось загрузить корзину'); }
    finally { this.loading.set(false); }
  }

  private async mutate(path: string, body: unknown): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try { await this.request(path, body); await this.load(); }
    catch (e) { this.error.set(e instanceof Error ? e.message : 'Не удалось выполнить действие'); }
    finally { this.busy.set(false); }
  }

  protected restore(item: TrashItem, destination: string): void {
    void this.mutate('/restore', { kind: item.kind, id: item.id, targetParentId: destination || null });
  }

  protected deleteOne(item: TrashItem): void {
    if (window.confirm(`Удалить «${item.name}» без возможности восстановления?`)) {
      void this.mutate('/delete', { items: [{ kind: item.kind, id: item.id }] });
    }
  }

  protected deleteAll(): void {
    const items = this.items().map(({ kind, id }) => ({ kind, id }));
    if (items.length && window.confirm(`Удалить все материалы из корзины (${items.length}) без возможности восстановления?`)) {
      void this.mutate('/delete', { items });
    }
  }
}
