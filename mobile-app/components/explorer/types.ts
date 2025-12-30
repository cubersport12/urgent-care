import { AppArticleVm, AppFolderVm, AppRescueItemVm, AppTestVm } from '@/hooks/api/types';

export type ExplorerItem = {
  type: 'folder' | 'article' | 'test' | 'rescue';
  data: AppFolderVm | AppArticleVm | AppTestVm | AppRescueItemVm;
};

export type BreadcrumbItem = {
  id: string;
  name: string;
  type: 'folder' | 'article' | 'test' | 'rescue';
};

