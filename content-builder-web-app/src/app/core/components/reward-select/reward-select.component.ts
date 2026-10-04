import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AppRewardsStorageService } from '@/core/api';
import type { RewardOut } from '@/core/api/generated/types.gen';
import { AppSelectComponent, AppSelectOption } from '../ui';

@Component({
  selector: 'app-reward-select',
  imports: [ReactiveFormsModule, AppSelectComponent],
  template: `
    <app-select
      [label]="label()"
      icon="trophy"
      [allowEmpty]="true"
      emptyLabel="Нет"
      [emptyValue]="null"
      [options]="_options()"
      [formControl]="control()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewardSelectComponent implements OnInit {
  private readonly _storage = inject(AppRewardsStorageService);

  public readonly control = input.required<FormControl<string | null>>();
  public readonly label = input('Нужна награда');

  protected readonly _rewards = signal<RewardOut[]>([]);
  protected readonly _options = computed<AppSelectOption[]>(() =>
    this._rewards().map((r) => ({
      value: r.id,
      label: r.title
    }))
  );

  ngOnInit(): void {
    this._storage.listAll().subscribe((list) => {
      const sorted = [...list]
        .filter((r) => r.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, 'ru'));
      this._rewards.set(sorted);
    });
  }
}
