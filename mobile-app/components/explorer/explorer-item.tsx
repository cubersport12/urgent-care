import type { StatusType } from '@/components/ui/status-badge';
import { ContentCard } from '@/components/ui/content-card';
import type { MaterialKind } from '@/components/ui/type-icon';
import { ExplorerItem } from './types';

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
};

function getStatus(
  item: ExplorerItem,
  isRead: boolean,
  testStats?: ExplorerItemComponentProps['testStats'],
  rescueStats?: ExplorerItemComponentProps['rescueStats'],
): StatusType | undefined {
  if (item.type === 'article') {
    return isRead ? 'read' : 'unread';
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

export function ExplorerItemComponent({
  item,
  onPress,
  isRead = false,
  isDisabled = false,
  testStats,
  rescueStats,
  description,
  index = 0,
}: ExplorerItemComponentProps) {
  const status = item.type === 'folder' ? undefined : getStatus(item, isRead, testStats, rescueStats);

  const descriptionPrefix =
    item.type === 'test' && testStats
      ? testStats.passed
        ? 'Успешно пройден · '
        : testStats.passed === false
          ? 'Не пройден · '
          : ''
      : item.type === 'rescue' && rescueStats?.completedAt
        ? rescueStats.passed === true
          ? 'Успешно · '
          : 'Не пройден · '
        : '';

  const defaultDescription =
    item.type === 'folder'
      ? 'Открыть раздел'
      : item.type === 'article'
        ? 'Статья'
        : item.type === 'test'
          ? 'Тест'
          : 'Режим спасения';

  return (
    <ContentCard
      title={item.data.name}
      description={`${descriptionPrefix}${description ?? defaultDescription}`}
      kind={getKind(item)}
      status={status}
      disabled={isDisabled}
      onPress={onPress}
      index={index}
    />
  );
}
