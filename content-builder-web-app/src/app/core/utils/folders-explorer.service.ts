import { Injectable, signal } from '@angular/core';
import { AppArticleVm, AppFolderVm, AppRescueItemVm, AppTestVm, NullableValue } from './types';

export type ExplorerItemType = 'folder' | 'article' | 'test' | 'rescue';

export type ExplorerClipboardEntry = {
  type: ExplorerItemType;
  item: AppFolderVm | AppArticleVm | AppTestVm | AppRescueItemVm;
  mode: 'copy' | 'cut';
};

@Injectable({
  providedIn: 'root'
})
export class FoldersExplorerService {
  public readonly beginRename = signal<NullableValue<string>>(null);
  public readonly clipboard = signal<NullableValue<ExplorerClipboardEntry>>(null);
  public readonly selectedId = signal<NullableValue<string>>(null);
}
