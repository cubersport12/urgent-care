import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./core/components/login/login.component').then((x) => x.LoginComponent)
  },
  {
    path: '',
    loadComponent: () =>
      import('./core/components/admin-layout/admin-layout.component').then(
        (x) => x.AdminLayoutComponent
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./core/components/dashboard/dashboard.component').then((x) => x.DashboardComponent)
      },
      {
        path: 'content',
        loadComponent: () =>
          import('./core/components/folders-explorer/folders-explorer.component').then(
            (x) => x.FoldersExplorerComponent
          )
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./core/components/users-list/users-list.component').then((x) => x.UsersListComponent)
      },
      {
        path: 'tariffs',
        loadComponent: () =>
          import('./core/components/tariffs-editor/tariffs-editor.component').then(
            (x) => x.TariffsEditorComponent
          )
      },
      {
        path: 'promo-codes',
        loadComponent: () =>
          import('./core/components/promo-codes-editor/promo-codes-editor.component').then(
            (x) => x.PromoCodesEditorComponent
          )
      },
      {
        path: 'refunds',
        loadComponent: () =>
          import(
            './core/components/subscription-refund-editor/subscription-refund-editor.component'
          ).then((x) => x.SubscriptionRefundEditorComponent)
      },
      {
        path: 'achievements',
        loadComponent: () =>
          import('./core/components/achievements-editor/achievements-editor.component').then(
            (x) => x.AchievementsEditorComponent
          )
      },
      {
        path: 'rewards',
        loadComponent: () =>
          import('./core/components/rewards-editor/rewards-editor.component').then(
            (x) => x.RewardsEditorComponent
          )
      },
      {
        path: 'stats-reset',
        loadComponent: () =>
          import('./core/components/stats-reset-editor/stats-reset-editor.component').then(
            (x) => x.StatsResetEditorComponent
          )
      },
      {
        path: 'legal-docs',
        loadComponent: () =>
          import('./core/components/legal-docs-editor/legal-docs-editor.component').then(
            (x) => x.LegalDocsEditorComponent
          )
      },
      {
        path: 'certificates',
        loadComponent: () =>
          import('./core/components/certificates-editor/certificates-editor.component').then(
            (x) => x.CertificatesEditorComponent
          )
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./core/components/system-settings/system-settings.component').then(
            (x) => x.SystemSettingsComponent
          )
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
