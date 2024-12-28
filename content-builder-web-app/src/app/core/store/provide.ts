import { provideStore } from '@ngxs/store';
import { FoldersState } from './folders';

export const provideAppStore = () => provideStore([FoldersState]);
