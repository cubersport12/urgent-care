import { AppRescueItemVm } from './types';
import { useFolderContent } from './useFolderContent';

export const useRescueItems = (parentId?: string) => {
  return useFolderContent<AppRescueItemVm>('rescue', parentId);
};
