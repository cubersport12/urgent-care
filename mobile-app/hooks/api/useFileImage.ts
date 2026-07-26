import { downloadMediaBlob } from '@/lib/api';
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
      const blob = await downloadMediaBlob(fileName);
      const reader = new FileReader();
      await new Promise<void>((resolve, reject) => {
        reader.onload = () => {
          setResponse(reader.result as string);
          setIsLoading(false);
          resolve();
        };
        reader.onerror = () => {
          setIsLoading(false);
          reject(new Error('Failed to read image file'));
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  }, [fileName]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { response, isLoading, fetchData };
};
