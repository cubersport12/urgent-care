import { inject, Injectable } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material/icon';
import { faSun, faMoon, faPlus, faTrash, faFolder, faSpinner, faFileContract, faSlidersH, faFileCircleCheck, faVideo } from '@fortawesome/free-solid-svg-icons';
import { icon, library } from '@fortawesome/fontawesome-svg-core';

@Injectable({ providedIn: 'root' })
export class AppIconsRegistry {
  private readonly _sanitizer = inject(DomSanitizer);
  private readonly _registry = inject(MatIconRegistry);

  public addAllSvgIcons(): void {
    const icons = [
      faSun,
      faMoon,
      faPlus,
      faTrash,
      faFolder,
      faSpinner,
      faFileContract,
      faSlidersH,
      faFileCircleCheck,
      faVideo
    ];

    icons.forEach((iconDefinition) => {
      library.add(iconDefinition);
      const i = icon({ prefix: 'fas', iconName: iconDefinition.iconName });
      this._registry.addSvgIconLiteral(
        iconDefinition.iconName,
        this._sanitizer.bypassSecurityTrustHtml(i.html[0])
      );
    });
  }
}
