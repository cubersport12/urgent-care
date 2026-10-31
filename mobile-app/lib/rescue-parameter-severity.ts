import type { RescueParameterSeverityEnum, RescueParameterSeverityVm } from '@/hooks/api/types';

/** Первый диапазон с включёнными границами, как на экране сценария. */
export function findSeverityForValue(value: number, severities?: RescueParameterSeverityVm[]): RescueParameterSeverityVm | null {
  return severities?.find((s) => value >= (s.min ?? -Infinity) && value <= (s.max ?? Infinity)) ?? null;
}

export function colorForSeverity(
  severity: RescueParameterSeverityEnum | undefined,
  colors: { success: string; warning: string; error: string; neutral: string },
): string {
  switch (severity) {
    case 'normal':
    case 'low':
      return colors.success;
    case 'medium':
      return colors.warning;
    case 'high':
      return colors.error;
    default:
      return colors.neutral;
  }
}
