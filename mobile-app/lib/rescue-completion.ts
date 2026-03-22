import {
  RescueCompletionCompareOperator,
  RescueCompletionLogicalOperator,
  type AppRescueItemCompletionVm,
  type AppRescueItemDataVm,
  type RescueCompletionConditionVm,
} from '@/hooks/api/types';

/** Итог режима спасения по деревьям success / failure */
export type RescueOutcome = 'passed' | 'failed' | 'undetermined';

function isNullableEmpty<T>(v: T | null | undefined): v is null | undefined {
  return v === null || v === undefined;
}

/** Если колонка `data` пришла строкой JSON — разбираем в объект */
export function parseRescueItemDataVm(data: unknown): AppRescueItemDataVm {
  if (data === null || data === undefined) {
    return {};
  }
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as AppRescueItemDataVm;
    } catch {
      return {};
    }
  }
  return data as AppRescueItemDataVm;
}

/**
 * Достаёт completion из сырого ответа API (camelCase / PascalCase, вложенный объект).
 */
function unwrapCompletionRaw(raw: unknown): AppRescueItemCompletionVm | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  let o: unknown = raw;
  if (typeof raw === 'string') {
    try {
      o = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof o !== 'object' || o === null) {
    return null;
  }
  const rec = o as Record<string, unknown>;
  return {
    success: (rec.success ?? rec.Success ?? rec.successCondition) as AppRescueItemCompletionVm['success'],
    failure: (rec.failure ?? rec.Failure ?? rec.failureCondition) as AppRescueItemCompletionVm['failure'],
  };
}

/** Есть ли в контенте заданные деревья успеха и/или неуспеха */
export function rescueCompletionHasConfiguredRules(completionRaw: unknown): boolean {
  const c = unwrapCompletionRaw(completionRaw);
  if (!c) {
    return false;
  }
  return !isNullableEmpty(c.success) || !isNullableEmpty(c.failure);
}

function conditionTypeKey(node: Record<string, unknown>): string {
  const t = node.type;
  return typeof t === 'string' ? t.toLowerCase().trim() : '';
}

function normalizeCompareOp(raw: unknown): RescueCompletionCompareOperator | null {
  if (typeof raw === 'string') {
    const v = raw.toLowerCase().trim();
    for (const op of Object.values(RescueCompletionCompareOperator)) {
      if (op === v) return op;
    }
    return null;
  }
  for (const op of Object.values(RescueCompletionCompareOperator)) {
    if (op === raw) return op;
  }
  return null;
}

function normalizeLogicalOp(raw: unknown): RescueCompletionLogicalOperator | null {
  if (raw === RescueCompletionLogicalOperator.And || raw === RescueCompletionLogicalOperator.Or) {
    return raw;
  }
  if (typeof raw !== 'string') return null;
  const v = raw.toLowerCase().trim();
  for (const op of Object.values(RescueCompletionLogicalOperator)) {
    if (op === v) return op;
  }
  return null;
}

function applyCompare(
  actual: number | undefined,
  operator: RescueCompletionCompareOperator,
  expected: number,
): boolean {
  if (actual === undefined) return false;
  switch (operator) {
    case RescueCompletionCompareOperator.Eq:
      return actual === expected;
    case RescueCompletionCompareOperator.Neq:
      return actual !== expected;
    case RescueCompletionCompareOperator.Gt:
      return actual > expected;
    case RescueCompletionCompareOperator.Gte:
      return actual >= expected;
    case RescueCompletionCompareOperator.Lt:
      return actual < expected;
    case RescueCompletionCompareOperator.Lte:
      return actual <= expected;
    default:
      return false;
  }
}

type ParsedCompare = {
  parameterId: string;
  operator: RescueCompletionCompareOperator;
  expected: number;
  actual: number | undefined;
};

function readCompareFields(
  n: Record<string, unknown>,
  parameters: Record<string, number>,
): ParsedCompare | null {
  const parameterIdRaw = n.parameterId ?? n.parameter_id ?? n.ParameterId;
  const parameterId =
    parameterIdRaw !== undefined && parameterIdRaw !== null ? String(parameterIdRaw) : '';
  if (!parameterId) return null;

  const op = normalizeCompareOp(n.operator);
  if (op === null) return null;
  const rawExpected = n.value;
  const expected =
    typeof rawExpected === 'number' && !Number.isNaN(rawExpected)
      ? rawExpected
      : typeof rawExpected === 'string'
        ? Number(rawExpected)
        : NaN;
  if (Number.isNaN(expected)) return null;
  const actual = parameters[parameterId];
  return { parameterId, operator: op, expected, actual };
}

function formatExpectedNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n);
}

/** Краткая запись условия, напр. «> 100» */
function formatCompareSymbolic(operator: RescueCompletionCompareOperator, expected: number): string {
  const v = formatExpectedNumber(expected);
  switch (operator) {
    case RescueCompletionCompareOperator.Eq:
      return `= ${v}`;
    case RescueCompletionCompareOperator.Neq:
      return `≠ ${v}`;
    case RescueCompletionCompareOperator.Gt:
      return `> ${v}`;
    case RescueCompletionCompareOperator.Gte:
      return `≥ ${v}`;
    case RescueCompletionCompareOperator.Lt:
      return `< ${v}`;
    case RescueCompletionCompareOperator.Lte:
      return `≤ ${v}`;
    default:
      return v;
  }
}

type RescueSubtreeExplanation = {
  satisfied: boolean;
  /** Почему поддерево истинно (для листьев — одна фраза) */
  reasonsIfTrue: string[];
  /** Почему поддерево ложно */
  reasonsIfFalse: string[];
};

function explainCompareLeaf(
  parsed: ParsedCompare,
  displayName: string,
): RescueSubtreeExplanation {
  const sym = formatCompareSymbolic(parsed.operator, parsed.expected);
  const satisfied = applyCompare(parsed.actual, parsed.operator, parsed.expected);
  const actualStr =
    parsed.actual === undefined ? 'значение не задано' : formatExpectedNumber(parsed.actual);

  if (satisfied) {
    return {
      satisfied: true,
      reasonsIfTrue: [
        `«${displayName}» ${sym} (сейчас ${actualStr})`,
      ],
      reasonsIfFalse: [],
    };
  }

  return {
    satisfied: false,
    reasonsIfTrue: [],
    reasonsIfFalse: [
      parsed.actual === undefined
        ? `«${displayName}»: ${actualStr}, условие ${sym} не выполняется`
        : `«${displayName}»: сейчас ${actualStr}, а по условию требуется ${sym}`,
    ],
  };
}

function explainSubtree(
  node: RescueCompletionConditionVm | Record<string, unknown> | null | undefined,
  parameters: Record<string, number>,
  parameterNamesById: Record<string, string>,
): RescueSubtreeExplanation {
  if (node === null || node === undefined || typeof node !== 'object') {
    return { satisfied: false, reasonsIfTrue: [], reasonsIfFalse: [] };
  }

  const n = node as Record<string, unknown>;
  const typeStr = conditionTypeKey(n);

  if (typeStr === 'compare') {
    const parsed = readCompareFields(n, parameters);
    if (!parsed) {
      return { satisfied: false, reasonsIfTrue: [], reasonsIfFalse: ['не удалось разобрать условие сравнения'] };
    }
    const displayName = parameterNamesById[parsed.parameterId] ?? parsed.parameterId;
    return explainCompareLeaf(parsed, displayName);
  }

  if (typeStr === 'group') {
    const logical = normalizeLogicalOp(
      n.logicalOperator ?? n.logical_operator ?? n.LogicalOperator,
    );
    if (logical === null) {
      return { satisfied: false, reasonsIfTrue: [], reasonsIfFalse: ['не задан оператор И или ИЛИ в группе условий'] };
    }
    const conditions = Array.isArray(n.conditions) ? n.conditions : [];
    if (conditions.length === 0) {
      const vacuous = logical === RescueCompletionLogicalOperator.And;
      return {
        satisfied: vacuous,
        reasonsIfTrue: [],
        reasonsIfFalse: vacuous ? [] : ['в группе «ИЛИ» нет условий для проверки'],
      };
    }

    const chunks = conditions.map((c) => explainSubtree(c, parameters, parameterNamesById));

    if (logical === RescueCompletionLogicalOperator.And) {
      const satisfied = chunks.every((c) => c.satisfied);
      if (satisfied) {
        return {
          satisfied: true,
          reasonsIfTrue: chunks.flatMap((c) => c.reasonsIfTrue),
          reasonsIfFalse: [],
        };
      }
      return {
        satisfied: false,
        reasonsIfTrue: [],
        reasonsIfFalse: chunks.filter((c) => !c.satisfied).flatMap((c) => c.reasonsIfFalse),
      };
    }

    /* ИЛИ */
    const satisfied = chunks.some((c) => c.satisfied);
    if (satisfied) {
      const first = chunks.find((c) => c.satisfied)!;
      return {
        satisfied: true,
        reasonsIfTrue: first.reasonsIfTrue,
        reasonsIfFalse: [],
      };
    }
    return {
      satisfied: false,
      reasonsIfTrue: [],
      reasonsIfFalse: [
        'ни одно из объединённых по «ИЛИ» условий не выполнено',
        ...chunks.flatMap((c) => c.reasonsIfFalse),
      ],
    };
  }

  return { satisfied: false, reasonsIfTrue: [], reasonsIfFalse: ['условие имеет неподдерживаемый формат'] };
}

/**
 * Человекочитаемое объяснение итога (список фраз «потому что …»).
 */
export function getRescueOutcomeBecauseLines(
  outcome: RescueOutcome,
  completionRaw: unknown,
  parameters: Record<string, number>,
  parameterNamesById: Record<string, string>,
): string[] {
  const c = unwrapCompletionRaw(completionRaw);
  if (!c) {
    return [];
  }

  const successNode = isNullableEmpty(c.success) ? null : c.success;
  const failureNode = isNullableEmpty(c.failure) ? null : c.failure;

  if (!successNode && !failureNode) {
    return [];
  }

  const successMatches = successNode ? evaluateRescueCompletionCondition(successNode, parameters) : null;
  const failureMatches = failureNode ? evaluateRescueCompletionCondition(failureNode, parameters) : null;

  if (outcome === 'passed') {
    if (successMatches && successNode) {
      return explainSubtree(successNode, parameters, parameterNamesById).reasonsIfTrue;
    }
    if (failureNode && failureMatches === false) {
      return explainSubtree(failureNode, parameters, parameterNamesById).reasonsIfFalse;
    }
    return [];
  }

  if (outcome === 'failed') {
    if (failureMatches && failureNode) {
      return explainSubtree(failureNode, parameters, parameterNamesById).reasonsIfTrue;
    }
    if (successMatches === false && successNode) {
      return explainSubtree(successNode, parameters, parameterNamesById).reasonsIfFalse;
    }
    return [];
  }

  /* undetermined: оба дерева заданы, оба не совпали */
  const lines: string[] = [];
  if (successNode && failureNode) {
    const sEx = explainSubtree(successNode, parameters, parameterNamesById);
    const fEx = explainSubtree(failureNode, parameters, parameterNamesById);
    if (sEx.reasonsIfFalse.length > 0) {
      lines.push(`условия успеха не выполнены: ${sEx.reasonsIfFalse.join('; ')}`);
    }
    if (fEx.reasonsIfFalse.length > 0) {
      lines.push(`условия неуспеха не сработали: ${fEx.reasonsIfFalse.join('; ')}`);
    }
  }
  return lines;
}

/**
 * Рекурсивно вычисляет значение дерева условий для текущих значений параметров.
 */
export function evaluateRescueCompletionCondition(
  node: RescueCompletionConditionVm | Record<string, unknown> | null | undefined,
  parameters: Record<string, number>,
): boolean {
  if (node === null || node === undefined || typeof node !== 'object') {
    return false;
  }

  const n = node as Record<string, unknown>;
  const typeStr = conditionTypeKey(n);

  if (typeStr === 'compare') {
    const parsed = readCompareFields(n, parameters);
    if (!parsed) return false;
    return applyCompare(parsed.actual, parsed.operator, parsed.expected);
  }

  if (typeStr === 'group') {
    const logical = normalizeLogicalOp(
      n.logicalOperator ?? n.logical_operator ?? n.LogicalOperator,
    );
    if (logical === null) return false;
    const conditions = Array.isArray(n.conditions) ? n.conditions : [];
    if (conditions.length === 0) {
      return logical === RescueCompletionLogicalOperator.And;
    }
    if (logical === RescueCompletionLogicalOperator.And) {
      return conditions.every((c) => evaluateRescueCompletionCondition(c, parameters));
    }
    return conditions.some((c) => evaluateRescueCompletionCondition(c, parameters));
  }

  return false;
}

/**
 * Определяет итог прохождения по {@link AppRescueItemCompletionVm} и финальным значениям параметров.
 *
 * - Заданы оба дерева: сначала проверяется success; при несовпадении — failure; иначе итог неопределён.
 * - Только success: пройдено, если дерево истинно.
 * - Только failure: не пройдено, если дерево истинно; иначе пройдено.
 * - Ни одного дерева: итог неопределён (нет правил).
 */
export function resolveRescueOutcome(
  completion: AppRescueItemCompletionVm | null | undefined,
  parameters: Record<string, number>,
): RescueOutcome {
  const completionObj = unwrapCompletionRaw(completion);
  if (!completionObj) {
    return 'undetermined';
  }

  const successNode = isNullableEmpty(completionObj.success) ? null : completionObj.success;
  const failureNode = isNullableEmpty(completionObj.failure) ? null : completionObj.failure;

  if (!successNode && !failureNode) {
    return 'undetermined';
  }

  const successMatches = successNode ? evaluateRescueCompletionCondition(successNode, parameters) : null;
  const failureMatches = failureNode ? evaluateRescueCompletionCondition(failureNode, parameters) : null;

  if (successNode && failureNode) {
    if (successMatches) return 'passed';
    if (failureMatches) return 'failed';
    return 'undetermined';
  }

  if (successNode && !failureNode) {
    return successMatches ? 'passed' : 'failed';
  }

  /* только failure */
  return failureMatches ? 'failed' : 'passed';
}
