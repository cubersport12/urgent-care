import {
  generateGUID,
  RescueSceneDocumentVm
} from '@/core/utils';
import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AppDialogWrapperComponent } from '../../dialog-wrapper/dialog-wrapper.component';
import {
  AppInputComponent,
  AppSelectComponent,
  SelectOption
} from '@/core/components/ui';

export type ArticleOption = { id: string; name: string };

export type RescueSceneDocumentDialogData = {
  document: RescueSceneDocumentVm | null;
  articleOptions: ArticleOption[];
};

@Component({
  selector: 'app-rescue-scene-document-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    AppDialogWrapperComponent,
    AppInputComponent,
    AppSelectComponent
  ],
  templateUrl: './rescue-scene-document-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: ``
})
export class RescueSceneDocumentDialogComponent {
  protected readonly _dialogData = inject<RescueSceneDocumentDialogData>(MAT_DIALOG_DATA);
  private readonly _ref = inject(MatDialogRef<RescueSceneDocumentDialogComponent, RescueSceneDocumentVm>);

  protected readonly _articleOptions: ArticleOption[] = Array.isArray(this._dialogData.articleOptions)
    ? [...this._dialogData.articleOptions].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    : [];

  protected readonly _articleSelectOptions = computed<SelectOption[]>(() =>
    this._articleOptions.map(a => ({ value: a.id, label: a.name }))
  );

  /** id генерируется автоматически при создании */
  protected readonly _form = new FormGroup({
    id: new FormControl<string>(
      this._dialogData.document?.id ?? generateGUID(),
      Validators.required
    ),
    name: new FormControl<string>(
      this._dialogData.document?.name ?? '',
      Validators.required
    ),
    articleId: new FormControl<string>(
      this._dialogData.document?.articleId ?? '',
      Validators.required
    )
  });

  protected _submit(): void {
    if (this._form.invalid) {
      return;
    }
    const v = this._form.getRawValue();
    this._ref.close({
      id: v.id!,
      name: v.name ?? '',
      articleId: v.articleId ?? ''
    });
  }

  protected _cancel(): void {
    this._ref.close();
  }
}
