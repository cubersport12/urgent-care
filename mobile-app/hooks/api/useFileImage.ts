import { API_BASE_URL, downloadMediaBlob } from '@/lib/api';
import { useCallback, useEffect, useRef, useState } from 'react';

// Изображения бэкенд отдаёт без сессии с Cache-Control (GET /media/public/{path}) —
// их грузим прямой ссылкой, которую кэшируют браузер (web) и нативный загрузчик
// картинок (Fresco), без авторизованного блоба и data-URL в DOM:
// - неймспейсы с GUID-ключами: иконки/фоны папок, иконки достижений и наград;
// - аватары (ключ user UUID + случайный hex — непердугадываемый);
// - корневые картинки без подпапки — фоны сцен и картинки вопросов (ключ = имя файла).
// Остальное (сертификаты — порядковый номер + ФИО, PDF статей — тарифный гейт,
// не-картинки) — как раньше, авторизованным блобом. Зеркало PUBLIC_IMAGE_PREFIXES в media.py.
const PUBLIC_IMAGE_PREFIXES = ['public/folders/', 'public/achievements/', 'public/rewards/', 'public/avatars/'];
const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|gif)$/i;

const isPublicImage = (fileName: string): boolean => {
  if (!fileName || !IMAGE_EXTENSIONS.test(fileName)) return false;
  const name = fileName.replace(/^public\//, '');
  return !name.includes('/') || PUBLIC_IMAGE_PREFIXES.some((prefix) => fileName.startsWith(prefix));
};

export const useFileImage = (fileName: string) => {
  const directUrl = isPublicImage(fileName) ? `${API_BASE_URL}/api/v1/media/public/${fileName}` : undefined;

  const [result, setResult] = useState<{ path: string; uri?: string; loading: boolean }>({ path: '', loading: false });
  const request = useRef(0);

  const fetchData = useCallback(async () => {
    const id = ++request.current;
    if (!fileName || directUrl) {
      setResult({ path: fileName, loading: false });
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
  }, [fileName, directUrl]);

  useEffect(() => {
    const activeRequests = request;
    void fetchData();
    return () => { activeRequests.current++; };
  }, [fetchData]);

  return {
    response: directUrl ?? (result.path === fileName ? result.uri : undefined),
    isLoading: !directUrl && !!fileName && (result.path !== fileName || result.loading),
    fetchData,
  };
};
