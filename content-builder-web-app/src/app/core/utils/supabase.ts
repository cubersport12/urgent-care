import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class AppSupabase {
  // eslint-disable-next-line max-len
  public client = createClient('https://cbnvjqjrsyrpnopspwzk.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNibnZqcWpyc3lycG5vcHNwd3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzODQ4NDYsImV4cCI6MjA1MDk2MDg0Nn0.MQVBPozROqV0vUpfLQoG8itS8PqChZI2rCzolieB4eI');
}
