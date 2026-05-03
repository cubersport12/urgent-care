import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class AppSupabase {
  // eslint-disable-next-line max-len
  public client = createClient('https://trouble-dent.ru', 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz');
}
