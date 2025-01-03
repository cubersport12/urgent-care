import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { provideAppStore } from '@/core/store';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideQuillConfig } from 'ngx-quill';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppStore(),
    provideHttpClient(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideQuillConfig({
      theme: 'bubble'
    }),
    importProvidersFrom(BrowserAnimationsModule)
  ]
};
