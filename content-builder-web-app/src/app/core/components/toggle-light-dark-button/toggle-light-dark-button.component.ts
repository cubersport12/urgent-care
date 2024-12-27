import { Component, signal } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

const LIGHT_MODE = 'light-mode';
const DARK_MODE = 'dark-mode';

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
  protected readonly _currentMode = signal<'light-mode' | 'dark-mode'>(LIGHT_MODE);
  protected _handleToggle(): void {
    const body = document.body;
    body.classList.remove(LIGHT_MODE, DARK_MODE);
    this._currentMode.update((currentMode) => {
      const newMode = currentMode === LIGHT_MODE ? DARK_MODE : LIGHT_MODE;
      body.classList.add(newMode);
      return newMode;
    });
  }
}
