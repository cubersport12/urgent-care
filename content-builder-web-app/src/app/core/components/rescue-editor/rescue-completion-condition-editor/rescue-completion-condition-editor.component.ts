import {
  RescueCompletionCompareOperator,
  RescueCompletionCompareVm,
  RescueCompletionConditionVm,
  RescueCompletionGroupVm,
  RescueCompletionLogicalOperator
} from '@/core/utils';
import { Component, forwardRef, input, output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatOption, MatSelectModule } from '@angular/material/select';

export type RescueCompletionParameterOption = { id: string; name: string };

@Component({
  selector: 'app-rescue-completion-condition-editor',
  standalone: true,
  imports: [
    MatButton,
    MatIcon,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatOption,
    forwardRef(() => RescueCompletionConditionEditorComponent)
  ],
  templateUrl: './rescue-completion-condition-editor.component.html',
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
