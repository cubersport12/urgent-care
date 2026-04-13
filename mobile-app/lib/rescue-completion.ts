import {
  RescueCompletionCompareOperator,
  RescueCompletionLogicalOperator,
  type AppRescueItemCompletionVm,
  type AppRescueItemDataVm,
  type RescueCompletionConditionVm,
} from '@/hooks/api/types';
import { formatSecondsAsHms } from '@/lib/rescue-timer-format';

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

/**
 * В completion часто хранят индекс параметра ("1", "2") или id, не совпадающий с {@link data.parameters},
 * тогда как значения в рантайме лежат по фактическому id параметра сцены.
 */
function resolveCompletionParameterIdToSceneId(
  rawId: string,
  definitions: readonly { id: string; name?: string | null }[],
  runtimeValues: Record<string, number>,
): string {
  const s = String(rawId).trim();
  if (!s) return s;

  if (definitions.some((p) => String(p.id) === s)) {
    return s;
  }
  if (runtimeValues[s] !== undefined) {
    return s;
  }

  const n = Number(s);
  if (!Number.isFinite(n)) {
    return definitions.length === 1 ? String(definitions[0]!.id) : s;
  }

  const intN = Math.trunc(n);
  if (intN >= 1 && intN <= definitions.length) {
    return String(definitions[intN - 1]!.id);
  }
  if (intN >= 0 && intN < definitions.length) {
    return String(definitions[intN]!.id);
  }

  if (definitions.length === 1) {
    return String(definitions[0]!.id);
  }

  return s;
}

function readCompareFields(
  n: Record<string, unknown>,
  parameters: Record<string, number>,
  parameterDefinitions?: readonly { id: string; name?: string | null }[],
): ParsedCompare | null {
  const parameterIdRaw = n.parameterId ?? n.parameter_id ?? n.ParameterId;
  const rawParameterId =
    parameterIdRaw !== undefined && parameterIdRaw !== null ? String(parameterIdRaw).trim() : '';
  if (!rawParameterId) return null;

  const parameterId =
    parameterDefinitions != null && parameterDefinitions.length > 0
      ? resolveCompletionParameterIdToSceneId(rawParameterId, parameterDefinitions, parameters)
      : rawParameterId;

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
  parameterDefinitions?: readonly { id: string; name?: string | null }[],
): RescueSubtreeExplanation {
  if (node === null || node === undefined || typeof node !== 'object') {
    return { satisfied: false, reasonsIfTrue: [], reasonsIfFalse: [] };
  }

  const n = node as Record<string, unknown>;
  const typeStr = conditionTypeKey(n);

  if (typeStr === 'compare') {
    const parsed = readCompareFields(n, parameters, parameterDefinitions);
    if (!parsed) {
      return { satisfied: false, reasonsIfTrue: [], reasonsIfFalse: ['не удалось разобрать условие сравнения'] };
    }
    const labels = mergeParameterDisplayLabels(parameterNamesById, parameterDefinitions ?? []);
    const displayName = displayNameForParameterId(parsed.parameterId, labels, parameterDefinitions ?? []);
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

    const chunks = conditions.map((c) =>
      explainSubtree(c, parameters, parameterNamesById, parameterDefinitions),
    );

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

type CompareLeafRow = {
  parameterId: string;
  displayName: string;
  satisfied: boolean;
  actual: number | undefined;
};

/** Имя параметра для UI: карта из контента + явный список определений (на случай расхождения id). */
function mergeParameterDisplayLabels(
  parameterNamesById: Record<string, string>,
  parameterDefinitions: readonly { id: string; name?: string | null }[],
): Record<string, string> {
  const m: Record<string, string> = {};
  for (const [k, v] of Object.entries(parameterNamesById)) {
    const t = typeof v === 'string' ? v.trim() : '';
    if (t) m[k] = t;
  }
  for (const p of parameterDefinitions) {
    const nm = p.name?.trim();
    if (nm) m[String(p.id)] = nm;
  }
  return m;
}

function displayNameForParameterId(
  parameterId: string,
  labels: Record<string, string>,
  parameterDefinitions: readonly { id: string; name?: string | null }[],
): string {
  const fromMap = labels[parameterId]?.trim() ?? labels[String(parameterId)]?.trim();
  if (fromMap) return fromMap;
  const def = parameterDefinitions.find((p) => String(p.id) === String(parameterId));
  const fromDef = def?.name?.trim();
  if (fromDef) return fromDef;
  return parameterId;
}

/** Листья compare с учётом И/ИЛИ: при ИЛИ и истине — только сработавшая ветка; при ИЛИ и ложи — объединение всех веток. */
function gatherCompareLeaves(
  node: RescueCompletionConditionVm | Record<string, unknown> | null | undefined,
  parameters: Record<string, number>,
  parameterLabels: Record<string, string>,
  parameterDefinitions: readonly { id: string; name?: string | null }[],
): CompareLeafRow[] {
  if (node === null || node === undefined || typeof node !== 'object') {
    return [];
  }
  const n = node as Record<string, unknown>;
  const typeStr = conditionTypeKey(n);

  if (typeStr === 'compare') {
    const parsed = readCompareFields(n, parameters, parameterDefinitions);
    if (!parsed) return [];
    const displayName = displayNameForParameterId(parsed.parameterId, parameterLabels, parameterDefinitions);
    const satisfied = applyCompare(parsed.actual, parsed.operator, parsed.expected);
    return [{ parameterId: parsed.parameterId, displayName, satisfied, actual: parsed.actual }];
  }

  if (typeStr === 'group') {
    const logical = normalizeLogicalOp(
      n.logicalOperator ?? n.logical_operator ?? n.LogicalOperator,
    );
    if (logical === null) return [];
    const conditions = Array.isArray(n.conditions) ? n.conditions : [];

    if (logical === RescueCompletionLogicalOperator.And) {
      return conditions.flatMap((c) =>
        gatherCompareLeaves(c, parameters, parameterLabels, parameterDefinitions),
      );
    }

    const anyChildSatisfied = conditions.some((c) =>
      evaluateRescueCompletionCondition(c, parameters, parameterDefinitions),
    );
    if (anyChildSatisfied) {
      const winner = conditions.find((c) =>
        evaluateRescueCompletionCondition(c, parameters, parameterDefinitions),
      );
      return winner
        ? gatherCompareLeaves(winner, parameters, parameterLabels, parameterDefinitions)
        : [];
    }
    return conditions.flatMap((c) =>
      gatherCompareLeaves(c, parameters, parameterLabels, parameterDefinitions),
    );
  }

  return [];
}

/** Все листья compare в дереве (для поиска нарушенных условий при провале И). */
function flattenAllCompareLeaves(
  node: RescueCompletionConditionVm | Record<string, unknown> | null | undefined,
  parameters: Record<string, number>,
  parameterLabels: Record<string, string>,
  parameterDefinitions: readonly { id: string; name?: string | null }[],
): CompareLeafRow[] {
  if (node === null || node === undefined || typeof node !== 'object') {
    return [];
  }
  const n = node as Record<string, unknown>;
  const typeStr = conditionTypeKey(n);

  if (typeStr === 'compare') {
    return gatherCompareLeaves(node, parameters, parameterLabels, parameterDefinitions);
  }

  if (typeStr === 'group') {
    const conditions = Array.isArray(n.conditions) ? n.conditions : [];
    return conditions.flatMap((c) =>
      flattenAllCompareLeaves(c, parameters, parameterLabels, parameterDefinitions),
    );
  }

  return [];
}

function uniqueByParameterId(rows: CompareLeafRow[]): CompareLeafRow[] {
  const seen = new Set<string>();
  const out: CompareLeafRow[] = [];
  for (const r of rows) {
    if (seen.has(r.parameterId)) continue;
    seen.add(r.parameterId);
    out.push(r);
  }
  return out;
}

function formatParameterDisplayValue(
  parameterId: string,
  actual: number | undefined,
  parameterTypesById: Record<string, 'timer' | 'numeric' | undefined>,
): string {
  if (actual === undefined) return '—';
  const typ =
    parameterTypesById[parameterId] ??
    parameterTypesById[String(parameterId)];
  if (typ === 'timer') return formatSecondsAsHms(actual);
  return formatExpectedNumber(actual);
}

function formatNameValueClause(
  rows: { parameterId: string; actual: number | undefined }[],
  parameterLabels: Record<string, string>,
  parameterDefinitions: readonly { id: string; name?: string | null }[],
  parameterTypesById: Record<string, 'timer' | 'numeric' | undefined>,
): string {
  return rows
    .map((r) => {
      const name = displayNameForParameterId(r.parameterId, parameterLabels, parameterDefinitions);
      return `${name} (${formatParameterDisplayValue(r.parameterId, r.actual, parameterTypesById)})`;
    })
    .join(', ');
}

export type RescueCompletionUserCopy = {
  title: string;
  body: string;
};

/**
 * Связный пользовательский текст для экрана завершения (без списков и таблиц).
 */
export function buildRescueCompletionDescription(
  outcome: RescueOutcome,
  completionRaw: unknown,
  parameterValues: Record<string, number>,
  parameterNamesById: Record<string, string>,
  parameterTypesById: Record<string, 'timer' | 'numeric' | undefined>,
  rescueName: string,
  parameterDefinitions: readonly { id: string; name?: string | null }[] = [],
): RescueCompletionUserCopy {
  const parameterLabels = mergeParameterDisplayLabels(parameterNamesById, parameterDefinitions);

  const c = unwrapCompletionRaw(completionRaw);
  if (!c || (!c.success && !c.failure)) {
    return {
      title: 'Завершено',
      body: `Вы завершили режим спасения «${rescueName}». Для автоматической оценки результата в контенте должны быть заданы условия завершения (успех и/или неуспех).`,
    };
  }

  const successNode = isNullableEmpty(c.success) ? null : c.success;
  const failureNode = isNullableEmpty(c.failure) ? null : c.failure;
  const successMatches = successNode
    ? evaluateRescueCompletionCondition(successNode, parameterValues, parameterDefinitions)
    : null;
  const failureMatches = failureNode
    ? evaluateRescueCompletionCondition(failureNode, parameterValues, parameterDefinitions)
    : null;

  if (outcome === 'passed') {
    const title = 'Успех';
    let body = `Вы успешно завершили режим спасения «${rescueName}». `;
    if (successNode && successMatches) {
      const leaves = gatherCompareLeaves(successNode, parameterValues, parameterLabels, parameterDefinitions).filter(
        (x) => x.satisfied,
      );
      const clause = formatNameValueClause(leaves, parameterLabels, parameterDefinitions, parameterTypesById);
      body += clause
        ? `Ключевые показатели укладывались в заданные условия: ${clause}.`
        : 'Контролируемые показатели соответствовали заданным условиям.';
    } else if (failureNode && failureMatches === false) {
      body +=
        'Критерии неблагоприятного исхода не сработали, поэтому по итогам сценария режим засчитан как успешный.';
    } else {
      body += 'По итогам сценария режим засчитан как успешный.';
    }
    return { title, body };
  }

  if (outcome === 'failed') {
    const title = 'Не пройдено';
    let body = `Вы не прошли режим спасения «${rescueName}»`;
    if (successNode && successMatches === false) {
      const all = flattenAllCompareLeaves(successNode, parameterValues, parameterLabels, parameterDefinitions);
      const bad = uniqueByParameterId(all.filter((x) => !x.satisfied));
      const clause = formatNameValueClause(bad, parameterLabels, parameterDefinitions, parameterTypesById);
      body += clause
        ? `, так как в ходе прохождения не удалось удержать на допустимом уровне ${clause}.`
        : ', так как не все условия успеха были выполнены.';
    } else if (failureNode && failureMatches) {
      const leaves = gatherCompareLeaves(failureNode, parameterValues, parameterLabels, parameterDefinitions).filter(
        (x) => x.satisfied,
      );
      const clause = formatNameValueClause(leaves, parameterLabels, parameterDefinitions, parameterTypesById);
      body += clause
        ? ` — сработали условия неблагоприятного исхода (${clause}).`
        : ' — сработали условия неблагоприятного исхода.';
    } else {
      body += '.';
    }
    return { title, body };
  }

  return {
    title: 'Завершено',
    body: `Режим спасения «${rescueName}» завершён.`,
  };
}

/**
 * Человекочитаемое объяснение итога (список фраз «потому что …»).
 */
export function getRescueOutcomeBecauseLines(
  outcome: RescueOutcome,
  completionRaw: unknown,
  parameters: Record<string, number>,
  parameterNamesById: Record<string, string>,
  parameterDefinitions: readonly { id: string; name?: string | null }[] = [],
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

  const successMatches = successNode
    ? evaluateRescueCompletionCondition(successNode, parameters, parameterDefinitions)
    : null;
  const failureMatches = failureNode
    ? evaluateRescueCompletionCondition(failureNode, parameters, parameterDefinitions)
    : null;

  if (outcome === 'passed') {
    if (successMatches && successNode) {
      return explainSubtree(successNode, parameters, parameterNamesById, parameterDefinitions).reasonsIfTrue;
    }
    if (failureNode && failureMatches === false) {
      return explainSubtree(failureNode, parameters, parameterNamesById, parameterDefinitions).reasonsIfFalse;
    }
    return [];
  }

  if (outcome === 'failed') {
    if (failureMatches && failureNode) {
      return explainSubtree(failureNode, parameters, parameterNamesById, parameterDefinitions).reasonsIfTrue;
    }
    if (successMatches === false && successNode) {
      return explainSubtree(successNode, parameters, parameterNamesById, parameterDefinitions).reasonsIfFalse;
    }
    return [];
  }

  /* undetermined: оба дерева заданы, оба не совпали */
  const lines: string[] = [];
  if (successNode && failureNode) {
    const sEx = explainSubtree(successNode, parameters, parameterNamesById, parameterDefinitions);
    const fEx = explainSubtree(failureNode, parameters, parameterNamesById, parameterDefinitions);
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
  parameterDefinitions?: readonly { id: string; name?: string | null }[],
): boolean {
  if (node === null || node === undefined || typeof node !== 'object') {
    return false;
  }

  const n = node as Record<string, unknown>;
  const typeStr = conditionTypeKey(n);

  if (typeStr === 'compare') {
    const parsed = readCompareFields(n, parameters, parameterDefinitions);
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
      return conditions.every((c) =>
        evaluateRescueCompletionCondition(c, parameters, parameterDefinitions),
      );
    }
    return conditions.some((c) =>
      evaluateRescueCompletionCondition(c, parameters, parameterDefinitions),
    );
  }

  return false;
}

/**
 * Определяет итог прохождения по {@link AppRescueItemCompletionVm} и финальным значениям параметров.
 *
 * - Заданы оба дерева: пройдено только если success истинно; иначе не пройдено (failure не задаёт отдельный «третий» исход).
 * - Только success: пройдено, если дерево истинно.
 * - Только failure: не пройдено, если дерево истинно; иначе пройдено.
 * - Ни одного дерева: итог неопределён (нет правил).
 */
export function resolveRescueOutcome(
  completion: AppRescueItemCompletionVm | null | undefined,
  parameters: Record<string, number>,
  parameterDefinitions: readonly { id: string; name?: string | null }[] = [],
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

  const successMatches = successNode
    ? evaluateRescueCompletionCondition(successNode, parameters, parameterDefinitions)
    : null;
  const failureMatches = failureNode
    ? evaluateRescueCompletionCondition(failureNode, parameters, parameterDefinitions)
    : null;

  if (successNode && failureNode) {
    return successMatches ? 'passed' : 'failed';
  }

  if (successNode && !failureNode) {
    return successMatches ? 'passed' : 'failed';
  }

  /* только failure */
  return failureMatches ? 'failed' : 'passed';
}
