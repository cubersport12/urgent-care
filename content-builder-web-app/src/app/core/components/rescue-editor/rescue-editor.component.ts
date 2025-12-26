import { AppLoading, RescueActions } from '@/core/store';
import { AppRescueItemVm, generateGUID, NullableValue } from '@/core/utils';
import { Component, computed, effect, inject, Injectable } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { Store } from '@ngxs/store';
import { RescueLibraryEditorComponent } from '../rescue-library-editor';
import { RescueStoriesBuilderComponent } from '../rescue-stories';

@Injectable({
  providedIn: 'root'
})
export class RescueEditorService {
  private readonly _dialogs = inject(MatDialog);
  public openRescue(rescue: Partial<AppRescueItemVm>): void {
    this._dialogs.open(RescueEditorComponent, {
      width: '90%',
      height: '90%',
      maxWidth: '90%',
      minWidth: '90%',
      hasBackdrop: true,
      autoFocus: true,
      disableClose: true,
      data: rescue
    });
  }
}

@Component({
  selector: 'app-rescue-editor',
  imports: [
    MatIcon,
    MatButton,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    RescueLibraryEditorComponent,
    RescueStoriesBuilderComponent
  ],
  templateUrl: './rescue-editor.component.html',
  styles: ``
})
export class RescueEditorComponent {
  protected readonly _dialogData = inject<AppRescueItemVm>(MAT_DIALOG_DATA);
  private readonly _ref = inject(MatDialogRef);
  private readonly _store = inject(Store);
  private readonly _dispatched = inject(AppLoading);

  protected readonly _isPending = computed(() =>
    this._dispatched.isDispatched(RescueActions.CreateRescueItem)()
    || this._dispatched.isDispatched(RescueActions.UpdateRescueItem)()
  );

  protected readonly _form = new FormGroup({
    name: new FormControl<string>('', Validators.required),
    description: new FormControl<string>('', Validators.required),
    createdAt: new FormControl<string>('', Validators.required),
    data: new FormGroup({
      maxDurationMin: new FormControl<number>(0, [Validators.required, Validators.min(1)])
    })
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
    const { name, description, createdAt, data } = this._dialogData;
    // Преобразуем ISO строку в формат для datetime-local (YYYY-MM-DDTHH:mm)
    const formatDateForInput = (isoString: string | undefined): string => {
      if (!isoString) {
        const now = new Date();
        return now.toISOString().slice(0, 16);
      }
      return new Date(isoString).toISOString().slice(0, 16);
    };
    this._form.reset({
      name: name ?? '',
      description: description ?? '',
      createdAt: formatDateForInput(createdAt),
      data: {
        maxDurationMin: data?.maxDurationMin ?? 0
      }
    });
  }

  private _getRescueVm(): AppRescueItemVm {
    const { name, description, createdAt, data } = this._form.value;
    // Преобразуем datetime-local формат обратно в ISO строку
    const formatDateToISO = (dateTimeLocal: string | undefined): string => {
      if (!dateTimeLocal) {
        return new Date().toISOString();
      }
      return new Date(dateTimeLocal).toISOString();
    };
    const result: AppRescueItemVm = {
      ...(this._dialogData ?? {}),
      name: name!,
      description: description!,
      createdAt: formatDateToISO(createdAt!),
      data: {
        maxDurationMin: data!.maxDurationMin!
      }
    };
    if ('type' in result) {
      delete result['type'];
    }
    return result;
  }

  private _createRescue(): void {
    const newId = generateGUID();
    const toCreate = this._getRescueVm();
    this._store.dispatch(new RescueActions.CreateRescueItem({
      ...toCreate,
      id: newId
    }))
      .subscribe(() => {
        this._handleClose();
      });
  }

  private _updateRescue(): void {
    this._store.dispatch(new RescueActions.UpdateRescueItem(this._dialogData.id, this._getRescueVm()))
      .subscribe(() => {
        this._handleClose();
      });
  }

  protected _handleSubmit(): void {
    const isNew = this._dialogData.id == null;
    if (isNew) {
      this._createRescue();
    }
    else {
      this._updateRescue();
    }
  }

  protected _handleClose(): void {
    this._ref.close();
  }
}
