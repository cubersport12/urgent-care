import { supabase } from '@/supabase';
import { PostgrestResponse } from "@supabase/supabase-js";

export const useSupabaseFetch = async <T = any>(
  relation: string,
  filterCallback?: (query: any) => any
): Promise<PostgrestResponse<T>> => {
  const select = supabase.from(relation).select('*');
  const r = filterCallback ? filterCallback(select) : select;
  const result = await r;
  return result as PostgrestResponse<T>;
}; 
