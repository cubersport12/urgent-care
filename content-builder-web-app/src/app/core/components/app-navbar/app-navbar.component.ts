import { Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-navbar',
  imports: [
    MatIcon,
    MatButton
  ],
  templateUrl: './app-navbar.component.html'
})
export class AppNavbarComponent {

}
