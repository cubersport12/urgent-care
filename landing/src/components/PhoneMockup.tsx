import { useState } from "react";

type PhoneMockupProps = {
  /** Путь к скриншоту для светлой темы, например /screens/home-light.png */
  src: string;
  /** Путь к скриншоту для тёмной темы, например /screens/home-dark.png */
  srcDark: string;
  alt: string;
  /** Подсказка в заглушке, пока скриншоты не добавлены в public/screens/ */
  hint: string;
  className?: string;
};

/**
 * Рамка телефона со скриншотом; пара light/dark переключается CSS-классами
 * (класс .dark на <html> ставит inline-скрипт в index.html). Отсутствие файла
 * показывает аккуратную заглушку.
 */
export function PhoneMockup({ src, srcDark, alt, hint, className }: PhoneMockupProps) {
  const [failed, setFailed] = useState({ light: false, dark: false });
  const allFailed = failed.light && failed.dark;

  return (
    <div
      className={`relative mx-auto w-full max-w-[270px] rounded-[2.6rem] bg-gray-900 p-2 shadow-2xl shadow-gray-900/30 ring-1 ring-gray-700/60 dark:bg-black dark:shadow-black/60 dark:ring-white/15 ${className ?? ""}`}
    >
      <div className="relative aspect-[9/19] overflow-hidden rounded-[2.1rem] bg-white dark:bg-white/5">
        {allFailed ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <PhoneIcon className="h-8 w-8 text-gray-300 dark:text-white/20" />
            <p className="font-mono text-[11px] break-all text-gray-400 dark:text-white/30">{src}</p>
            <p className="text-[11px] leading-snug text-gray-400 dark:text-white/40">{hint}</p>
          </div>
        ) : (
          <>
            <img
              src={src}
              alt={alt}
              loading="lazy"
              onError={() => setFailed((f) => ({ ...f, light: true }))}
              className={`h-full w-full object-cover object-top ${failed.light ? "hidden" : "block dark:hidden"}`}
            />
            <img
              src={srcDark}
              alt=""
              loading="lazy"
              onError={() => setFailed((f) => ({ ...f, dark: true }))}
              className={`h-full w-full object-cover object-top ${failed.dark ? "hidden" : "hidden dark:block"}`}
            />
          </>
        )}
        {/* «Чёлка» */}
        <div className="absolute top-2 left-1/2 h-4 w-20 -translate-x-1/2 rounded-full bg-gray-900 dark:bg-black" />
      </div>
    </div>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className} aria-hidden="true">
      <rect x="7" y="2" width="10" height="20" rx="2.5" />
      <path d="M11 18.5h2" strokeLinecap="round" />
    </svg>
  );
}
