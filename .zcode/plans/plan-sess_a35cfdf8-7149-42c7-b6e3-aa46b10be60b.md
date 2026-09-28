# Дизайн-система мобильного приложения в HTML

## Что создаётся

Один самодостаточный файл **`mobile-app/design-system.html`** — интерактивная страница-документация без сборки и без новых зависимостей (только Google Fonts CDN для точного рендера Inter / IBM Plex Mono / Material Symbols, с системными фолбэками). Язык — русский (как весь UI приложения).

Все значения берутся дословно из `constants/theme.ts` и компонентов — это снимок текущего кода, не выдуманная система.

## Структура страницы

**Переключатель темы** (Светлая/Тёмная) в шапке, переключает `data-theme` на `<html>` — вся страница живёт на палитре приложения, обе темы видны вживую. По умолчанию тёмная (она первична: «Kimi-inspired, dark matches kimi-dental-edu»). Выбор сохраняется в localStorage.

### Секции

1. **Цвета** — свотчи по группам с именами токенов и значениями обеих тем:
   - Брендовые пары: `primary/success/error/warning` + `on*`/`*Container`/`on*Container`
   - Поверхности: `page`, `layout1-3`, `onLayout*`, `elevated1-3`
   - Текст и нейтральные: `text`, `neutral`, `neutralSoft`, `icon`, `onNeutral*`
   - Границы: `border`, `borderVariant`; акцент `accentPurple`
   - Подсекция «вне токенов» — захардкоженные цвета (StatusBadge, FilterPills active, ParticleHelix палитра, баннер `#1C1C1E`) с пометкой
2. **Типографика** — все 11 вариантов ThemedText (`default…label, mono`) отрендерены живьём реальными шрифтами + таблица спецификаций (fontSize/weight/lineHeight/letterSpacing/fontFamily); шрифтовые стеки iOS/Android/web (Inter 300–600, IBM Plex Mono 400/500)
3. **Скругления** — Radius: sm 8 / md 10 / lg 12 / xl 16 / modal 20 / pill — визуальные плитки
4. **Отступы и сетка** — Spacing (pageX 16, pageBottom 96, header 56, nav 64, card 16), NavRail (72/200, breakpoint 768)
5. **Компоненты** — HTML/CSS-реконструкции с живыми состояниями:
   - Button: 7 вариантов (primary/gradient, success, error, default, glass, ghost) × 3 размера, press-состояния (scale 0.98), disabled
   - GlassCard (+ примечание: blur только native dark, web/light — плоская)
   - GlassInput (focus/без focus, глазок пароля)
   - StatusBadge — все 7 статусов
   - ProgressBar (градиентная заливка + shimmer)
   - ContentCard + TypeIcon (folder/article/test/rescue)
   - FilterPills (active/inactive)
   - Теги последствий rescue (normal/low/medium/high)
6. **Эффекты** — Glass-таблица токенов (background/border/hover/scrim/tint-варианты) + live-карточка с `backdrop-filter`; Glow (title glow за заголовком, кнопочный glow); градиенты (`#0084FF→#4D8B31`); Shadows всех 5 уровней (small/medium/large/glass/nav) в обеих темах; шкала blurIntensity
7. **Анимации** — live CSS-демо с кнопкой «повторить» + таблица словаря длительностей:
   - появление экрана FadeIn 300ms; stagger-вход списка (шаг 60ms, 600ms, spring damping 18/stiffness 120)
   - тост FadeInUp 280 / FadeOutUp 200; автоскрытие 6000ms
   - shimmer прогресса 3000ms; typewriter 35ms/символ; флеш параметра 160/320ms
   - press-состояния; nav rail 220ms
   - неиспользуемые токены (`pulseDanger`, `pulseRing`, `blinkTimer`) — помечены «зарезервировано»
8. **Иконки** — таблица всех 49 маппингов SF Symbols → Material Icons (рендер Material Symbols), примечание про нативный SF Symbols на iOS (weight regular)
9. **Платформенные заметки** — blur только native+dark (web — плоско), haptics только iOS, RN shadow → CSS box-shadow соответствия

## Реализация

- Все токены — CSS custom properties: `:root[data-theme='dark']{--primary:#0084FF;…}` и `[data-theme='light']{…}`, значения скопированы из `constants/theme.ts` (полные таблицы Colors/Glass/Glow/Shadows уже собраны, они в контексте)
- Реконструкции компонентов — чистый CSS по спекам из кода (кнопки: высоты 36/44/52, радиус 12, градиент `linear-gradient(135deg, …)` и т.д.)
- Никакого JS-фреймворка: `<script>` только для переключателя темы и replay-кнопок демо (~30 строк)

## Проверка

- Открыть файл через локальный статический сервер (например `python -m http.server` в `mobile-app/`) и проверить в браузере скриншотами обе темы — секции цветов, кнопок, типографики. Это и есть «runnable check» для страницы.
- Сверка значений: страница собирается из уже извлечённых точных таблиц токенов, отдельный скрипт-генератор не нужен (YAGNI — дрифт для снимка-документации приемлем; при желании потом можно генерировать).

## Не делается

- Не трогаю код приложения; новый файл только `design-system.html`
- Никаких сборочных шагов, новых пакетов, деплоя
