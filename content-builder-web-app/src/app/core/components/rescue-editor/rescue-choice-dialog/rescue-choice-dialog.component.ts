import {
  generateGUID,
  RescueChoiceParameterChangeVm,
  RescueSceneChoiceVm
} from '@/core/utils';
import { Component, inject } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatOption, MatSelectModule } from '@angular/material/select';
import { NullableValue } from '@/core/utils';

export type SceneOption = { id: string; name: string };
export type ParameterOption = { id: string; name: string };

export type RescueChoiceDialogData = {
  choice: RescueSceneChoiceVm | null;
  sceneOptions: SceneOption[];
  parameterOptions: ParameterOption[];
  /** id сцены, в которой находится выбор (исключаем из списка «Следующая сцена») */
  currentSceneId: string;
};

function parameterChangeGroup(p: NullableValue<RescueChoiceParameterChangeVm> = null): FormGroup {
  return new FormGroup({
    parameterId: new FormControl<string>(p?.parameterId ?? '', Validators.required),
    value: new FormControl<number>(p?.value ?? 0)
  });
}

@Component({
  selector: 'app-rescue-choice-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButton,
    MatIcon,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOption
  ],
  templateUrl: './rescue-choice-dialog.component.html',
  styles: ``
})
export class RescueChoiceDialogComponent {
  protected readonly _dialogData = inject<RescueChoiceDialogData>(MAT_DIALOG_DATA);
  private readonly _ref = inject(MatDialogRef<RescueChoiceDialogComponent, RescueSceneChoiceVm>);

  /** Опции сцен и параметров с fallback на пустой массив (для надёжного отображения в mat-select) */
  protected get _sceneOptionsList(): SceneOption[] {
    return Array.isArray(this._dialogData?.sceneOptions) ? this._dialogData.sceneOptions : [];
  }

  protected get _parameterOptionsList(): ParameterOption[] {
    return Array.isArray(this._dialogData?.parameterOptions) ? this._dialogData.parameterOptions : [];
  }

  /** Варианты следующей сцены (без текущей сцены) */
  protected get _nextSceneOptions(): SceneOption[] {
    const currentId = this._dialogData?.currentSceneId ?? '';
    return this._sceneOptionsList.filter(opt => opt?.id != null && opt.id !== currentId);
  }

  /** id генерируется автоматически при создании */
  protected readonly _form = new FormGroup({
    id: new FormControl<string>(
      this._dialogData?.choice?.id ?? generateGUID(),
      Validators.required
    ),
    text: new FormControl<string>(
      this._dialogData?.choice?.text ?? '',
      Validators.required
    ),
    nextSceneId: new FormControl<NullableValue<string>>(
      this._dialogData?.choice?.nextSceneId ?? null
    ),
    parameterChanges: new FormArray(
      this._dialogData?.choice?.id
        ? (this._dialogData?.choice?.parameterChanges ?? []).map(parameterChangeGroup)
        : (this._dialogData?.parameterOptions ?? []).map(param => parameterChangeGroup({ parameterId: param.id, value: 0 }))
    )
  });

  protected get _parameterChanges(): FormArray {
    return this._form.get('parameterChanges') as FormArray;
  }

  protected _addParameterChange(): void {
    this._parameterChanges.push(parameterChangeGroup(null));
  }

  protected _removeParameterChange(index: number): void {
    this._parameterChanges.removeAt(index);
  }

  protected _submit(): void {
    if (this._form.invalid) {
      return;
    }
    const v = this._form.getRawValue();
    const rawChanges = (v.parameterChanges ?? []) as Array<Record<string, unknown>>;
    this._ref.close({
      id: v.id!,
      text: v.text ?? '',
      nextSceneId: v.nextSceneId ?? null,
      parameterChanges: rawChanges.map(pc => ({
        parameterId: pc['parameterId'] as string,
        value: (pc['value'] as number) ?? 0
      }))
    });
  }

  protected _cancel(): void {
    this._ref.close();
  }
}
