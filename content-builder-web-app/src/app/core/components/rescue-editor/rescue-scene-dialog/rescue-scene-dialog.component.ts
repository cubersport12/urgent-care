import {
  generateGUID,
  NullableValue,
  RescueSceneChoiceVm,
  RescueSceneVm
} from '@/core/utils';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { openFile } from '@/core/utils';
import { RescueChoiceDialogComponent, RescueChoiceDialogData, SceneOption } from '../rescue-choice-dialog/rescue-choice-dialog.component';
import { take } from 'rxjs';

export type ParameterOption = { id: string; name: string };

export type RescueSceneDialogData = {
  scene: RescueSceneVm | null;
  parameterOptions: ParameterOption[];
  sceneOptions: SceneOption[];
  /** Актуальные списки при открытии диалога выбора (если заданы — вызываются в момент открытия) */
  getSceneOptions?: () => SceneOption[];
  getParameterOptions?: () => ParameterOption[];
  /** Колбэк для регистрации выбранного файла фона (id — имя/ид файла для сохранения) */
  addBackgroundFile?: (id: string, file: Blob) => void;
};

@Component({
  selector: 'app-rescue-scene-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButton,
    MatIcon,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatCheckboxModule
  ],
  templateUrl: './rescue-scene-dialog.component.html',
  styles: ``
})
export class RescueSceneDialogComponent {
  protected readonly _dialogData = inject<RescueSceneDialogData>(MAT_DIALOG_DATA);
  private readonly _ref = inject(MatDialogRef<RescueSceneDialogComponent, RescueSceneVm>);
  private readonly _dialog = inject(MatDialog);

  /** Варианты выбора сцены (редактируются внутри диалога) */
  protected readonly _choicesList = signal<RescueSceneChoiceVm[]>(
    this._dialogData.scene?.choices ?? []
  );

  protected readonly _choicesDisplayedColumns: string[] = ['text', 'nextScene', 'actions'];

  /** id генерируется автоматически при создании */
  protected readonly _form = new FormGroup({
    id: new FormControl<string>(
      this._dialogData.scene?.id ?? generateGUID(),
      Validators.required
    ),
    background: new FormControl<string>(
      this._dialogData.scene?.background ?? ''
    ),
    text: new FormControl<string>(
      this._dialogData.scene?.text ?? '',
      Validators.required
    ),
    hidden: new FormControl<boolean>(
      this._dialogData.scene?.hidden ?? false,
      { nonNullable: true }
    )
  });

  protected _getSceneNameById(sceneId: NullableValue<string>): string {
    if (sceneId == null) {
      return '— Конец';
    }
    const opt = this._dialogData.sceneOptions.find(o => o.id === sceneId);
    return opt?.name ?? sceneId;
  }

  protected async _openFile(): Promise<void> {
    try {
      const file = await openFile(['image/*']);
      const fileId = file.name;
      this._dialogData.addBackgroundFile?.(fileId, file);
      this._form.patchValue({ background: fileId });
      this._form.markAsDirty();
    }
    catch {
      // Пользователь отменил выбор
    }
  }

  protected _openChoiceDialog(choice: RescueSceneChoiceVm | null): void {
    const sceneOptions = (this._dialogData.getSceneOptions?.() ?? this._dialogData.sceneOptions ?? []);
    const parameterOptions = (this._dialogData.getParameterOptions?.() ?? this._dialogData.parameterOptions ?? []);
    const sceneOptionsList = Array.isArray(sceneOptions) ? [...sceneOptions] : [];
    const parameterOptionsList = Array.isArray(parameterOptions) ? [...parameterOptions] : [];
    this._dialog
      .open(RescueChoiceDialogComponent, {
        data: {
          choice,
          sceneOptions: sceneOptionsList,
          parameterOptions: parameterOptionsList,
          currentSceneId: this._form.value.id ?? ''
        } satisfies RescueChoiceDialogData,
        width: '480px',
        disableClose: false
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe((result: RescueSceneChoiceVm | undefined) => {
        if (result == null) {
          return;
        }
        const list = this._choicesList();
        if (choice == null) {
          this._choicesList.set([...list, result]);
        }
        else {
          const idx = list.findIndex(c => c.id === choice.id);
          if (idx !== -1) {
            const next = [...list];
            next[idx] = result;
            this._choicesList.set(next);
          }
        }
      });
  }

  protected _addChoice(): void {
    this._openChoiceDialog(null);
  }

  protected _editChoice(index: number): void {
    const list = this._choicesList();
    const choice = list[index];
    if (choice) {
      this._openChoiceDialog(choice);
    }
  }

  protected _removeChoice(index: number): void {
    const list = this._choicesList();
    this._choicesList.set(list.filter((_, i) => i !== index));
  }

  protected _submit(): void {
    if (this._form.invalid) {
      return;
    }
    const v = this._form.getRawValue();
    this._ref.close({
      id: v.id!,
      background: v.background ?? '',
      text: v.text ?? '',
      choices: this._choicesList(),
      hidden: v.hidden ?? false
    });
  }

  protected _cancel(): void {
    this._ref.close();
  }
}
