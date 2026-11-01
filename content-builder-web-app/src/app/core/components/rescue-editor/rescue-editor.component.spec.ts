import { describe, expect, it, vi } from 'vitest';
import { RescueEditorComponent } from './rescue-editor.component';

describe('RescueEditorComponent save validation', () => {
  const draft = () => ({
    id: 'rescue', name: 'Сценарий', createdAt: '2026-01-01', description: '',
    data: { scenes: [{ id: 'scene', text: 'Сцена', choices: [{ id: 'choice', text: 'Выбор',
      parameterChanges: [{ parameterId: 'parameter', value: '1' }] }] }] }
  });

  function editor(vm: ReturnType<typeof draft>) {
    return {
      _savingFiles: () => false,
      _getRescueVm: () => vm,
      _showValidationErrors: vi.fn(),
      _validateRescueGraph: vi.fn(() => ({ global: [] as string[], sceneErrors: new Map<string, string>() })),
      _sceneErrors: { set: vi.fn() },
      _doSave: vi.fn(),
      _pendingVm: null
    };
  }

  it('blocks invalid data before graph validation or saving and identifies the scene', () => {
    const vm = draft();
    vm.data.scenes[0].choices[0].parameterChanges[0].value = 'invalid';
    const component = editor(vm);
    RescueEditorComponent.prototype['_handleSubmit'].call(component as never);
    expect(component._doSave).not.toHaveBeenCalled();
    expect(component._validateRescueGraph).not.toHaveBeenCalled();
    const [messages, sceneErrors] = component._showValidationErrors.mock.calls[0] as unknown as [string[], Map<string, string>];
    expect(messages[0]).toContain('data.scenes[1].choices[1].parameterChanges[1].value');
    expect(sceneErrors.has('scene')).toBe(true);
    expect(component._pendingVm).toBeNull();
  });

  it('saves the parsed value when the data is valid', () => {
    const component = editor(draft());
    RescueEditorComponent.prototype['_handleSubmit'].call(component as never);
    expect(component._doSave).toHaveBeenCalledOnce();
    expect(component._doSave.mock.calls[0][0].data.scenes[0].choices[0].parameterChanges[0].value).toBe(1);
  });

  it('saves parameter numbers instead of strings or empty fields', () => {
    const vm = { ...draft(), data: { ...draft().data, parameters: [{ id: 'parameter', name: 'Показатель', delta: '', startValue: '12' }] } };
    const component = editor(vm);
    RescueEditorComponent.prototype['_handleSubmit'].call(component as never);
    expect(component._doSave.mock.calls[0][0].data.parameters[0]).toMatchObject({ delta: 0, startValue: 12 });
  });

  it('retains the existing override for scene graph errors', () => {
    const component = editor(draft());
    component._validateRescueGraph.mockReturnValue({ global: ['Ошибка перехода'], sceneErrors: new Map() });
    RescueEditorComponent.prototype['_handleSubmit'].call(component as never);
    expect(component._doSave).not.toHaveBeenCalled();
    expect(component._pendingVm).not.toBeNull();
    expect(component._showValidationErrors).toHaveBeenCalled();
  });
});
