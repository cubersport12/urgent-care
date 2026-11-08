/**
 * Самопроверка pdf.js-HTML из pdf-view.types.ts: транспорт сообщений должен
 * работать и в нативном WebView (ReactNativeWebView), и на web (parent.postMessage).
 * Запуск: node scripts/check-pdf-view-html.mjs
 */
import { pdfJsHtmlFromBase64, pdfJsHtmlFromFile } from '../components/pdf-view/pdf-view.types.ts';

const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
};

const html = pdfJsHtmlFromBase64('aGVsbG8=');
assert(html.includes('atob("aGVsbG8=")'), 'base64 встроен в HTML');
assert(
  html.includes('pdfjs-dist@6.5.438/build/pdf.mjs'),
  'используется поддерживаемая версия pdf.js',
);
assert(html.includes('isEvalSupported: false'), 'отключена небезопасная компиляция PDF-функций');
assert(html.includes('__pdfPost'), 'шим __pdfPost присутствует');
assert(
  html.includes('window.ReactNativeWebView') && html.includes('window.parent.postMessage'),
  'шим умеет оба транспорта: натив и web',
);
// шим объявлен до первого использования
assert(
  html.indexOf('function __pdfPost') < html.indexOf("__pdfPost('loaded')"),
  '__pdfPost объявлен до вызова',
);

const urlHtml = pdfJsHtmlFromFile('https://example.com/doc.pdf');
assert(urlHtml.includes('const url = "https://example.com/doc.pdf"'), 'URL безопасно сериализуется в HTML');
assert(urlHtml.includes('function __pdfPost'), 'шим есть и в URL-варианте');

console.log('check-pdf-view-html: OK');
