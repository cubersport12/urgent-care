import { LINKS } from "../links";

const stores = [
  { name: "App Store", href: LINKS.appStore, icon: <AppleIcon /> },
  { name: "Google Play", href: LINKS.googlePlay, icon: <PlayIcon /> },
  { name: "RuStore", href: LINKS.ruStore, icon: <RuStoreIcon /> },
];

export function StoreBadges({ className }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className ?? ""}`}>
      {stores.map((s) =>
        s.href ? (
          <a
            key={s.name}
            href={s.href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 rounded-xl bg-black px-4 py-2 text-white ring-1 ring-white/25 transition hover:ring-white/60"
          >
            <span className="h-6 w-6">{s.icon}</span>
            <span className="text-left">
              <span className="block text-[10px] leading-tight text-white/70">Скачать в</span>
              <span className="block text-sm leading-tight font-semibold">{s.name}</span>
            </span>
          </a>
        ) : (
          // TODO: убрать «Скоро», когда в links.ts появится ссылка
          <span
            key={s.name}
            title="Скоро"
            aria-disabled="true"
            className="flex cursor-not-allowed items-center gap-2.5 rounded-xl bg-black/60 px-4 py-2 text-white/60 ring-1 ring-white/15"
          >
            <span className="h-6 w-6">{s.icon}</span>
            <span className="text-left">
              <span className="block text-[10px] leading-tight text-white/50">Скачать в</span>
              <span className="block text-sm leading-tight font-semibold">
                {s.name} <span className="text-[10px] font-normal text-white/50">· скоро</span>
              </span>
            </span>
          </span>
        ),
      )}
    </div>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.702" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
      <path d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z" />
    </svg>
  );
}

function RuStoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6" aria-hidden="true">
      <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" strokeLinejoin="round" />
      <path d="M8.5 10V6.5a3.5 3.5 0 0 1 7 0V10" strokeLinecap="round" />
    </svg>
  );
}
