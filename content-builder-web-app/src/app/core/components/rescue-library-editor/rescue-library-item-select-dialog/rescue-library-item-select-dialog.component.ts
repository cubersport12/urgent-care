import { RescueLibraryItemVm, NullableValue } from '@/core/utils';
import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { RescueLibraryTreeComponent } from '../rescue-library-tree';

@Component({
  selector: 'app-rescue-library-item-select-dialog',
  imports: [
    MatIcon,
    MatButton,
    RescueLibraryTreeComponent
  ],
  templateUrl: './rescue-library-item-select-dialog.component.html',
  styles: `
    .dialog-content {
      min-width: 400px;
      min-height: 400px;
      display: flex;
      flex-direction: column;
    }
    .tree-container {
      flex: 1;
      overflow: auto;
      border: 1px solid #ccc;
      border-radius: 4px;
      margin: 16px 0;
    }
  `
})
export class RescueLibraryItemSelectDialogComponent {
  private readonly _dialogRef = inject(MatDialogRef<RescueLibraryItemSelectDialogComponent>);
  protected readonly _data = inject<{ selectedItemId?: NullableValue<string> }>(MAT_DIALOG_DATA);

  protected _onItemSelect(item: RescueLibraryItemVm): void {
    this._dialogRef.close(item);
  }

  protected _onCancel(): void {
    this._dialogRef.close();
  }
}
