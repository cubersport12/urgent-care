// Self-check: findCyclePath (используется в test-editor для проверки циклов условий доступа).
// Запуск: node scripts/graph-self-check.mjs  (Node 24+ умеет импортировать .ts напрямую)
import assert from 'node:assert/strict';
import { findCyclePath } from '../src/app/core/utils/graph.ts';

// Прямой цикл A → B → A
assert.deepEqual(findCyclePath(new Map([['a', ['b']], ['b', ['a']]]), 'a'), ['a', 'b', 'a']);
// Цикл в цепочке, не включающей стартовую вершину: a требует b, а b ↔ c заблокированы
assert.deepEqual(findCyclePath(new Map([['a', ['b']], ['b', ['c']], ['c', ['b']]]), 'a'), ['b', 'c', 'b']);
// Самоцикл
assert.deepEqual(findCyclePath(new Map([['a', ['a']]]), 'a'), ['a', 'a']);
// Ациклический граф
assert.equal(findCyclePath(new Map([['a', ['b', 'c']], ['b', ['d']], ['c', ['d']], ['d', []]]), 'a'), null);

console.log('graph self-check: OK');
