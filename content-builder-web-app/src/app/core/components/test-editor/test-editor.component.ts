import { AppTestVm } from '@/core/utils';
import { Component, inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

@Injectable({
  providedIn: 'root'
})
export class TestsEditorService {
  private readonly _dialogs = inject(MatDialog);
  public openTest(test: Partial<AppTestVm>): void {
    this._dialogs.open(TestEditorComponent, {
      minWidth: '400px',
      hasBackdrop: true,
      autoFocus: true,
      disableClose: true,
      data: test
    });
  }
}

@Component({
  selector: 'app-test-editor',
  imports: [],
  templateUrl: './test-editor.component.html',
  styles: ``
})
export class TestEditorComponent {

}
