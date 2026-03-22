import {
  AppRescueItemCompletionVm,
  RescueCompletionCompareOperator,
  RescueCompletionConditionVm,
  RescueCompletionGroupVm,
  RescueCompletionLogicalOperator
} from './types';

const operatorLabels: Record<RescueCompletionCompareOperator, string> = {
  [RescueCompletionCompareOperator.Eq]: 'равно',
  [RescueCompletionCompareOperator.Neq]: 'не равно',
  [RescueCompletionCompareOperator.Gt]: 'больше',
  [RescueCompletionCompareOperator.Gte]: 'больше или равно',
  [RescueCompletionCompareOperator.Lt]: 'меньше',
  [RescueCompletionCompareOperator.Lte]: 'меньше или равно'
};

function paramLabel(parameterId: string, nameById: Map<string, string>): string {
  const n = nameById.get(parameterId);
  return n != null && n.length > 0 ? `«${n}»` : `параметр «${parameterId}»`;
}

function childNeedsParens(ch: RescueCompletionConditionVm): boolean {
  return ch.type === 'group';
}

/**
 * Человекочитаемое условие (рекурсивно): «Имя» больше 10 и ( ... )
 */
export function formatRescueCompletionCondition(
  c: RescueCompletionConditionVm,
  nameById: Map<string, string>
): string {
  if (c.type === 'compare') {
    const p = paramLabel(c.parameterId, nameById);
    const op = operatorLabels[c.operator] ?? c.operator;
    return `${p} будет ${op} ${c.value}`;
  }
  const g = c as RescueCompletionGroupVm;
  const sep =
    g.logicalOperator === RescueCompletionLogicalOperator.And ? ' и ' : ' или ';
  if (g.conditions.length === 0) {
    return '(пустая группа — добавьте условия)';
  }
  return g.conditions
    .map((ch) => {
      const t = formatRescueCompletionCondition(ch, nameById);
      return childNeedsParens(ch) ? `(${t})` : t;
    })
    .join(sep);
}

/** Строка для блока успеха / неуспеха */
export function formatRescueCompletionOutcomeLine(
  kind: 'success' | 'failure',
  root: RescueCompletionConditionVm | null | undefined,
  nameById: Map<string, string>
): string {
  if (root == null) {
    return kind === 'success'
      ? 'Условия успешного завершения не заданы.'
      : 'Условия неуспешного завершения не заданы.';
  }
  const body = formatRescueCompletionCondition(root, nameById);
  if (kind === 'success') {
    return `Спасение завершится успешно, если ${body}.`;
  }
  return `Спасение завершится неуспешно, если ${body}.`;
}

/** Две строки: успех и неуспех (или подсказка, если completion нет) */
export function formatRescueCompletionSummary(
  completion: AppRescueItemCompletionVm | null | undefined,
  nameById: Map<string, string>
): [string, string] {
  if (completion == null) {
    const hint = 'Условия завершения не настроены. Нажмите «Настроить условия завершения».';
    return [hint, hint];
  }
  return [
    formatRescueCompletionOutcomeLine('success', completion.success ?? null, nameById),
    formatRescueCompletionOutcomeLine('failure', completion.failure ?? null, nameById)
  ];
}

/** Проверка: группы не пустые, compare с непустым parameterId */
export function validateRescueCompletionCondition(
  c: RescueCompletionConditionVm | null | undefined,
  path = ''
): string[] {
  const errs: string[] = [];
  if (c == null) {
    return errs;
  }
  if (c.type === 'compare') {
    if (!c.parameterId?.trim()) {
      errs.push(`${path || 'Условие'}: выберите параметр`.trim());
    }
    return errs;
  }
  const p = path ? `${path} → группа` : 'Группа';
  if (c.conditions.length === 0) {
    errs.push(`${p}: добавьте хотя бы одно вложенное условие`);
  }
  c.conditions.forEach((ch, i) => {
    errs.push(...validateRescueCompletionCondition(ch, `${p}[${i + 1}]`));
  });
  return errs;
}

export function validateAppRescueItemCompletion(vm: AppRescueItemCompletionVm): string[] {
  return [
    ...validateRescueCompletionCondition(vm.success ?? null, 'Успех'),
    ...validateRescueCompletionCondition(vm.failure ?? null, 'Неуспех')
  ];
}
