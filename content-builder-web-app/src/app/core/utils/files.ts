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
