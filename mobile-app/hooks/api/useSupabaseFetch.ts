import { supabase } from '@/supabase';
import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useSupabaseFetch = async (relation: string, filterCallback?: (f: PostgrestFilterBuilder<any, any, any[], string>) => PostgrestFilterBuilder<any, any, any[], string>) => {
  const select = supabase.from(relation).select('*');
  const r = filterCallback ? filterCallback(select) : select;
  const result = await r;
  return result;
};
