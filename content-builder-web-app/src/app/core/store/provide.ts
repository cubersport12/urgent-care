import { provideStore } from '@ngxs/store';
import { FoldersState } from './folders';
import { ArticlesState } from './articles';
import { TestsState } from './tests';

export const provideAppStore = () => provideStore([FoldersState, ArticlesState, TestsState]);
