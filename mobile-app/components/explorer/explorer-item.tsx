import type { AppFolderVm } from '@/hooks/api/types';
import type { StatusType } from '@/components/ui/status-badge';
import { ContentCard } from '@/components/ui/content-card';
import type { MaterialKind } from '@/components/ui/type-icon';
import { ExplorerItem, type LockReason } from './types';

type ExplorerItemComponentProps = {
  item: ExplorerItem;
  onPress: () => void;
  isRead?: boolean;
  isDisabled?: boolean;
  testStats?: {
    passed: boolean | null | undefined;
    completedAt?: string | null;
    startedAt?: string | null;
  };
  rescueStats?: {
    passed: boolean | null | undefined;
    completedAt?: string | null;
    startedAt?: string | null;
  };
  description?: string;
  index?: number;
  isHome?: boolean;
};

function getStatus(
  item: ExplorerItem,
  isRead: boolean,
  testStats?: ExplorerItemComponentProps['testStats'],
  rescueStats?: ExplorerItemComponentProps['rescueStats'],
): StatusType | undefined {
  if (item.type === 'article') {
    // Бейдж только для прочитанных; непрочитанные — без пометки
    return isRead ? 'read' : undefined;
  }
  if (item.type === 'test' && testStats) {
    if (testStats.passed === true) return 'success';
    if (testStats.passed === false) return 'failure';
    return 'not-passed';
  }
  if (item.type === 'rescue' && rescueStats) {
    if (rescueStats.completedAt) {
      return rescueStats.passed === true ? 'success' : 'failure';
    }
    return 'not-passed';
  }
  return undefined;
}

function getKind(item: ExplorerItem): MaterialKind {
  return item.type;
}

/**
 * Название для показа: в имени нераскрытого режима спасения часто скрыт диагноз,
 * поэтому до первой попытки показывается нейтральное «Режим спасения · N».
 */
export function rescueDisplayName(name: string, attempted: boolean, index: number): string {
  return attempted ? name : `Режим спасения · ${index + 1}`;
}

export function ExplorerItemComponent({
  item,
  onPress,
  isRead = false,
  isDisabled = false,
  testStats,
  rescueStats,
  description,
  index = 0,
  isHome = false,
}: ExplorerItemComponentProps) {
  const isHomeRescue = isHome && item.type === 'rescue';
  const status = item.type === 'folder' || isHomeRescue ? undefined : getStatus(item, isRead, testStats, rescueStats);

  // В названии режима спасения часто скрыт диагноз — маскируем только его:
  // до первой попытки (и пока недоступен) — «Режим спасения · N».
  // Тесты и документы всегда с настоящими названиями.
  const showRealName = !isDisabled && rescueStats != null;

  return (
    <ContentCard
      title={
        item.type === 'rescue'
          ? rescueDisplayName(item.data.name, showRealName, index)
          : item.data.name
      }
      description={isHomeRescue ? undefined : description}
      kind={getKind(item)}
      iconPath={item.type === 'folder' ? (item.data as AppFolderVm).iconPath : null}
      backgroundPath={item.type === 'folder' ? (item.data as AppFolderVm).backgroundPath : null}
      iconPathDark={item.type === 'folder' ? (item.data as AppFolderVm).iconPathDark : null}
      backgroundPathDark={item.type === 'folder' ? (item.data as AppFolderVm).backgroundPathDark : null}
      status={status}
      disabled={isDisabled}
      locked={(item.data.lockedBy as LockReason | null) ?? undefined}
      onPress={onPress}
      index={index}
    />
  );
}
