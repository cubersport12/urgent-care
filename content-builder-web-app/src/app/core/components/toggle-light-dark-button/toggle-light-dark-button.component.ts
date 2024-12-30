import { Component, effect, signal } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

const LIGHT_MODE = 'light-mode';
const DARK_MODE = 'dark-mode';
const LS_KEY = 'theme';

@Component({
  selector: 'app-toggle-light-dark-button',
  imports: [
    MatIcon,
    MatIconButton
  ],
  templateUrl: './toggle-light-dark-button.component.html',
  styleUrl: './toggle-light-dark-button.component.scss'
})
export class ToggleLightDarkButtonComponent {
  protected readonly _currentMode = signal<'light-mode' | 'dark-mode'>((localStorage.getItem(LS_KEY) as 'light-mode' | 'dark-mode') ?? DARK_MODE);

  constructor() {
    effect(() => {
      const mode = this._currentMode();
      const body = document.body;
      body.classList.remove(LIGHT_MODE, DARK_MODE);
      body.classList.add(mode);
      localStorage.setItem(LS_KEY, mode);
    });
  }

  protected _handleToggle(): void {
    const body = document.body;
    body.classList.remove(LIGHT_MODE, DARK_MODE);
    this._currentMode.update((currentMode) => {
      const newMode = currentMode === LIGHT_MODE ? DARK_MODE : LIGHT_MODE;
      return newMode;
    });
  }
}
