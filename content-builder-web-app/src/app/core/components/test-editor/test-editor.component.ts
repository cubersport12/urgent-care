import { AppLoading, TestsActions } from '@/core/store';
import { AppTestAccessablityCondition, AppTestVm, generateGUID } from '@/core/utils';
import { Component, computed, effect, inject, Injectable } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenu } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { Store } from '@ngxs/store';
import { TestConditionsBuilderComponent } from './test-condition-builder/test-conditions-builder.component';

@Injectable({
  providedIn: 'root'
})
export class TestsEditorService {
  private readonly _dialogs = inject(MatDialog);
  public openTest(test: Partial<AppTestVm>): void {
    this._dialogs.open(TestEditorComponent, {
      width: '90%',
      height: '90%',
      maxWidth: '90%',
      minWidth: '90%',
      hasBackdrop: true,
      autoFocus: true,
      disableClose: true,
      data: test
    });
  }
}

@Component({
  selector: 'app-test-editor',
  imports: [
    MatIcon,
    MatButton,
    ReactiveFormsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    TestConditionsBuilderComponent,
    MatMenu
  ],
  templateUrl: './test-editor.component.html',
  styles: ``
})
export class TestEditorComponent {
  protected readonly _dialogData = inject<AppTestVm>(MAT_DIALOG_DATA);
  private readonly _ref = inject(MatDialogRef);
  private readonly _store = inject(Store);
  private readonly _dispatched = inject(AppLoading);

  protected readonly _isPending = computed(() =>
    this._dispatched.isDispatched(TestsActions.CreateTest)()
    || this._dispatched.isDispatched(TestsActions.UpdateTest)()
  );

  protected readonly _form = new FormGroup({
    name: new FormControl<string>('', Validators.required),
    conditions: new FormControl<AppTestAccessablityCondition[]>([])
  });

  constructor() {
    effect(() => {
      const isPending = this._isPending();
      if (isPending) {
        this._form.disable();
      }
      else {
        this._form.enable();
      }
    });
    this._reset();
  }

  private _reset(): void {
    const { name, accessabilityConditions } = this._dialogData;
    this._form.reset({ name, conditions: accessabilityConditions ?? [] });
  }

  private _createTest(): void {
    const { name, conditions } = this._form.getRawValue();
    const newId = generateGUID();
    this._store.dispatch(new TestsActions.CreateTest({
      ...this._dialogData,
      name: name!,
      id: newId,
      accessabilityConditions: conditions
    }))
      .subscribe(() => {
        this._handleClose();
      });
  }

  private _updateTest(): void {

  }

  protected _handleSubmit(): void {
    const isNew = this._dialogData.id == null;
    if (isNew) {
      this._createTest();
    }
    else {
      this._updateTest();
    }
  }

  protected _handleClose(): void {
    this._ref.close();
  }
}
