import { Component, computed, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-svg-icon-input-dialog',
  imports: [
    MatIcon,
    MatButton,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './svg-icon-input-dialog.component.html',
  styles: `
    .dialog-content {
      min-width: 500px;
      min-height: 400px;
      display: flex;
      flex-direction: column;
    }
    .preview-container {
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 16px;
      min-height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
    }
  `
})
export class SvgIconInputDialogComponent {
  private readonly _dialogRef = inject(MatDialogRef<SvgIconInputDialogComponent>);
  private readonly _sanitizer = inject(DomSanitizer);
  protected readonly _data = inject<{ initialValue?: string; title: string }>(MAT_DIALOG_DATA);

  protected readonly _form = new FormGroup({
    svg: new FormControl<string>(this._data.initialValue ?? '', Validators.required)
  });

  protected get _previewSvg() {
    const svg = this._form.value.svg;
    console.info(svg);
    if (!svg) {
      return null;
    }
    return this._sanitizer.bypassSecurityTrustHtml(svg); // 1 = SecurityContext.HTML
  }

  protected _onConfirm(): void {
    if (this._form.invalid) {
      return;
    }
    this._dialogRef.close(this._form.value.svg);
  }

  protected _onCancel(): void {
    this._dialogRef.close();
  }
}
