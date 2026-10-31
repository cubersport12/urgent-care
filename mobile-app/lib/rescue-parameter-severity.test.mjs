import assert from 'node:assert/strict';
import { colorForSeverity, findSeverityForValue } from './rescue-parameter-severity.ts';

const bands = [{ max: 10, severity: 'normal' }, { min: 10, max: 20, severity: 'medium', description: 'Проверьте показатель' }, { min: 30, severity: 'high' }];
assert.equal(findSeverityForValue(10, bands), bands[0]);
assert.equal(findSeverityForValue(20, bands), bands[1]);
assert.equal(findSeverityForValue(25, bands), null);
assert.equal(findSeverityForValue(30, bands), bands[2]);
assert.equal(findSeverityForValue(1), null);
const colors = { success: 'success', warning: 'warning', error: 'error', neutral: 'neutral' };
assert.deepEqual(['normal', 'low', 'medium', 'high', undefined].map((s) => colorForSeverity(s, colors)), ['success', 'success', 'warning', 'error', 'neutral']);
