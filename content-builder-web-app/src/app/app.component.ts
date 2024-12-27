import { Component, inject } from '@angular/core';
import { AppIconsRegistry } from '@/core/utils';
import { ToggleLightDarkButtonComponent } from '@/core/components';

@Component({
  selector: 'app-root',
  imports: [
    ToggleLightDarkButtonComponent
  ],
  host: {
    class: 'block w-full h-full relative'
  },
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private readonly _iconsRegistry = inject(AppIconsRegistry);
  title = 'content-builder-web-app';

  constructor() {
    this._iconsRegistry.addAllSvgIcons();
  }
}
