import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AppDialogWrapperComponent } from '../../dialog-wrapper/dialog-wrapper.component';
import { AppButtonComponent } from '../../ui';

export type PdfViewerDialogData = {
  title: string;
  url: string;
};

@Component({
  selector: 'app-pdf-viewer-dialog',
  imports: [AppDialogWrapperComponent, AppButtonComponent],
  template: `
    <app-dialog-wrapper
      [title]="data.title || 'Просмотр документа PDF'"
      subtitle="Встроенный предварительный просмотр"
      [showSave]="false"
      closeText="Закрыть"
      (close)="_close()"
    >
      <div class="flex flex-col gap-3 w-full min-w-[min(90vw,900px)]">
        <div class="flex justify-end">
          <app-button variant="secondary" size="sm" icon="arrow-up-right-from-square" (clicked)="_openExternal()">
            Открыть в новой вкладке
          </app-button>
        </div>

        <div class="relative w-full h-[72vh] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-inner">
          <iframe
            [src]="_safeUrl()"
            class="w-full h-full border-none"
            title="PDF Preview"
          ></iframe>
        </div>
      </div>
    </app-dialog-wrapper>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PdfViewerDialogComponent {
  private readonly _ref = inject(MatDialogRef<PdfViewerDialogComponent>);
  private readonly _sanitizer = inject(DomSanitizer);
  protected readonly data = inject<PdfViewerDialogData>(MAT_DIALOG_DATA);

  protected readonly _safeUrl = computed<SafeResourceUrl>(() =>
    this._sanitizer.bypassSecurityTrustResourceUrl(this.data.url)
  );

  protected _openExternal(): void {
    if (this.data.url) {
      window.open(this.data.url, '_blank');
    }
  }

  protected _close(): void {
    this._ref.close();
  }
}
