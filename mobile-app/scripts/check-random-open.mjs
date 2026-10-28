import assert from 'node:assert/strict';
import { pickRandomItem, randomOpenCandidates } from '../lib/random-open.ts';

const items = [
  { type: 'folder', data: { id: 'sub', parentId: 'f' } },
  { type: 'article', data: { id: 'a', parentId: 'f' } },
  { type: 'test', data: { id: 't', parentId: 'f' } },
  { type: 'rescue', data: { id: 'r', parentId: 'f' } },
  { type: 'article', data: { id: 'tariff-locked-article', parentId: 'f', isLocked: true, lockedBy: 'tariff' } },
  { type: 'test', data: { id: 'reward-locked-test', parentId: 'f', isLocked: true, lockedBy: 'reward' } },
  { type: 'rescue', data: { id: 'tariff-locked-rescue', parentId: 'f', isLocked: true, lockedBy: 'tariff' } },
  { type: 'article', data: { id: 'hidden', parentId: 'f' } },
  { type: 'test', data: { id: 'disabled', parentId: 'f' } },
  { type: 'article', data: { id: 'nested', parentId: 'sub' } },
];

const eligible = randomOpenCandidates(
  items,
  'f',
  (item) => item.data.id === 'hidden',
  (item) => item.data.id === 'disabled',
);
assert.deepEqual(eligible.map((item) => item.data.id), ['a', 't', 'r']);
assert.equal(pickRandomItem(eligible, () => 0)?.data.id, 'a');
assert.equal(pickRandomItem(eligible, () => 0)?.data.id, 'a'); // Повторы допускаются.
assert.equal(pickRandomItem(eligible, () => 0.5)?.data.id, 't');
assert.equal(pickRandomItem(eligible, () => 0.999)?.data.id, 'r');
assert.equal(pickRandomItem([], () => 0), undefined);
assert.deepEqual(randomOpenCandidates(items, 'empty', () => false, () => false), []);
assert.deepEqual(randomOpenCandidates(items.slice(4, 7), 'f', () => false, () => false), []);
assert.deepEqual(randomOpenCandidates([items[1]], 'f', () => false, () => false), [items[1]]);
console.log('OK: random-open candidates and selection');
