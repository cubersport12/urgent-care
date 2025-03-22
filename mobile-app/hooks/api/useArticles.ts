import { useEffect, useState } from 'react';
import { useSupabaseFetch } from './useSupabaseFetch';
import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { AppArticleVm, NullableValue } from './types';
import { supabase } from '@/supabase';
import { Platform } from 'react-native';

const RELATION_NAME = 'articles';

export const useArticles = (parentId?: string) => {
  const [response, setResponse] = useState<Partial<PostgrestSingleResponse<AppArticleVm[]>>>({});

  useEffect(() => {
    const fetchArticles = async () => {
      const result = await useSupabaseFetch(RELATION_NAME, ref => parentId?.length ? ref.filter('parentId', 'eq', parentId) : ref.filter('parentId', 'is', null));
      setResponse(result);
    };
    void fetchArticles();
  }, [parentId]);
  return response;
};

export const useFileContentString = (fileName: string) => {
  const [response, setResponse] = useState<NullableValue<string>>();

  useEffect(() => {
    const fetchContent = async () => {
      const r = await supabase.storage.from('cubersport12').download(`public/${fileName}`);
      if (r.data instanceof Blob) {
        const reader = new FileReader();

        reader.onload = () => {
          const text = reader.result as string;
          setResponse(text);
        };

        reader.readAsText(r.data);
      }
      else {
        throw new Error('File not found');
      }
    };
    void fetchContent();
  }, [fileName]);

  return response;
};
