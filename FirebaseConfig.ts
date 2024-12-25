import { FirebaseOptions, initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDcUJsYrKgs0usrFVNa0wrqDenVqYZPXFI',
  authDomain: 'urgent-care-9444e.firebaseapp.com',
  projectId: 'urgent-care-9444e',
  storageBucket: 'urgent-care-9444e.firebasestorage.app',
  messagingSenderId: '968549272760',
  appId: '1:968549272760:web:88d791e2e2c1291a03b84d',
  measurementId: 'G-66VELK0HS7'
} satisfies FirebaseOptions;

export const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
