import { AppRescueItemCompletionVm, RescueCompletionConditionVm } from '@/core/utils';
import { validateAppRescueItemCompletion } from '@/core/utils/rescue-completion-format';
import { safeParseAppRescueItemCompletion } from '@/core/utils/zod';
import { Component, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDivider } from '@angular/material/divider';
import {
  RescueCompletionConditionEditorComponent,
  RescueCompletionParameterOption
} from '../rescue-completion-condition-editor/rescue-completion-condition-editor.component';

export type RescueCompletionDialogData = {
  completion: AppRescueItemCompletionVm | null;
  getParameterOptions: () => RescueCompletionParameterOption[];
};

function cloneCondition(c: RescueCompletionConditionVm | null | undefined): RescueCompletionConditionVm | null {
  if (c == null) {
    return null;
  }
  return structuredClone(c);
}

@Component({
  selector: 'app-rescue-completion-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButton,
    MatDivider,
    RescueCompletionConditionEditorComponent
  ],
  templateUrl: './rescue-completion-dialog.component.html',
  styles: `
    :host {
      display: block;
    }
  `
})
export class RescueCompletionDialogComponent {
  private readonly _ref = inject(
    MatDialogRef<RescueCompletionDialogComponent, AppRescueItemCompletionVm | null | undefined>
  );
  protected readonly _dialogData = inject<RescueCompletionDialogData>(MAT_DIALOG_DATA);

  protected readonly _success = signal<RescueCompletionConditionVm | null>(
    cloneCondition(this._dialogData.completion?.success ?? null)
  );
  protected readonly _failure = signal<RescueCompletionConditionVm | null>(
    cloneCondition(this._dialogData.completion?.failure ?? null)
  );
  protected readonly _error = signal<string | null>(null);

  protected _parameterOptions(): RescueCompletionParameterOption[] {
    return this._dialogData.getParameterOptions();
  }

  protected _onSuccessChange(c: RescueCompletionConditionVm | null): void {
    this._success.set(c);
    this._error.set(null);
  }

  protected _onFailureChange(c: RescueCompletionConditionVm | null): void {
    this._failure.set(c);
    this._error.set(null);
  }

  protected _clearAll(): void {
    this._success.set(null);
    this._failure.set(null);
    this._error.set(null);
  }

  protected _submit(): void {
    const vm: AppRescueItemCompletionVm = {};
    const s = this._success();
    const f = this._failure();
    if (s != null) {
      vm.success = s;
    }
    if (f != null) {
      vm.failure = f;
    }
    const customErrs = validateAppRescueItemCompletion(vm);
    if (customErrs.length > 0) {
      this._error.set(customErrs.join(' '));
      return;
    }
    const parsed = safeParseAppRescueItemCompletion(vm);
    if (!parsed.success) {
      this._error.set(parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
      return;
    }
    this._error.set(null);
    const data = parsed.data;
    if (data.success == null && data.failure == null) {
      this._ref.close(null);
    }
    else {
      this._ref.close(data);
    }
  }

  protected _cancel(): void {
    this._ref.close(undefined);
  }
}
