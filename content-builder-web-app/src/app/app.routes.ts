import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    pathMatch: 'full',
    path: '',
    loadComponent: () => import('./core/components/folders-explorer/folders-explorer.component').then(x => x.FoldersExplorerComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
