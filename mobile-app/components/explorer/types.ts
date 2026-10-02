import { AppArticleVm, AppFolderVm, AppRescueItemVm, AppTestVm } from '@/hooks/api/types';

/** Причина блокировки материала: 'tariff' — нужен тариф выше, 'reward' — открывается за достижение. */
export type LockReason = 'tariff' | 'reward';

export type ExplorerItem = {
  type: 'folder' | 'article' | 'test' | 'rescue';
  data: AppFolderVm | AppArticleVm | AppTestVm | AppRescueItemVm;
};

export type BreadcrumbItem = {
  id: string;
  name: string;
  type: 'folder' | 'article' | 'test' | 'rescue';
};

