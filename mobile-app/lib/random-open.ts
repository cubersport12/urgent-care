type FolderItem = {
  type: string;
  data: { parentId?: string | null; isLocked?: boolean | null };
};

export function randomOpenCandidates<T extends FolderItem>(
  items: readonly T[],
  folderId: string,
  isHidden: (item: T, index: number) => boolean,
  isDisabled: (item: T, index: number) => boolean,
): T[] {
  return items.filter((item, index) =>
    item.type !== 'folder' &&
    item.data.parentId === folderId &&
    !item.data.isLocked &&
    !isHidden(item, index) &&
    !isDisabled(item, index),
  );
}

export function pickRandomItem<T>(items: readonly T[], random = Math.random): T | undefined {
  return items.length ? items[Math.floor(random() * items.length)] : undefined;
}
