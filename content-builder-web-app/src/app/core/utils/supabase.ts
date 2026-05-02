import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class AppSupabase {
  // eslint-disable-next-line max-len
  public client = createClient('http://77.91.90.39:54321', 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz');
}
