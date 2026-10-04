import { Component, effect, signal, ChangeDetectionStrategy } from '@angular/core';
import { AppIconButtonComponent } from '@/core/components/ui';

const LIGHT_MODE = 'light';
const DARK_MODE = 'dark';
const LS_KEY = 'theme';

@Component({
  selector: 'app-toggle-light-dark-button',
  imports: [
    AppIconButtonComponent
  ],
  templateUrl: './toggle-light-dark-button.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './toggle-light-dark-button.component.scss'
})
export class ToggleLightDarkButtonComponent {
  protected readonly _currentMode = signal<'light' | 'dark'>((localStorage.getItem(LS_KEY) as 'light' | 'dark') ?? DARK_MODE);

  constructor() {
    effect(() => {
      const mode = this._currentMode();
      const html = document.documentElement;
      html.classList.toggle('dark', mode === DARK_MODE);
      html.style.colorScheme = mode;
      localStorage.setItem(LS_KEY, mode);
    });
  }

  protected _handleToggle(): void {
    this._currentMode.update(currentMode => currentMode === LIGHT_MODE ? DARK_MODE : LIGHT_MODE);
  }
}
