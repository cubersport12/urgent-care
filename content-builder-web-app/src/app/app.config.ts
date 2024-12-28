import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { AngularFireModule } from '@angular/fire/compat';
import { provideAppStore } from '@/core/store';

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(AngularFireModule.initializeApp({
      apiKey: 'AIzaSyDcUJsYrKgs0usrFVNa0wrqDenVqYZPXFI',
      authDomain: 'urgent-care-9444e.firebaseapp.com',
      projectId: 'urgent-care-9444e',
      storageBucket: 'urgent-care-9444e.firebasestorage.app',
      messagingSenderId: '968549272760',
      appId: '1:968549272760:web:88d791e2e2c1291a03b84d',
      measurementId: 'G-66VELK0HS7'
    })),
    provideAppStore(),
    provideHttpClient(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes)
  ]
};
