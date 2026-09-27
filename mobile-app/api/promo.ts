/** Promo codes API facade over generated OpenAPI client. */
import { billingActivatePromoCode } from '@/api/generated/sdk.gen';
import type { PromoActivateOut } from '@/api/generated/types.gen';
import { apiCall } from '@/api/utils';

export type ActivatedPromo = PromoActivateOut;

export const promoApi = {
  activate: (code: string): Promise<ActivatedPromo> =>
    apiCall(() => billingActivatePromoCode({ body: { code: code.trim() } })),
};
