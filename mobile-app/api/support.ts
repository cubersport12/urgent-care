/** Support chat API facade. */
import {
  supportGetMyThread,
  supportPostMyMessage,
} from '@/api/generated/sdk.gen';
import type { SupportMessageOut, SupportThreadDetailOut } from '@/api/generated/types.gen';
import { apiCall } from '@/api/utils';

export type SupportMessage = SupportMessageOut;
export type SupportThread = SupportThreadDetailOut;

export const supportApi = {
  getMine: (): Promise<SupportThread> => apiCall(() => supportGetMyThread()),

  send: (body: string): Promise<SupportMessage> =>
    apiCall(() => supportPostMyMessage({ body: { body } })),
};
