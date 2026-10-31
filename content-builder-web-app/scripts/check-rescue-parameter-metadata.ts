import assert from 'node:assert/strict';
import { rescueItemSchema } from '../src/app/core/utils/zod';

const base = {
  id: 'rescue', name: 'Сценарий', createdAt: '2026-01-01', description: '',
  data: { parameters: [{ id: 'pressure', name: 'Давление', delta: 0, startValue: 120, icon: 'public/pressure.png', unit: 'мм рт.ст' }] },
};
const parsed = rescueItemSchema.parse(base);
assert.equal(parsed.data?.parameters?.[0].icon, 'public/pressure.png');
assert.equal(parsed.data?.parameters?.[0].unit, 'мм рт.ст');
assert.doesNotThrow(() => rescueItemSchema.parse({ ...base, data: { parameters: [{ id: 'old', name: 'Старый', delta: 0, startValue: 0 }] } }));
console.log('Rescue parameter metadata survives schema parsing; legacy parameters remain valid.');
