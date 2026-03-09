import {
  AppRescueItemVm,
  generateGUID,
  NullableValue,
  RescueChoiceParameterChangeVm,
  RescueSceneChoiceVm,
  RescueSceneVm,
  RescueTimerParameterVm
} from '@/core/utils';
import { Component, computed, effect, inject, Injectable } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { Store } from '@ngxs/store';
import { AppLoading, RescueActions } from '@/core/store';
import { RescueParameterDialogComponent, RescueParameterDialogData } from './rescue-parameter-dialog/rescue-parameter-dialog.component';
import {
  RescueSceneDialogComponent,
  RescueSceneDialogData,
  ParameterOption
} from './rescue-scene-dialog/rescue-scene-dialog.component';
import { SceneOption } from './rescue-choice-dialog/rescue-choice-dialog.component';
import { AppFilesStorageService } from '@/core/api';
import { signal } from '@angular/core';
import { forkJoin, take } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RescueEditorService {
  private readonly _dialogs = inject(MatDialog);

  openRescue(rescue: Partial<AppRescueItemVm>): void {
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

function parameterGroup(p: NullableValue<RescueTimerParameterVm> = null): FormGroup {
  return new FormGroup({
    id: new FormControl<string>(p?.id ?? generateGUID(), Validators.required),
    name: new FormControl<string>(p?.name ?? '', Validators.required),
    delta: new FormControl<number>(p?.delta ?? 0),
    startValue: new FormControl<number>(p?.startValue ?? 0)
  });
}

function parameterChangeGroup(p: NullableValue<RescueChoiceParameterChangeVm> = null): FormGroup {
  return new FormGroup({
    parameterId: new FormControl<string>(p?.parameterId ?? '', Validators.required),
    value: new FormControl<number>(p?.value ?? 0)
  });
}

function choiceGroup(c: NullableValue<RescueSceneChoiceVm> = null): FormGroup {
  const nextId = c?.nextSceneId ?? null;
  return new FormGroup({
    id: new FormControl<string>(c?.id ?? generateGUID(), Validators.required),
    text: new FormControl<string>(c?.text ?? '', Validators.required),
    nextSceneId: new FormControl<NullableValue<string>>(nextId),
    parameterChanges: new FormArray(
      (c?.parameterChanges ?? []).map(parameterChangeGroup)
    )
  });
}

function sceneGroup(s: NullableValue<RescueSceneVm> = null): FormGroup {
  const choices = (s?.choices ?? []).map(ch => choiceGroup(ch));
  return new FormGroup({
    id: new FormControl<string>(s?.id ?? generateGUID(), Validators.required),
    order: new FormControl<NullableValue<number>>(s?.order ?? null),
    background: new FormControl<string>(s?.background ?? '', Validators.required),
    text: new FormControl<string>(s?.text ?? '', Validators.required),
    hidden: new FormControl<boolean>(s?.hidden ?? false, { nonNullable: true }),
    choices: new FormArray(choices)
  });
}

@Component({
  selector: 'app-rescue-editor',
  imports: [
    MatIcon,
    MatButton,
    ReactiveFormsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule
  ],
  templateUrl: './rescue-editor.component.html',
  styles: ``
})
export class RescueEditorComponent {
  protected readonly _dialogData = inject<AppRescueItemVm>(MAT_DIALOG_DATA);
  private readonly _ref = inject(MatDialogRef<RescueEditorComponent>);
  private readonly _store = inject(Store);
  private readonly _dispatched = inject(AppLoading);
  private readonly _dialog = inject(MatDialog);
  private readonly _filesStorage = inject(AppFilesStorageService);

  /** Файлы фонов сцен для загрузки при сохранении */
  private readonly _sceneBackgroundFiles = new Map<string, Blob>();

  /** Копия списка контролов для mat-table (обновляется при добавлении/удалении/редактировании) */
  protected readonly _parametersList = signal<FormGroup[]>([]);
  protected readonly _scenesList = signal<FormGroup[]>([]);

  protected readonly _parametersDisplayedColumns: string[] = ['name', 'delta', 'startValue', 'actions'];
  protected readonly _scenesDisplayedColumns: string[] = ['text', 'actions'];

  protected readonly _isPending = computed(
    () =>
      this._dispatched.isDispatched(RescueActions.CreateRescueItem)()
      || this._dispatched.isDispatched(RescueActions.UpdateRescueItem)()
  );

  protected readonly _form = new FormGroup({
    name: new FormControl<string>('', Validators.required),
    description: new FormControl<string>(''),
    parameters: new FormArray<FormGroup>([]),
    scenes: new FormArray<FormGroup>([])
  });

  /** Геттеры, чтобы всегда использовать актуальные FormArray после setControl в _reset() */
  protected get _parameters(): FormArray<FormGroup> {
    return this._form.get('parameters') as FormArray<FormGroup>;
  }

  protected get _scenes(): FormArray<FormGroup> {
    return this._form.get('scenes') as FormArray<FormGroup>;
  }

  /** Список сцен для выбора следующей сцены в выборе (для диалога выбора) */
  protected get _sceneOptions(): SceneOption[] {
    const scenes = this._scenes.controls;
    return scenes.map((c, i) => ({
      id: c.value.id as string,
      name: (c.get('text')?.value as string)?.slice(0, 30) || `Сцена ${i + 1}`
    }));
  };

  protected get _parameterOptions() {
    return this._parameters.controls.map(c => ({ id: c.value.id as string, name: c.value.name as string }));
  };

  constructor() {
    effect(() => {
      if (this._isPending()) {
        this._form.disable();
      }
      else {
        this._form.enable();
      }
    });
    this._reset();
  }

  private _reset(): void {
    const d = this._dialogData;
    const data = d?.data ?? {};
    const parameters = (data.parameters ?? []).map(p => parameterGroup(p));
    const scenesData = data.scenes ?? [];
    const scenes = scenesData.map(s => sceneGroup(s));
    this._form.reset({
      name: d?.name ?? '',
      description: d?.description ?? ''
    });
    this._form.setControl('parameters', new FormArray(parameters));
    this._form.setControl('scenes', new FormArray(scenes));
    this._parametersList.set([...this._parameters.controls] as FormGroup[]);
    this._scenesList.set([...this._scenes.controls] as FormGroup[]);
  }

  protected _openParameterDialog(parameter: RescueTimerParameterVm | null): void {
    this._dialog
      .open(RescueParameterDialogComponent, {
        data: { parameter } satisfies RescueParameterDialogData,
        width: '400px',
        disableClose: false
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe((result: RescueTimerParameterVm | undefined) => {
        if (result == null) {
          return;
        }
        if (parameter == null) {
          this._parameters.push(parameterGroup(result));
        }
        else {
          const idx = this._parameters.controls.findIndex(c => (c.value as RescueTimerParameterVm).id === parameter.id);
          if (idx !== -1) {
            this._parameters.at(idx).patchValue(result);
          }
        }
        this._parametersList.set([...this._parameters.controls]);
        this._form.markAsDirty();
      });
  }

  protected _addParameter(): void {
    this._openParameterDialog(null);
  }

  protected _editParameter(index: number): void {
    const group = this._parameters.at(index);
    const value = group.value as RescueTimerParameterVm;
    this._openParameterDialog(value);
  }

  protected _removeParameter(index: number): void {
    this._parameters.removeAt(index);
    this._parametersList.set([...this._parameters.controls] as FormGroup[]);
    this._form.markAsDirty();
  }

  protected _openSceneDialog(scene: RescueSceneVm | null): void {
    const parameterOptions: ParameterOption[] = this._parameterOptions;
    const sceneOptions = this._sceneOptions;
    this._dialog
      .open(RescueSceneDialogComponent, {
        data: {
          scene,
          parameterOptions,
          sceneOptions,
          addBackgroundFile: (id: string, file: Blob) => this._sceneBackgroundFiles.set(id, file)
        } satisfies RescueSceneDialogData,
        width: '90%',
        maxWidth: '900px',
        minWidth: '500px',
        height: '85%',
        maxHeight: '700px',
        disableClose: false
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe((result: RescueSceneVm | undefined) => {
        if (result == null) {
          return;
        }
        if (scene == null) {
          this._scenes.push(sceneGroup(result));
        }
        else {
          const idx = this._scenes.controls.findIndex(c => (c.value as RescueSceneVm).id === scene.id);
          if (idx !== -1) {
            const sceneControl = this._scenes.at(idx);
            sceneControl.patchValue({
              id: result.id,
              background: result.background,
              text: result.text,
              hidden: result.hidden
            });
            const choicesArr = sceneControl.get('choices') as FormArray;
            choicesArr.clear();
            (result.choices ?? []).forEach(ch => choicesArr.push(choiceGroup(ch)));
          }
        }
        this._scenesList.set([...this._scenes.controls]);
        this._form.markAsDirty();
      });
  }

  protected _addScene(): void {
    this._openSceneDialog(null);
  }

  protected _editScene(index: number): void {
    const group = this._scenes.at(index);
    const value = group.value as RescueSceneVm;
    const choices = (group.get('choices') as FormArray).value as RescueSceneChoiceVm[];
    this._openSceneDialog({ ...value, choices });
  }

  protected _removeScene(index: number): void {
    this._scenes.removeAt(index);
    this._scenesList.set([...this._scenes.controls]);
    this._form.markAsDirty();
  }

  private _getRescueVm(): AppRescueItemVm {
    const raw = this._form.getRawValue();
    const { name, description, parameters, scenes } = raw;
    const parametersList: RescueTimerParameterVm[] = (parameters ?? []).map((p: Record<string, unknown>) => ({
      id: p['id'] as string,
      name: p['name'] as string,
      delta: (p['delta'] as number) ?? 0,
      startValue: (p['startValue'] as number) ?? 0
    }));
    const scenesList: RescueSceneVm[] = (scenes ?? []).map((s: Record<string, unknown>, order: number) => ({
      id: s['id'] as string,
      order,
      background: (s['background'] as string) ?? '',
      text: (s['text'] as string) ?? '',
      hidden: (s['hidden'] as boolean) ?? false,
      choices: ((s['choices'] ?? []) as Array<Record<string, unknown>>).map((ch: Record<string, unknown>) => ({
        id: ch['id'] as string,
        text: (ch['text'] as string) ?? '',
        nextSceneId: (ch['nextSceneId'] as NullableValue<string>) ?? null,
        parameterChanges: ((ch['parameterChanges'] ?? []) as Array<Record<string, unknown>>).map((pc: Record<string, unknown>) => ({
          parameterId: pc['parameterId'] as string,
          value: (pc['value'] as number) ?? 0
        }))
      }))
    }));
    const base = this._dialogData ?? {};
    return {
      id: base.id ?? generateGUID(),
      name: name!,
      description: description ?? '',
      parentId: base.parentId ?? null,
      order: base.order ?? null,
      createdAt: base.createdAt ?? new Date().toISOString(),
      data: {
        parameters: parametersList,
        scenes: scenesList
      }
    } as AppRescueItemVm;
  }

  protected _handleSubmit(): void {
    const vm = this._getRescueVm();
    const isNew = this._dialogData?.id == null;
    const action = isNew
      ? this._store.dispatch(new RescueActions.CreateRescueItem(vm))
      : this._store.dispatch(new RescueActions.UpdateRescueItem(vm.id, vm));
    const uploads = Array.from(this._sceneBackgroundFiles.entries()).map(([id, file]) =>
      this._filesStorage.uploadFile(id, file)
    );
    if (uploads.length > 0) {
      forkJoin([action, ...uploads]).subscribe(() => this._ref.close());
    }
    else {
      action.subscribe(() => this._ref.close());
    }
  }

  protected _handleClose(): void {
    this._ref.close();
  }
}
