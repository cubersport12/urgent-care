import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AppTariffsStorageService } from '@/core/api';
import type { TariffOut } from '@/core/api/generated/types.gen';
import { AppSelectComponent, AppSelectOption } from '../ui';

@Component({
  selector: 'app-tariff-select',
  imports: [ReactiveFormsModule, AppSelectComponent],
  template: `
    <app-select
      [label]="label()"
      icon="tag"
      [options]="_options()"
      [formControl]="control()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TariffSelectComponent implements OnInit {
  private readonly _storage = inject(AppTariffsStorageService);

  public readonly control = input.required<FormControl<string | null>>();
  public readonly label = input('Минимальный тариф');

  protected readonly _tariffs = signal<TariffOut[]>([]);
  protected readonly _options = computed<AppSelectOption[]>(() =>
    this._tariffs().map((t) => ({
      value: t.id,
      label: `${t.title} (rank ${t.rank})${t.isDefault ? ' — по умолчанию' : ''}`
    }))
  );

  ngOnInit(): void {
    this._storage.listAll().subscribe((list) => {
      const sorted = [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.rank - b.rank);
      this._tariffs.set(sorted);
      const ctrl = this.control();
      if (ctrl.value == null) {
        const def = sorted.find((t) => t.isDefault) ?? sorted[0];
        if (def) {
          ctrl.setValue(def.id, { emitEvent: false });
        }
      }
    });
  }
}
