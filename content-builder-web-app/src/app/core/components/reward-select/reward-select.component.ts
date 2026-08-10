import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { AppRewardsStorageService } from '@/core/api';
import type { RewardOut } from '@/core/api/generated/types.gen';

@Component({
  selector: 'app-reward-select',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatSelectModule],
  template: `
    <mat-form-field appearance="fill" class="w-full">
      <mat-label>{{ label() }}</mat-label>
      <mat-select [formControl]="control()">
        <mat-option [value]="null">Нет</mat-option>
        @for (r of _rewards(); track r.id) {
          <mat-option [value]="r.id">{{ r.title }}</mat-option>
        }
      </mat-select>
    </mat-form-field>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewardSelectComponent implements OnInit {
  private readonly _storage = inject(AppRewardsStorageService);

  public readonly control = input.required<FormControl<string | null>>();
  public readonly label = input('Нужна награда');

  protected readonly _rewards = signal<RewardOut[]>([]);

  ngOnInit(): void {
    this._storage.listAll().subscribe((list) => {
      const sorted = [...list]
        .filter((r) => r.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, 'ru'));
      this._rewards.set(sorted);
    });
  }
}
