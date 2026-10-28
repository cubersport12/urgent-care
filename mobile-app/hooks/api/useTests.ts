import { AppTestVm } from './types';
import { useFolderContent } from './useFolderContent';

export const useTests = (parentId?: string) => {
  return useFolderContent<AppTestVm>('tests', parentId);
};
