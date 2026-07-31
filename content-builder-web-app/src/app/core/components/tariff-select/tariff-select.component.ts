import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { AppTariffsStorageService } from '@/core/api';
import type { TariffOut } from '@/core/api/generated/types.gen';

@Component({
  selector: 'app-tariff-select',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatSelectModule],
  template: `
    <mat-form-field appearance="fill" class="w-full">
      <mat-label>{{ label() }}</mat-label>
      <mat-select [formControl]="control()">
        @for (t of _tariffs(); track t.id) {
          <mat-option [value]="t.id">
            {{ t.title }} (rank {{ t.rank }}){{ t.isDefault ? ' — по умолчанию' : '' }}
          </mat-option>
        }
      </mat-select>
    </mat-form-field>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TariffSelectComponent implements OnInit {
  private readonly _storage = inject(AppTariffsStorageService);

  public readonly control = input.required<FormControl<string | null>>();
  public readonly label = input('Минимальный тариф');

  protected readonly _tariffs = signal<TariffOut[]>([]);

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
