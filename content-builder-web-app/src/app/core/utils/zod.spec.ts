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
    expect(rescueChoiceParameterChangeSchema.safeParse({ ...change, value: '' }).success).toBe(false);
    expect(rescueChoiceParameterChangeSchema.safeParse({ ...change, value: 'invalid' }).success).toBe(false);
  });
});
