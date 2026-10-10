import { useEffect, useState, type ReactNode } from "react";
import { AuroraBackground } from "./components/AuroraBackground";
import { PhoneMockup } from "./components/PhoneMockup";
import { StoreBadges } from "./components/StoreBadges";
import { ThemeToggle } from "./components/ThemeToggle";
import { LINKS } from "./links";

export default function App() {
  return (
    <div className="relative isolate min-h-screen bg-page font-sans text-gray-900 antialiased dark:bg-night dark:text-gray-100">
      <AuroraBackground />
      <Header />
      <main>
        <Hero />
        <Problem />
        <Features />
        <Rescue />
        <Steps />
        <Audience />
        <Certificate />
        <Pricing />
        <Download />
      </main>
      <Footer />
    </div>
  );
}

/* ---------- Хелперы ---------- */

function I({ children, className = "h-6 w-6" }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function SectionHead({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      <p className="text-sm font-semibold tracking-wider text-brand uppercase dark:text-brand-bright">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {children && <p className="mt-4 text-lg leading-relaxed text-gray-600 dark:text-gray-400">{children}</p>}
    </div>
  );
}

/* ---------- Header ---------- */

const nav = [
  { href: "#features", label: "Возможности" },
  { href: "#rescue", label: "Режим спасения" },
  { href: "#audience", label: "Для кого" },
  { href: "#certificate", label: "Сертификат" },
  { href: "#pricing", label: "Тарифы" },
];

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/70 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-night/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="#" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="" className="h-8 w-8 rounded-lg" />
          <span className="text-lg font-bold tracking-tight">
            Trouble<span className="text-brand dark:text-brand-bright">Dent</span>
          </span>
        </a>

        <nav className="hidden items-center gap-6 text-sm text-gray-600 md:flex dark:text-gray-400">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className="transition hover:text-gray-900 dark:hover:text-white">
              {n.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a
            href="#download"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand/90 dark:bg-brand-bright dark:hover:bg-brand-bright/90"
          >
            Скачать
          </a>
        </div>
      </div>
    </header>
  );
}

/* ---------- Hero ---------- */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-125 w-200 -translate-x-1/2 rounded-full bg-brand/10 blur-3xl dark:bg-brand-bright/10"
        aria-hidden="true"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div className="text-center lg:text-left">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-4 py-1.5 text-sm font-medium text-brand dark:border-brand-bright/25 dark:bg-brand-bright/10 dark:text-brand-bright">
            Тренажёр неотложной помощи в стоматологии
          </p>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Тренируйся на сценариях, <span className="text-brand dark:text-brand-bright">а не на пациентах</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-gray-600 lg:mx-0 dark:text-gray-400">
            Материалы, тесты и интерактивные симуляторы экстренных состояний
            для студентов-стоматологов, интернов и начинающих врачей.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 lg:items-start">
            <StoreBadges className="justify-center lg:justify-start" />
            <a
              href={LINKS.webApp}
              className="text-sm font-medium text-brand underline decoration-brand/40 underline-offset-4 transition hover:decoration-brand dark:text-brand-bright dark:decoration-brand-bright/40"
            >
              Или откройте веб-версию прямо сейчас →
            </a>
          </div>
        </div>
        <div className="relative">
          <div
            className="pointer-events-none absolute inset-x-8 inset-y-6 rounded-[3rem] bg-brand/15 blur-3xl dark:bg-brand-bright/10"
            aria-hidden="true"
          />
          <PhoneMockup
            src="/screens/home-light.png"
            srcDark="/screens/home-dark.png"
            alt="Экран «Обучение» приложения TroubleDent"
            hint="Скриншоты экрана «Обучение»: home-light.png и home-dark.png в public/screens/."
          />
        </div>
      </div>
    </section>
  );
}

/* ---------- Проблема ---------- */

const problems = [
  {
    icon: (
      <I>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </I>
    ),
    title: "Теория без практики",
    text: "Учебники дают знания, но не тренируют решения. Первый настоящий обморок или анафилаксия случается на приёме — и в этот момент легко растеряться.",
  },
  {
    icon: (
      <I>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </I>
    ),
    title: "Дорогие симуляции",
    text: "Курсы на фантомах дороги и малодоступны: нужно ехать, собирать группы, подстраиваться под расписание.",
  },
  {
    icon: (
      <I>
        <path d="m22 8-6 4 6 4V8Z" />
        <rect x="2" y="6" width="14" height="12" rx="2" />
      </I>
    ),
    title: "Видео без системы",
    text: "Разборы на YouTube хаотичны: нет структуры, проверки знаний и измеримого прогресса.",
  },
];

function Problem() {
  return (
    <section className="border-y border-gray-200/70 bg-white/60 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <SectionHead eyebrow="Проблема" title="Знать протокол — не значит действовать">
          Между «прочитал» и «сделал» — пропасть. TroubleDent закрывает разрыв: ошибаться можно и нужно
          здесь, до контакта с реальным пациентом.
        </SectionHead>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {problems.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rescue/10 text-rescue dark:bg-rescue-bright/10 dark:text-rescue-bright">
                {p.icon}
              </div>
              <h3 className="mt-4 font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Возможности ---------- */

const features = [
  {
    icon: (
      <I>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </I>
    ),
    title: "Материалы",
    text: "Структурированная библиотека статей и PDF-документов по неотложным состояниям — с отметками о прочитанном.",
  },
  {
    icon: (
      <I>
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <path d="m9 14 2 2 4-4" />
      </I>
    ),
    title: "Тесты",
    text: "Автопроверка с разбором ошибок. Засчитывается сдача без превышения лимита промахов — как на зачёте.",
  },
  {
    icon: (
      <I>
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
      </I>
    ),
    title: "Режим спасения",
    text: "Интерактивные симуляторы в формате визуальной новеллы. Решения влияют на состояние пациента и исход.",
  },
  {
    icon: (
      <I>
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
        <path d="M3 21v-5h5" />
      </I>
    ),
    title: "Умная тренировка",
    text: "Ошибки из тестов собираются в раздел повторения, а подбор статей подсказывает, что перечитать именно вам.",
  },
  {
    icon: (
      <I>
        <path d="M3 3v18h18" />
        <path d="M8 17v-3" />
        <path d="M13 17V5" />
        <path d="M18 17v-7" />
      </I>
    ),
    title: "Статистика и достижения",
    text: "Наглядный прогресс по каждому разделу, бейджи и награды — они открывают контент и дни подписки.",
  },
  {
    icon: (
      <I>
        <circle cx="12" cy="8" r="6" />
        <path d="M15.5 12.9 17 22l-5-3-5 3 1.5-9.1" />
      </I>
    ),
    title: "Сертификат",
    text: "Именной, с уникальным номером и QR-кодом. Подлинность проверяется публично за пару секунд.",
  },
];

function Features() {
  return (
    <section id="features" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <SectionHead eyebrow="Возможности" title="Всё для уверенной подготовки">
          Не просто справочник: цикл «изучил — проверил — исправил ошибки — отработал сценарий»
          помогает довести знания до автоматизма.
        </SectionHead>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-gray-200 bg-white p-6 transition hover:border-brand/40 dark:border-white/10 dark:bg-white/5 dark:hover:border-brand-bright/40"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand dark:bg-brand-bright/10 dark:text-brand-bright">
                {f.icon}
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Режим спасения ---------- */

const rescuePoints = [
  "Каждое решение влияет на параметры пациента и исход сценария",
  "Таймер на выбор — давление времени, как в реальности",
  "Справочные материалы доступны прямо во время сценария",
  "Экран завершения разбирает последствия каждого действия",
];

function Rescue() {
  return (
    <section
      id="rescue"
      className="scroll-mt-20 border-y border-rescue/15 bg-rescue/[0.04] dark:border-rescue-bright/15 dark:bg-rescue-bright/[0.05]"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div>
          <p className="text-sm font-semibold tracking-wider text-rescue uppercase dark:text-rescue-bright">
            Главная фишка
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Режим спасения</h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-600 dark:text-gray-400">
            Неотложное состояние разворачивается на экране: сцена за сценой вы принимаете решения
            в формате визуальной новеллы — и сразу видите, к чему они привели.
          </p>
          <ul className="mt-8 space-y-4">
            {rescuePoints.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rescue/15 text-rescue dark:bg-rescue-bright/15 dark:text-rescue-bright">
                  <I className="h-4 w-4">
                    <path d="M20 6 9 17l-5-5" />
                  </I>
                </span>
                <span className="leading-relaxed">{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col items-center justify-center gap-6 sm:flex-row lg:gap-0">
          <PhoneMockup
            src="/screens/rescue-light.png"
            srcDark="/screens/rescue-dark.png"
            alt="Сцена «Режима спасения» с выбором действия"
            hint="Скриншоты сцены «Режима спасения»: rescue-light.png и rescue-dark.png в public/screens/."
          />
          <PhoneMockup
            src="/screens/rescue-result-light.png"
            srcDark="/screens/rescue-result-dark.png"
            alt="Экран завершения сценария с разбором"
            hint="Скриншоты экрана завершения: rescue-result-light.png и rescue-result-dark.png в public/screens/."
            className="sm:-ml-20 sm:translate-y-10"
          />
        </div>
      </div>
    </section>
  );
}

/* ---------- Как проходит обучение ---------- */

const steps = [
  { title: "Изучите материалы", text: "Статьи и PDF по теме — коротко и по делу." },
  { title: "Проверьте себя тестом", text: "Лимит на ошибки мотивирует читать внимательно." },
  { title: "Разберите промахи", text: "Ошибки соберутся в «Тренировку» с подборкой статей для повторения." },
  { title: "Отработайте сценарий", text: "Закрепите тему в «Режиме спасения» — под давлением времени." },
];

function Steps() {
  return (
    <section className="border-t border-gray-200/70 bg-white/60 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div className="order-2 relative lg:order-1">
          <div
            className="pointer-events-none absolute inset-x-10 inset-y-8 rounded-[3rem] bg-brand/15 blur-3xl dark:bg-brand-bright/10"
            aria-hidden="true"
          />
          <PhoneMockup
            src="/screens/stats-light.png"
            srcDark="/screens/stats-dark.png"
            alt="Экран «Статистика» с прогрессом"
            hint="Скриншоты экрана «Статистика»: stats-light.png и stats-dark.png в public/screens/."
          />
        </div>
        <div className="order-1 lg:order-2">
          <p className="text-sm font-semibold tracking-wider text-brand uppercase dark:text-brand-bright">
            Как это работает
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Цикл обучения, который доводит до автоматизма
          </h2>
          <ol className="mt-8 space-y-6">
            {steps.map((s, i) => (
              <li key={s.title} className="flex items-start gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 font-semibold text-brand dark:bg-brand-bright/10 dark:text-brand-bright">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ---------- Для кого ---------- */

const audience = [
  {
    title: "Студентам",
    text: "Подготовка к занятиям, зачётам и госэкзаменам: материалы по программе и честная самопроверка.",
  },
  {
    title: "Интернам и ординаторам",
    text: "Первые самостоятельные годы — самое время отработать действия в нестандартных ситуациях.",
  },
  {
    title: "Практикующим врачам",
    text: "Быстро освежить протоколы неотложной помощи и подтянуть смежные темы.",
  },
  {
    title: "Преподавателям",
    text: "Наглядные сценарии и тесты — готовый материал для демонстрации на занятиях.",
  },
];

function Audience() {
  return (
    <section id="audience" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <SectionHead eyebrow="Для кого" title="Создано для стоматологов на каждом этапе">
          От первого курса до собственного приёма — контент и сценарии остаются полезными,
          когда теория уже позади.
        </SectionHead>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {audience.map((a) => (
            <div
              key={a.title}
              className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-white/5"
            >
              <h3 className="font-semibold text-brand dark:text-brand-bright">{a.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{a.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Сертификат ---------- */

function Certificate() {
  return (
    <section
      id="certificate"
      className="scroll-mt-20 border-y border-gray-200/70 bg-white/60 dark:border-white/10 dark:bg-white/[0.03]"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div>
          <p className="text-sm font-semibold tracking-wider text-brand uppercase dark:text-brand-bright">
            Сертификат
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Именной, с QR-кодом и публичной проверкой
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-600 dark:text-gray-400">
            Подтверждение того, что вы прошли материалы: с вашим именем, датой и уникальным номером.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              "ФИО, дата выдачи и уникальный номер серии TD на каждом сертификате",
              "QR-код ведёт на публичную страницу проверки — работодатель или преподаватель убедится в подлинности за секунды",
              "Выдаётся за прохождение материалов внутри приложения и не является документом об образовании",
            ].map((p) => (
              <li key={p} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand dark:bg-brand-bright/15 dark:text-brand-bright">
                  <I className="h-4 w-4">
                    <path d="M20 6 9 17l-5-5" />
                  </I>
                </span>
                <span className="leading-relaxed">{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-white p-3 shadow-xl ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-white/10">
          <img
            src="/certificate-template.jpg"
            alt="Шаблон именного сертификата TroubleDent"
            loading="lazy"
            className="w-full rounded-xl"
          />
        </div>
      </div>
    </section>
  );
}

/* ---------- Тарифы ---------- */

type Tariff = {
  id: string;
  title: string;
  description: string | null;
  priceRub: number;
  periodDays: number;
  isDefault: boolean;
};

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

function formatPeriod(days: number): string {
  if (days > 0 && days % 30 === 0) {
    const months = days / 30;
    return `${months} ${plural(months, "месяц", "месяца", "месяцев")}`;
  }
  return `${days} ${plural(days, "день", "дня", "дней")}`;
}

function Pricing() {
  // Тарифы настраиваются в админке — берём живой список из публичного эндпоинта.
  const [tariffs, setTariffs] = useState<Tariff[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/billing/tariffs")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: Tariff[]) => {
        if (!cancelled) setTariffs(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setTariffs([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="pricing" className="scroll-mt-20">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:py-24">
        <SectionHead eyebrow="Тарифы" title="Одна подписка — весь контент">
          Выберите удобный срок — тарифы отличаются только им. Часть материалов доступна
          бесплатно, расширенные темы и «Режим спасения» — по подписке.
        </SectionHead>

        {tariffs === null ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
            <div className="h-64 animate-pulse rounded-2xl bg-gray-200/70 dark:bg-white/[0.06]" />
            <div className="h-64 animate-pulse rounded-2xl bg-gray-200/70 dark:bg-white/[0.06]" />
            <div className="h-64 animate-pulse rounded-2xl bg-gray-200/70 dark:bg-white/[0.06]" />
          </div>
        ) : tariffs.length === 0 ? (
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">Актуальные тарифы смотрите в приложении.</p>
            <a
              href={LINKS.webApp}
              className="mt-6 inline-block rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white transition hover:bg-brand/90 dark:bg-brand-bright dark:hover:bg-brand-bright/90"
            >
              Открыть приложение
            </a>
          </div>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {tariffs.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 transition hover:border-brand/40 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-brand-bright/40"
                >
                  <h3 className="text-lg font-semibold">{t.title}</h3>
                  {t.description && (
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                      {t.description}
                    </p>
                  )}
                  <p className="mt-5">
                    <span className="text-4xl font-bold tracking-tight">
                      {t.priceRub.toLocaleString("ru-RU")} ₽
                    </span>
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                      за {formatPeriod(t.periodDays)}
                    </span>
                  </p>
                  <div className="mt-auto pt-6">
                    <a
                      href={LINKS.webApp}
                      className="block rounded-xl bg-brand px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-brand/90 dark:bg-brand-bright dark:hover:bg-brand-bright/90"
                    >
                      Подписаться
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Оплата проходит на защищённой странице платёжного сервиса.
        </p>
      </div>
    </section>
  );
}

/* ---------- CTA ---------- */

function Download() {
  return (
    <section id="download" className="relative scroll-mt-20 overflow-hidden">
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 h-100 w-160 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/10 blur-3xl dark:bg-brand-bright/10"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:py-28">
        <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          Готовы тренироваться на сценариях, а не на пациентах?
        </h2>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          Часть контента доступна бесплатно. Расширенные материалы и сценарии — по подписке.
        </p>
        <StoreBadges className="mt-8 justify-center" />
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          Или{" "}
          <a
            href={LINKS.webApp}
            className="font-medium text-brand underline decoration-brand/40 underline-offset-4 dark:text-brand-bright dark:decoration-brand-bright/40"
          >
            откройте веб-версию
          </a>{" "}
          без установки.
        </p>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */

function Footer() {
  return (
    <footer className="border-t border-gray-200/70 dark:border-white/10">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col items-center gap-8 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
          <div className="max-w-md">
            <a href="#" className="flex items-center justify-center gap-2.5 sm:justify-start">
              <img src="/logo.png" alt="" className="h-8 w-8 rounded-lg" />
              <span className="text-lg font-bold tracking-tight">
                Trouble<span className="text-brand dark:text-brand-bright">Dent</span>
              </span>
            </a>
            <p className="mt-4 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              Приложение носит информационный характер и не заменяет консультацию врача
              и клинические протоколы. Сертификат подтверждает прохождение материалов внутри
              приложения и не является документом об образовании.
            </p>
          </div>
          <nav className="text-sm text-gray-600 dark:text-gray-400">
            <ul className="space-y-2">
              <li>
                <a
                  href={LINKS.legalOffer}
                  target="_blank"
                  rel="noreferrer"
                  className="transition hover:text-gray-900 dark:hover:text-white"
                >
                  Пользовательское соглашение
                </a>
              </li>
              <li>
                <a
                  href={LINKS.legalPdn}
                  target="_blank"
                  rel="noreferrer"
                  className="transition hover:text-gray-900 dark:hover:text-white"
                >
                  Политика обработки персональных данных
                </a>
              </li>
              <li>
                <a
                  href={LINKS.legalConsent}
                  target="_blank"
                  rel="noreferrer"
                  className="transition hover:text-gray-900 dark:hover:text-white"
                >
                  Согласие на обработку персональных данных
                </a>
              </li>
              <li>
                <a
                  href={LINKS.legalConsentDistribution}
                  target="_blank"
                  rel="noreferrer"
                  className="transition hover:text-gray-900 dark:hover:text-white"
                >
                  Согласие на распространение персональных данных
                </a>
              </li>
              <li>
                <a href={LINKS.webApp} className="transition hover:text-gray-900 dark:hover:text-white">
                  Веб-версия приложения
                </a>
              </li>
            </ul>
          </nav>
        </div>
        <p className="mt-10 text-center text-xs text-gray-400 dark:text-gray-500">
          © 2026 TroubleDent
        </p>
      </div>
    </footer>
  );
}
