import { Component, computed, inject } from '@angular/core';
import { AppIconsRegistry, NullableValue } from '@/core/utils';
import { ToggleLightDarkButtonComponent } from '@/core/components';
import { Store } from '@ngxs/store';
import { FoldersActions, FoldersState } from '@/core/store';
import { AppNavbarComponent } from '@/core/components';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [
    ToggleLightDarkButtonComponent,
    AppNavbarComponent,
    RouterOutlet
  ],
  host: {
    class: 'block w-full h-full relative'
  },
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private readonly _store = inject(Store);
  private readonly _iconsRegistry = inject(AppIconsRegistry);

  protected readonly _folders = (parentId: NullableValue<string>) => computed(() => {
    const result = this._store.selectSignal(FoldersState.getFolders)();
    return result(parentId);
  });

  constructor() {
    this._iconsRegistry.addAllSvgIcons();
    this._store.dispatch(new FoldersActions.FetchFolders(null));
  }

  protected _handleAdd(): void {
    const folders = this._store.selectSignal(FoldersState.getFolders)()(null);
    this._store.dispatch(new FoldersActions.CreateFolder(null, { name: `New folder #${(folders?.length ?? 1) + 1}` }));
  }
}
