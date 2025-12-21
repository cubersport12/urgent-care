import { AppArticleVm, AppFolderVm, AppTestVm } from '@/hooks/api/types';

export type ExplorerItem = {
  type: 'folder' | 'article' | 'test';
  data: AppFolderVm | AppArticleVm | AppTestVm;
};

export type BreadcrumbItem = {
  id: string;
  name: string;
  type: 'folder' | 'article' | 'test';
};

