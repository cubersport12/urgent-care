import { describe, expect, it } from 'vitest';
import { rescueChoiceParameterChangeSchema, rescueItemSchema } from './zod';

describe('rescueItemSchema', () => {
  const item = { id: '1', name: 'Rescue', createdAt: '2026-01-01T00:00:00Z', description: '' };

  it('accepts nullable API data and scenes without a background', () => {
    expect(rescueItemSchema.parse({ ...item, data: null }).data).toEqual({});
    const scene = { id: 'scene', text: 'Scene', choices: [] };
    expect(rescueItemSchema.parse({ ...item, data: { scenes: [scene] } }).data.scenes).toEqual([scene]);
  });

  it('normalizes saved numeric strings and rejects invalid values', () => {
    const change = { parameterId: '1', value: '1' };
    expect(rescueChoiceParameterChangeSchema.parse(change).value).toBe(1);
    expect(rescueChoiceParameterChangeSchema.parse({ ...change, value: '' }).value).toBe(0);
    expect(rescueChoiceParameterChangeSchema.safeParse({ ...change, value: 'invalid' }).success).toBe(false);
  });

  it('normalizes numeric fields throughout a rescue while preserving open bounds', () => {
    const result = rescueItemSchema.parse({
      ...item,
      order: '2',
      data: {
        parameters: [{ id: 'p', name: 'Parameter', delta: '', startValue: '12', severities: [{ min: null, max: '15' }] }],
        scenes: [{ id: 's', order: '1', text: 'Scene', choices: [{ id: 'c', text: 'Choice', parameterChanges: [{ parameterId: 'p', value: '-3' }] }] }],
        completion: { success: { type: 'compare', parameterId: 'p', operator: 'gte', value: '9' } }
      }
    });
    expect(result.order).toBe(2);
    expect(result.data.parameters?.[0]).toMatchObject({ delta: 0, startValue: 12, severities: [{ min: null, max: 15 }] });
    expect(result.data.scenes?.[0].order).toBe(1);
    expect(result.data.scenes?.[0].choices?.[0].parameterChanges?.[0].value).toBe(-3);
    expect(result.data.completion?.success).toMatchObject({ value: 9 });
    expect(rescueItemSchema.safeParse({ ...item, data: { parameters: [{ id: 'p', name: 'P', delta: 'abc', startValue: 0 }] } }).success).toBe(false);
  });
});
