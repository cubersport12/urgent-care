export const openFileAsHtml = (): Promise<string> => {
  const i = document.createElement('input');
  i.type = 'file';
  i.accept = 'text/html';
  return new Promise<string>((resolve, reject) => {
    const signal = new AbortController();
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    i.addEventListener('change', async () => {
      const file = i.files?.[0];
      if (file) {
        const text = await file.text();
        resolve(text);
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
