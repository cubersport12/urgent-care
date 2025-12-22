import { supabase } from '@/supabase';
import { useCallback, useEffect, useState } from 'react';
import { NullableValue } from './types';

export const useFilePdf = (fileName: string) => {
  const [response, setResponse] = useState<NullableValue<string>>();
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!fileName) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      // Загружаем файл и конвертируем в base64
      const r = await supabase.storage.from('cubersport12').download(`public/${fileName}`);
      if (r.data instanceof Blob) {
        const reader = new FileReader();
        
        reader.onload = () => {
          let base64 = reader.result as string;
          // Нормализуем формат для react-native-pdf: "data:application/pdf;base64,..."
          // FileReader может вернуть другой MIME тип, поэтому исправляем его
          if (base64.startsWith('data:')) {
            const base64Match = base64.match(/data:.*?;base64,(.+)/);
            if (base64Match) {
              // Принудительно устанавливаем правильный MIME тип для PDF
              base64 = `data:application/pdf;base64,${base64Match[1]}`;
            }
          } else {
            // Если это просто base64 строка без префикса
            base64 = `data:application/pdf;base64,${base64}`;
          }
          setResponse(base64);
          setIsLoading(false);
        };
        
        reader.onerror = () => {
          setIsLoading(false);
          throw new Error('Failed to read PDF file');
        };
        
        reader.readAsDataURL(r.data);
      } else {
        setIsLoading(false);
        throw new Error('File not found');
      }
    } catch (error) {
      setIsLoading(false);
      console.error('Error loading PDF:', error);
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

