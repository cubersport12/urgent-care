export const openFileAsBuffer = (mimeType?: string, readAs?: 'text' | 'buffer'): Promise<ArrayBuffer | string> => {
  const i = document.createElement('input');
  i.type = 'file';
  i.accept = mimeType ?? '*/*';
  return new Promise<ArrayBuffer | string>((resolve, reject) => {
    const signal = new AbortController();

    i.addEventListener('change', () => {
      const file = i.files?.[0];
      if (file) {
        switch (readAs) {
          default:
            void file.text()
              .then((t) => {
                resolve(t);
              });
            break;
          case 'buffer':
            void file.arrayBuffer()
              .then((b) => {
                resolve(b);
              });
            break;
        }
      }
      else {
        reject(new Error('No file selected'));
      }
      signal.abort();
      i.remove();
    }, { signal: signal.signal });
    i.click();
  });
};

export const openFile = (mimeTypes?: string[]): Promise<File> => {
  const i = document.createElement('input');
  i.type = 'file';
  if (mimeTypes && mimeTypes.length > 0) {
    // Формируем строку для accept, используя расширения файлов и MIME типы
    // Расширения файлов более надежны для фильтрации в диалоге выбора
    const acceptParts: string[] = [];

    mimeTypes.forEach(type => {
      if (type.startsWith('.')) {
        // Расширение файла - добавляем как есть
        acceptParts.push(type);
      }
      else {
        // MIME тип - добавляем как есть
        acceptParts.push(type);
      }
    });

    i.accept = acceptParts.join(',');
  }
  return new Promise<File>((resolve, reject) => {
    const signal = new AbortController();

    i.addEventListener('change', () => {
      const file = i.files?.[0];
      if (file) {
        resolve(file);
      }
      else {
        reject(new Error('No file selected'));
      }
      signal.abort();
      i.remove();
    }, { signal: signal.signal });
    i.click();
  });
};
