import { AppLoading, RescueActions, RescueState } from '@/core/store';
import { AppRescueItemVm, generateGUID, NullableValue, AppRescueItemParameterVm } from '@/core/utils';
import { Component, computed, effect, inject, Injectable, signal, ViewContainerRef } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { Store } from '@ngxs/store';
import { RescueLibraryEditorComponent } from '../rescue-library-editor';
import { RescueStoriesBuilderComponent } from '../rescue-stories';
import { RescueParameterDialogComponent } from '../rescue-stories/rescue-parameter-dialog';

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
    MatChipsModule,
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
  private readonly _dialog = inject(MatDialog);
  private readonly _viewContainerRef = inject(ViewContainerRef);

  protected readonly _isPending = computed(() =>
    this._dispatched.isDispatched(RescueActions.CreateRescueItem)()
    || this._dispatched.isDispatched(RescueActions.UpdateRescueItem)()
  );

  protected readonly _form = new FormGroup({
    name: new FormControl<string>('', Validators.required),
    description: new FormControl<string>('', Validators.required),
    createdAt: new FormControl<string>('', Validators.required),
    data: new FormGroup({})
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
      data: {}
    });
    // Инициализируем локальные параметры из данных
    this._localParameters.set(data?.parameters || []);
  }

  protected readonly _rescueItem = computed(() => {
    const rescueId = this._dialogData?.id;
    if (!rescueId) {
      return this._dialogData;
    }
    const items = this._store.selectSignal(RescueState.getAllRescueItems)();
    return items.find(item => item.id === rescueId) || this._dialogData;
  });

  // Локальное хранилище параметров (изменения не сохраняются до нажатия "Сохранить")
  private readonly _localParameters = signal<AppRescueItemParameterVm[] | null>(null);

  protected readonly _parameters = computed(() => {
    // Всегда используем локальные параметры, если они были инициализированы
    const localParams = this._localParameters();
    if (localParams !== null) {
      return localParams;
    }
    // Иначе используем параметры из store (при первой загрузке)
    return this._rescueItem()?.data?.parameters || [];
  });

  protected _formatParameterValue(parameter: AppRescueItemParameterVm): string {
    if (parameter.category === 'duration') {
      // Для duration value уже строка в формате HH:mm:ss
      return typeof parameter.value === 'string' ? parameter.value : String(parameter.value);
    }
    // Для number value - число
    return String(parameter.value);
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
    const rescueItem = this._rescueItem();
    const result: AppRescueItemVm = {
      ...(rescueItem ?? {}),
      name: name!,
      description: description!,
      createdAt: formatDateToISO(createdAt!),
      data: {
        parameters: this._localParameters() || []
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

  protected _openAddParameterDialog(): void {
    const dialogRef = this._dialog.open(RescueParameterDialogComponent, {
      viewContainerRef: this._viewContainerRef,
      data: {}
    });

    dialogRef.afterClosed().subscribe((result?: AppRescueItemParameterVm) => {
      if (result) {
        this._addParameter(result);
      }
    });
  }

  protected _openEditParameterDialog(parameter: AppRescueItemParameterVm): void {
    const dialogRef = this._dialog.open(RescueParameterDialogComponent, {
      viewContainerRef: this._viewContainerRef,
      data: { parameter }
    });

    dialogRef.afterClosed().subscribe((result?: AppRescueItemParameterVm) => {
      if (result) {
        this._updateParameter(result);
      }
    });
  }

  protected _deleteParameter(parameterId: string): void {
    const currentParameters = this._localParameters() || [];
    const updatedParameters = currentParameters.filter(p => p.id !== parameterId);
    this._localParameters.set(updatedParameters);
    // Помечаем форму как измененную
    this._form.markAsDirty();
  }

  private _addParameter(parameter: AppRescueItemParameterVm): void {
    const newParameter: AppRescueItemParameterVm = {
      ...parameter,
      id: generateGUID(),
      category: parameter.category || 'number'
    };

    const currentParameters = this._localParameters() || [];
    const updatedParameters = [...currentParameters, newParameter];
    this._localParameters.set(updatedParameters);
    // Помечаем форму как измененную
    this._form.markAsDirty();
  }

  private _updateParameter(parameter: AppRescueItemParameterVm): void {
    const currentParameters = this._localParameters() || [];
    const updatedParameters = currentParameters.map(p => 
      p.id === parameter.id ? parameter : p
    );
    this._localParameters.set(updatedParameters);
    // Помечаем форму как измененную
    this._form.markAsDirty();
  }
}
