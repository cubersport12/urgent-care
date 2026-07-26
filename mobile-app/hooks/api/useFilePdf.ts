import { downloadMediaBlob } from '@/lib/api';
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
      const blob = await downloadMediaBlob(fileName);
      const reader = new FileReader();

      await new Promise<void>((resolve, reject) => {
        reader.onload = () => {
          let base64 = reader.result as string;
          if (base64.startsWith('data:')) {
            const base64Match = base64.match(/data:.*?;base64,(.+)/);
            if (base64Match) {
              base64 = `data:application/pdf;base64,${base64Match[1]}`;
            }
          } else {
            base64 = `data:application/pdf;base64,${base64}`;
          }
          setResponse(base64);
          setIsLoading(false);
          resolve();
        };
        reader.onerror = () => {
          setIsLoading(false);
          reject(new Error('Failed to read PDF file'));
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      setIsLoading(false);
      console.error('Error loading PDF:', error);
      throw error;
    }
  }, [fileName]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { response, isLoading, fetchData };
};
