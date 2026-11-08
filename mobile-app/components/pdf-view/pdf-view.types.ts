import { Colors, type ThemeMode } from '@/constants/theme';
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
  /** 0–100 scroll progress (native pdf.js viewer). */
  onScrollProgress?: (percent: number) => void;
  onScrollDirection?: (direction: 'up' | 'down') => void;
};

/**
 * Транспорт сообщений из pdf.js-HTML наружу: в нативном WebView это
 * ReactNativeWebView.postMessage, на web — postMessage в родительское окно.
 */
export const PDF_POST_JS = `
    function __pdfPost(msg) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(msg);
      } else if (window.parent !== window) {
        window.parent.postMessage(msg, '*');
      }
    }
`;

/** Injected into pdf.js HTML scroll handler */
export const PDF_SCROLL_PROGRESS_JS = `
    var __pdfProgressSent = {};
    var __pdfLastTop = 0;
    var __pdfLastDirection = '';
    function __pdfReportProgress() {
      var el = document.scrollingElement || document.documentElement;
      var delta = el.scrollTop - __pdfLastTop;
      if (Math.abs(delta) > 3) {
        var direction = delta > 0 ? 'down' : 'up';
        if (direction !== __pdfLastDirection) {
          __pdfLastDirection = direction;
          __pdfPost('direction:' + direction);
        }
        __pdfLastTop = el.scrollTop;
      }
      var max = el.scrollHeight - el.clientHeight;
      var pct = max <= 0 ? 100 : Math.min(100, Math.round((el.scrollTop / max) * 100));
      [25, 50, 75].forEach(function(t) {
        if (pct >= t && !__pdfProgressSent[t]) {
          __pdfProgressSent[t] = true;
          __pdfPost('progress:' + t);
        }
      });
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 48) {
        __pdfPost('end');
      }
    }
`;

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
export function pdfJsHtmlFromFile(fileUri: string, theme: ThemeMode = 'light'): string {
  const safeUri = JSON.stringify(fileUri);
  const c = Colors[theme];
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: ${c.page}; padding: 8px; }
    canvas { display: block; width: 100% !important; height: auto !important; margin-bottom: 8px; }
    #error { color: ${c.error}; padding: 16px; font-family: sans-serif; }
    #loading { padding: 24px; text-align: center; font-family: sans-serif; color: ${c.neutral}; }
  </style>
</head>
<body>
  <div id="loading">Загрузка PDF…</div>
  <div id="pages"></div>
  <div id="error"></div>
  <script type="module">
    ${PDF_POST_JS}
    const url = ${safeUri};
    import('https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.mjs').then(function(pdfjsLib) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.worker.mjs';
      return pdfjsLib.getDocument({ url, isEvalSupported: false }).promise;
    }).then(async function(pdf) {
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
      __pdfPost('loaded');
      setTimeout(function() {
        var el = document.scrollingElement || document.documentElement;
        if (el.scrollHeight <= el.clientHeight + 2) {
          __pdfPost('end');
        }
      }, 500);
    }).catch(function(err) {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('error').textContent = 'Ошибка загрузки PDF: ' + err.message;
      __pdfPost('error');
    });
    ${PDF_SCROLL_PROGRESS_JS}
    window.addEventListener('scroll', __pdfReportProgress, { passive: true });
  </script>
</body>
</html>`;
}

/** pdf.js с base64-данными (fallback, если file:// недоступен) */
export function pdfJsHtmlFromBase64(base64: string, theme: ThemeMode = 'light'): string {
  const safeB64 = JSON.stringify(base64.replace(/\s/g, ''));
  const c = Colors[theme];
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: ${c.page}; padding: 8px; }
    canvas { display: block; width: 100% !important; height: auto !important; margin-bottom: 8px; }
    #error { color: ${c.error}; padding: 16px; font-family: sans-serif; }
    #loading { padding: 24px; text-align: center; font-family: sans-serif; color: ${c.neutral}; }
  </style>
</head>
<body>
  <div id="loading">Загрузка PDF…</div>
  <div id="pages"></div>
  <div id="error"></div>
  <script type="module">
    ${PDF_POST_JS}
    const raw = atob(${safeB64});
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    import('https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.mjs').then(function(pdfjsLib) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.worker.mjs';
      return pdfjsLib.getDocument({ data: bytes, isEvalSupported: false }).promise;
    }).then(async function(pdf) {
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
      __pdfPost('loaded');
      setTimeout(function() {
        var el = document.scrollingElement || document.documentElement;
        if (el.scrollHeight <= el.clientHeight + 2) {
          __pdfPost('end');
        }
      }, 500);
    }).catch(function(err) {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('error').textContent = 'Ошибка загрузки PDF: ' + err.message;
      __pdfPost('error');
    });
    ${PDF_SCROLL_PROGRESS_JS}
    window.addEventListener('scroll', __pdfReportProgress, { passive: true });
  </script>
</body>
</html>`;
}
