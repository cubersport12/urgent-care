import { provideStore } from '@ngxs/store';
import { FoldersState } from './folders';
import { ArticlesState } from './articles';
import { TestsState } from './tests';
import { RescueState } from './rescue';

export const provideAppStore = () => provideStore([FoldersState, ArticlesState, TestsState, RescueState]);
