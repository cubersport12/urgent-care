/**
 * Поиск цикла, достижимого из startId, в ориентированном графе.
 * Возвращает путь цикла (первая вершина совпадает с последней) или null.
 */
export function findCyclePath(edges: Map<string, string[]>, startId: string): string[] | null {
  const color = new Map<string, 'gray' | 'black'>();
  const path: string[] = [];

  const visit = (id: string): string[] | null => {
    const state = color.get(id);
    if (state === 'black') return null;
    if (state === 'gray') {
      return path.slice(path.indexOf(id)).concat(id);
    }
    color.set(id, 'gray');
    path.push(id);
    for (const next of edges.get(id) ?? []) {
      const found = visit(next);
      if (found) return found;
    }
    path.pop();
    color.set(id, 'black');
    return null;
  };

  return visit(startId);
}
