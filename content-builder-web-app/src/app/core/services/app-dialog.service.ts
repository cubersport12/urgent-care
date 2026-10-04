import { inject, Injectable } from '@angular/core';
import { ComponentType } from '@angular/cdk/portal';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';

export interface AppDialogConfig<D = any> extends MatDialogConfig<D> {
  // Specific extensions if needed
}

@Injectable({ providedIn: 'root' })
export class AppDialogService {
  private readonly _dialog = inject(MatDialog);

  /**
   * Opens a standardized dialog modal with unified styling, backdrop, and behavior.
   */
  public open<T, D = any, R = any>(
    component: ComponentType<T>,
    config?: AppDialogConfig<D>
  ): MatDialogRef<T, R> {
    const mergedConfig: MatDialogConfig<D> = {
      maxWidth: '95vw',
      hasBackdrop: true,
      backdropClass: 'app-dialog-backdrop',
      panelClass: ['app-custom-dialog-panel'],
      autoFocus: 'first-tabbable',
      ...config
    };

    return this._dialog.open<T, D, R>(component, mergedConfig);
  }
}
