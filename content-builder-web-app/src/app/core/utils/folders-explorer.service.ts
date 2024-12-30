import { Injectable, signal } from '@angular/core';
import { NullableValue } from './types';

@Injectable({
  providedIn: 'root'
})
export class FoldersExplorerService {
  public readonly beginRename = signal<NullableValue<string>>(null);
}
