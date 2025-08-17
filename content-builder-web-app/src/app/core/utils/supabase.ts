import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class AppSupabase {
  // eslint-disable-next-line max-len
  public client = createClient('https://jjqzkpedbpfytjotaank.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqcXprcGVkYnBmeXRqb3RhYW5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjI5MDMsImV4cCI6MjA3MDkzODkwM30.PKjoTccGMVYiuvWqvHoebCa0CPmlHd74a5s9P4mssJc');
}
