import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { AppDialogWrapperComponent } from '../dialog-wrapper/dialog-wrapper.component';

interface ShortcutGroup {
  category: string;
  items: { key: string; action: string }[];
}

@Component({
  selector: 'app-shortcuts-dialog',
  imports: [AppDialogWrapperComponent],
  template: `
    <app-dialog-wrapper
      title="Горячие клавиши"
      subtitle="Клавиатурные комбинации для быстрой работы в файловом менеджере"
      [showSave]="false"
      closeText="Понятно"
      (close)="_close()"
    >
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-[360px] max-w-2xl">
        @for (group of _shortcutGroups; track group.category) {
          <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 space-y-3">
            <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {{ group.category }}
            </div>
            <div class="space-y-2">
              @for (item of group.items; track item.action) {
                <div class="flex items-center justify-between gap-3 text-xs">
                  <span class="text-slate-600 dark:text-slate-300">{{ item.action }}</span>
                  <kbd class="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200 shadow-xs shrink-0">
                    {{ item.key }}
                  </kbd>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </app-dialog-wrapper>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShortcutsDialogComponent {
  private readonly _ref = inject(MatDialogRef<ShortcutsDialogComponent>);

  protected readonly _shortcutGroups: ShortcutGroup[] = [
    {
      category: 'Навигация и панели',
      items: [
        { key: '↑ / ↓', action: 'Перемещение по списку' },
        { key: '← / →', action: 'Переключение левой/правой панели' },
        { key: 'Enter', action: 'Открыть папку / редактор' },
        { key: 'Backspace', action: 'Перейти на уровень вверх' }
      ]
    },
    {
      category: 'Буфер обмена',
      items: [
        { key: 'Ctrl + C  /  F5', action: 'Копировать выбранный объект' },
        { key: 'Ctrl + X  /  F6', action: 'Вырезать (переместить)' },
        { key: 'Ctrl + V', action: 'Вставить в текущую папку' }
      ]
    },
    {
      category: 'Операции с объектами',
      items: [
        { key: 'F2', action: 'Быстрое переименование' },
        { key: 'Delete', action: 'Удалить объект (с подтверждением)' },
        { key: 'Двойной клик', action: 'Открыть объект' },
        { key: 'Правый клик', action: 'Контекстное меню' }
      ]
    },
    {
      category: 'Мышь и Drag & Drop',
      items: [
        { key: 'Перетаскивание', action: 'Смена порядка внутри папки' },
        { key: 'Перенос на папку', action: 'Перемещение внутрь папки' },
        { key: 'Перенос на панель', action: 'Перемещение между панелями' }
      ]
    }
  ];

  protected _close(): void {
    this._ref.close();
  }
}
