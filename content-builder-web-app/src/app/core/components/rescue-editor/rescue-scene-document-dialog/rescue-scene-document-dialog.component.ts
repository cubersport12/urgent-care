import {
  generateGUID,
  RescueSceneDocumentVm
} from '@/core/utils';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOption, MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';

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
    MatButton,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOption
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
