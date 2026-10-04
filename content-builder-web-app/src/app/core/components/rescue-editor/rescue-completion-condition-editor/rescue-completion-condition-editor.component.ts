import {
  RescueCompletionCompareOperator,
  RescueCompletionCompareVm,
  RescueCompletionConditionVm,
  RescueCompletionGroupVm,
  RescueCompletionLogicalOperator
} from '@/core/utils';
import { Component, forwardRef, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AppButtonComponent,
  AppInputComponent,
  AppSelectComponent,
  SelectOption
} from '@/core/components/ui';

export type RescueCompletionParameterOption = { id: string; name: string };

@Component({
  selector: 'app-rescue-completion-condition-editor',
  standalone: true,
  imports: [
    FormsModule,
    AppButtonComponent,
    AppInputComponent,
    AppSelectComponent,
    forwardRef(() => RescueCompletionConditionEditorComponent)
  ],
  templateUrl: './rescue-completion-condition-editor.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    :host {
      display: block;
    }
  `
})
export class RescueCompletionConditionEditorComponent {
  readonly condition = input<RescueCompletionConditionVm | null>(null);
  readonly conditionChange = output<RescueCompletionConditionVm | null>();

  readonly parameterOptions = input<RescueCompletionParameterOption[]>([]);

  protected readonly LogicalOp = RescueCompletionLogicalOperator;

  protected readonly _compareOpList: RescueCompletionCompareOperator[] = [
    RescueCompletionCompareOperator.Eq,
    RescueCompletionCompareOperator.Neq,
    RescueCompletionCompareOperator.Gt,
    RescueCompletionCompareOperator.Gte,
    RescueCompletionCompareOperator.Lt,
    RescueCompletionCompareOperator.Lte
  ];

  protected _compareOpLabel(op: RescueCompletionCompareOperator): string {
    const m: Record<RescueCompletionCompareOperator, string> = {
      [RescueCompletionCompareOperator.Eq]: 'равно',
      [RescueCompletionCompareOperator.Neq]: 'не равно',
      [RescueCompletionCompareOperator.Gt]: 'больше',
      [RescueCompletionCompareOperator.Gte]: 'больше или равно',
      [RescueCompletionCompareOperator.Lt]: 'меньше',
      [RescueCompletionCompareOperator.Lte]: 'меньше или равно'
    };
    return m[op] ?? op;
  }

  protected readonly _paramSelectOptions = computed<SelectOption[]>(() =>
    this.parameterOptions().map(opt => ({ value: opt.id, label: opt.name }))
  );

  protected readonly _operatorOptions: SelectOption[] = [
    { value: RescueCompletionCompareOperator.Eq, label: 'равно' },
    { value: RescueCompletionCompareOperator.Neq, label: 'не равно' },
    { value: RescueCompletionCompareOperator.Gt, label: 'больше' },
    { value: RescueCompletionCompareOperator.Gte, label: 'больше или равно' },
    { value: RescueCompletionCompareOperator.Lt, label: 'меньше' },
    { value: RescueCompletionCompareOperator.Lte, label: 'меньше или равно' }
  ];

  protected readonly _logicalOpOptions: SelectOption[] = [
    { value: RescueCompletionLogicalOperator.And, label: 'Все условия (И)' },
    { value: RescueCompletionLogicalOperator.Or, label: 'Любое условие (ИЛИ)' }
  ];

  protected _setCompareRoot(): void {
    const id = this.parameterOptions()[0]?.id ?? '';
    const cmp: RescueCompletionCompareVm = {
      type: 'compare',
      parameterId: id,
      operator: RescueCompletionCompareOperator.Gt,
      value: 0
    };
    this.conditionChange.emit(cmp);
  }

  protected _setGroupRoot(): void {
    const g: RescueCompletionGroupVm = {
      type: 'group',
      logicalOperator: RescueCompletionLogicalOperator.And,
      conditions: []
    };
    this.conditionChange.emit(g);
  }

  protected _clear(): void {
    this.conditionChange.emit(null);
  }

  protected _patchCompare(patch: Partial<RescueCompletionCompareVm>): void {
    const cur = this.condition();
    if (cur?.type !== 'compare') {
      return;
    }
    this.conditionChange.emit({ ...cur, ...patch });
  }

  protected _patchGroupOp(op: RescueCompletionLogicalOperator): void {
    const cur = this.condition();
    if (cur?.type !== 'group') {
      return;
    }
    this.conditionChange.emit({ ...cur, logicalOperator: op });
  }

  protected _updateChild(index: number, ch: RescueCompletionConditionVm | null): void {
    const cur = this.condition();
    if (cur?.type !== 'group') {
      return;
    }
    const next = [...cur.conditions];
    if (ch == null) {
      next.splice(index, 1);
    }
    else {
      next[index] = ch;
    }
    this.conditionChange.emit({ ...cur, conditions: next });
  }

  protected _addCompareChild(): void {
    const cur = this.condition();
    if (cur?.type !== 'group') {
      return;
    }
    const id = this.parameterOptions()[0]?.id ?? '';
    const cmp: RescueCompletionCompareVm = {
      type: 'compare',
      parameterId: id,
      operator: RescueCompletionCompareOperator.Gt,
      value: 0
    };
    this.conditionChange.emit({ ...cur, conditions: [...cur.conditions, cmp] });
  }

  protected _addGroupChild(): void {
    const cur = this.condition();
    if (cur?.type !== 'group') {
      return;
    }
    const g: RescueCompletionGroupVm = {
      type: 'group',
      logicalOperator: RescueCompletionLogicalOperator.And,
      conditions: []
    };
    this.conditionChange.emit({ ...cur, conditions: [...cur.conditions, g] });
  }
}
