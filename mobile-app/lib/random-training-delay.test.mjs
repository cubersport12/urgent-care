import assert from 'node:assert/strict';
import { selectionStepDelays } from './random-training-delay.ts';

for (const count of [5, 10, 20]) {
  let index = 0;
  const delays = selectionStepDelays(count, () => index++ % 2 ? 0.9 : 0.1);
  const total = delays.reduce((sum, delay) => sum + delay, 0);
  assert.equal(delays.length, count);
  assert.ok(total >= 3500 && total <= 4000);
  assert.ok(delays.every((delay) => delay > 0));
  assert.notEqual(delays[0], delays[1]);
}
