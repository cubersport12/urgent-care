import { inject, Injectable } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material/icon';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faSun, faMoon, faPlusCircle, faPlus, faExclamationCircle, faWindowMaximize, faTrash,
  faFolder, faFolderOpen, faSpinner, faCheck, faTimes, faFileContract, faSlidersH, faFileCircleCheck, faEdit, faVideo, faBars, faKitMedical, faChevronRight, faChevronDown, faBolt, faUpload, faCopy, faScissors, faPaste, faArrowUp, faRotateRight, faEllipsisVertical, faTag, faBell, faTrophy, faGift, faComments, faCertificate, faCreditCard, faUsers, faChartLine, faGear, faShieldHalved, faHouse, faCoins, faGamepad, faBan, faMagnifyingGlass, faFilter,
  faEnvelope, faLock, faEye, faEyeSlash, faArrowRight, faChevronLeft,
  faKey, faUser, faCalculator, faMessage, faArrowUpRightFromSquare, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { icon, library } from '@fortawesome/fontawesome-svg-core';

@Injectable({ providedIn: 'root' })
export class AppIconsRegistry {
  private readonly _sanitizer = inject(DomSanitizer);
  private readonly _registry = inject(MatIconRegistry);

  public addAllSvgIcons(): void {
    const icons = [
      faWindowMaximize,
      faExclamationCircle,
      faSun,
      faMoon,
      faPlus,
      faTrash,
      faFolder,
      faSpinner,
      faFileContract,
      faSlidersH,
      faFileCircleCheck,
      faVideo,
      faCheck,
      faTimes,
      faEdit,
      faBars,
      faKitMedical,
      faChevronRight,
      faChevronDown,
      faBolt,
      faPlusCircle,
      faUpload,
      faCopy,
      faScissors,
      faPaste,
      faArrowUp,
      faRotateRight,
      faEllipsisVertical,
      faFolderOpen,
      faTag,
      faBell,
      faTrophy,
      faGift,
      faComments,
      faCertificate,
      faCreditCard,
      faUsers,
      faChartLine,
      faGear,
      faShieldHalved,
      faHouse,
      faCoins,
      faGamepad,
      faBan,
      faMagnifyingGlass,
      faFilter,
      faEnvelope,
      faLock,
      faEye,
      faEyeSlash,
      faArrowRight,
      faChevronLeft,
      faKey,
      faUser,
      faCalculator,
      faMessage,
      faArrowUpRightFromSquare,
      faPaperPlane
    ];

    icons.forEach((iconDefinition) => {
      library.add(iconDefinition);
      const i = icon({ prefix: 'fas', iconName: iconDefinition.iconName });
      console.info(`Adding icon: ${iconDefinition.iconName}`);
      this._registry.addSvgIconLiteral(
        iconDefinition.iconName,
        this._sanitizer.bypassSecurityTrustHtml(i.html[0])
      );
    });

    // FA6 переименовал часть иконок, а шаблоны используют старые FA5 имена —
    // регистрируем алиасы, иначе mat-icon с таким именем рендерится пустым.
    const aliases: Array<[string, IconDefinition]> = [
      ['times', faTimes],
      ['edit', faEdit],
      ['exclamation-circle', faExclamationCircle],
      ['sliders-h', faSlidersH],
      ['comment-alt', faMessage]
    ];
    aliases.forEach(([name, iconDefinition]) => {
      const i = icon({ prefix: 'fas', iconName: iconDefinition.iconName });
      this._registry.addSvgIconLiteral(
        name,
        this._sanitizer.bypassSecurityTrustHtml(i.html[0])
      );
    });
  }
}
