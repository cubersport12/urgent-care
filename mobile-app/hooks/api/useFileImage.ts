import { downloadMediaBlob } from '@/lib/api';
import { useCallback, useEffect, useRef, useState } from 'react';

export const useFileImage = (fileName: string) => {
  const [result, setResult] = useState<{ path: string; uri?: string; loading: boolean }>({ path: '', loading: false });
  const request = useRef(0);

  const fetchData = useCallback(async () => {
    const id = ++request.current;
    if (!fileName) {
      setResult({ path: '', loading: false });
      return;
    }
    setResult({ path: fileName, loading: true });
    try {
      const blob = await downloadMediaBlob(fileName);
      const uri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(blob);
      });
      if (request.current === id) setResult({ path: fileName, uri, loading: false });
    } catch {
      if (request.current === id) setResult({ path: fileName, loading: false });
    }
  }, [fileName]);

  useEffect(() => {
    const activeRequests = request;
    void fetchData();
    return () => { activeRequests.current++; };
  }, [fetchData]);

  return {
    response: result.path === fileName ? result.uri : undefined,
    isLoading: !!fileName && (result.path !== fileName || result.loading),
    fetchData,
  };
};
