import type { ViewStyle } from 'react-native';

export type PdfViewProps = {
  source: string | null | undefined;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  style?: ViewStyle;
  onPageChanged?: (page: number, numberOfPages: number) => void;
  enablePaging?: boolean;
  horizontal?: boolean;
  spacing?: number;
  page?: number;
  fitPolicy?: 0 | 1 | 2;
  onScrollToEnd?: () => void;
};

export function normalizePdfDataUri(source: string): string {
  if (!source.startsWith('data:')) {
    return `data:application/pdf;base64,${source}`;
  }
  if (source.startsWith('data:application/pdf;base64,')) {
    return source;
  }
  const base64Match = source.match(/data:.*?;base64,(.+)/);
  if (base64Match) {
    return `data:application/pdf;base64,${base64Match[1]}`;
  }
  return source;
}

/** HTML с pdf.js для Android (WebView не рендерит PDF напрямую) */
export function pdfJsHtmlFromFile(fileUri: string): string {
  const safeUri = fileUri.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #fff; padding: 8px; }
    canvas { display: block; width: 100% !important; height: auto !important; margin-bottom: 8px; }
    #error { color: #c00; padding: 16px; font-family: sans-serif; }
    #loading { padding: 24px; text-align: center; font-family: sans-serif; color: #666; }
  </style>
</head>
<body>
  <div id="loading">Загрузка PDF…</div>
  <div id="pages"></div>
  <div id="error"></div>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const url = '${safeUri}';
    pdfjsLib.getDocument(url).promise.then(async function(pdf) {
      document.getElementById('loading').style.display = 'none';
      const container = document.getElementById('pages');
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const canvas = document.createElement('canvas');
        container.appendChild(canvas);
        const viewport = page.getViewport({ scale: 1.4 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
      }
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage('loaded');
      setTimeout(function() {
        var el = document.scrollingElement || document.documentElement;
        if (el.scrollHeight <= el.clientHeight + 2) {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage('end');
        }
      }, 500);
    }).catch(function(err) {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('error').textContent = 'Ошибка загрузки PDF: ' + err.message;
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage('error');
    });
    window.addEventListener('scroll', function() {
      var el = document.scrollingElement || document.documentElement;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 48) {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage('end');
      }
    }, { passive: true });
  </script>
</body>
</html>`;
}

/** pdf.js с base64-данными (fallback, если file:// недоступен) */
export function pdfJsHtmlFromBase64(base64: string): string {
  const safeB64 = base64.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\s/g, '');
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #fff; padding: 8px; }
    canvas { display: block; width: 100% !important; height: auto !important; margin-bottom: 8px; }
    #error { color: #c00; padding: 16px; font-family: sans-serif; }
    #loading { padding: 24px; text-align: center; font-family: sans-serif; color: #666; }
  </style>
</head>
<body>
  <div id="loading">Загрузка PDF…</div>
  <div id="pages"></div>
  <div id="error"></div>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const raw = atob('${safeB64}');
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    pdfjsLib.getDocument({ data: bytes }).promise.then(async function(pdf) {
      document.getElementById('loading').style.display = 'none';
      const container = document.getElementById('pages');
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const canvas = document.createElement('canvas');
        container.appendChild(canvas);
        const viewport = page.getViewport({ scale: 1.4 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
      }
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage('loaded');
      setTimeout(function() {
        var el = document.scrollingElement || document.documentElement;
        if (el.scrollHeight <= el.clientHeight + 2) {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage('end');
        }
      }, 500);
    }).catch(function(err) {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('error').textContent = 'Ошибка загрузки PDF: ' + err.message;
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage('error');
    });
    window.addEventListener('scroll', function() {
      var el = document.scrollingElement || document.documentElement;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 48) {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage('end');
      }
    }, { passive: true });
  </script>
</body>
</html>`;
}
