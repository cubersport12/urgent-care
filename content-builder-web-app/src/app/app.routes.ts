import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Вход — Trouble Dent',
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
        title: 'Дашборд и Аналитика — Trouble Dent',
        loadComponent: () =>
          import('./core/components/dashboard/dashboard.component').then((x) => x.DashboardComponent)
      },
      {
        path: 'content',
        title: 'Файловый менеджер — Trouble Dent',
        loadComponent: () =>
          import('./core/components/folders-explorer/folders-explorer.component').then(
            (x) => x.FoldersExplorerComponent
          )
      },
      {
        path: 'users',
        title: 'Управление пользователями — Trouble Dent',
        loadComponent: () =>
          import('./core/components/users-list/users-list.component').then((x) => x.UsersListComponent)
      },
      {
        path: 'support',
        title: 'Служба поддержки — Trouble Dent',
        loadComponent: () =>
          import('./core/components/support-inbox/support-inbox.component').then(
            (x) => x.SupportInboxComponent
          )
      },
      {
        path: 'tariffs',
        title: 'Тарифные планы — Trouble Dent',
        loadComponent: () =>
          import('./core/components/tariffs-editor/tariffs-editor.component').then(
            (x) => x.TariffsEditorComponent
          )
      },
      {
        path: 'promo-codes',
        title: 'Промокоды — Trouble Dent',
        loadComponent: () =>
          import('./core/components/promo-codes-editor/promo-codes-editor.component').then(
            (x) => x.PromoCodesEditorComponent
          )
      },
      {
        path: 'refunds',
        title: 'Возврат подписок — Trouble Dent',
        loadComponent: () =>
          import(
            './core/components/subscription-refund-editor/subscription-refund-editor.component'
          ).then((x) => x.SubscriptionRefundEditorComponent)
      },
      {
        path: 'achievements',
        title: 'Достижения — Trouble Dent',
        loadComponent: () =>
          import('./core/components/achievements-editor/achievements-editor.component').then(
            (x) => x.AchievementsEditorComponent
          )
      },
      {
        path: 'rewards',
        title: 'Награды — Trouble Dent',
        loadComponent: () =>
          import('./core/components/rewards-editor/rewards-editor.component').then(
            (x) => x.RewardsEditorComponent
          )
      },
      {
        path: 'stats-reset',
        title: 'Сброс статистики — Trouble Dent',
        loadComponent: () =>
          import('./core/components/stats-reset-editor/stats-reset-editor.component').then(
            (x) => x.StatsResetEditorComponent
          )
      },
      {
        path: 'legal-docs',
        title: 'Нормативные документы — Trouble Dent',
        loadComponent: () =>
          import('./core/components/legal-docs-editor/legal-docs-editor.component').then(
            (x) => x.LegalDocsEditorComponent
          )
      },
      {
        path: 'certificates',
        title: 'Сертификаты — Trouble Dent',
        loadComponent: () =>
          import('./core/components/certificates-editor/certificates-editor.component').then(
            (x) => x.CertificatesEditorComponent
          )
      },
      {
        path: 'settings',
        title: 'Настройки платформы — Trouble Dent',
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
