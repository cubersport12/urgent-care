import { provideStore } from '@ngxs/store';
import { FoldersState } from './folders';
import { ArticlesState } from './articles';
import { TestsState } from './tests';
import { RescueState } from './rescue';
import { RescueLibraryState } from './rescue-library';
import { RescueStoriesState } from './rescue-stories';

export const provideAppStore = () => provideStore([FoldersState, ArticlesState, TestsState, RescueState, RescueLibraryState, RescueStoriesState]);
