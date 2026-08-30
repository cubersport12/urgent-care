/** User public profile (QR scan) API facade. */
import { usersGetUserQrProfile } from '@/api/generated/sdk.gen';
import type { QrProfileOut } from '@/api/generated/types.gen';
import { apiCall } from '@/api/utils';

export type QrProfile = QrProfileOut;

export const usersApi = {
  qrProfile: (userId: string): Promise<QrProfile> =>
    apiCall(() => usersGetUserQrProfile({ path: { user_id: userId } })),
};
