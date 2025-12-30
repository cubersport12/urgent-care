import { RescueLibraryItemVm, NullableValue } from '@/core/utils';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTreeModule, MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { FlatTreeControl } from '@angular/cdk/tree';
import { Store } from '@ngxs/store';
import { RescueLibraryActions, RescueLibraryState } from '@/core/store';
import { orderBy } from 'lodash';

interface TreeNode {
  item: RescueLibraryItemVm;
  children?: TreeNode[];
}

interface FlatTreeNode {
  expandable: boolean;
  item: RescueLibraryItemVm;
  level: number;
}

@Component({
  selector: 'app-rescue-library-tree',
  imports: [
    MatIcon,
    MatButton,
    MatTreeModule
  ],
  templateUrl: './rescue-library-tree.component.html',
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    .tree-container {
      overflow-y: auto;
      height: 100%;
    }
    mat-tree {
      background: transparent;
    }
  `
})
export class RescueLibraryTreeComponent {
  private readonly _store = inject(Store);

  selectedItemId = input<NullableValue<string>>(null);
  itemSelect = output<RescueLibraryItemVm>();

  private readonly _treeData = signal<TreeNode[]>([]);
  private readonly _expandedItemIds = signal<Set<string>>(new Set());

  // Tree control для управления разворачиванием/сворачиванием
  protected readonly treeControl = new FlatTreeControl<FlatTreeNode>(
    node => node.level,
    node => node.expandable
  );

  // Flattener для преобразования вложенной структуры в плоскую
  private readonly _treeFlattener = new MatTreeFlattener<TreeNode, FlatTreeNode>(
    (node: TreeNode, level: number) => ({
      expandable: !!node.children && node.children.length > 0,
      item: node.item,
      level: level
    }),
    node => node.level,
    node => node.expandable,
    node => node.children
  );

  // Data source для дерева
  protected readonly dataSource = new MatTreeFlatDataSource(this.treeControl, this._treeFlattener);

  constructor() {
    this._store.dispatch(new RescueLibraryActions.FetchAllRescueLibraryItems());
    // Подписываемся на изменения элементов
    effect(() => {
      const items = this._store.selectSignal(RescueLibraryState.getAllRescueLibraryItems)();

      // Сохраняем текущее состояние развернутых узлов перед обновлением
      const currentExpandedIds = new Set<string>();
      const flatNodes = this.treeControl.dataNodes ?? [];
      if (flatNodes.length > 0) {
        flatNodes.forEach((node) => {
          if (this.treeControl.isExpanded(node)) {
            currentExpandedIds.add(node.item.id);
          }
        });
        // Обновляем сохраненное состояние текущими развернутыми узлами
        this._expandedItemIds.set(new Set(currentExpandedIds));
      }

      // Получаем сохраненное состояние развернутых узлов
      const savedExpandedIds = this._expandedItemIds();

      // Строим новое дерево
      const treeData = this._buildTree(items);
      this._treeData.set(treeData);
      this.dataSource.data = treeData;

      // Восстанавливаем состояние развернутых узлов после обновления данных
      setTimeout(() => {
        const newFlatNodes = this.treeControl.dataNodes;
        savedExpandedIds.forEach((itemId) => {
          const node = newFlatNodes.find(n => n.item.id === itemId);
          if (node && this.treeControl.isExpandable(node)) {
            this.treeControl.expand(node);
          }
        });
      }, 0);
    });

    // Отслеживаем изменения selectedItemId для подсветки выбранного элемента
    effect(() => {
      const selectedId = this.selectedItemId();
      if (selectedId) {
        // Разворачиваем родителя выбранного элемента, если нужно
        const flatNodes = this.treeControl.dataNodes;
        const selectedNode = flatNodes.find(n => n.item.id === selectedId);
        if (selectedNode && selectedNode.item.parentId) {
          const parentNode = flatNodes.find(n => n.item.id === selectedNode.item.parentId);
          if (parentNode && this.treeControl.isExpandable(parentNode)) {
            this.treeControl.expand(parentNode);
          }
        }
      }
    });
  }

  protected _hasChild = (_: number, node: FlatTreeNode) => node.expandable;

  protected _getIconForType(type: string): string {
    switch (type) {
      case 'folder':
        return 'folder';
      case 'test':
        return 'file-circle-check';
      case 'question':
        return 'file-contract';
      case 'medicine':
        return 'kit-medical';
      case 'trigger':
        return 'bolt';
      case 'params-state':
        return 'chart-line';
      case 'folder-container':
        return 'layer-group';
      default:
        return 'file-contract';
    }
  }

  protected _selectItem(item: RescueLibraryItemVm): void {
    this.itemSelect.emit(item);
  }

  protected _onDragStart(event: DragEvent, item: RescueLibraryItemVm): void {
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('text/plain', item.id);
      // Сохраняем данные элемента в dataTransfer для использования в drop
      event.dataTransfer.setData('application/json', JSON.stringify({ id: item.id, name: item.name, type: item.type }));
    }
    // Эмитим событие выбора для синхронизации с родительским компонентом
    this.itemSelect.emit(item);
  }

  private _buildTree(items: RescueLibraryItemVm[]): TreeNode[] {
    const itemMap = new Map<string, RescueLibraryItemVm>();
    items.forEach(item => itemMap.set(item.id, item));

    // Создаем карту узлов
    const nodeMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    // Создаем узлы для всех элементов
    items.forEach((item) => {
      const node: TreeNode = {
        item,
        children: []
      };
      nodeMap.set(item.id, node);
    });

    // Строим дерево
    items.forEach((item) => {
      const node = nodeMap.get(item.id)!;
      if (item.parentId) {
        const parentNode = nodeMap.get(item.parentId);
        if (parentNode) {
          if (!parentNode.children) {
            parentNode.children = [];
          }
          parentNode.children.push(node);
        }
        else {
          // Если родитель не найден, добавляем в корень
          rootNodes.push(node);
        }
      }
      else {
        // Корневой элемент
        rootNodes.push(node);
      }
    });

    // Сортируем узлы по order
    const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
      return orderBy(nodes, ['item.order'], ['asc']).map(node => ({
        ...node,
        children: node.children ? sortNodes(node.children) : undefined
      }));
    };

    return sortNodes(rootNodes);
  }
}
