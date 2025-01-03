import { provideStore } from '@ngxs/store';
import { FoldersState } from './folders';
import { ArticlesState } from './articles';

export const provideAppStore = () => provideStore([FoldersState, ArticlesState]);
