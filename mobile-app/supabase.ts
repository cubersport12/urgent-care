import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jjqzkpedbpfytjotaank.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqcXprcGVkYnBmeXRqb3RhYW5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjI5MDMsImV4cCI6MjA3MDkzODkwM30.PKjoTccGMVYiuvWqvHoebCa0CPmlHd74a5s9P4mssJc';

class SupabaseStorage {
  async getItem(key: string) {
    if (Platform.OS === 'web') {
      if (typeof localStorage === 'undefined') {
        return null;
      }
      return localStorage.getItem(key);
    }
    return AsyncStorage.getItem(key);
  }

  async removeItem(key: string) {
    if (Platform.OS === 'web') {
      return localStorage.removeItem(key);
    }
    return AsyncStorage.removeItem(key);
  }

  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      return localStorage.setItem(key, value);
    }
    return AsyncStorage.setItem(key, value);
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: new SupabaseStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// Tells Supabase Auth to continuously refresh the session automatically
// if the app is in the foreground. When this is added, you will continue
// to receive `onAuthStateChange` events with the `TOKEN_REFRESHED` or
// `SIGNED_OUT` event if the user's session is terminated. This should
// only be registered once.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    void supabase.auth.startAutoRefresh();
  }
  else {
    void supabase.auth.stopAutoRefresh();
  }
});
