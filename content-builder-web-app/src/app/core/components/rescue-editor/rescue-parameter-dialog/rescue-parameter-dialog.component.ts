import {
  generateGUID,
  RescueParameterSeverityEnum,
  RescueParameterSeverityVm,
  RescueTimerParameterVm
} from '@/core/utils';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { take } from 'rxjs';
import {
  RescueParameterSeverityDialogComponent,
  RescueParameterSeverityDialogData
} from '../rescue-parameter-severity-dialog/rescue-parameter-severity-dialog.component';

export type RescueParameterDialogData = {
  parameter: RescueTimerParameterVm | null;
};

type NullableSeverity = RescueParameterSeverityEnum | null | undefined;

@Component({
  selector: 'app-rescue-parameter-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButton,
    MatIcon,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule
  ],
  templateUrl: './rescue-parameter-dialog.component.html',
  styles: ``
})
export class RescueParameterDialogComponent {
  protected readonly _dialogData = inject<RescueParameterDialogData>(MAT_DIALOG_DATA);
  private readonly _ref = inject(MatDialogRef<RescueParameterDialogComponent, RescueTimerParameterVm>);
  private readonly _dialog = inject(MatDialog);

  protected readonly _severitiesList = signal<RescueParameterSeverityVm[]>(
    [...(this._dialogData.parameter?.severities ?? [])]
  );

  protected readonly _severitiesDisplayedColumns: string[] = ['min', 'max', 'severity', 'description', 'actions'];

  /** id генерируется автоматически при создании, при редактировании — из переданного параметра */
  protected readonly _form = new FormGroup({
    id: new FormControl<string>(
      this._dialogData.parameter?.id ?? generateGUID(),
      Validators.required
    ),
    name: new FormControl<string>(
      this._dialogData.parameter?.name ?? '',
      Validators.required
    ),
    delta: new FormControl<number>(this._dialogData.parameter?.delta ?? 0),
    startValue: new FormControl<number>(this._dialogData.parameter?.startValue ?? 0)
  });

  protected _severityLabel(s: NullableSeverity): string {
    if (s == null) {
      return '—';
    }
    switch (s) {
      case RescueParameterSeverityEnum.Normal:
        return 'Нормальная';
      case RescueParameterSeverityEnum.Low:
        return 'Низкая';
      case RescueParameterSeverityEnum.Medium:
        return 'Средняя';
      case RescueParameterSeverityEnum.High:
        return 'Высокая';
      default:
        return String(s);
    }
  }

  protected _formatNumber(n: number | undefined): string {
    return n != null && !Number.isNaN(n) ? String(n) : '—';
  }

  protected _formatDescription(row: RescueParameterSeverityVm): string {
    const d = row.description?.trim();
    if (d == null || d.length === 0) {
      return '—';
    }
    return d.length > 48 ? `${d.slice(0, 45)}…` : d;
  }

  protected _openSeverityDialog(severity: RescueParameterSeverityVm | null): void {
    this._dialog
      .open(RescueParameterSeverityDialogComponent, {
        data: { severity } satisfies RescueParameterSeverityDialogData,
        width: '400px',
        disableClose: false
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe((result: RescueParameterSeverityVm | undefined) => {
        if (result == null) {
          return;
        }
        const list = this._severitiesList();
        if (severity == null) {
          this._severitiesList.set([...list, result]);
        }
        else {
          const idx = list.indexOf(severity);
          if (idx !== -1) {
            const next = [...list];
            next[idx] = result;
            this._severitiesList.set(next);
          }
        }
      });
  }

  protected _addSeverity(): void {
    this._openSeverityDialog(null);
  }

  protected _editSeverity(index: number): void {
    const row = this._severitiesList()[index];
    if (row != null) {
      this._openSeverityDialog(row);
    }
  }

  protected _removeSeverity(index: number): void {
    const list = this._severitiesList();
    this._severitiesList.set(list.filter((_, i) => i !== index));
  }

  protected _submit(): void {
    if (this._form.invalid) {
      return;
    }
    const v = this._form.getRawValue();
    const severities = this._severitiesList();
    this._ref.close({
      id: v.id!,
      name: v.name!,
      delta: v.delta ?? 0,
      startValue: v.startValue ?? 0,
      severities
    });
  }

  protected _cancel(): void {
    this._ref.close();
  }
}
