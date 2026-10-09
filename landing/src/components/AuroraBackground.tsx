/**
 * Фоновая «аврора»: три больших размытых пятна фирменных оттенков, медленно
 * дрейфующих на CSS-анимации (см. .aurora-* в index.css). Слой фиксированный,
 * с отрицательным z-index — выше фона страницы, ниже всего контента; на светлой
 * теме почти незаметен, на тёмной даёт мягкое свечение. Анимацию отключаем
 * при prefers-reduced-motion.
 */
export function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div
        className="aurora-blob aurora-blob-a bg-brand/[0.07] dark:bg-brand-bright/[0.09]"
        style={{ top: "-18vh", left: "-12vw", width: "48vw", height: "48vw" }}
      />
      <div
        className="aurora-blob aurora-blob-b bg-brand-bright/[0.06] dark:bg-brand-bright/[0.07]"
        style={{ top: "28vh", right: "-16vw", width: "42vw", height: "42vw" }}
      />
      <div
        className="aurora-blob aurora-blob-c bg-brand/[0.05] dark:bg-brand/[0.08]"
        style={{ bottom: "-22vh", left: "18vw", width: "52vw", height: "52vw" }}
      />
    </div>
  );
}
