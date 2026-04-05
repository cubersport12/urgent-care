function pad2(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(2, '0');
}

/** Значение для `input type="time"` (step=1, до 23:59:59; больше — показываем максимум). */
export function secondsToTimeInputValue(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  let h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 23) {
    return '23:59:59';
  }
  return `${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
}

/** Парсинг значения `input type="time"` (HH:mm или HH:mm:ss) в секунды. */
export function timeInputValueToSeconds(value: string): number {
  const v = (value ?? '').trim();
  if (!v.includes(':')) {
    return 0;
  }
  const parts = v.split(':').map(p => parseInt(p, 10));
  const h = parts[0] || 0;
  const m = Number.isFinite(parts[1]) ? parts[1] : 0;
  const sec = Number.isFinite(parts[2]) ? parts[2] : 0;
  if ([h, m, sec].some(n => Number.isNaN(n) || n < 0)) {
    return 0;
  }
  return h * 3600 + Math.min(59, m) * 60 + Math.min(59, sec);
}

/** Отображение секунд как ЧЧ:ММ:СС (для таблицы; без ограничения 24 ч). */
export function formatSecondsAsHms(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
}
