import { Component, inject } from '@angular/core';
import { AppIconsRegistry } from '@/core/utils';
import { ToggleLightDarkButtonComponent } from '@/core/components';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatButton } from '@angular/material/button';
import { uniqueId } from 'lodash';
import { toSignal } from '@angular/core/rxjs-interop';
import { JsonPipe } from '@angular/common';
import { map } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [
    ToggleLightDarkButtonComponent,
    MatButton,
    JsonPipe
  ],
  host: {
    class: 'block w-full h-full relative'
  },
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private readonly _firestore = inject(AngularFirestore);
  private readonly _folders = this._firestore.collection('folders');
  private readonly _iconsRegistry = inject(AppIconsRegistry);

  protected readonly _foldersList = toSignal(this._folders.snapshotChanges()
    .pipe(map(actions => actions.map(action => ({
      id: action.payload.doc.get('id'),
      name: action.payload.doc.get('name')
    })))));

  constructor() {
    this._iconsRegistry.addAllSvgIcons();
    this._folders.get()
      .subscribe(async (actions) => {
        const data = await actions.query.get();
        console.info(data.docs.map(doc => doc.data()));
      });
  }

  _handleAdd() {
    void this._folders.add({ id: uniqueId('folders'), name: 'Folder 1' });
  }
}
