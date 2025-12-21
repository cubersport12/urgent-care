import { supabase } from '@/supabase';
import { useCallback, useEffect, useState } from 'react';
import { NullableValue } from './types';

export const useFileImage = (fileName: string) => {
  const [response, setResponse] = useState<NullableValue<string>>();
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!fileName) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const r = await supabase.storage.from('cubersport12').download(`public/${fileName}`);
      if (r.data instanceof Blob) {
        const reader = new FileReader();

        reader.onload = () => {
          const dataUrl = reader.result as string;
          setResponse(dataUrl);
          setIsLoading(false);
        };

        reader.onerror = () => {
          setIsLoading(false);
          throw new Error('Failed to read image file');
        };

        reader.readAsDataURL(r.data);
      }
      else {
        setIsLoading(false);
        throw new Error('File not found');
      }
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  }, [fileName]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    response,
    isLoading,
    fetchData,
  };
};

